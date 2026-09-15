
CREATE OR REPLACE FUNCTION public.enforce_reel_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'pending';
  ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    NEW.moderation_status := OLD.moderation_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reel_moderation ON public.reels;
CREATE TRIGGER trg_enforce_reel_moderation
BEFORE INSERT OR UPDATE ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.enforce_reel_moderation();

CREATE OR REPLACE FUNCTION public.enforce_certification_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
  ELSE
    NEW.verified := OLD.verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_certification_verified ON public.artist_certifications;
CREATE TRIGGER trg_enforce_certification_verified
BEFORE INSERT OR UPDATE ON public.artist_certifications
FOR EACH ROW EXECUTE FUNCTION public.enforce_certification_verified();
