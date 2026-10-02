drop policy if exists "Launch market listings only" on public.app_documents;
create policy "Launch market listings only"
on public.app_documents as restrictive
for all to anon, authenticated
using (
  collection <> 'listings'
  or data->>'universityId' = 'uniosun'
)
with check (
  collection <> 'listings'
  or data->>'universityId' = 'uniosun'
);
