-- 202610220001_listing_upload_moderation_rls.sql
--
-- Fixes the agent listing-upload failure:
--   "new row violates row-level security policy for table app_documents"
--
-- ROOT CAUSE (verified against live Postgres/PostgREST logs):
--   The client wrote the listing with status/verificationStatus = 'published' and
--   isVerified = true in BOTH the first INSERT and the final upsert.
--   * The live INSERT policy had no moderation-state condition, so the first INSERT
--     succeeded and left a falsely "published/verified" row with no media.
--   * The live UPDATE policy (WITH CHECK) forbids an owner from setting isVerified=true,
--     so the final upsert (ON CONFLICT DO UPDATE, ~90% of the progress bar) was rejected
--     with HTTP 403 after the media had already uploaded successfully.
--   The INSERT and UPDATE policies disagreed about what an agent may write.
--
-- WHAT THIS CHANGES (listings + listing-media only; every other branch is unchanged):
--   1. Agents may only create/update listings in a pre-moderation state
--      (draft/uploading/upload_failed/incomplete/pending) with isVerified <> true.
--      Only administrators can approve/publish. Same rule for INSERT and UPDATE.
--   2. Creating a listing requires an approved, verified agent (the helper existed in
--      202610010003 but was never applied to this database).
--   3. The ownership id inside the JSON (agentId, nested agent.id) must be the caller.
--      The old email-match branch that let a user attach a listing to another agentId is gone.
--   4. An agent cannot mutate a listing an admin already approved/removed/banned.
--   5. listing-media uploads are restricted to listings/<own listing id | own uid>/...
--      and owners can read their own objects so idempotent (upsert) retries work.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_dormiqa_verified_agent()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.app_documents d
    where d.collection = 'users'
      and d.id = auth.uid()::text
      and d.data->>'role' = 'agent'
      and d.data->>'businessVerificationStatus' = 'approved'
      and d.data->>'isVerifiedAgent' = 'true'
  );
$$;

create or replace function public.dormiqa_owns_listing(p_listing_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.app_documents l
    where l.collection = 'listings'
      and l.id = p_listing_id
      and coalesce(l.data->>'agentId', l.data->>'userId', l.data->>'ownerId') = auth.uid()::text
  );
$$;

revoke all on function public.is_dormiqa_verified_agent() from public, anon;
revoke all on function public.dormiqa_owns_listing(text) from public, anon;
grant execute on function public.is_dormiqa_verified_agent() to authenticated, service_role;
grant execute on function public.dormiqa_owns_listing(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- public.app_documents: INSERT
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users create own documents" on public.app_documents;
create policy "Authenticated users create own documents"
on public.app_documents for insert to authenticated
with check (
  public.is_dormiqa_admin()
  or (
    collection = 'listings'
    and coalesce(data->>'agentId', data->>'userId', data->>'ownerId') = auth.uid()::text
    and (data #>> '{agent,id}' is null or data #>> '{agent,id}' = auth.uid()::text)
    and public.is_dormiqa_verified_agent()
    and coalesce(data->>'status', 'pending') in ('draft', 'uploading', 'upload_failed', 'incomplete', 'pending')
    and coalesce(data->>'verificationStatus', 'pending') in ('draft', 'uploading', 'upload_failed', 'incomplete', 'pending')
    and coalesce(data->>'isVerified', 'false') <> 'true'
  )
  or (
    collection in ('users', 'students', 'agents')
    and (
      coalesce(data->>'uid', data->>'id') = auth.uid()::text
      or lower(coalesce(data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
    )
  )
  or (
    collection in ('inspections', 'conversations', 'chat_messages', 'reports', 'notifications')
    and (
      data->>'studentId' = auth.uid()::text
      or data->>'agentId' = auth.uid()::text
      or data->>'userId' = auth.uid()::text
      or data->>'recipientId' = auth.uid()::text
      or data->>'reporterId' = auth.uid()::text
    )
  )
  or (
    collection like '%/messages'
    and public.dormiqa_can_access_conversation(split_part(collection, '/', 2))
  )
);

-- ---------------------------------------------------------------------------
-- public.app_documents: UPDATE
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users update own documents" on public.app_documents;
create policy "Authenticated users update own documents"
on public.app_documents for update to authenticated
using (
  public.is_dormiqa_admin()
  or (
    collection = 'listings'
    and (
      data->>'agentId' = auth.uid()::text
      or data->>'userId' = auth.uid()::text
      or data->>'ownerId' = auth.uid()::text
      or data #>> '{agent,id}' = auth.uid()::text
    )
    -- admin-moderated rows are not client-editable
    and coalesce(data->>'status', 'pending') not in ('approved', 'published', 'removed', 'banned')
  )
  or (
    collection <> 'listings'
    and (
      coalesce(data->>'uid', data->>'id', data->>'userId', data->>'recipientId', data->>'studentId', data->>'agentId', data->>'ownerId') = auth.uid()::text
      or lower(coalesce(data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
    )
  )
  or (
    collection like '%/messages'
    and public.dormiqa_can_access_conversation(split_part(collection, '/', 2))
  )
)
with check (
  public.is_dormiqa_admin()
  or (
    collection <> 'listings'
    and (
      coalesce(data->>'uid', data->>'id', data->>'userId', data->>'recipientId', data->>'studentId', data->>'agentId', data->>'ownerId') = auth.uid()::text
      or lower(coalesce(data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
    )
  )
  or (
    collection = 'listings'
    and coalesce(data->>'agentId', data->>'userId', data->>'ownerId') = auth.uid()::text
    and (data #>> '{agent,id}' is null or data #>> '{agent,id}' = auth.uid()::text)
    and coalesce(data->>'status', 'pending') in ('draft', 'uploading', 'upload_failed', 'incomplete', 'pending')
    and coalesce(data->>'verificationStatus', 'pending') in ('draft', 'uploading', 'upload_failed', 'incomplete', 'pending')
    and coalesce(data->>'isVerified', 'false') <> 'true'
  )
  or (
    collection like '%/messages'
    and public.dormiqa_can_access_conversation(split_part(collection, '/', 2))
  )
);

-- ---------------------------------------------------------------------------
-- storage.objects (bucket listing-media)
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated listing media uploads" on storage.objects;
create policy "Authenticated listing media uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = 'listings'
  and (
    public.is_dormiqa_admin()
    or (storage.foldername(name))[2] = auth.uid()::text
    or public.dormiqa_owns_listing((storage.foldername(name))[2])
  )
);

drop policy if exists "Owners read own listing media" on storage.objects;
create policy "Owners read own listing media"
on storage.objects for select to authenticated
using (bucket_id = 'listing-media' and owner_id = auth.uid()::text);
