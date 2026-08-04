-- Consent records (DPDP Act 2023)
CREATE TABLE public.consent_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  purpose text NOT NULL,
  granted boolean NOT NULL,
  policy_version text NOT NULL DEFAULT 'v1',
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.consent_records TO authenticated;
GRANT INSERT ON public.consent_records TO anon;
GRANT ALL ON public.consent_records TO service_role;

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record consent"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users read own consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_consent_records_user ON public.consent_records(user_id, created_at DESC);

-- Change audit log for artists & bookings
CREATE TABLE public.change_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL,
  changed_by uuid,
  changed_fields jsonb,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.change_audit_log TO authenticated;
GRANT ALL ON public.change_audit_log TO service_role;

ALTER TABLE public.change_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read change audit log"
  ON public.change_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_change_audit_created ON public.change_audit_log(created_at DESC);
CREATE INDEX idx_change_audit_record ON public.change_audit_log(table_name, record_id);

CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_j jsonb;
  new_j jsonb;
  changed text[];
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_j := to_jsonb(NEW);
    INSERT INTO public.change_audit_log(table_name, record_id, operation, changed_by, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), new_j);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_j := to_jsonb(OLD);
    new_j := to_jsonb(NEW);
    changed := ARRAY[]::text[];
    FOR k IN SELECT jsonb_object_keys(new_j) LOOP
      IF (new_j -> k) IS DISTINCT FROM (old_j -> k) AND k <> 'updated_at' THEN
        changed := array_append(changed, k);
      END IF;
    END LOOP;
    IF array_length(changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.change_audit_log(table_name, record_id, operation, changed_by, changed_fields, old_values, new_values)
    VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), to_jsonb(changed),
      (SELECT jsonb_object_agg(key, old_j -> key) FROM unnest(changed) AS key),
      (SELECT jsonb_object_agg(key, new_j -> key) FROM unnest(changed) AS key)
    );
    RETURN NEW;
  ELSE
    old_j := to_jsonb(OLD);
    INSERT INTO public.change_audit_log(table_name, record_id, operation, changed_by, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), old_j);
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER audit_artists_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER audit_bookings_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();