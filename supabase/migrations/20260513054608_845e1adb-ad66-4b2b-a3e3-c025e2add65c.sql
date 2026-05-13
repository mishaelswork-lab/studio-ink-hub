CREATE TABLE IF NOT EXISTS public.perf_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  value numeric,
  url text,
  user_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_metrics_event_created_idx ON public.perf_metrics (event, created_at DESC);
ALTER TABLE public.perf_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert perf metrics"
  ON public.perf_metrics FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Admins can view perf metrics"
  ON public.perf_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));