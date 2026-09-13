-- 1. Bookings: artists only see their own bookings
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_role(auth.uid(), 'admin')
    OR artist_id IN (SELECT id FROM public.artists WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Artists and admins can update bookings" ON public.bookings;
CREATE POLICY "Artists and admins can update bookings" ON public.bookings
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR artist_id IN (SELECT id FROM public.artists WHERE user_id = auth.uid())
  );

-- 2. Payments: artists only see their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_role(auth.uid(), 'admin')
    OR artist_id IN (SELECT id FROM public.artists WHERE user_id = auth.uid())
  );

-- 3. Storage: ownership-checked writes on reels-videos
DROP POLICY IF EXISTS "Artists can upload reel videos" ON storage.objects;
CREATE POLICY "Artists can upload reel videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reels-videos'
    AND auth.uid() IS NOT NULL
    AND (
      -- avatar-style paths: <uid>/...
      (storage.foldername(name))[1] = auth.uid()::text
      -- consultation reference uploads embedding the uid in the filename
      OR name LIKE '%' || auth.uid()::text || '%'
      -- consultation chat uploads: consultations/<consultation_id>/...
      OR (
        (storage.foldername(name))[1] = 'consultations'
        AND EXISTS (
          SELECT 1 FROM public.consultations c
          JOIN public.artists a ON a.id = c.artist_id
          WHERE c.id::text = (storage.foldername(name))[2]
            AND (c.customer_id = auth.uid() OR a.user_id = auth.uid())
        )
      )
      -- artist-owned folders: <folder>/<artist_id>/...
      OR EXISTS (
        SELECT 1 FROM public.artists a
        WHERE a.user_id = auth.uid()
          AND (storage.foldername(name))[2] = a.id::text
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "Artists can delete their reel videos" ON storage.objects;
CREATE POLICY "Artists can delete their reel videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reels-videos'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE '%' || auth.uid()::text || '%'
      OR (
        (storage.foldername(name))[1] = 'consultations'
        AND EXISTS (
          SELECT 1 FROM public.consultations c
          JOIN public.artists a ON a.id = c.artist_id
          WHERE c.id::text = (storage.foldername(name))[2]
            AND (c.customer_id = auth.uid() OR a.user_id = auth.uid())
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.artists a
        WHERE a.user_id = auth.uid()
          AND (storage.foldername(name))[2] = a.id::text
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );