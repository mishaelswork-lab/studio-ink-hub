ALTER TABLE public.consultation_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

DROP POLICY IF EXISTS "Participants can mark messages read" ON public.consultation_messages;
CREATE POLICY "Participants can mark messages read"
ON public.consultation_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_messages.consultation_id
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
      AND consultation_messages.sender_id <> auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_messages.consultation_id
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
      AND consultation_messages.sender_id <> auth.uid()
  )
);