-- Push subscriptions for web push
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access push" ON public.push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Daily refreshed tattoo design feed
CREATE TABLE public.daily_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  thumb_url TEXT,
  source_url TEXT,
  photographer TEXT,
  description TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Designs viewable by everyone" ON public.daily_designs FOR SELECT USING (true);
CREATE POLICY "Service role manages designs" ON public.daily_designs
  FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX idx_daily_designs_fetched ON public.daily_designs(fetched_at DESC);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE,
  customer_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers create own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = customer_id);

-- Moderation status on reels
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_reels_moderation ON public.reels(moderation_status);

-- Schedule daily design refresh (9 AM IST)
SELECT cron.schedule(
  'refresh-daily-designs',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ccfbfcbgljivdkqsayes.supabase.co/functions/v1/refresh-designs',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZmJmY2JnbGppdmRrcXNheWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwNTYsImV4cCI6MjA5MTAzNjA1Nn0.9itK_QsH4fPTWazEmyaA2SRe-h4hBzKo_6hNlBMDB_k"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule review prompts (every hour)
SELECT cron.schedule(
  'prompt-reviews',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ccfbfcbgljivdkqsayes.supabase.co/functions/v1/send-review-prompts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZmJmY2JnbGppdmRrcXNheWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwNTYsImV4cCI6MjA5MTAzNjA1Nn0.9itK_QsH4fPTWazEmyaA2SRe-h4hBzKo_6hNlBMDB_k"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule booking reminders (every 5 min)
SELECT cron.schedule(
  'booking-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ccfbfcbgljivdkqsayes.supabase.co/functions/v1/booking-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZmJmY2JnbGppdmRrcXNheWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwNTYsImV4cCI6MjA5MTAzNjA1Nn0.9itK_QsH4fPTWazEmyaA2SRe-h4hBzKo_6hNlBMDB_k"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Enable realtime for artists.available
ALTER PUBLICATION supabase_realtime ADD TABLE public.artists;