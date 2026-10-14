CREATE OR REPLACE FUNCTION public.enforce_artist_profile_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  img_count int;
  recent int;
  caller_is_admin boolean;
BEGIN
  SELECT count(DISTINCT image) INTO img_count FROM unnest(NEW.portfolio_images) AS image WHERE image IS NOT NULL AND image ~ '^https://';
  caller_is_admin := public.has_role(auth.uid(), 'admin');

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

  IF TG_OP = 'INSERT' AND NOT caller_is_admin THEN
    NEW.application_status := 'pending';
    NEW.rejection_reason := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.submitted_at := now();
  ELSIF TG_OP = 'UPDATE' AND NOT caller_is_admin THEN
    IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
      IF NOT (OLD.application_status = 'rejected' AND NEW.application_status = 'pending' AND img_count >= 2) THEN
        RAISE EXCEPTION 'Only admins can change artist approval status';
      END IF;
      NEW.rejection_reason := NULL;
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.submitted_at := now();
    END IF;
    IF NOT (OLD.application_status = 'rejected' AND NEW.application_status = 'pending') AND (NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
      RAISE EXCEPTION 'Only admins can change artist review details';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Artist ownership cannot be changed';
    END IF;
    IF OLD.application_status <> 'rejected' OR NEW.application_status <> 'pending' THEN
      NEW.submitted_at := OLD.submitted_at;
    END IF;
  END IF;

  IF caller_is_admin AND NEW.application_status = 'approved' THEN
    IF img_count < 2 THEN
      RAISE EXCEPTION 'At least 2 portfolio photos are required for approval';
    END IF;
    NEW.rejection_reason := NULL;
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  ELSIF caller_is_admin AND NEW.application_status = 'rejected' THEN
    IF NEW.rejection_reason IS NULL OR length(trim(NEW.rejection_reason)) < 3 THEN
      RAISE EXCEPTION 'A rejection reason is required';
    END IF;
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
    NEW.available := false;
  END IF;

  IF img_count < 2 OR NEW.application_status <> 'approved' THEN
    NEW.available := false;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT caller_is_admin THEN
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


CREATE OR REPLACE FUNCTION public.audit_artist_application_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.application_status IS DISTINCT FROM NEW.application_status
     AND NEW.application_status IN ('approved', 'rejected')
     AND public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, reason, metadata)
    VALUES (auth.uid(), 'artist_application_' || NEW.application_status, 'artist', NEW.id,
      NEW.rejection_reason, jsonb_build_object('photo_count', COALESCE(array_length(NEW.portfolio_images, 1), 0)));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.audit_artist_application_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS audit_artist_application_review ON public.artists;
CREATE TRIGGER audit_artist_application_review AFTER UPDATE ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.audit_artist_application_review();
