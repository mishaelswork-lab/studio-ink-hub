drop policy if exists portfolio_owner_insert_pending on public.portfolio_items;
create policy portfolio_owner_insert_pending on public.portfolio_items
for insert to authenticated
with check (
  approved is false and exists (
    select 1 from public.artists a
    where a.id = portfolio_items.artist_id and a.user_id = auth.uid()
  )
);
drop policy if exists portfolio_owner_delete on public.portfolio_items;
create policy portfolio_owner_delete on public.portfolio_items
for delete to authenticated
using (
  exists (
    select 1 from public.artists a
    where a.id = portfolio_items.artist_id and a.user_id = auth.uid()
  )
);
grant insert (artist_id,media_url,media_type,caption,source_url) on public.portfolio_items to authenticated;
grant delete on public.portfolio_items to authenticated;