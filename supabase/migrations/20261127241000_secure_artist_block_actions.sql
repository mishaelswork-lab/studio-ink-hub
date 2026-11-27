-- Let customers block/unblock an artist without exposing the artist's auth user ID.
CREATE OR REPLACE FUNCTION public.is_artist_blocked(p_artist_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_artist_user_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;
  SELECT a.user_id INTO v_artist_user_id FROM public.artists a WHERE a.id = p_artist_id;
  IF NOT FOUND OR v_artist_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE ub.blocker_id = v_user_id AND ub.blocked_id = v_artist_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_artist_block(p_artist_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_artist_user_id uuid;
  v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;
  SELECT a.user_id INTO v_artist_user_id
  FROM public.artists a
  WHERE a.id = p_artist_id
  FOR UPDATE;
  IF NOT FOUND OR v_artist_user_id IS NULL THEN
    RAISE EXCEPTION 'Artist not found' USING errcode = 'P0002';
  END IF;
  IF v_artist_user_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot block your own artist profile' USING errcode = '42501';
  END IF;

  SELECT ub.id INTO v_existing_id
  FROM public.user_blocks ub
  WHERE ub.blocker_id = v_user_id AND ub.blocked_id = v_artist_user_id;
  IF FOUND THEN
    DELETE FROM public.user_blocks WHERE id = v_existing_id;
    RETURN false;
  END IF;

  INSERT INTO public.user_blocks(blocker_id, blocked_id)
  VALUES (v_user_id, v_artist_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_artist_blocked(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_artist_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_artist_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_artist_block(uuid) TO authenticated;

-- Rollback: revoke authenticated execution and drop both RPCs.
