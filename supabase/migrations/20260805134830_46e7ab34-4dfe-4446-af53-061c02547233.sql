CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert platform settings"
ON public.platform_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings"
ON public.platform_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform settings"
ON public.platform_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_platform_settings_updated
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (key, value) VALUES
  ('pricing', '{"cover_charge":500,"commission_percent":15,"membership_price":199,"membership_months":3,"featured_boost_price":999,"featured_boost_days":30}'::jsonb),
  ('limits', '{"guest_design_limit":30,"ai_design_count":10,"max_upload_mb":10,"booking_window_days":60}'::jsonb),
  ('contact', '{"support_email":"artspacehelp@gmail.com","grievance_officer":"Mishael Jose Anil Kadungamparambil","whatsapp":""}'::jsonb),
  ('features', '{"ai_designs":true,"reels":true,"piercing_service":true,"featured_boosts":true,"push_notifications":true,"maintenance_mode":false}'::jsonb),
  ('content', '{"tagline":"Where tattoo becomes art","announcement":""}'::jsonb);