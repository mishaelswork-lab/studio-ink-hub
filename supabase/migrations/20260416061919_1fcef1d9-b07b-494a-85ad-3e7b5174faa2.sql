
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add last_active_at to profiles for re-engagement tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Outreach leads table for scraped artists
CREATE TABLE public.outreach_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  email text,
  instagram_url text,
  source_url text,
  city text,
  contacted boolean NOT NULL DEFAULT false,
  contacted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outreach leads"
ON public.outreach_leads FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert outreach leads"
ON public.outreach_leads FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update outreach leads"
ON public.outreach_leads FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access to outreach leads"
ON public.outreach_leads FOR ALL
USING (auth.role() = 'service_role');
