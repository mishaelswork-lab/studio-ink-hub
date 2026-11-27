revoke select (user_id) on public.artists from anon;
grant select (user_id) on public.artists to authenticated;