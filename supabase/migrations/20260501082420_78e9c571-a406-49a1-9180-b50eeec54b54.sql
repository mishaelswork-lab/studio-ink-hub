
-- Memberships table
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'premium',
  status TEXT NOT NULL DEFAULT 'active',
  amount INTEGER NOT NULL DEFAULT 399,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own membership" ON public.memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own membership" ON public.memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access memberships" ON public.memberships FOR ALL USING (auth.role() = 'service_role'::text);
CREATE POLICY "Admins can view all memberships" ON public.memberships FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Artist certifications table
CREATE TABLE public.artist_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  certification_name TEXT NOT NULL,
  issuing_body TEXT,
  certificate_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certifications viewable by everyone" ON public.artist_certifications FOR SELECT USING (true);
CREATE POLICY "Artists can add own certifications" ON public.artist_certifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.artists WHERE id = artist_certifications.artist_id AND user_id = auth.uid())
);
CREATE POLICY "Artists can delete own certifications" ON public.artist_certifications FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.artists WHERE id = artist_certifications.artist_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can update certifications" ON public.artist_certifications FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Chat count on profiles for non-member limit
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_count INTEGER NOT NULL DEFAULT 0;
