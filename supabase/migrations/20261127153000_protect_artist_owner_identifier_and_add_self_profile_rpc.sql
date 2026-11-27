revoke select (user_id) on public.artists from anon,authenticated;
create or replace function public.get_my_artist_profile()
returns setof public.artists language sql stable security definer set search_path=pg_catalog,public as $$
  select a.* from public.artists a where a.user_id=auth.uid() limit 1
$$;
revoke all on function public.get_my_artist_profile() from public,anon;
grant execute on function public.get_my_artist_profile() to authenticated;