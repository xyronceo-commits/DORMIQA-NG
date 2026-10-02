insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own verification documents" on storage.objects;
create policy "Users upload own verification documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners and admin read verification documents" on storage.objects;
create policy "Owners and admin read verification documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'verification-documents'
  and (owner_id = auth.uid()::text or public.is_dormiqa_admin())
);

drop policy if exists "Owners delete own verification documents" on storage.objects;
create policy "Owners delete own verification documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-documents'
  and owner_id = auth.uid()::text
);
