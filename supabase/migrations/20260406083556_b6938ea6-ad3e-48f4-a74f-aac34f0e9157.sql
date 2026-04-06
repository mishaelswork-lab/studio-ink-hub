
-- Create reels table
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'instagram')),
  instagram_url TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Anyone can view reels
CREATE POLICY "Reels are viewable by everyone"
  ON public.reels FOR SELECT USING (true);

-- Artists can create their own reels
CREATE POLICY "Artists can create their own reels"
  ON public.reels FOR INSERT WITH CHECK (auth.uid() = artist_id);

-- Artists can update their own reels
CREATE POLICY "Artists can update their own reels"
  ON public.reels FOR UPDATE USING (auth.uid() = artist_id);

-- Artists can delete their own reels
CREATE POLICY "Artists can delete their own reels"
  ON public.reels FOR DELETE USING (auth.uid() = artist_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reels_updated_at
  BEFORE UPDATE ON public.reels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for reel videos
INSERT INTO storage.buckets (id, name, public) VALUES ('reels-videos', 'reels-videos', true);

CREATE POLICY "Reel videos are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'reels-videos');

CREATE POLICY "Artists can upload reel videos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reels-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Artists can delete their reel videos"
  ON storage.objects FOR DELETE USING (bucket_id = 'reels-videos' AND auth.uid() IS NOT NULL);
