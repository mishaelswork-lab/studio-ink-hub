-- Server-authoritative booking holds. Additive: does not alter existing booking rows.
create or replace function public.create_booking_hold(
  p_artist_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_service_type text,
  p_brief text,
  p_placement text,
  p_size_description text,
  p_idempotency_key text
)
returns table (
  booking_id uuid,
  design_request_id uuid,
  booking_status text,
  hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_artist public.artists%rowtype;
  v_existing public.bookings%rowtype;
  v_design_request_id uuid;
  v_booking_id uuid;
  v_hold_expires_at timestamptz := now() + interval '15 minutes';
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_has_hours boolean;
  v_has_exception boolean;
begin
  if v_customer_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_artist_id is null or p_starts_at is null or p_ends_at is null then
    raise exception 'Artist and appointment times are required' using errcode = '22023';
  end if;
  if p_starts_at <= now() + interval '2 minutes'
     or p_ends_at <= p_starts_at
     or p_ends_at > p_starts_at + interval '8 hours' then
    raise exception 'Appointment time or duration is invalid' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_service_type)), 0) not between 1 and 40
     or coalesce(length(trim(p_brief)), 0) not between 10 and 4000
     or coalesce(length(trim(p_placement)), 0) > 120
     or coalesce(length(trim(p_size_description)), 0) > 80 then
    raise exception 'Booking details are invalid' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_idempotency_key)), 0) not between 16 and 100 then
    raise exception 'A valid idempotency key is required' using errcode = '22023';
  end if;

  -- Serialize booking creation per artist so concurrent requests cannot both
  -- pass the overlap check. Browser clients cannot write bookings directly.
  select * into v_artist
  from public.artists a
  where a.id = p_artist_id and a.status = 'active'
  for update;
  if not found then
    raise exception 'Artist is not currently bookable' using errcode = 'P0002';
  end if;

  select * into v_existing
  from public.bookings b
  where b.idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing.customer_id = v_customer_id
       and v_existing.artist_id = p_artist_id
       and v_existing.starts_at = p_starts_at
       and v_existing.ends_at = p_ends_at then
      return query
      select v_existing.id, v_existing.design_request_id, v_existing.status, v_existing.hold_expires_at;
      return;
    end if;
    raise exception 'Idempotency key has already been used' using errcode = '23505';
  end if;

  -- Use the artist's configured timezone for weekly hours.
  select coalesce(av.timezone, 'Asia/Kolkata')
    into v_timezone
  from public.artist_availability av
  where av.artist_id = p_artist_id and av.is_active is true
  order by av.timezone
  limit 1;
  v_timezone := coalesce(v_timezone, 'Asia/Kolkata');
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := p_ends_at at time zone v_timezone;

  if v_local_start::date <> v_local_end::date then
    raise exception 'Appointments must fit within one local calendar day' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.artist_availability av
    where av.artist_id = p_artist_id
      and av.is_active is true
      and av.weekday = extract(dow from v_local_start)::integer
      and av.start_time <= v_local_start::time
      and av.end_time >= v_local_end::time
      and coalesce(av.timezone, 'Asia/Kolkata') = v_timezone
  ) into v_has_hours;

  select exists (
    select 1 from public.availability_exceptions ex
    where ex.artist_id = p_artist_id
      and ex.is_available is true
      and ex.starts_at <= p_starts_at
      and ex.ends_at >= p_ends_at
  ) into v_has_exception;

  if not (v_has_hours or v_has_exception) then
    raise exception 'The requested time is outside the artist availability' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.availability_exceptions ex
    where ex.artist_id = p_artist_id
      and ex.is_available is false
      and tstzrange(ex.starts_at, ex.ends_at, '[)') &&
          tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'The artist is unavailable at the requested time' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.artist_id = p_artist_id
      and (
        b.status in ('pending', 'confirmed')
        or (b.status in ('held', 'awaiting_payment') and b.hold_expires_at > now())
      )
      and tstzrange(b.starts_at, b.ends_at, '[)') &&
          tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'The requested time is already booked or held' using errcode = '23P01';
  end if;

  insert into public.design_requests (
    customer_id, artist_id, brief, placement, size_description, status
  ) values (
    v_customer_id, p_artist_id,
    '[' || trim(p_service_type) || '] ' || trim(p_brief),
    nullif(trim(p_placement), ''),
    nullif(trim(p_size_description), ''),
    'submitted'
  ) returning id into v_design_request_id;

  insert into public.bookings (
    customer_id, artist_id, design_request_id, starts_at, ends_at,
    amount_minor, currency, status, hold_expires_at, idempotency_key
  ) values (
    v_customer_id, p_artist_id, v_design_request_id, p_starts_at, p_ends_at,
    null, 'INR', 'held', v_hold_expires_at, trim(p_idempotency_key)
  ) returning id into v_booking_id;

  return query select v_booking_id, v_design_request_id, 'held'::text, v_hold_expires_at;
end;
$$;

revoke all on function public.create_booking_hold(uuid,timestamptz,timestamptz,text,text,text,text,text) from public, anon;
grant execute on function public.create_booking_hold(uuid,timestamptz,timestamptz,text,text,text,text,text) to authenticated;
