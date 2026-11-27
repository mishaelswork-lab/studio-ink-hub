-- Additive compatibility foundation for the existing ArtSpace production schema.
-- Existing tables and records are preserved. Client access is granted only
-- where a matching owner-scoped RLS policy is installed below.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('customer','artist','admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  CONSTRAINT user_roles_user_role_key UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'premium',
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memberships_user_status_expiry_idx
  ON public.memberships(user_id, status, expires_at DESC);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.memberships FROM anon, authenticated;
GRANT SELECT ON TABLE public.memberships TO authenticated;
DROP POLICY IF EXISTS memberships_select_own ON public.memberships;
CREATE POLICY memberships_select_own ON public.memberships
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('artist','reel','photo','design')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_item_key UNIQUE (user_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS favorites_user_created_idx
  ON public.favorites(user_id, created_at DESC);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.favorites FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;
DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
CREATE POLICY favorites_select_own ON public.favorites
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS favorites_insert_own ON public.favorites;
CREATE POLICY favorites_insert_own ON public.favorites
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;
CREATE POLICY favorites_delete_own ON public.favorites
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Keep the existing profiles.id = auth.users.id model canonical. This
-- generated alias supports legacy client filters without allowing divergence.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid GENERATED ALWAYS AS (id) STORED;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_count integer NOT NULL DEFAULT 0
  CHECK (chat_count >= 0);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
