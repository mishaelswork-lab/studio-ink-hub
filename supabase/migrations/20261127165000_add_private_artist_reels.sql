-- Private Reel storage and canonical Reel records. Additive only.
create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  video_url text not null,
  caption text,
  instagram_url text,
  thumbnail_url text,
  likes integer not null default 0 check (likes >= 0),
  views integer not null default 0 check (views >= 0),
  source text not null default 'upload' check (source in ('upload','instagram')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reels_artist_created_idx on public.reels(artist_id, created_at desc);
create index if not exists reels_public_discovery_idx on public.reels(moderation_status, created_at desc);
alter table public.reels enable row level security;
revoke all on public.reels from public, anon, authenticated;
grant select on public.reels to anon, authenticated;
drop policy if exists reels_public_approved_select on public.reels;
create policy reels_public_approved_select on public.reels for select to anon, authenticated
using (moderation_status='approved' and exists(select 1 from public.artists a where a.id=reels.artist_id and a.status='active'));
drop policy if exists reels_owner_read on public.reels;
create policy reels_owner_read on public.reels for select to authenticated
using (exists(select 1 from public.artists a where a.id=reels.artist_id and a.user_id=auth.uid()));
drop policy if exists reels_admin_read on public.reels;
create policy reels_admin_read on public.reels for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));
drop policy if exists reels_owner_delete on public.reels;
create policy reels_owner_delete on public.reels for delete to authenticated
using (exists(select 1 from public.artists a where a.id=reels.artist_id and a.user_id=auth.uid()));
grant delete on public.reels to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio-reels','portfolio-reels',false,104857600,array['video/mp4','video/quicktime','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists portfolio_reels_owner_insert on storage.objects;
create policy portfolio_reels_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='portfolio-reels' and (storage.foldername(storage.objects.name))[1]=auth.uid()::text and exists(select 1 from public.artists a where a.id::text=(storage.foldername(storage.objects.name))[2] and a.user_id=auth.uid()));
drop policy if exists portfolio_reels_owner_read on storage.objects;
create policy portfolio_reels_owner_read on storage.objects for select to authenticated
using(bucket_id='portfolio-reels' and (storage.foldername(storage.objects.name))[1]=auth.uid()::text and exists(select 1 from public.artists a where a.id::text=(storage.foldername(storage.objects.name))[2] and a.user_id=auth.uid()));
drop policy if exists portfolio_reels_owner_delete on storage.objects;
create policy portfolio_reels_owner_delete on storage.objects for delete to authenticated
using(bucket_id='portfolio-reels' and (storage.foldername(storage.objects.name))[1]=auth.uid()::text and exists(select 1 from public.artists a where a.id::text=(storage.foldername(storage.objects.name))[2] and a.user_id=auth.uid()));
