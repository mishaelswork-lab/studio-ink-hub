
CREATE TABLE public.featured_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.featured_artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Featured artists viewable by everyone" ON public.featured_artists FOR SELECT USING (true);
CREATE POLICY "Admins manage featured artists" ON public.featured_artists FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_featured_artists_updated BEFORE UPDATE ON public.featured_artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_featured_artists_active ON public.featured_artists(active, priority DESC);

CREATE TABLE public.featured_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  message TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.featured_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists can submit own request" ON public.featured_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM artists WHERE artists.id = featured_requests.artist_id AND artists.user_id = auth.uid())
);
CREATE POLICY "Artists view own requests" ON public.featured_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM artists WHERE artists.id = featured_requests.artist_id AND artists.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins update requests" ON public.featured_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_featured_requests_updated BEFORE UPDATE ON public.featured_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
