# DORMIQA — PROPOSED RECONCILIATION SQL

> **NOTICE: PROPOSED SCHEMA CHANGES ONLY — NOT EXECUTED.**  
> In accordance with the read-only audit rules, the following SQL statements have **not** been executed against any database. They are provided in strict dependency order for review and approval.

---

## 1. Storage Bucket Reconciliation: 50 MB Video Limit (Dependency 1)
Align the PostgreSQL storage bucket configuration for `listing-media` with the 50 MB video requirement (changing from 100 MB down to 50 MB / 52,428,800 bytes).

```sql
-- Migration: 202610060001_reconcile_listing_media_50mb.sql
update storage.buckets
set file_size_limit = 52428800 -- 50 MB
where id = 'listing-media';

-- Verify update
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'listing-media';
```

---

## 2. Compulsory Front-of-Building Photo Constraint (Dependency 2)
Add an explicit constraint on `public.app_documents` ensuring any document inserted or updated in the `listings` collection contains at least one valid photo in `data->'photos'`.

```sql
-- Migration: 202610060002_enforce_compulsory_front_photo.sql
alter table public.app_documents
  drop constraint if exists check_listings_front_photo;

alter table public.app_documents
  add constraint check_listings_front_photo
  check (
    collection <> 'listings'
    or (
      jsonb_typeof(data->'photos') = 'array'
      and jsonb_array_length(data->'photos') >= 1
      and jsonb_array_length(data->'photos') <= 3
    )
  );

-- Update RLS check policy to enforce photo requirement at RLS evaluation
drop policy if exists "Verified agents create pending listings" on public.app_documents;

create policy "Verified agents create pending listings"
on public.app_documents as restrictive
for insert to authenticated
with check (
  collection <> 'listings'
  or public.is_dormiqa_admin()
  or (
    public.is_dormiqa_verified_agent()
    and data->>'agentId' = auth.uid()::text
    and jsonb_typeof(data->'photos') = 'array'
    and jsonb_array_length(data->'photos') >= 1
    and coalesce(data->>'status', 'pending') not in ('approved', 'published')
    and coalesce(data->>'verificationStatus', 'pending') not in ('approved', 'published')
    and coalesce(data->>'isVerified', 'false') <> 'true'
  )
);
```

---

## 3. Dynamic Multi-Administrator Role Management (Dependency 3)
Transition `is_dormiqa_admin()` from a hardcoded single-email check to verify `admin` status through Supabase `auth.users.raw_app_meta_data->>'role' = 'admin'` or a dedicated table, while maintaining a fallback for the founder account.

```sql
-- Migration: 202610060003_dynamic_admin_authorization.sql
create table if not exists public.admin_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('ADMIN', 'SUPER_ADMIN')),
  created_at timestamptz not null default now()
);

alter table public.admin_directory enable row level security;

-- Seed founder administrator
insert into public.admin_directory (user_id, email, role)
select u.id, u.email, 'SUPER_ADMIN'
from auth.users u
where lower(coalesce(u.email, '')) = 'buildsafe247@gmail.com'
on conflict (email) do nothing;

-- Update is_dormiqa_admin function to check admin_directory
create or replace function public.is_dormiqa_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_directory a
    join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid()
      and u.email_confirmed_at is not null
  ) or exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = 'buildsafe247@gmail.com'
      and u.email_confirmed_at is not null
  );
$$;
```

---

## 4. Part B: Live Database Verification Queries (Paste-Ready Pack)

Run these queries in the **Supabase SQL Editor** to inspect the live database state without modifying data:

```sql
-- ============================================================================
-- DORMIQA LIVE DATABASE VERIFICATION QUERY PACK (READ-ONLY)
-- ============================================================================

-- B1. Tables and Row Level Security Status
select schemaname, tablename, rowsecurity 
from pg_tables 
where schemaname = 'public' 
order by tablename;

-- B2. All Row Level Security Policies
select tablename, policyname, cmd, roles, qual, with_check 
from pg_policies 
where schemaname = 'public' 
order by tablename, cmd;

-- B3. Columns in Public Tables
select table_name, column_name, data_type, is_nullable, column_default 
from information_schema.columns 
where table_schema = 'public' 
order by table_name, ordinal_position;

-- B4. Constraints (Primary Key, Foreign Key, Unique, Check)
select conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as definition 
from pg_constraint 
where connamespace = 'public'::regnamespace 
order by 1, 2;

-- B5. Indexes
select tablename, indexname, indexdef 
from pg_indexes 
where schemaname = 'public' 
order by tablename;

-- B6. Triggers (Public tables and auth.users)
select tgrelid::regclass as on_table, tgname, pg_get_triggerdef(oid) as definition 
from pg_trigger 
where not tgisinternal 
  and (tgrelid::regclass::text like 'public.%' or tgrelid = 'auth.users'::regclass);

-- B7. Functions (Flags SECURITY DEFINER)
select p.proname, p.prosecdef as security_definer, pg_get_functiondef(p.oid) as definition 
from pg_proc p 
join pg_namespace n on n.oid = p.pronamespace 
where n.nspname = 'public' 
order by p.proname;

-- B8. Views
select table_name, view_definition 
from information_schema.views 
where table_schema = 'public';

-- B9. Table Privileges for Anon / Authenticated
select grantee, table_name, privilege_type 
from information_schema.role_table_grants 
where table_schema = 'public' and grantee in ('anon', 'authenticated') 
order by table_name, grantee;

-- B10. Storage Buckets Configuration
select id, name, public, file_size_limit, allowed_mime_types 
from storage.buckets;

-- B11. Storage Policies on Objects
select policyname, cmd, roles, qual, with_check 
from pg_policies 
where schemaname = 'storage' and tablename = 'objects';

-- B12. Realtime-Enabled Publication Tables
select schemaname, tablename 
from pg_publication_tables 
where pubname = 'supabase_realtime';

-- B13. Applied Migration History
select version, name 
from supabase_migrations.schema_migrations 
order by version;

-- B14. Distribution of Documents by Collection
select collection, count(*) as document_count 
from public.app_documents 
group by collection 
order by document_count desc;
```

