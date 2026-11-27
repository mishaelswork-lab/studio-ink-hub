CREATE OR REPLACE FUNCTION public.conversation_peer(p_conversation_id uuid)
RETURNS TABLE(peer_user_id uuid, peer_name text, peer_avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE WHEN c.customer_id = auth.uid() THEN a.user_id ELSE c.customer_id END,
    CASE WHEN c.customer_id = auth.uid() THEN a.name ELSE p.display_name END,
    CASE WHEN c.customer_id = auth.uid() THEN a.avatar_url ELSE p.avatar_url END
  FROM public.conversations c
  JOIN public.artists a ON a.id = c.artist_id
  LEFT JOIN public.profiles p ON p.id = c.customer_id
  WHERE c.id = p_conversation_id
    AND (c.customer_id = auth.uid() OR a.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.conversation_peer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_peer(uuid) TO authenticated;