-- design_reports
CREATE TABLE public.design_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid NOT NULL REFERENCES public.daily_designs(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (design_id, reporter_id)
);
GRANT SELECT, INSERT, UPDATE ON public.design_reports TO authenticated;
GRANT ALL ON public.design_reports TO service_role;
ALTER TABLE public.design_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create own reports" ON public.design_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "users view own reports" ON public.design_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update reports" ON public.design_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_design_reports_updated BEFORE UPDATE ON public.design_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- design_views (repeat-view suppression)
CREATE TABLE public.design_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.daily_designs(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, design_id)
);
GRANT SELECT, INSERT, DELETE ON public.design_views TO authenticated;
GRANT ALL ON public.design_views TO service_role;
ALTER TABLE public.design_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own views" ON public.design_views FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Cron extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;