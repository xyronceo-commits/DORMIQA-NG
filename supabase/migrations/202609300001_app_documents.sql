create extension if not exists pgcrypto;

create table if not exists public.app_documents (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists app_documents_collection_idx
  on public.app_documents (collection);
create index if not exists app_documents_data_gin_idx
  on public.app_documents using gin (data);

create or replace function public.set_app_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_documents_updated_at on public.app_documents;
create trigger app_documents_updated_at
before update on public.app_documents
for each row execute function public.set_app_documents_updated_at();

create or replace function public.is_dormiqa_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_documents d
    where d.collection = 'authorized_admins'
      and lower(coalesce(d.data->>'email', d.id)) = lower(coalesce(auth.jwt()->>'email', ''))
      and coalesce(d.data->>'status', 'active') <> 'disabled'
  ) or lower(coalesce(auth.jwt()->>'email', '')) = 'buildsafe247@gmail.com';
$$;

alter table public.app_documents enable row level security;
grant select, insert, update, delete on public.app_documents to anon, authenticated, service_role;

drop policy if exists "Public can read universities" on public.app_documents;
create policy "Public can read universities"
on public.app_documents for select
using (collection = 'universities');

drop policy if exists "Public can read approved listings" on public.app_documents;
create policy "Public can read approved listings"
on public.app_documents for select
using (
  collection = 'listings'
  and (
    data->>'verificationStatus' = 'approved'
    or data->>'status' = 'approved'
  )
);

drop policy if exists "Users can read their own documents" on public.app_documents;
create policy "Users can read their own documents"
on public.app_documents for select to authenticated
using (
  coalesce(data->>'uid', data->>'id', data->>'userId', data->>'recipientId', data->>'studentId', data->>'agentId', data->>'ownerId') = auth.uid()::text
  or lower(coalesce(data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
  or (
    collection in ('notifications')
    and coalesce(data->>'userId', data->>'recipientId') = 'all'
  )
  or (
    collection in ('inspections', 'conversations', 'chat_messages', 'reports')
    and (
      data->>'studentId' = auth.uid()::text
      or data->>'agentId' = auth.uid()::text
      or data->>'userId' = auth.uid()::text
      or data->>'reporterId' = auth.uid()::text
    )
  )
  or (
    collection = 'listings'
    and (
      data->>'agentId' = auth.uid()::text
      or data->>'userId' = auth.uid()::text
      or data->>'ownerId' = auth.uid()::text
      or data->'agent'->>'id' = auth.uid()::text
    )
  )
  or (
    collection like '%/messages'
    and exists (
      select 1 from public.app_documents parent
      where parent.collection = 'conversations'
        and parent.id = split_part(app_documents.collection, '/', 2)
        and (parent.data->>'studentId' = auth.uid()::text or parent.data->>'agentId' = auth.uid()::text)
    )
  )
);

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
    collection = 'listings'
    and coalesce(data->>'agentId', data->>'userId', data->>'ownerId') = auth.uid()::text
    and coalesce(data->>'verificationStatus', 'pending') <> 'approved'
    and coalesce(data->>'status', 'pending') <> 'approved'
    and coalesce(data->>'isVerified', 'false') <> 'true'
  )
  or (
    collection like '%/messages'
    and exists (
      select 1 from public.app_documents parent
      where parent.collection = 'conversations'
        and parent.id = split_part(app_documents.collection, '/', 2)
        and (parent.data->>'studentId' = auth.uid()::text or parent.data->>'agentId' = auth.uid()::text)
    )
  )
);

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
      or data->'agent'->>'id' = auth.uid()::text
    )
  )
  or coalesce(data->>'uid', data->>'id', data->>'userId', data->>'recipientId', data->>'studentId', data->>'agentId', data->>'ownerId') = auth.uid()::text
  or lower(coalesce(data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
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
    and coalesce(data->>'verificationStatus', 'pending') <> 'approved'
    and coalesce(data->>'status', 'pending') <> 'approved'
    and coalesce(data->>'isVerified', 'false') <> 'true'
  )
  or (
    collection like '%/messages'
    and exists (
      select 1 from public.app_documents parent
      where parent.collection = 'conversations'
        and parent.id = split_part(app_documents.collection, '/', 2)
        and (parent.data->>'studentId' = auth.uid()::text or parent.data->>'agentId' = auth.uid()::text)
    )
  )
);

drop policy if exists "Users delete own documents" on public.app_documents;
create policy "Users delete own documents"
on public.app_documents for delete to authenticated
using (
  public.is_dormiqa_admin()
  or (
    collection = 'listings'
    and (
      data->>'agentId' = auth.uid()::text
      or data->>'userId' = auth.uid()::text
      or data->>'ownerId' = auth.uid()::text
      or data->'agent'->>'id' = auth.uid()::text
    )
  )
  or coalesce(data->>'uid', data->>'id', data->>'userId', data->>'recipientId', data->>'studentId', data->>'agentId', data->>'ownerId') = auth.uid()::text
);

drop policy if exists "Admins manage all documents" on public.app_documents;
create policy "Admins manage all documents"
on public.app_documents for all to authenticated
using (public.is_dormiqa_admin())
with check (public.is_dormiqa_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_documents'
     ) then
    alter publication supabase_realtime add table public.app_documents;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', true, 104857600, array['image/*', 'video/*'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated listing media uploads" on storage.objects;
create policy "Authenticated listing media uploads"
on storage.objects for insert to authenticated
with check (bucket_id = 'listing-media');

drop policy if exists "Owners update listing media" on storage.objects;
create policy "Owners update listing media"
on storage.objects for update to authenticated
using (bucket_id = 'listing-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'listing-media' and owner_id = auth.uid()::text);

drop policy if exists "Owners delete listing media" on storage.objects;
create policy "Owners delete listing media"
on storage.objects for delete to authenticated
using (bucket_id = 'listing-media' and owner_id = auth.uid()::text);
