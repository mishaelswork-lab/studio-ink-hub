-- Enforce blocks in conversations that existed before either party blocked the other.
-- The helper only reveals whether the caller is involved in the queried pair.
CREATE OR REPLACE FUNCTION private.users_blocked_between(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_user_a IS NULL OR p_user_b IS NULL THEN false
    WHEN auth.uid() NOT IN (p_user_a, p_user_b) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_blocks ub
      WHERE (ub.blocker_id = p_user_a AND ub.blocked_id = p_user_b)
         OR (ub.blocker_id = p_user_b AND ub.blocked_id = p_user_a)
    )
  END;
$function$;

REVOKE ALL ON FUNCTION private.users_blocked_between(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.users_blocked_between(uuid, uuid) TO authenticated;

-- A blocked pair can no longer discover or read an existing conversation.
DROP POLICY IF EXISTS conversations_participant_select ON public.conversations;
CREATE POLICY conversations_participant_select
ON public.conversations
FOR SELECT
TO authenticated
USING (
  (
    customer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = conversations.artist_id AND a.user_id = (SELECT auth.uid())
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = conversations.artist_id
      AND private.users_blocked_between(conversations.customer_id, a.user_id)
  )
);

DROP POLICY IF EXISTS messages_participant_select ON public.messages;
CREATE POLICY messages_participant_select
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (
        c.customer_id = (SELECT auth.uid())
        OR a.user_id = (SELECT auth.uid())
      )
      AND NOT private.users_blocked_between(c.customer_id, a.user_id)
  )
);

DROP POLICY IF EXISTS messages_participant_insert ON public.messages;
CREATE POLICY messages_participant_insert
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (
        c.customer_id = (SELECT auth.uid())
        OR a.user_id = (SELECT auth.uid())
      )
      AND NOT private.users_blocked_between(c.customer_id, a.user_id)
  )
);

DROP POLICY IF EXISTS messages_recipient_read_receipt_update ON public.messages;
CREATE POLICY messages_recipient_read_receipt_update
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id IS DISTINCT FROM (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (
        c.customer_id = (SELECT auth.uid())
        OR a.user_id = (SELECT auth.uid())
      )
      AND NOT private.users_blocked_between(c.customer_id, a.user_id)
  )
)
WITH CHECK (
  sender_id IS DISTINCT FROM (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (
        c.customer_id = (SELECT auth.uid())
        OR a.user_id = (SELECT auth.uid())
      )
      AND NOT private.users_blocked_between(c.customer_id, a.user_id)
  )
);

-- Do not disclose the other participant's profile after a block.
DROP POLICY IF EXISTS profiles_conversation_participant_read ON public.profiles;
CREATE POLICY profiles_conversation_participant_read
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE (
      (c.customer_id = profiles.id AND a.user_id = (SELECT auth.uid()))
      OR
      (c.customer_id = (SELECT auth.uid()) AND profiles.id = a.user_id)
    )
    AND NOT private.users_blocked_between(c.customer_id, a.user_id)
  )
);

-- The peer lookup RPC is SECURITY DEFINER, so it must enforce the same rule itself.
CREATE OR REPLACE FUNCTION private.conversation_peer(p_conversation_id uuid)
RETURNS TABLE(peer_user_id uuid, peer_name text, peer_avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    CASE WHEN c.customer_id = auth.uid() THEN a.user_id ELSE c.customer_id END,
    CASE WHEN c.customer_id = auth.uid() THEN a.name ELSE p.display_name END,
    CASE WHEN c.customer_id = auth.uid() THEN a.avatar_url ELSE p.avatar_url END
  FROM public.conversations c
  JOIN public.artists a ON a.id = c.artist_id
  LEFT JOIN public.profiles p ON p.id = c.customer_id
  WHERE c.id = p_conversation_id
    AND (c.customer_id = auth.uid() OR a.user_id = auth.uid())
    AND NOT private.users_blocked_between(c.customer_id, a.user_id)
$function$;

-- Rollback: restore the previous definitions of
-- private.conversation_peer and the five participant policies from
-- 20261127144038_secure_conversation_peer_lookup.sql and
-- 20261127143933_canonical_consultation_messaging.sql, then drop
-- private.users_blocked_between(uuid, uuid).
