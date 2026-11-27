-- Additive account-deletion support.
-- Retain financial/audit history while removing personal identity and user media.

alter table public.profiles
  add column if not exists deletion_pending_at timestamptz;

alter table public.bookings alter column customer_id drop not null;
alter table public.conversations alter column customer_id drop not null;
alter table public.design_requests alter column customer_id drop not null;
alter table public.messages alter column sender_id drop not null;
alter table public.artists alter column user_id drop not null;
alter table public.admin_audit_log alter column admin_id drop not null;

alter table public.bookings drop constraint if exists bookings_customer_id_fkey;
alter table public.bookings add constraint bookings_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;

alter table public.conversations drop constraint if exists conversations_customer_id_fkey;
alter table public.conversations add constraint conversations_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;

alter table public.design_requests drop constraint if exists design_requests_customer_id_fkey;
alter table public.design_requests add constraint design_requests_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;

alter table public.artists drop constraint if exists artists_user_id_fkey;
alter table public.artists add constraint artists_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.payments drop constraint if exists payments_customer_id_fkey;
alter table public.payments add constraint payments_customer_id_fkey
  foreign key (customer_id) references auth.users(id) on delete set null;

alter table public.admin_audit_log drop constraint if exists admin_audit_log_admin_id_fkey;
alter table public.admin_audit_log add constraint admin_audit_log_admin_id_fkey
  foreign key (admin_id) references auth.users(id) on delete set null;

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_artist_id uuid;
  v_is_admin boolean;
  v_admin_count integer;
begin
  if p_user_id is null then
    raise exception 'Account identifier is required' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Account profile not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'admin'
  ) into v_is_admin;

  if v_is_admin then
    select count(*) into v_admin_count
    from public.user_roles ur where ur.role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'LAST_ADMIN_ACCOUNT: transfer admin access before deleting this account' using errcode = '23514';
    end if;
  end if;

  select a.id into v_artist_id
  from public.artists a where a.user_id = p_user_id
  for update;

  if exists (
    select 1 from public.bookings b
    where b.customer_id = p_user_id
      and b.status in ('pending', 'held', 'awaiting_payment', 'confirmed')
  ) then
    raise exception 'OPEN_CUSTOMER_BOOKINGS: cancel or complete active bookings before deleting this account' using errcode = '23514';
  end if;

  if v_artist_id is not null and exists (
    select 1 from public.bookings b
    where b.artist_id = v_artist_id
      and b.status in ('pending', 'held', 'awaiting_payment', 'confirmed')
  ) then
    raise exception 'OPEN_ARTIST_BOOKINGS: settle or cancel active client bookings before deleting this account' using errcode = '23514';
  end if;

  -- Prevent new booking holds after deletion has been requested.
  update public.profiles
  set deletion_pending_at = coalesce(deletion_pending_at, now()),
      display_name = 'Deleted account',
      avatar_url = null,
      city = null,
      country = null,
      chat_count = 0,
      updated_at = now()
  where id = p_user_id;

  -- Remove conversations and their messages for either side.
  delete from public.messages m
  using public.conversations c
  where m.conversation_id = c.id
    and (c.customer_id = p_user_id or (v_artist_id is not null and c.artist_id = v_artist_id));

  delete from public.conversations c
  where c.customer_id = p_user_id
     or (v_artist_id is not null and c.artist_id = v_artist_id);

  -- Keep booking/payment records, but detach the deleted customer.
  update public.bookings
  set customer_id = null, design_request_id = null
  where customer_id = p_user_id;

  update public.payments
  set customer_id = null
  where customer_id = p_user_id;

  -- Remove customer-owned requests after preserving any linked booking.
  delete from public.design_requests where customer_id = p_user_id;
  delete from public.saved_designs where user_id = p_user_id;

  -- Remove authored messages that may exist outside the deleted conversations.
  update public.messages set sender_id = null where sender_id = p_user_id;

  -- Keep moderation/audit history without retaining the deleted admin identity.
  update public.admin_audit_log set admin_id = null where admin_id = p_user_id;

  if v_artist_id is not null then
    -- Remove all artist-published media and catalogue content.
    delete from public.portfolio_items where artist_id = v_artist_id;
    delete from public.reels where artist_id = v_artist_id;
    delete from public.saved_designs
      where design_id in (select d.id from public.designs d where d.artist_id = v_artist_id);
    update public.design_requests
      set design_id = null, reel_url = null
      where artist_id = v_artist_id;
    delete from public.designs where artist_id = v_artist_id;
    delete from public.artist_availability where artist_id = v_artist_id;
    delete from public.availability_exceptions where artist_id = v_artist_id;
    update public.featured_artists set active = false where artist_id = v_artist_id;

    -- Retain the artist FK target for historical bookings/payments, but anonymise it.
    update public.artists
    set user_id = null,
        slug = 'deleted-' || id::text,
        name = 'Deleted artist',
        bio = null,
        styles = '{}'::text[],
        studio_name = null,
        city = null,
        country = null,
        specialty = null,
        status = 'suspended',
        verified_at = null,
        hourly_rate = 1500,
        experience_years = 0,
        avatar_url = null,
        available = false,
        rejection_reason = null
    where id = v_artist_id;
  end if;

  return jsonb_build_object('success', true, 'artist_id', v_artist_id, 'deletion_pending', true);