---

## 5. Part B15: Role Impersonation Test Templates (Dev / Staging Only)

Execute these transactional tests to verify RLS enforcement. All transactions end with `rollback;` to ensure zero side effects.

### Test 1: Student reads another student's saved listings & messages (Expect: Denied / 0 rows)
```sql
begin;
set local role authenticated;
-- Replace with actual Student UUID
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"student1@test.com","role":"authenticated"}';

-- Attempt reading another student's document
select * from public.app_documents
where collection = 'users' and id = '22222222-2222-2222-2222-222222222222';
-- EXPECTED: 0 rows returned

-- Attempt reading another user's conversation
select * from public.app_documents
where collection = 'conversations'
  and data->>'studentId' = '22222222-2222-2222-2222-222222222222'
  and data->>'agentId' != '11111111-1111-1111-1111-111111111111';
-- EXPECTED: 0 rows returned

rollback;
```

### Test 2: Student reads or updates agent verification CAC docs (Expect: Denied / 0 rows)
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"student1@test.com","role":"authenticated"}';

-- Attempt reading verification documents from private bucket
select * from storage.objects
where bucket_id = 'verification-documents'
  and owner_id != '11111111-1111-1111-1111-111111111111';
-- EXPECTED: 0 rows returned

rollback;
```

### Test 3: Agent A edits or deletes Agent B's listing (Expect: Denied / 0 rows affected)
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"agenta@test.com","role":"authenticated"}';

-- Attempt updating listing owned by agent B
update public.app_documents
set data = jsonb_set(data, '{title}', '"Hijacked Title"')
where collection = 'listings' and data->>'agentId' = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- EXPECTED: 0 rows updated

-- Attempt deleting listing owned by agent B
delete from public.app_documents
where collection = 'listings' and data->>'agentId' = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- EXPECTED: 0 rows deleted

rollback;
```

### Test 4: Non-admin attempts to self-promote to Admin (Expect: Throws Exception)
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"agenta@test.com","role":"authenticated"}';

-- Attempt escalating role to admin
update public.app_documents
set data = jsonb_set(data, '{role}', '"admin"')
where collection = 'users' and id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- EXPECTED ERROR: 'Only server-authorized administrators may grant privileged roles or verification status.'

rollback;
```

### Test 5: Anon reads non-approved listings or private documents (Expect: Denied / 0 rows)
```sql
begin;
set local role anon;

-- Attempt reading pending/unverified listings
select * from public.app_documents
where collection = 'listings'
  and coalesce(data->>'status', '') <> 'approved'
  and coalesce(data->>'verificationStatus', '') <> 'approved';
-- EXPECTED: 0 rows returned

-- Attempt reading users collection
select * from public.app_documents
where collection = 'users';
-- EXPECTED: 0 rows returned

rollback;
```

### Test 6: Student sees removed or unapproved listings (Expect: Not visible / 0 rows)
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"student1@test.com","role":"authenticated"}';

-- Attempt selecting rejected/banned listings
select * from public.app_documents
where collection = 'listings'
  and (data->>'status' = 'banned' or data->>'status' = 'rejected');
-- EXPECTED: 0 rows returned

rollback;
```

### Test 7: Agent reads removal reason on their own listing (Expect: Allowed / 1 row)
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"agenta@test.com","role":"authenticated"}';

-- Agent selects their own rejected listing to read rejectionReason
select id, data->>'title' as title, data->>'rejectionReason' as reason
from public.app_documents
where collection = 'listings'
  and data->>'agentId' = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and (data->>'status' = 'rejected' or data->>'verificationStatus' = 'rejected');
-- EXPECTED: 1 row returned with rejection reason

rollback;
```

### Test 8: User reads a conversation they are not a participant in (Expect: Denied / 0 rows)
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","email":"outsider@test.com","role":"authenticated"}';

-- Attempt reading messages of an external conversation
select * from public.app_documents
where collection like '%/messages'
  and split_part(collection, '/', 2) in (
    select id from public.app_documents
    where collection = 'conversations'
      and data->>'studentId' != '99999999-9999-9999-9999-999999999999'
      and data->>'agentId' != '99999999-9999-9999-9999-999999999999'
  );
-- EXPECTED: 0 rows returned

rollback;
```

---

Awaiting approval before any changes.
