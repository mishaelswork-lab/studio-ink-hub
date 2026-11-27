alter table public.artists add column if not exists rejection_reason text;
create or replace function public.admin_review_artist(p_artist_id uuid,p_decision text,p_reason text default null)
returns public.artists language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_admin uuid:=auth.uid(); v_artist public.artists%rowtype; v_photo_count integer;
begin
 if v_admin is null or not public.has_role(v_admin,'admin') then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_decision not in ('approve','reject') then raise exception 'Invalid review decision' using errcode='22023'; end if;
 select * into v_artist from public.artists where id=p_artist_id for update;
 if not found then raise exception 'Artist not found' using errcode='P0002'; end if;
 if v_artist.status not in ('pending','suspended') then raise exception 'Artist application is not awaiting review' using errcode='P0001'; end if;
 select count(*) into v_photo_count from public.portfolio_items where artist_id=p_artist_id;
 if p_decision='approve' then
   if v_photo_count<2 then raise exception 'At least two portfolio items are required' using errcode='22023'; end if;
   update public.portfolio_items set approved=true where artist_id=p_artist_id;
   update public.artists set status='active',rejection_reason=null,available=false,verified_at=now() where id=p_artist_id returning * into v_artist;
 else
   if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A rejection reason is required' using errcode='22023'; end if;
   update public.artists set status='suspended',rejection_reason=trim(p_reason),available=false where id=p_artist_id returning * into v_artist;
 end if;
 insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason,metadata)
 values(v_admin,'artist_application_'||p_decision,'artist',p_artist_id,case when p_decision='reject' then trim(p_reason) else null end,jsonb_build_object('portfolio_item_count',v_photo_count));
 return v_artist;
end; $$;
create or replace function public.artist_resubmit_application()
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid(); v_artist_id uuid; v_status text; v_count integer;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id,status into v_artist_id,v_status from public.artists where user_id=v_user for update;
 if not found then raise exception 'Artist profile not found' using errcode='P0002'; end if;
 if v_status<>'suspended' then raise exception 'Only a returned application can be resubmitted' using errcode='P0001'; end if;
 select count(*) into v_count from public.portfolio_items where artist_id=v_artist_id;
 if v_count<2 then raise exception 'At least two portfolio items are required' using errcode='22023'; end if;
 update public.artists set status='pending',rejection_reason=null,available=false where id=v_artist_id;
 return true;
end; $$;
revoke all on function public.admin_review_artist(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_review_artist(uuid,text,text) to authenticated;
revoke all on function public.artist_resubmit_application() from public,anon;
grant execute on function public.artist_resubmit_application() to authenticated;