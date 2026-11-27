-- Keep internal artist ownership and moderation-only portfolio URLs private.
revoke select (user_id) on public.artists from anon, authenticated;
revoke select (rejection_reason) on public.artists from anon, authenticated;

-- Replace broad portfolio row reads with explicit display columns.
revoke select on public.portfolio_items from anon, authenticated;
revoke select (source_url) on public.portfolio_items from anon, authenticated;
grant select (id, artist_id, media_url, media_type, caption, approved, created_at)
  on public.portfolio_items to anon, authenticated;

-- Source URLs are not part of the client submission contract.
revoke insert (source_url) on public.portfolio_items from authenticated;

alter table public.artists enable row level security;
alter table public.portfolio_items enable row level security;
