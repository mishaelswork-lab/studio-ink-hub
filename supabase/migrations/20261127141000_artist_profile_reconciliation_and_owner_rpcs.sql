alter table public.artists
  add column if not exists name text,
  add column if not exists specialty text,
  add column if not exists hourly_rate integer not null default 1500,
  add column if not exists experience_years integer not null default 0,
  add column if not exists avatar_url text,
  add column if not exists available boolean not null default false;
alter table public.artists
  add constraint artists_hourly_rate_range check (hourly_rate between 100 and 50000),
  add constraint artists_experience_years_range check (experience_years between 0 and 70);
create or replace function public.artist_update_own_profile(p_name text,p_studio_name text,p_specialty text,p_bio text,p_hourly_rate integer,p_experience_years integer,p_avatar_url text default null)
returns public.artists language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_user_id uuid := auth.uid(); v_artist public.artists%rowtype;
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if length(trim(coalesce(p_name,''))) not between 2 and 80 or length(coalesce(p_studio_name,''))>80 or length(coalesce(p_specialty,''))>60 or length(coalesce(p_bio,''))>1500 or p_hourly_rate not between 100 and 50000 or p_experience_years not between 0 and 70 or (p_avatar_url is not null and (length(p_avatar_url)>2048 or p_avatar_url !~ '^https://')) then raise exception 'Invalid artist profile details' using errcode='22023'; end if;
 update public.artists a set name=trim(p_name),studio_name=nullif(trim(coalesce(p_studio_name,'')),''),specialty=nullif(trim(coalesce(p_specialty,'')),''),bio=nullif(trim(coalesce(p_bio,'')),''),hourly_rate=p_hourly_rate,experience_years=p_experience_years,avatar_url=coalesce(p_avatar_url,a.avatar_url),slug=coalesce(nullif(a.slug,''),lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g'))||'-'||left(a.id::text,8)) where a.user_id=v_user_id returning * into v_artist;
 if not found then raise exception 'Artist profile not found' using errcode='P0002'; end if; return v_artist;
end; $$;
create or replace function public.artist_set_availability(p_available boolean) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user_id uuid:=auth.uid(); v_artist_id uuid; v_status text; v_approved_count integer;
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id,status into v_artist_id,v_status from public.artists where user_id=v_user_id for update;
 if not found then raise exception 'Artist profile not found' using errcode='P0002'; end if;
 select count(*) into v_approved_count from public.portfolio_items where artist_id=v_artist_id and approved is true;
 if p_available and (v_status<>'active' or v_approved_count<2) then raise exception 'Only approved artists with at least two approved portfolio items can become available' using errcode='42501'; end if;
 update public.artists set available=coalesce(p_available,false) where id=v_artist_id; return coalesce(p_available,false);
end; $$;
revoke all on function public.artist_update_own_profile(text,text,text,text,integer,integer,text) from public,anon;
grant execute on function public.artist_update_own_profile(text,text,text,text,integer,integer,text) to authenticated;
revoke all on function public.artist_set_availability(boolean) from public,anon;
grant execute on function public.artist_set_availability(boolean) to authenticated;
drop policy if exists artists_owner_read on public.artists;
create policy artists_owner_read on public.artists for select to authenticated using (user_id=auth.uid());
grant select (id,user_id,slug,bio,styles,studio_name,city,country,currency,status,verified_at,created_at,name,specialty,hourly_rate,experience_years,avatar_url,available) on public.artists to anon,authenticated;