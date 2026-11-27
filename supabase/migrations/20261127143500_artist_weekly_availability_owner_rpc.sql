create or replace function public.artist_replace_weekly_availability(p_schedule jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user_id uuid:=auth.uid(); v_artist_id uuid; v_count integer:=0; v_day text; v_dow integer; v_item jsonb; v_start time; v_end time;
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into v_artist_id from public.artists where user_id=v_user_id for update;
 if not found then raise exception 'Artist profile not found' using errcode='P0002'; end if;
 if jsonb_typeof(p_schedule)<>'object' then raise exception 'Invalid schedule' using errcode='22023'; end if;
 delete from public.artist_availability where artist_id=v_artist_id;
 for v_day,v_item in select key,value from jsonb_each(p_schedule) loop
   v_dow:=case lower(v_day) when 'sunday' then 0 when 'monday' then 1 when 'tuesday' then 2 when 'wednesday' then 3 when 'thursday' then 4 when 'friday' then 5 when 'saturday' then 6 else null end;
   if v_dow is null then raise exception 'Invalid weekday' using errcode='22023'; end if;
   if coalesce((v_item->>'off')::boolean,false) then continue; end if;
   if coalesce(v_item->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(v_item->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid availability time' using errcode='22023'; end if;
   v_start:=(v_item->>'start')::time; v_end:=(v_item->>'end')::time;
   if v_end<=v_start then raise exception 'End time must be after start time' using errcode='22023'; end if;
   insert into public.artist_availability(artist_id,weekday,start_time,end_time,timezone,is_active)
   values(v_artist_id,v_dow,v_start,v_end,'Asia/Kolkata',true);
   v_count:=v_count+1;
 end loop;
 return v_count;
end; $$;
revoke all on function public.artist_replace_weekly_availability(jsonb) from public,anon;
grant execute on function public.artist_replace_weekly_availability(jsonb) to authenticated;