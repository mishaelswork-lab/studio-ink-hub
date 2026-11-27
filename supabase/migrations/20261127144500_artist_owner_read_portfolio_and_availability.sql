drop policy if exists portfolio_owner_read on public.portfolio_items;
create policy portfolio_owner_read on public.portfolio_items for select to authenticated
using (exists(select 1 from public.artists a where a.id=portfolio_items.artist_id and a.user_id=auth.uid()));
grant select on public.portfolio_items to authenticated;

drop policy if exists artist_availability_owner_read on public.artist_availability;
create policy artist_availability_owner_read on public.artist_availability for select to authenticated
using (exists(select 1 from public.artists a where a.id=artist_availability.artist_id and a.user_id=auth.uid()));
grant select on public.artist_availability to authenticated;