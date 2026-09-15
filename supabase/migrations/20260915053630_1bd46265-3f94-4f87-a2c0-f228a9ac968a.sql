
CREATE OR REPLACE FUNCTION public.in_consultation_path(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _name LIKE 'ref-' || auth.uid()::text || '-%'
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      LEFT JOIN public.artists a ON a.id = c.artist_id
      WHERE c.id::text = (storage.foldername(_name))[1]
        AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid() OR a.user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.in_consultation_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.in_consultation_path(text) TO authenticated, service_role;

CREATE POLICY "Participants can read consultation media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'consultation-media' AND public.in_consultation_path(name));

CREATE POLICY "Participants can upload consultation media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'consultation-media' AND public.in_consultation_path(name));

CREATE POLICY "Participants can delete consultation media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'consultation-media' AND public.in_consultation_path(name));

-- Public bucket no longer accepts consultation uploads
CREATE OR REPLACE FUNCTION public.can_write_media(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    (storage.foldername(_name))[1] = auth.uid()::text
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
    OR public.has_role(auth.uid(), 'admin')
  )
$$;
