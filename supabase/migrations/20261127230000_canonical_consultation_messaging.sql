-- Canonical conversations/messages access and atomic consultation creation.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
GRANT INSERT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

DROP POLICY IF EXISTS messages_participant_insert ON public.messages;
CREATE POLICY messages_participant_insert ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (c.customer_id = (SELECT auth.uid()) OR a.user_id = (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS messages_recipient_read_receipt_update ON public.messages;
CREATE POLICY messages_recipient_read_receipt_update ON public.messages FOR UPDATE TO authenticated
USING (
  sender_id IS DISTINCT FROM (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (c.customer_id = (SELECT auth.uid()) OR a.user_id = (SELECT auth.uid()))
  )
)
WITH CHECK (
  sender_id IS DISTINCT FROM (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE c.id = messages.conversation_id
      AND (c.customer_id = (SELECT auth.uid()) OR a.user_id = (SELECT auth.uid()))
  )
);

CREATE OR REPLACE FUNCTION public.start_consultation(
  p_artist_id uuid, p_brief text, p_reference_images jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_artist_user_id uuid;
  v_profile public.profiles%ROWTYPE;
  v_conversation_id uuid;
  v_request_id uuid;
  v_is_member boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_artist_id IS NULL OR length(trim(coalesce(p_brief, ''))) < 3 OR length(p_brief) > 5000 THEN
    RAISE EXCEPTION 'A valid artist and design brief are required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(coalesce(p_reference_images, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(p_reference_images, '[]'::jsonb)) > 3 THEN
    RAISE EXCEPTION 'Up to three reference images are allowed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_profile.deletion_pending_at IS NOT NULL THEN
    RAISE EXCEPTION 'Account unavailable' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_artist_user_id
  FROM public.artists WHERE id = p_artist_id AND status = 'active';
  IF v_artist_user_id IS NULL OR v_artist_user_id = v_user_id THEN
    RAISE EXCEPTION 'Artist is unavailable' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_user_id AND blocked_id = v_artist_user_id)
       OR (blocker_id = v_artist_user_id AND blocked_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'This conversation cannot be started' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_user_id AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_member;
  IF NOT v_is_member AND v_profile.chat_count >= 3 THEN
    RAISE EXCEPTION 'Free consultation limit reached' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_is_member THEN
    UPDATE public.profiles SET chat_count = chat_count + 1, updated_at = now()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO public.design_requests (customer_id, artist_id, brief, reference_images, status)
  VALUES (v_user_id, p_artist_id, trim(p_brief), coalesce(p_reference_images, '[]'::jsonb), 'open')
  RETURNING id INTO v_request_id;
  INSERT INTO public.conversations (customer_id, artist_id, design_request_id)
  VALUES (v_user_id, p_artist_id, v_request_id)
  RETURNING id INTO v_conversation_id;
  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_consultation(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_consultation(uuid, text, jsonb) TO authenticated;

GRANT SELECT (id, display_name, avatar_url) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS profiles_conversation_participant_read ON public.profiles;
CREATE POLICY profiles_conversation_participant_read ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.artists a ON a.id = c.artist_id
    WHERE (c.customer_id = profiles.id AND a.user_id = (SELECT auth.uid()))
       OR (c.customer_id = (SELECT auth.uid()) AND profiles.id = a.user_id)
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
