-- Payment hardening: amounts and entitlements are computed server-side only.
-- Clients may no longer write memberships, referrals-used state, or payment rows.
drop policy if exists "Users can create own membership" on public.memberships;
drop policy if exists "System can update referrals" on public.referrals;
drop policy if exists "System can create payments" on public.payments;

-- chat_count is derived server-side; browser writes to it are rejected.
create or replace function public.enforce_profile_chat_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if current_setting('app.derived_chat_count', true) = 'on' then
    return new;
  end if;
  if new.chat_count is distinct from old.chat_count then
    raise exception 'chat_count is managed by the system';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_chat_count_trigger on public.profiles;
create trigger enforce_profile_chat_count_trigger
before update on public.profiles
for each row execute function public.enforce_profile_chat_count();

-- Free consultations are counted server-side from real consultations,
-- so clearing browser data or rewriting the counter cannot grant extra chats.
create or replace function public.enforce_free_chat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_member boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.customer_id is null or new.customer_id <> auth.uid() then
    return new;
  end if;
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and status = 'active'
      and expires_at > now()
  ) into v_member;
  if not v_member then
    select count(*) into v_count
    from public.consultations
    where customer_id = new.customer_id;
    if v_count >= 3 then
      raise exception 'Free consultation limit reached. Upgrade to Premium for unlimited chats.';
    end if;
  end if;
  perform set_config('app.derived_chat_count', 'on', true);
  update public.profiles
  set chat_count = least(3, coalesce(v_count, 0) + 1)
  where user_id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists enforce_free_chat_limit_trigger on public.consultations;
create trigger enforce_free_chat_limit_trigger
before insert on public.consultations
for each row execute function public.enforce_free_chat_limit();
