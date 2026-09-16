
CREATE OR REPLACE FUNCTION public.enforce_artist_profile_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  img_count int;
  recent int;
BEGIN
  img_count := COALESCE(array_length(NEW.portfolio_images, 1), 0);

  IF img_count > 24 THEN
    RAISE EXCEPTION 'A portfolio can hold at most 24 photos';
  END IF;

  IF NEW.hourly_rate < 100 OR NEW.hourly_rate > 50000 THEN
    RAISE EXCEPTION 'Hourly rate must be between 100 and 50000';
  END IF;

  IF NEW.bio IS NOT NULL AND length(NEW.bio) > 1500 THEN
    RAISE EXCEPTION 'Bio must be 1500 characters or fewer';
  END IF;

  IF NEW.experience_years IS NOT NULL AND (NEW.experience_years < 0 OR NEW.experience_years > 70) THEN
    RAISE EXCEPTION 'Experience years must be between 0 and 70';
  END IF;

  -- Public listing requires at least 2 portfolio photos.
  IF img_count < 2 THEN
    NEW.available := false;
  END IF;

  -- Anti-spam: cap profile write frequency (admins exempt).
  IF TG_OP = 'UPDATE' AND NOT public.has_role(auth.uid(), 'admin') THEN
    SELECT count(*) INTO recent
    FROM public.change_audit_log
    WHERE table_name = 'artists'
      AND record_id = NEW.id
      AND created_at > now() - interval '1 hour';
    IF recent > 40 THEN
      RAISE EXCEPTION 'Too many profile updates. Please try again later.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_artist_profile_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_artist_profile_rules ON public.artists;
CREATE TRIGGER trg_enforce_artist_profile_rules
BEFORE INSERT OR UPDATE ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.enforce_artist_profile_rules();
