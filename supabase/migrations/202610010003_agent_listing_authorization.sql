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

create or replace function public.prevent_client_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  previous_data jsonb := '{}'::jsonb;
begin
  if tg_op = 'UPDATE' then
    previous_data := old.data;
  end if;

  if new.collection in ('users', 'agents')
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_dormiqa_admin()
     and (
       lower(coalesce(new.data->>'role', '')) in ('admin', 'super_admin')
       or (
         new.data->>'isVerifiedAgent' = 'true'
         and previous_data->>'isVerifiedAgent' is distinct from 'true'
       )
       or (
         new.data->>'businessVerificationStatus' = 'approved'
         and previous_data->>'businessVerificationStatus' is distinct from 'approved'
       )
     ) then
    raise exception 'Only server-authorized administrators may grant privileged roles or verification status.';
  end if;

  return new;
end;
$$;

drop trigger if exists app_documents_protect_client_privileges on public.app_documents;
create trigger app_documents_protect_client_privileges
before insert or update on public.app_documents
for each row execute function public.prevent_client_admin_escalation();

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
    and coalesce(data->>'status', 'pending') not in ('approved', 'published')
    and coalesce(data->>'verificationStatus', 'pending') not in ('approved', 'published')
    and coalesce(data->>'isVerified', 'false') <> 'true'
  )
);
