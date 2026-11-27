-- Permit authenticated users to read only their own profile.
-- Profile writes remain blocked until editable columns and ownership flows are audited.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);
