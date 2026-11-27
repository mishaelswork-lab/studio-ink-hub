-- Instagram connection metadata is service-role-only; tokens are encrypted by Edge Functions.
alter table public.portfolio_items add column if not exists instagram_media_id text;
create unique index if not exists portfolio_items_artist_instagram_media_uidx
  on public.portfolio_items(artist_id, instagram_media_id) where instagram_media_id is not null;

alter table public.reels add column if not exists instagram_media_id text;
create unique index if not exists reels_artist_instagram_media_uidx
  on public.reels(artist_id, instagram_media_id) where instagram_media_id is not null;

create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null unique references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_user_id text not null,
  instagram_username text not null,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.instagram_connections enable row level security;
revoke all on public.instagram_connections from public, anon, authenticated;

create table if not exists public.instagram_oauth_states (
  state text primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.instagram_oauth_states enable row level security;
revoke all on public.instagram_oauth_states from public, anon, authenticated;
