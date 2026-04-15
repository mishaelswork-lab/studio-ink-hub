
-- Favorites table
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('artist', 'reel', 'photo')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Consultations table
CREATE TABLE public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  design_description text,
  reference_images text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can create consultations" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Participants can view consultations" ON public.consultations FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = artist_id);
CREATE POLICY "Artists can update consultation status" ON public.consultations FOR UPDATE USING (auth.uid() = artist_id OR auth.uid() = customer_id);

-- Chat messages for consultations
CREATE TABLE public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON public.consultation_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())));
CREATE POLICY "Participants can send messages" ON public.consultation_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())));

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  discount_amount integer NOT NULL DEFAULT 100,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "System can update referrals" ON public.referrals FOR UPDATE USING (auth.uid() = referred_id OR auth.uid() = referrer_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;

-- Triggers for updated_at
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
