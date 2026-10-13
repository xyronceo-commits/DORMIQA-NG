-- Migration: 202610110001_admin_login_security.sql
-- Allow Google OAuth OR MFA TOTP (aal2) for Dormiqa Admin

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
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = 'buildsafe247@gmail.com'
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
      )
  );
$$;
