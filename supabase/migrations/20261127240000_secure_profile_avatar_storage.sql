-- Store profile avatars in the existing private image bucket.
-- Users can update only their own avatar_url column and one fixed object path.
GRANT UPDATE (avatar_url) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_update_own_avatar ON public.profiles;
CREATE POLICY profiles_update_own_avatar
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_avatar_owner_insert ON storage.objects;
CREATE POLICY profile_avatar_owner_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-private'
  AND name = ((SELECT auth.uid())::text || '/profile/avatar')
);

DROP POLICY IF EXISTS profile_avatar_owner_update ON storage.objects;
CREATE POLICY profile_avatar_owner_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio-private'
  AND name = ((SELECT auth.uid())::text || '/profile/avatar')
)
WITH CHECK (
  bucket_id = 'portfolio-private'
  AND name = ((SELECT auth.uid())::text || '/profile/avatar')
);

DROP POLICY IF EXISTS profile_avatar_owner_read ON storage.objects;
CREATE POLICY profile_avatar_owner_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'portfolio-private'
  AND name = ((SELECT auth.uid())::text || '/profile/avatar')
);

-- Rollback:
-- DROP POLICY IF EXISTS profile_avatar_owner_read ON storage.objects;
-- DROP POLICY IF EXISTS profile_avatar_owner_update ON storage.objects;
-- DROP POLICY IF EXISTS profile_avatar_owner_insert ON storage.objects;
-- DROP POLICY IF EXISTS profiles_update_own_avatar ON public.profiles;
-- REVOKE UPDATE (avatar_url) ON TABLE public.profiles FROM authenticated;
