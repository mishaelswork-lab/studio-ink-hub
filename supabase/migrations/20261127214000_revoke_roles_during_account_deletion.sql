-- Once deletion is approved, immediately remove all app roles.
-- This prevents a partially completed storage cleanup from leaving a privileged account.
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

  perform 1 from public.profiles p where p.id = p_user_id for update;

  select exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'admin')
  into v_is_admin;
  if v_is_admin then
    select count(*) into v_admin_count from public.user_roles ur where ur.role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'LAST_ADMIN_ACCOUNT: transfer admin access before deleting this account' using errcode = '23514';
    end if;
  end if;

  select a.id into v_artist_id from public.artists a where a.user_id = p_user_id for update;

  if exists (select 1 from public.bookings b where b.customer_id = p_user_id
    and b.status in ('pending', 'held', 'awaiting_payment', 'confirmed')) then
    raise exception 'OPEN_CUSTOMER_BOOKINGS: cancel or complete active bookings before deleting this account' using errcode = '23514';
  end if;
  if v_artist_id is not null and exists (select 1 from public.bookings b where b.artist_id = v_artist_id
    and b.status in ('pending', 'held', 'awaiting_payment', 'confirmed')) then
    raise exception 'OPEN_ARTIST_BOOKINGS: settle or cancel active client bookings before deleting this account' using errcode = '23514';
  end if;

  update public.profiles
  set deletion_pending_at = coalesce(deletion_pending_at, now()),
      display_name = 'Deleted account', avatar_url = null, city = null, country = null,
      chat_count = 0, updated_at = now()
  where id = p_user_id;

  delete from public.messages m using public.conversations c
  where m.conversation_id = c.id
    and (c.customer_id = p_user_id or (v_artist_id is not null and c.artist_id = v_artist_id));
  delete from public.conversations c
  where c.customer_id = p_user_id or (v_artist_id is not null and c.artist_id = v_artist_id);

  update public.bookings set customer_id = null, design_request_id = null where customer_id = p_user_id;
  update public.payments set customer_id = null where customer_id = p_user_id;
  delete from public.design_requests where customer_id = p_user_id;
  delete from public.saved_designs where user_id = p_user_id;
  update public.messages set sender_id = null where sender_id = p_user_id;
  update public.admin_audit_log set admin_id = null where admin_id = p_user_id;
  delete from public.user_roles where user_id = p_user_id;

  if v_artist_id is not null then
    delete from public.portfolio_items where artist_id = v_artist_id;
    delete from public.reels where artist_id = v_artist_id;
    delete from public.saved_designs
      where design_id in (select d.id from public.designs d where d.artist_id = v_artist_id);
    update public.design_requests set design_id = null, reel_url = null where artist_id = v_artist_id;
    delete from public.designs where artist_id = v_artist_id;
    delete from public.artist_availability where artist_id = v_artist_id;
    delete from public.availability_exceptions where artist_id = v_artist_id;
    update public.featured_artists set active = false where artist_id = v_artist_id;
    update public.artists
    set user_id = null, slug = 'deleted-' || id::text, name = 'Deleted artist',
        bio = null, styles = '{}'::text[], studio_name = null, city = null, country = null,
        specialty = null, status = 'suspended', verified_at = null, hourly_rate = 1500,
        experience_years = 0, avatar_url = null, available = false, rejection_reason = null
    where id = v_artist_id;
  end if;

  return jsonb_build_object('success', true, 'artist_id', v_artist_id, 'deletion_pending', true);
end;
$function$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
