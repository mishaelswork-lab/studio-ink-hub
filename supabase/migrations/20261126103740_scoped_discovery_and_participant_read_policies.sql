-- Public discovery is limited to approved/active artist content and safe columns.
REVOKE ALL ON TABLE public.artists, public.portfolio_items, public.designs, public.artist_availability FROM anon, authenticated;
GRANT SELECT (id, slug, bio, styles, studio_name, city, country, currency, status, verified_at, created_at)
  ON public.artists TO anon, authenticated;
GRANT SELECT ON public.portfolio_items, public.designs, public.artist_availability TO anon, authenticated;

DROP POLICY IF EXISTS artists_public_active_select ON public.artists;
CREATE POLICY artists_public_active_select ON public.artists
  FOR SELECT TO anon, authenticated USING (status = 'active');

DROP POLICY IF EXISTS portfolio_public_approved_select ON public.portfolio_items;
CREATE POLICY portfolio_public_approved_select ON public.portfolio_items
  FOR SELECT TO anon, authenticated USING (
    approved IS TRUE AND EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = portfolio_items.artist_id AND a.status = 'active'
    )
  );

DROP POLICY IF EXISTS designs_public_select ON public.designs;
CREATE POLICY designs_public_select ON public.designs
  FOR SELECT TO anon, authenticated USING (
    is_public IS TRUE AND (
      artist_id IS NULL OR EXISTS (
        SELECT 1 FROM public.artists a WHERE a.id = designs.artist_id AND a.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS artist_availability_public_select ON public.artist_availability;
CREATE POLICY artist_availability_public_select ON public.artist_availability
  FOR SELECT TO anon, authenticated USING (
    is_active IS TRUE AND EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_availability.artist_id AND a.status = 'active'
    )
  );

-- Authenticated participants may read their own booking and consultation records.
GRANT SELECT ON public.bookings, public.design_requests, public.conversations, public.messages
  TO authenticated;

DROP POLICY IF EXISTS bookings_participant_select ON public.bookings;
CREATE POLICY bookings_participant_select ON public.bookings
  FOR SELECT TO authenticated USING (
    customer_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = bookings.artist_id AND a.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS design_requests_participant_select ON public.design_requests;
CREATE POLICY design_requests_participant_select ON public.design_requests
  FOR SELECT TO authenticated USING (
    customer_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = design_requests.artist_id AND a.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS conversations_participant_select ON public.conversations;
CREATE POLICY conversations_participant_select ON public.conversations
  FOR SELECT TO authenticated USING (
    customer_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = conversations.artist_id AND a.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS messages_participant_select ON public.messages;
CREATE POLICY messages_participant_select ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.customer_id = (SELECT auth.uid()) OR EXISTS (
            SELECT 1 FROM public.artists a
            WHERE a.id = c.artist_id AND a.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- Legacy saved-design relation remains owner-private.
GRANT SELECT, INSERT, DELETE ON public.saved_designs TO authenticated;
DROP POLICY IF EXISTS saved_designs_select_own ON public.saved_designs;
CREATE POLICY saved_designs_select_own ON public.saved_designs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS saved_designs_insert_own ON public.saved_designs;
CREATE POLICY saved_designs_insert_own ON public.saved_designs
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS saved_designs_delete_own ON public.saved_designs;
CREATE POLICY saved_designs_delete_own ON public.saved_designs
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
