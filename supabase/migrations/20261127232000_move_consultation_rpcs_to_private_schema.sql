CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.start_consultation(uuid,text,jsonb) SET SCHEMA private;
ALTER FUNCTION public.conversation_peer(uuid) SET SCHEMA private;

CREATE OR REPLACE FUNCTION public.start_consultation(
  p_artist_id uuid, p_brief text, p_reference_images jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.start_consultation(p_artist_id,p_brief,p_reference_images) $$;
REVOKE ALL ON FUNCTION public.start_consultation(uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_consultation(uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.conversation_peer(p_conversation_id uuid)
RETURNS TABLE(peer_user_id uuid, peer_name text, peer_avatar_url text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT * FROM private.conversation_peer(p_conversation_id) $$;
REVOKE ALL ON FUNCTION public.conversation_peer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_peer(uuid) TO authenticated;