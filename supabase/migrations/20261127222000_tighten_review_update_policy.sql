drop policy if exists reviews_customer_update_pending on public.reviews;
create policy reviews_customer_update_pending on public.reviews for update to authenticated
using (
  customer_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.customer_id = (select auth.uid())
      and b.artist_id = reviews.artist_id
      and b.status = 'completed'
  )
)
with check (
  customer_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.customer_id = (select auth.uid())
      and b.artist_id = reviews.artist_id
      and b.status = 'completed'
  )
);
