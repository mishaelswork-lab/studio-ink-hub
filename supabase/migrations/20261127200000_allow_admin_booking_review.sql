grant select on public.bookings to authenticated;
drop policy if exists bookings_admin_select on public.bookings;
create policy bookings_admin_select on public.bookings for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role='admin'));