end;
$function$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

-- Prevent a user who has requested deletion from creating new booking holds.
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
returns table(booking_id uuid, design_request_id uuid, booking_status text, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
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
  if v_customer_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles p where p.id = v_customer_id and p.deletion_pending_at is not null) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;
  if p_artist_id is null or p_starts_at is null or p_ends_at is null then
    raise exception 'Artist and appointment times are required' using errcode = '22023';
  end if;
  if p_starts_at <= now() + interval '2 minutes' or p_ends_at <= p_starts_at
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

  select * into v_artist from public.artists a
  where a.id = p_artist_id and a.status = 'active' for update;
  if not found then raise exception 'Artist is not currently bookable' using errcode = 'P0002'; end if;

  select * into v_existing from public.bookings b where b.idempotency_key = trim(p_idempotency_key);
  if found then
    if v_existing.customer_id = v_customer_id and v_existing.artist_id = p_artist_id
       and v_existing.starts_at = p_starts_at and v_existing.ends_at = p_ends_at then
      return query select v_existing.id, v_existing.design_request_id, v_existing.status, v_existing.hold_expires_at;
      return;
    end if;
    raise exception 'Idempotency key has already been used' using errcode = '23505';
  end if;

  select coalesce(av.timezone, 'Asia/Kolkata') into v_timezone
  from public.artist_availability av
  where av.artist_id = p_artist_id and av.is_active is true
  order by av.timezone limit 1;
  v_timezone := coalesce(v_timezone, 'Asia/Kolkata');
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := p_ends_at at time zone v_timezone;
  if v_local_start::date <> v_local_end::date then
    raise exception 'Appointments must fit within one local calendar day' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.artist_availability av
    where av.artist_id = p_artist_id and av.is_active is true
      and av.weekday = extract(dow from v_local_start)::integer
      and av.start_time <= v_local_start::time and av.end_time >= v_local_end::time
      and coalesce(av.timezone, 'Asia/Kolkata') = v_timezone
  ) into v_has_hours;
  select exists (
    select 1 from public.availability_exceptions ex
    where ex.artist_id = p_artist_id and ex.is_available is true
      and ex.starts_at <= p_starts_at and ex.ends_at >= p_ends_at
  ) into v_has_exception;
  if not (v_has_hours or v_has_exception) then
    raise exception 'The requested time is outside the artist availability' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.availability_exceptions ex
    where ex.artist_id = p_artist_id and ex.is_available is false
      and tstzrange(ex.starts_at, ex.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'The artist is unavailable at the requested time' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.bookings b where b.artist_id = p_artist_id
      and (b.status in ('pending', 'confirmed')
        or (b.status in ('held', 'awaiting_payment') and b.hold_expires_at > now()))
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'The requested time is already booked or held' using errcode = '23P01'; end if;

  insert into public.design_requests(customer_id, artist_id, brief, placement, size_description, status)
  values (v_customer_id, p_artist_id, '[' || trim(p_service_type) || '] ' || trim(p_brief),
    nullif(trim(p_placement), ''), nullif(trim(p_size_description), ''), 'submitted')
  returning id into v_design_request_id;
  insert into public.bookings(customer_id, artist_id, design_request_id, starts_at, ends_at,
    amount_minor, currency, status, hold_expires_at, idempotency_key)
  values (v_customer_id, p_artist_id, v_design_request_id, p_starts_at, p_ends_at,
    null, 'INR', 'held', v_hold_expires_at, trim(p_idempotency_key))
  returning id into v_booking_id;
  return query select v_booking_id, v_design_request_id, 'held'::text, v_hold_expires_at;
end;
$function$;

revoke all on function public.create_booking_hold(uuid,timestamptz,timestamptz,text,text,text,text,text) from public, anon;
grant execute on function public.create_booking_hold(uuid,timestamptz,timestamptz,text,text,text,text,text) to authenticated;
