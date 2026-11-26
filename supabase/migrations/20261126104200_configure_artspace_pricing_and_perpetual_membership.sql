ALTER TABLE public.memberships ALTER COLUMN expires_at DROP NOT NULL;

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
  v_days integer;
  v_days_text text;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_payment.status = 'captured' THEN
    IF v_payment.provider_payment_id = p_provider_payment_id THEN
      RETURN jsonb_build_object('success', true, 'already_processed', true);
    END IF;
    RAISE EXCEPTION 'payment already finalized';
  END IF;
  IF v_payment.status NOT IN ('created','pending') THEN RAISE EXCEPTION 'payment is not payable'; END IF;
  IF v_payment.provider <> 'razorpay' OR v_payment.provider_order_id IS NULL
     OR p_provider_payment_id IS NULL OR length(p_provider_payment_id) = 0
     OR p_provider_signature IS NULL OR length(p_provider_signature) = 0
     OR v_payment.customer_id IS NULL OR v_payment.amount_minor <= 0
     OR v_payment.currency <> 'INR' THEN
    RAISE EXCEPTION 'invalid payment attribution';
  END IF;
  IF v_payment.payment_type = 'cover_charge' THEN
    IF v_payment.booking_id IS NULL THEN RAISE EXCEPTION 'booking attribution missing'; END IF;
  ELSIF v_payment.payment_type = 'membership' THEN
    NULL;
  ELSIF v_payment.payment_type = 'featured_boost' THEN
    IF v_payment.artist_id IS NULL THEN RAISE EXCEPTION 'artist attribution missing'; END IF;
    v_days_text := v_payment.metadata->>'boost_days';
    v_days := CASE WHEN v_days_text ~ '^[0-9]{1,3}$'
      THEN greatest(1, least(365, v_days_text::integer)) ELSE 30 END;
  ELSE
    RAISE EXCEPTION 'unsupported payment type';
  END IF;
  UPDATE public.payments SET status = 'captured',
    provider_payment_id = p_provider_payment_id,
    provider_signature = p_provider_signature
  WHERE id = p_payment_id;
  IF v_payment.payment_type = 'cover_charge' THEN
    UPDATE public.bookings SET cover_charge_paid = true
    WHERE id = v_payment.booking_id AND customer_id = v_payment.customer_id
      AND cover_charge_paid IS FALSE;
    IF NOT FOUND THEN RAISE EXCEPTION 'booking attribution mismatch or already paid'; END IF;
  ELSIF v_payment.payment_type = 'membership' THEN
    INSERT INTO public.memberships(user_id, plan, amount, currency, status, started_at, expires_at)
    VALUES (v_payment.customer_id, 'premium', v_payment.amount_minor / 100.0,
      v_payment.currency, 'active', now(), NULL);
  ELSIF v_payment.payment_type = 'featured_boost' THEN
    INSERT INTO public.featured_artists(artist_id, active, priority, expires_at)
    VALUES (v_payment.artist_id, true, 1, now() + make_interval(days => v_days))
    ON CONFLICT (artist_id) DO UPDATE SET
      active = true, expires_at = greatest(now(), featured_artists.expires_at) + make_interval(days => v_days);
  END IF;
  RETURN jsonb_build_object('success', true, 'already_processed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_razorpay_payment(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_razorpay_payment(uuid,text,text) TO service_role;

INSERT INTO public.platform_settings(key,value,updated_at)
VALUES ('pricing', jsonb_build_object(
  'currency','INR',
  'cover_charge',49,
  'member_cover_charge_discount_percent',10,
  'membership_price',395,
  'membership_duration','lifetime',
  'membership_months',null,
  'featured_boost_price',500,
  'featured_boost_days',30,
  'membership_terms_version','2026-11-26',
  'membership_terms','Membership purchased for ₹395 is currently lifetime access with no scheduled expiry. ArtSpace may revise membership benefits or introduce time-limited plans prospectively. Any material change affecting an already purchased lifetime membership will be communicated in advance and will not silently convert existing memberships to a 3-month plan.'
), now())
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
