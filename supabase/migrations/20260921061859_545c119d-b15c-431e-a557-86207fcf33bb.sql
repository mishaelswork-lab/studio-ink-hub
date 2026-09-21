ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS application_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.artists
  ADD CONSTRAINT artists_application_status_valid
  CHECK (application_status IN ('pending', 'approved', 'rejected'));

UPDATE public.artists
SET application_status = 'approved', reviewed_at = COALESCE(reviewed_at, now())
WHERE available = true AND COALESCE(array_length(portfolio_images, 1), 0) >= 2;

DROP POLICY IF EXISTS "Artists are viewable by everyone" ON public.artists;
CREATE POLICY "Approved artists are publicly viewable"
ON public.artists FOR SELECT
USING (
  application_status = 'approved'
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update artist applications"
ON public.artists FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
  img_count := COALESCE(array_length(NEW.portfolio_images, 1), 0);
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
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Only admins can change artist review details';
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

UPDATE public.artists
SET available = false
WHERE application_status <> 'approved' OR COALESCE(array_length(portfolio_images, 1), 0) < 2;