-- 1. booking_notifications table
CREATE TABLE public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event text NOT NULL,
  message text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.booking_notifications TO authenticated;
GRANT ALL ON public.booking_notifications TO service_role;

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.booking_notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
  ON public.booking_notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX booking_notifications_user_idx
  ON public.booking_notifications(user_id, created_at DESC);

-- 2. trigger: notify customer on status change
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evt text;
  msg text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    evt := CASE NEW.status
      WHEN 'accepted' THEN 'accepted'
      WHEN 'confirmed' THEN 'accepted'
      WHEN 'rejected' THEN 'rejected'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'completed' THEN 'completed'
      ELSE 'updated'
    END;
    msg := 'Booking on ' || NEW.date || ' at ' || NEW.time || ' is now ' || NEW.status;
    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO public.booking_notifications (user_id, booking_id, event, message)
      VALUES (NEW.customer_id, NEW.id, evt, msg);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_status_notify
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- 3. Let customers cancel their own booking
CREATE POLICY "Customers cancel own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() AND status = 'cancelled');
