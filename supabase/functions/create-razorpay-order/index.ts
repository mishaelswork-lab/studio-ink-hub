import { requireUser } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Order creation is fully server-side: the browser never tells us the price.
// Amounts come from platform_settings and are validated against the caller's
// booking ownership, membership status and referral code before an order is
// created. verify-razorpay-payment later reconciles against this order.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _g = await requireUser(req);
  if (_g.response) return _g.response;
  const user = _g.user;

  try {
    const body = await req.json().catch(() => ({}));
    const payment_type = typeof body.payment_type === "string" ? body.payment_type : "cover_charge";
    const booking_id = typeof body.booking_id === "string" ? body.booking_id : null;
    const artist_id = typeof body.artist_id === "string" ? body.artist_id : null;
    const referral_code = typeof body.referral_code === "string" ? body.referral_code.trim().toUpperCase() : "";

    if (!["cover_charge", "membership", "featured_boost"].includes(payment_type)) {
      return json({ error: "Invalid payment type" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Server-side pricing — never trust a client amount.
    const { data: pricingRow } = await admin
      .from("platform_settings").select("value").eq("key", "pricing").maybeSingle();
    const pricing = pricingRow?.value ?? {};
    const coverCharge = Number(pricing.cover_charge) || 500;
    const membershipPrice = Number(pricing.membership_price) || 199;
    const boostPrice = Number(pricing.featured_boost_price) || 999;
    const boostDays = Number(pricing.featured_boost_days) || 30;

    const notes: Record<string, string> = {
      user_id: user.id,
      payment_type,
    };
    let amount = 0;

    if (payment_type === "cover_charge") {
      if (!booking_id) return json({ error: "Booking is required" }, 400);
      const { data: booking } = await admin
        .from("bookings")
        .select("id, customer_id, cover_charge_paid")
        .eq("id", booking_id).maybeSingle();
      if (!booking) return json({ error: "Booking not found" }, 404);
      if (booking.customer_id !== user.id) return json({ error: "This is not your booking" }, 403);
      if (booking.cover_charge_paid) return json({ error: "Booking is already paid" }, 400);

      notes.booking_id = booking_id;

      // Member cover-charge benefit is decided here, not in the browser.
      const { data: mem } = await admin
        .from("memberships")
        .select("id")
        .eq("user_id", user.id).eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();
      amount = mem ? Math.round(coverCharge / 2) : coverCharge;

      // Referral discount is validated server-side against the referrals table.
      let referralUsed = false;
      if (referral_code) {
        const { data: ref } = await admin
          .from("referrals")
          .select("id, discount_amount, referrer_id")
          .eq("referral_code", referral_code).eq("used", false).maybeSingle();
        if (ref && ref.referrer_id !== user.id) {
          amount = Math.max(0, amount - Math.min(Number(ref.discount_amount) || 0, amount));
          notes.referral_code = referral_code;
          referralUsed = true;
        }
      }

      // Fully discounted — no order needed; settle it server-side now.
      if (amount === 0) {
        if (referralUsed) {
          await admin.from("referrals").update({ used: true, referred_id: user.id })
            .eq("referral_code", referral_code).eq("used", false);
        }
        await admin.from("bookings").update({ cover_charge_paid: true })
          .eq("id", booking_id).eq("customer_id", user.id).eq("cover_charge_paid", false);
        return json({ free: true, booking_id });
      }
    } else if (payment_type === "membership") {
      amount = membershipPrice;
    } else {
      // featured_boost — the caller must own the artist profile being boosted.
      if (!artist_id) return json({ error: "Artist is required" }, 400);
      const { data: artist } = await admin
        .from("artists").select("id").eq("id", artist_id).eq("user_id", user.id).maybeSingle();
      if (!artist) return json({ error: "You can only boost your own artist profile" }, 403);
      amount = boostPrice;
      notes.artist_id = artist_id;
      notes.boost_days = String(boostDays);
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return json({ error: "Razorpay not configured" }, 500);
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects paise
        currency: "INR",
        notes,
      }),
    });

    const order = await response.json();
    if (!response.ok) {
      return json({ error: order.error?.description || "Failed to create order" }, 400);
    }

    // Record the order server-side with the authoritative amount. The verify
    // step only completes payments that match this record.
    const { error: paymentInsertError } = await admin.from("payments").insert({
      booking_id: booking_id ?? null,
      customer_id: user.id,
      artist_id: notes.artist_id ?? null,
      amount,
      currency: "INR",
      payment_type,
      razorpay_order_id: order.id,
      status: "pending",
    });
    if (paymentInsertError) {
      // Do not return an order to the browser unless its server-side attribution
      // record exists; verification relies on this record as its source of truth.
      return json({ error: "Could not record payment order" }, 500);
    }

    return json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
