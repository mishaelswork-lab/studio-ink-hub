create or replace function public.artist_update_own_profile(
  p_name text,p_studio_name text,p_specialty text,p_bio text,
  p_hourly_rate integer,p_experience_years integer,p_avatar_url text default null
) returns public.artists
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_user_id uuid:=auth.uid();
  v_artist public.artists%rowtype;
  v_avatar_is_private_path boolean:=false;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_artist from public.artists where user_id=v_user_id for update;
  if not found then raise exception 'Artist profile not found' using errcode='P0002'; end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 80
    or length(coalesce(p_studio_name,''))>80 or length(coalesce(p_specialty,''))>60
    or length(coalesce(p_bio,''))>1500 or p_hourly_rate not between 100 and 50000
    or p_experience_years not between 0 and 70 then
    raise exception 'Invalid artist profile details' using errcode='22023';
  end if;
  if p_avatar_url is not null then
    v_avatar_is_private_path := p_avatar_url ~ ('^'||v_user_id::text||'/'||v_artist.id::text||'/[A-Za-z0-9-]{1,80}[.](jpg|png|webp)$');
    if length(p_avatar_url)>2048 or (not v_avatar_is_private_path and p_avatar_url !~ '^https://[^[:space:]]{1,2000}$') then
      raise exception 'Invalid avatar reference' using errcode='22023';
    end if;
    if v_avatar_is_private_path and not exists(select 1 from storage.objects o where o.bucket_id='portfolio-private' and o.name=p_avatar_url) then
      raise exception 'Private avatar object not found' using errcode='22023';
    end if;
  end if;
  update public.artists set
    name=trim(p_name),studio_name=nullif(trim(coalesce(p_studio_name,'')),''),
    specialty=nullif(trim(coalesce(p_specialty,'')),''),bio=nullif(trim(coalesce(p_bio,'')),''),
    hourly_rate=p_hourly_rate,experience_years=p_experience_years,
    avatar_url=coalesce(p_avatar_url,v_artist.avatar_url),
    slug=coalesce(nullif(v_artist.slug,''),lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g'))||'-'||left(v_artist.id::text,8))
  where id=v_artist.id returning * into v_artist;
  return v_artist;
end; $$;
revoke all on function public.artist_update_own_profile(text,text,text,text,integer,integer,text) from public,anon;
grant execute on function public.artist_update_own_profile(text,text,text,text,integer,integer,text) to authenticated;
