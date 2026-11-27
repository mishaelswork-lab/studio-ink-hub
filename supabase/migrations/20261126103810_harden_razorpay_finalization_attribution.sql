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
  v_months_text text;
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
    v_months_text := v_payment.metadata->>'membership_months';
    v_months := CASE WHEN v_months_text ~ '^[0-9]{1,2}$'
      THEN greatest(1, least(24, v_months_text::integer)) ELSE 3 END;
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
    SELECT greatest(now(), coalesce(max(expires_at), now())) INTO v_expires
    FROM public.memberships WHERE user_id = v_payment.customer_id AND status = 'active';
    INSERT INTO public.memberships(user_id, plan, amount, currency, status, started_at, expires_at)
    VALUES (v_payment.customer_id, 'premium', v_payment.amount_minor / 100.0,
      v_payment.currency, 'active', now(), v_expires + make_interval(months => v_months));
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
