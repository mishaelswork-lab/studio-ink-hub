CREATE OR REPLACE FUNCTION public.shares_consultation(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE (c.customer_id = _a AND c.artist_id = _b)
       OR (c.customer_id = _b AND c.artist_id = _a)
  )
$$;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultation partners read each other's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.shares_consultation(auth.uid(), user_id));

REVOKE SELECT ON public.profiles FROM anon;