CREATE OR REPLACE FUNCTION public.recheck_artist_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE photo_count integer;
BEGIN
  SELECT count(DISTINCT image) INTO photo_count FROM unnest(NEW.portfolio_images) image WHERE image ~ '^https://';
  IF COALESCE(array_length(NEW.portfolio_images,1),0)>24 THEN RAISE EXCEPTION 'A portfolio can hold at most 24 photos'; END IF;
  IF NEW.rejection_reason IS NOT NULL AND length(NEW.rejection_reason)>1500 THEN RAISE EXCEPTION 'Rejection reason must be 1500 characters or fewer'; END IF;
  IF TG_OP='INSERT' THEN
    NEW.application_status:='pending'; NEW.available:=false; NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.rejection_reason:=NULL; NEW.submitted_at:=now();
  ELSE
    IF NOT public.has_role(auth.uid(),'admin') AND OLD.application_status='approved' AND
      (NEW.portfolio_images IS DISTINCT FROM OLD.portfolio_images OR NEW.bio IS DISTINCT FROM OLD.bio OR NEW.name IS DISTINCT FROM OLD.name OR NEW.specialty IS DISTINCT FROM OLD.specialty OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN
      NEW.application_status:='pending'; NEW.available:=false; NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.rejection_reason:=NULL; NEW.submitted_at:=now();
    ELSIF public.has_role(auth.uid(),'admin') AND NEW.application_status=OLD.application_status AND NEW.rejection_reason IS NOT DISTINCT FROM OLD.rejection_reason THEN
      NEW.reviewed_by:=OLD.reviewed_by; NEW.reviewed_at:=OLD.reviewed_at;
    END IF;
  END IF;
  IF NEW.application_status<>'approved' OR photo_count<2 THEN NEW.available:=false; END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.recheck_artist_publication() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER z_recheck_artist_publication BEFORE INSERT OR UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION public.recheck_artist_publication();
