-- Migration: 202610120004_rls_security_hardening.sql
-- Harden RLS policies, revoke anon write grants, secure storage, and enforce listing data integrity

-- 1. Revoke write permissions from anon
revoke insert, update, delete on public.app_documents from anon;

-- 2. Performance indexes on hot JSONB paths
create index if not exists idx_app_documents_listings_agent
  on public.app_documents ((data->>'agentId')) where collection = 'listings';
create index if not exists idx_app_documents_student_id
  on public.app_documents ((data->>'studentId'));
create index if not exists idx_app_documents_user_id
  on public.app_documents ((data->>'userId'));
create index if not exists idx_app_documents_recipient_id
  on public.app_documents ((data->>'recipientId'));
create index if not exists idx_app_documents_conversation_id
  on public.app_documents ((data->>'conversationId'));

-- 3. Trigger to prevent tampering with protected listing fields
create or replace function public.prevent_listing_tampering()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  is_admin boolean;
begin
  if new.collection <> 'listings' then
    return new;
  end if;

  -- Allow service_role (null auth.uid) or admin
  if auth.uid() is null then
    return new;
  end if;

  select public.is_dormiqa_admin() into is_admin;
  if is_admin then
    return new;
  end if;

  -- Guard against client spoofing agentId or agent details
  if (new.data->>'agentId') <> (old.data->>'agentId') then
    raise exception 'Cannot alter listing agentId';
  end if;

  if (new.data ? 'rating' and (new.data->>'rating') <> coalesce(old.data->>'rating', '5.0'))
     or (new.data ? 'reviewCount' and (new.data->>'reviewCount') <> coalesce(old.data->>'reviewCount', '0'))
     or (new.data ? 'viewCount' and (new.data->>'viewCount') <> coalesce(old.data->>'viewCount', '0'))
     or (new.data ? 'featured' and (new.data->>'featured') = 'true' and coalesce(old.data->>'featured', 'false') <> 'true')
  then
    raise exception 'Client is not permitted to modify system metrics (rating, reviews, views, featured)';
  end if;

  -- Prevent clients from unilaterally approving their own listing
  if (new.data->>'status') in ('approved', 'published') and coalesce(old.data->>'status', 'pending') not in ('approved', 'published') then
    raise exception 'Only administrators can approve listings';
  end if;

  if (new.data->>'verificationStatus') in ('approved', 'published') and coalesce(old.data->>'verificationStatus', 'pending') not in ('approved', 'published') then
    raise exception 'Only administrators can approve listing verification';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_listing_tampering on public.app_documents;
create trigger trg_prevent_listing_tampering
  before update on public.app_documents
  for each row execute function public.prevent_listing_tampering();

-- 4. Recreate client INSERT policy: make reports, inspections, notifications, conversations server-written only
drop policy if exists "Authenticated users create own documents" on public.app_documents;
create policy "Authenticated users create own documents"
on public.app_documents for insert to authenticated
with check (
  public.is_dormiqa_admin()
  or (
    collection in ('users', 'students', 'agents')
    and (coalesce(data->>'uid', data->>'id') = auth.uid()::text or lower(coalesce(data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', '')))
  )
  or (
    collection like '%/messages'
    and data->>'senderId' = auth.uid()::text
    and exists (
      select 1 from public.app_documents parent
      where parent.collection = 'conversations'
        and parent.id = split_part(app_documents.collection, '/', 2)
        and (parent.data->>'studentId' = auth.uid()::text or parent.data->>'agentId' = auth.uid()::text)
    )
  )
);

-- 5. Recreate client UPDATE policy: server handles inspections/reports/notifications updates
drop policy if exists "Authenticated users update own documents" on public.app_documents;
create policy "Authenticated users update own documents"
on public.app_documents for update to authenticated
using (
  public.is_dormiqa_admin()
  or (
    collection in ('users', 'students')
    and coalesce(data->>'uid', data->>'id') = auth.uid()::text
  )
  or (
    collection = 'agents'
    and coalesce(data->>'uid', data->>'id') = auth.uid()::text
    and coalesce(data->>'businessVerificationStatus', 'none') = 'approved'
  )
  or (
    collection = 'listings'
    and coalesce(data->>'agentId', data->>'userId') = auth.uid()::text
  )
)
with check (
  public.is_dormiqa_admin()
  or (
    collection in ('users', 'students')
    and coalesce(data->>'uid', data->>'id') = auth.uid()::text
  )
  or (
    collection = 'agents'
    and coalesce(data->>'uid', data->>'id') = auth.uid()::text
  )
  or (
    collection = 'listings'
    and coalesce(data->>'agentId', data->>'userId') = auth.uid()::text
  )
);

-- 6. Storage bucket 'listing-media' tightening (50 MB max, no SVGs, restricted upload path)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media',
  'listing-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

-- Recreate storage upload policy for listing-media
drop policy if exists "Authenticated listing media uploads" on storage.objects;
create policy "Authenticated listing media uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = 'listings'
);
