-- Private portfolio media storage. No public bucket or public object reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-private',
  'portfolio-private',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists portfolio_private_owner_insert on storage.objects;
create policy portfolio_private_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'portfolio-private'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and exists (
    select 1 from public.artists a
    where a.id::text = (storage.foldername(storage.objects.name))[2]
      and a.user_id = auth.uid()
  )
);

drop policy if exists portfolio_private_owner_read on storage.objects;
create policy portfolio_private_owner_read on storage.objects
for select to authenticated
using (
  bucket_id = 'portfolio-private'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and exists (
    select 1 from public.artists a
    where a.id::text = (storage.foldername(storage.objects.name))[2]
      and a.user_id = auth.uid()
  )
);

drop policy if exists portfolio_private_owner_delete on storage.objects;
create policy portfolio_private_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'portfolio-private'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and exists (
    select 1 from public.artists a
    where a.id::text = (storage.foldername(storage.objects.name))[2]
      and a.user_id = auth.uid()
  )
);
