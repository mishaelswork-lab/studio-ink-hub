-- Secure admin moderation/audit RPCs and narrowly scoped operational reads.
alter table public.reels add column if not exists moderation_reason text;
create or replace function public.admin_write_audit(p_action text,p_target_type text,p_target_id uuid,p_reason text default null,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_admin uuid:=auth.uid(); v_id uuid;
begin
 if v_admin is null or not public.has_role(v_admin,'admin') then raise exception 'Admin access required' using errcode='42501'; end if;
 if length(trim(coalesce(p_action,''))) not between 3 and 80 or length(trim(coalesce(p_target_type,''))) not between 2 and 40 then raise exception 'Invalid audit event' using errcode='22023'; end if;
 insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason,metadata)
 values(v_admin,trim(p_action),trim(p_target_type),p_target_id,nullif(trim(p_reason),''),coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.admin_write_audit(text,text,uuid,text,jsonb) from public,anon;
grant execute on function public.admin_write_audit(text,text,uuid,text,jsonb) to authenticated;
create or replace function public.admin_review_reel(p_reel_id uuid,p_decision text,p_reason text default null)
returns table(reel_id uuid,moderation_status text) language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_admin uuid:=auth.uid(); v_reel public.reels%rowtype;
begin
 if v_admin is null or not public.has_role(v_admin,'admin') then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_decision not in ('approve','reject') then raise exception 'Invalid moderation decision' using errcode='22023'; end if;
 select * into v_reel from public.reels where id=p_reel_id for update;
 if not found then raise exception 'Reel not found' using errcode='P0002'; end if;
 if v_reel.moderation_status not in ('pending','flagged') then raise exception 'Reel is not awaiting moderation' using errcode='P0001'; end if;
 if p_decision='reject' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'A rejection reason is required' using errcode='22023'; end if;
 update public.reels set moderation_status=case when p_decision='approve' then 'approved' else 'rejected' end,
 moderation_reason=case when p_decision='approve' then null else trim(p_reason) end,updated_at=now() where id=p_reel_id;
 insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason,metadata)
 values(v_admin,'reel_'||case when p_decision='approve' then 'approved' else 'rejected' end,'reel',p_reel_id,nullif(trim(p_reason),''),jsonb_build_object('previous_status',v_reel.moderation_status));
 return query select p_reel_id,case when p_decision='approve' then 'approved'::text else 'rejected'::text end;
end; $$;
revoke all on function public.admin_review_reel(uuid,text,text) from public,anon;
grant execute on function public.admin_review_reel(uuid,text,text) to authenticated;
revoke all on public.payments from anon,authenticated;
grant select (id,booking_id,provider,provider_order_id,provider_payment_id,amount_minor,currency,status,created_at,customer_id,artist_id,payment_type) on public.payments to authenticated;
drop policy if exists payments_participant_read on public.payments;
create policy payments_participant_read on public.payments for select to authenticated using(customer_id=auth.uid() or exists(select 1 from public.artists a where a.id=payments.artist_id and a.user_id=auth.uid()));
drop policy if exists payments_admin_read on public.payments;
create policy payments_admin_read on public.payments for select to authenticated using(exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));
revoke all on public.featured_artists from anon,authenticated;
grant select (id,artist_id,active,priority,expires_at,created_at) on public.featured_artists to anon,authenticated;
drop policy if exists featured_artists_public_active_read on public.featured_artists;
create policy featured_artists_public_active_read on public.featured_artists for select to anon,authenticated using(active is true and expires_at>now() and exists(select 1 from public.artists a where a.id=featured_artists.artist_id and a.status='active'));
drop policy if exists featured_artists_admin_read on public.featured_artists;
create policy featured_artists_admin_read on public.featured_artists for select to authenticated using(exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));
