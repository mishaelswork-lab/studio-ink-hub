import { requireUser } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req);
  if (!auth.user) return auth.response ?? json({ error: "Sign in required" }, 401);
  const user = auth.user;

  try {
    const body = await req.json().catch(() => ({}));
    const paymentType = typeof body.payment_type === "string" ? body.payment_type : "cover_charge";
    const bookingId = typeof body.booking_id === "string" ? body.booking_id : null;
    const artistId = typeof body.artist_id === "string" ? body.artist_id : null;
    if (!["cover_charge", "membership", "featured_boost"].includes(paymentType)) {
      return json({ error: "Invalid payment type" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Payment service unavailable" }, 503);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: accountState, error: accountStateError } = await admin
      .from("profiles").select("deletion_pending_at").eq("id", user.id).maybeSingle();
    if (accountStateError) return json({ error: "Could not verify account status" }, 500);
    if (!accountState || accountState.deletion_pending_at) {
      return json({ error: "Account deletion is in progress; new payments are disabled" }, 409);
    }

    const { data: setting, error: settingError } = await admin
      .from("platform_settings").select("value").eq("key", "pricing").maybeSingle();
    if (settingError) return json({ error: "Pricing configuration unavailable" }, 503);
    const pricing = setting?.value ?? {};
    let amountRupees: number;
    const metadata: Record<string, number> = {};
    let resolvedArtistId: string | null = null;

    if (paymentType === "cover_charge") {
      if (!bookingId) return json({ error: "Booking is required" }, 400);
      const { data: booking, error } = await admin.from("bookings")
        .select("id, customer_id, status, cover_charge_paid, hold_expires_at")
        .eq("id", bookingId).maybeSingle();
      if (error) return json({ error: "Could not verify booking" }, 500);
      if (!booking) return json({ error: "Booking not found" }, 404);
      if (booking.customer_id !== user.id) return json({ error: "This is not your booking" }, 403);
      if (booking.cover_charge_paid) return json({ error: "Booking is already paid" }, 409);
      if (!["held", "awaiting_payment"].includes(booking.status)) {
        return json({ error: "Booking is not awaiting payment" }, 409);
      }
      if (!booking.hold_expires_at || Date.parse(booking.hold_expires_at) <= Date.now()) {
        return json({ error: "Booking hold has expired. Please choose another time." }, 409);
      }
      const base = Number(pricing.cover_charge);
      if (!Number.isSafeInteger(base) || base <= 0) {
        return json({ error: "Cover-charge pricing is not configured" }, 503);
      }
      const { data: membership, error: membershipError } = await admin.from("memberships")
        .select("id").eq("user_id", user.id).eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .limit(1).maybeSingle();
      if (membershipError) return json({ error: "Could not verify membership benefit" }, 500);
      const discountPercent = Number(pricing.member_cover_charge_discount_percent ?? 0);
      if (!Number.isSafeInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return json({ error: "Membership discount configuration is invalid" }, 503);
      }
      amountRupees = membership ? base * (100 - discountPercent) / 100 : base;
    } else if (paymentType === "membership") {
      const { data: activeMembership, error: activeMembershipError } = await admin.from("memberships")
        .select("id").eq("user_id", user.id).eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .limit(1).maybeSingle();
      if (activeMembershipError) return json({ error: "Could not verify current membership" }, 500);
      if (activeMembership) return json({ error: "You already have an active lifetime membership" }, 409);
      amountRupees = Number(pricing.membership_price);
      if (!Number.isSafeInteger(amountRupees) || amountRupees <= 0 ||
          pricing.membership_duration !== "lifetime") {
        return json({ error: "Membership pricing is not configured" }, 503);
      }
    } else {
      if (!artistId) return json({ error: "Artist is required" }, 400);
      const { data: artist, error } = await admin.from("artists")
        .select("id,status").eq("id", artistId).eq("user_id", user.id).eq("status", "active").maybeSingle();
      if (error) return json({ error: "Could not verify artist ownership" }, 500);
      if (!artist) return json({ error: "Only your approved, active artist profile can be featured" }, 403);
      amountRupees = Number(pricing.featured_boost_price);
      const days = Number(pricing.featured_boost_days);
      if (!Number.isSafeInteger(amountRupees) || amountRupees <= 0 ||
          !Number.isSafeInteger(days) || days < 1 || days > 365) {
        return json({ error: "Featured boost pricing is not configured" }, 503);
      }
      metadata.boost_days = days;
      resolvedArtistId = artistId;
    }

    const amountMinor = amountRupees * 100;
    if (!Number.isSafeInteger(amountMinor)) return json({ error: "Invalid configured amount" }, 503);

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Razorpay not configured" }, 503);

    let orderExpiresAt: number | null = null;
    if (paymentType === "cover_charge" && bookingId) {
      // Extend the slot hold for the same bounded period as the Razorpay order.
      orderExpiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
      const { data: heldBooking, error: holdError } = await admin.from("bookings")
        .update({ hold_expires_at: new Date(orderExpiresAt * 1000).toISOString() })
        .eq("id", bookingId).eq("customer_id", user.id)
        .in("status", ["held", "awaiting_payment"])
        .gt("hold_expires_at", new Date().toISOString())
        .select("id").maybeSingle();
      if (holdError || !heldBooking) {
        return json({ error: "Booking hold expired. Please choose another time." }, 409);
      }
    }

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: "INR",
        ...(orderExpiresAt ? { expire_by: orderExpiresAt } : {}),
        notes: { user_id: user.id, payment_type: paymentType, booking_id: bookingId ?? "", artist_id: resolvedArtistId ?? "" },
      }),
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      return json({ error: order.error?.description || "Failed to create order" }, 502);
    }

    const { error: insertError } = await admin.from("payments").insert({
      booking_id: bookingId,
      customer_id: user.id,
      artist_id: resolvedArtistId,
      provider: "razorpay",
      provider_order_id: order.id,
      amount_minor: amountMinor,
      currency: "INR",
      payment_type: paymentType,
      metadata,
      status: "created",
    });
    if (insertError) {
      // Do not expose an untracked gateway order to the client.
      return json({ error: "Could not securely record payment order" }, 500);
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
