import { requireUser } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Payment verification is fully server-side: the browser only relays the
// Razorpay response ids. The amount, booking attribution and any entitlement
// (membership, featured boost) come from the server-recorded order — never
// from values the client posts.

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing payment details" }, 400);
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Razorpay not configured" }, 500);

    // 1. Signature check: order_id|payment_id signed with the key secret.
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(keySecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC", key, encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`)
    );
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    if (expectedSignature !== razorpay_signature) {
      return json({ error: "Invalid signature" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 2. Ask Razorpay what actually happened — never trust client amounts.
    const rzpAuth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: rzpAuth },
    });
    const payment = await payRes.json();
    if (!payRes.ok) return json({ error: "Could not confirm payment with the gateway" }, 400);
    if (payment.order_id !== razorpay_order_id) {
      return json({ error: "Payment does not match this order" }, 400);
    }
    // Razorpay's "authorized" state is not a completed/captured payment.
    // Never grant booking or membership entitlements until capture is confirmed.
    if (payment.status !== "captured") {
      return json({ error: `Payment not captured (status: ${payment.status})` }, 400);
    }

    // 3. Match against the server-recorded pending order.
    const { data: pending, error: pendingError } = await admin
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("status", "pending")
      .maybeSingle();
    if (pendingError) return json({ error: "Could not verify the pending order" }, 500);
    if (!pending) return json({ error: "Unknown or already processed order" }, 404);
    if (pending.customer_id !== user.id) {
      return json({ error: "This order belongs to a different user" }, 403);
    }
    if (Number(payment.amount) !== Number(pending.amount) * 100) {
      return json({ error: "Payment amount does not match the order" }, 400);
    }

    // 4. Complete the payment record with the authoritative amounts.
    const { error: paymentUpdateError } = await admin.from("payments").update({
      status: "completed",
      razorpay_payment_id,
      razorpay_signature,
      amount: Math.round(Number(payment.amount) / 100),
      artist_id: pending.artist_id ?? null,
      booking_id: pending.booking_id ?? null,
    }).eq("id", pending.id).eq("status", "pending");
    if (paymentUpdateError) {
      return json({ error: "Could not record captured payment" }, 500);
    }

    // 5. Entitlements are applied here, server-side.
    if (pending.payment_type === "cover_charge" && pending.booking_id) {
      const { error: bookingUpdateError } = await admin.from("bookings").update({ cover_charge_paid: true })
        .eq("id", pending.booking_id)
        .eq("customer_id", user.id)
        .eq("cover_charge_paid", false);
      if (bookingUpdateError) return json({ error: "Payment captured; booking update requires reconciliation" }, 500);
      // Consume the referral discount that was validated at order creation.
      const notesRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: rzpAuth },
      });
      const orderInfo = await notesRes.json();
      const referralCode = String(orderInfo?.notes?.referral_code || "");
      if (referralCode) {
        const { error: referralError } = await admin.from("referrals").update({ used: true, referred_id: user.id })
          .eq("referral_code", referralCode).eq("used", false);
        if (referralError) return json({ error: "Payment captured; referral update requires reconciliation" }, 500);
      }
    }

    if (pending.payment_type === "membership") {
      const { data: pricingRow, error: pricingError } = await admin
        .from("platform_settings").select("value").eq("key", "pricing").maybeSingle();
      if (pricingError) return json({ error: "Payment captured; membership pricing lookup requires reconciliation" }, 500);
      const months = Number(pricingRow?.value?.membership_months) || 3;
      const { data: existing, error: membershipLookupError } = await admin
        .from("memberships")
        .select("id, expires_at")
        .eq("user_id", user.id).eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (membershipLookupError) return json({ error: "Payment captured; membership lookup requires reconciliation" }, 500);
      const base = existing?.expires_at ? new Date(existing.expires_at) : new Date();
      const expires = new Date(base);
      expires.setMonth(expires.getMonth() + months);
      const membershipWrite = existing
        ? await admin.from("memberships").update({ expires_at: expires.toISOString() }).eq("id", existing.id)
        : await admin.from("memberships").insert({
          user_id: user.id,
          plan: "premium",
          amount: Math.round(Number(payment.amount) / 100),
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: expires.toISOString(),
        });
      if (membershipWrite.error) return json({ error: "Payment captured; membership activation requires reconciliation" }, 500);
    }

    if (pending.payment_type === "featured_boost" && pending.artist_id) {
      const { data: pricingRow, error: pricingError } = await admin
        .from("platform_settings").select("value").eq("key", "pricing").maybeSingle();
      if (pricingError) return json({ error: "Payment captured; boost pricing lookup requires reconciliation" }, 500);
      const days = Number(pricingRow?.value?.featured_boost_days) || 30;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      const { data: existing, error: boostLookupError } = await admin
        .from("featured_artists").select("id").eq("artist_id", pending.artist_id).maybeSingle();
      if (boostLookupError) return json({ error: "Payment captured; boost lookup requires reconciliation" }, 500);
      const boostWrite = existing
        ? await admin.from("featured_artists").update({ active: true, expires_at: expires.toISOString() })
          .eq("id", existing.id)
        : await admin.from("featured_artists").insert({
          artist_id: pending.artist_id,
          active: true,
          priority: 1,
          expires_at: expires.toISOString(),
        });
      if (boostWrite.error) return json({ error: "Payment captured; boost activation requires reconciliation" }, 500);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
