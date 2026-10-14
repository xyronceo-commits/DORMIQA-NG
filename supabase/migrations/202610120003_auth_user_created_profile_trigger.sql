-- Migration: 202610120003_auth_user_created_profile_trigger.sql
-- Create database trigger on auth.users after insert to create user and student/agent profile in app_documents

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb;
  user_role text;
  full_name text;
  phone_num text;
  uni_id text;
  uni_name text;
  agency text;
  doc_user jsonb;
  doc_role jsonb;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  
  -- Determine role: strictly 'student' or 'agent', NEVER 'admin'
  user_role := lower(coalesce(meta->>'role', 'student'));
  if user_role not in ('student', 'agent') then
    user_role := 'student';
  end if;

  full_name := coalesce(nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), split_part(new.email, '@', 1), 'User');
  phone_num := coalesce(meta->>'phone', '');
  uni_id := 'uniosun';
  uni_name := 'Osun State University (UNIOSUN)';
  agency := coalesce(meta->>'agency_name', '');

  -- 1. Insert into app_documents for collection 'users'
  doc_user := jsonb_build_object(
    'id', new.id::text,
    'uid', new.id::text,
    'name', full_name,
    'email', lower(coalesce(new.email, '')),
    'role', user_role,
    'phone', phone_num,
    'universityId', uni_id,
    'universityName', uni_name,
    'agencyName', agency,
    'isEmailVerified', (new.email_confirmed_at is not null),
    'businessVerificationStatus', 'none',
    'isVerifiedAgent', false,
    'avatarUrl', '',
    'createdAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  insert into public.app_documents (collection, id, data)
  values ('users', new.id::text, doc_user)
  on conflict (collection, id) do nothing;

  -- 2. Insert into role-specific collection (students or agents)
  if user_role = 'student' then
    doc_role := jsonb_build_object(
      'id', new.id::text,
      'uid', new.id::text,
      'name', full_name,
      'email', lower(coalesce(new.email, '')),
      'phone', phone_num,
      'universityId', uni_id,
      'universityName', uni_name,
      'createdAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    insert into public.app_documents (collection, id, data)
    values ('students', new.id::text, doc_role)
    on conflict (collection, id) do nothing;
  elsif user_role = 'agent' then
    doc_role := jsonb_build_object(
      'id', new.id::text,
      'uid', new.id::text,
      'name', full_name,
      'email', lower(coalesce(new.email, '')),
      'phone', phone_num,
      'agencyName', agency,
      'universityId', uni_id,
      'universityName', uni_name,
      'businessVerificationStatus', 'none',
      'isVerifiedAgent', false,
      'createdAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    insert into public.app_documents (collection, id, data)
    values ('agents', new.id::text, doc_role)
    on conflict (collection, id) do nothing;
  end if;

  return new;
end;
$$;

-- Drop existing trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
