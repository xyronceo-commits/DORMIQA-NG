-- Migration: 202610120002_admin_config_and_security.sql
-- Single configuration table for admin email and enhanced is_dormiqa_admin() security check

create table if not exists public.admin_config (
  id text primary key default 'primary',
  admin_email text not null unique,
  updated_at timestamptz not null default now()
);

-- Seed primary admin email
insert into public.admin_config (id, admin_email)
values ('primary', 'buildsafe247@gmail.com')
on conflict (id) do update set admin_email = excluded.admin_email;

-- Restrict direct client writes to admin_config
alter table public.admin_config enable row level security;
revoke all on public.admin_config from anon, authenticated;

create or replace function public.is_dormiqa_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    cross join public.admin_config ac
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = lower(ac.admin_email)
      and u.email_confirmed_at is not null
      and (
        exists (
          select 1
          from auth.identities i
          where i.user_id = u.id
            and i.provider = 'google'
        )
        or (auth.jwt() ->> 'aal') = 'aal2'
        or (auth.jwt() -> 'amr') @> '[{"method": "totp"}]'::jsonb
        or (auth.jwt() -> 'amr') @> '[{"method": "oauth"}]'::jsonb
      )
  );
$$;
