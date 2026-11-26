create or replace function public.finalize_razorpay_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_signature text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_days integer;
  v_days_text text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found'; end if;
  if v_payment.status = 'captured' then
    if v_payment.provider_payment_id = p_provider_payment_id then
      return jsonb_build_object('success', true, 'already_processed', true);
    end if;
    raise exception 'payment already finalized';
  end if;
  if v_payment.status not in ('created','pending') then raise exception 'payment is not payable'; end if;
  if v_payment.provider <> 'razorpay' or v_payment.provider_order_id is null
     or p_provider_payment_id is null or length(p_provider_payment_id) = 0
     or p_provider_signature is null or length(p_provider_signature) = 0
     or v_payment.customer_id is null or v_payment.amount_minor <= 0
     or v_payment.currency <> 'INR' then
    raise exception 'invalid payment attribution';
  end if;
  if v_payment.payment_type = 'cover_charge' then
    if v_payment.booking_id is null then raise exception 'booking attribution missing'; end if;
  elsif v_payment.payment_type = 'membership' then
    null;
  elsif v_payment.payment_type = 'featured_boost' then
    if v_payment.artist_id is null then raise exception 'artist attribution missing'; end if;
    v_days_text := v_payment.metadata->>'boost_days';
    v_days := case when v_days_text ~ '^[0-9]{1,3}$'
      then greatest(1, least(365, v_days_text::integer)) else 30 end;
  else
    raise exception 'unsupported payment type';
  end if;

  update public.payments set status = 'captured',
    provider_payment_id = p_provider_payment_id,
    provider_signature = p_provider_signature
  where id = p_payment_id;

  if v_payment.payment_type = 'cover_charge' then
    -- A paid hold becomes a durable pending request. It must continue blocking
    -- the slot after the temporary checkout hold expires.
    update public.bookings set cover_charge_paid = true,
      status = 'pending', hold_expires_at = null
    where id = v_payment.booking_id and customer_id = v_payment.customer_id
      and status in ('held','awaiting_payment') and cover_charge_paid is false;
    if not found then raise exception 'booking attribution mismatch, expired or already paid'; end if;
  elsif v_payment.payment_type = 'membership' then
    insert into public.memberships(user_id, plan, amount, currency, status, started_at, expires_at)
    values (v_payment.customer_id, 'premium', v_payment.amount_minor / 100.0,
      v_payment.currency, 'active', now(), null);
  elsif v_payment.payment_type = 'featured_boost' then
    insert into public.featured_artists(artist_id, active, priority, expires_at)
    values (v_payment.artist_id, true, 1, now() + make_interval(days => v_days))
    on conflict (artist_id) do update set
      active = true, expires_at = greatest(now(), featured_artists.expires_at) + make_interval(days => v_days);
  end if;
  return jsonb_build_object('success', true, 'already_processed', false);
end;
$$;
revoke all on function public.finalize_razorpay_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.finalize_razorpay_payment(uuid,text,text) to service_role;

create or replace function public.artist_confirm_booking(p_booking_id uuid)
returns table (booking_id uuid, booking_status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.artists a
    where a.id = v_booking.artist_id and a.user_id = v_user_id and a.status = 'active'
  ) then raise exception 'Only the owning active artist can confirm this booking' using errcode = '42501'; end if;
  if v_booking.status <> 'pending' or v_booking.cover_charge_paid is not true then
    raise exception 'Booking is not ready for artist confirmation' using errcode = 'P0001';
  end if;
  update public.bookings set status = 'confirmed'
  where id = p_booking_id and status = 'pending' and cover_charge_paid is true;
  if not found then raise exception 'Booking state changed; refresh and retry' using errcode = '40001'; end if;
  return query select p_booking_id, 'confirmed'::text;
end;
$$;
revoke all on function public.artist_confirm_booking(uuid) from public, anon;
grant execute on function public.artist_confirm_booking(uuid) to authenticated;