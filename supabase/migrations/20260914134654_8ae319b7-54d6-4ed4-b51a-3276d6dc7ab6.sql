
-- 1. Reels: hide unapproved content from the public
DROP POLICY IF EXISTS "Reels are viewable by everyone" ON public.reels;
CREATE POLICY "Approved reels are viewable by everyone"
ON public.reels FOR SELECT
USING (
  moderation_status = 'approved'
  OR auth.uid() = artist_id
  OR public.has_role(auth.uid(), 'admin')
);

-- 2. Storage: strict ownership checks for the reels-videos bucket
DROP POLICY IF EXISTS "Artists can upload reel videos" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their reel videos" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_write_media(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    -- own avatar folder: <uid>/...
    (storage.foldername(_name))[1] = auth.uid()::text
    -- portfolio/reels/avatars/<uid or own artist id>/...
    OR (
      (storage.foldername(_name))[1] IN ('portfolio','reels','avatars')
      AND (
        (storage.foldername(_name))[2] = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.artists a
          WHERE a.user_id = auth.uid()
            AND a.id::text = (storage.foldername(_name))[2]
        )
      )
    )
    -- consultation reference image uploaded by the user: consultations/ref-<uid>-...
    OR _name LIKE 'consultations/ref-' || auth.uid()::text || '-%'
    -- consultation thread the user participates in: consultations/<id>/...
    OR (
      (storage.foldername(_name))[1] = 'consultations'
      AND EXISTS (
        SELECT 1 FROM public.consultations c
        LEFT JOIN public.artists a ON a.id = c.artist_id
        WHERE c.id::text = (storage.foldername(_name))[2]
          AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid() OR a.user_id = auth.uid())
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_write_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_media(text) TO authenticated, service_role;

CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reels-videos' AND public.can_write_media(name));

CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'reels-videos' AND public.can_write_media(name))
WITH CHECK (bucket_id = 'reels-videos' AND public.can_write_media(name));

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'reels-videos' AND public.can_write_media(name));
