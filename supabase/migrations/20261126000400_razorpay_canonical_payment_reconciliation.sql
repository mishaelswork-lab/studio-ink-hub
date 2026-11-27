-- Reconcile Razorpay payments with the existing production schema.
-- Additive only: existing payment identifiers and amounts remain canonical.
ALTER TABLE public.payments
  ALTER COLUMN booking_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artists(id),
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS provider_signature text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cover_charge_paid boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.featured_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL UNIQUE REFERENCES public.artists(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.featured_artists ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.featured_artists FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_settings FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS payments_customer_created_idx
  ON public.payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx
  ON public.payments(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.finalize_razorpay_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_signature text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_months integer;
  v_days integer;
  v_expires timestamptz;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_payment.status = 'captured' THEN
    IF v_payment.provider_payment_id = p_provider_payment_id THEN
      RETURN jsonb_build_object('success', true, 'already_processed', true);
    END IF;
    RAISE EXCEPTION 'payment already finalized';
  END IF;
  IF v_payment.status NOT IN ('created','pending') THEN
    RAISE EXCEPTION 'payment is not payable';
  END IF;
  IF v_payment.provider <> 'razorpay' OR v_payment.provider_order_id IS NULL
     OR p_provider_payment_id IS NULL OR p_provider_signature IS NULL THEN
    RAISE EXCEPTION 'invalid payment attribution';
  END IF;

  UPDATE public.payments SET
    status = 'captured',
    provider_payment_id = p_provider_payment_id,
    provider_signature = p_provider_signature
  WHERE id = p_payment_id;

  IF v_payment.payment_type = 'cover_charge' THEN
    UPDATE public.bookings SET cover_charge_paid = true
    WHERE id = v_payment.booking_id AND customer_id = v_payment.customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'booking attribution mismatch'; END IF;
  ELSIF v_payment.payment_type = 'membership' THEN
    v_months := greatest(1, least(24, coalesce((v_payment.metadata->>'membership_months')::integer, 3)));
    SELECT greatest(now(), coalesce(max(expires_at), now())) INTO v_expires
    FROM public.memberships WHERE user_id = v_payment.customer_id AND status = 'active';
    INSERT INTO public.memberships(user_id, plan, amount, currency, status, started_at, expires_at)
    VALUES (v_payment.customer_id, 'premium', v_payment.amount_minor / 100.0,
      v_payment.currency, 'active', now(), v_expires + make_interval(months => v_months));
  ELSIF v_payment.payment_type = 'featured_boost' THEN
    v_days := greatest(1, least(365, coalesce((v_payment.metadata->>'boost_days')::integer, 30)));
    INSERT INTO public.featured_artists(artist_id, active, priority, expires_at)
    VALUES (v_payment.artist_id, true, 1, now() + make_interval(days => v_days))
    ON CONFLICT (artist_id) DO UPDATE SET
      active = true, expires_at = greatest(now(), featured_artists.expires_at) + make_interval(days => v_days);
  ELSE
    RAISE EXCEPTION 'unsupported payment type';
  END IF;

  RETURN jsonb_build_object('success', true, 'already_processed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_razorpay_payment(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_razorpay_payment(uuid,text,text) TO service_role;
