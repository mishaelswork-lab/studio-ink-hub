import { requireUser, guardCors } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...guardCors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: guardCors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await requireUser(req);
  if (auth.response) return auth.response;
  const user = auth.user;

  try {
    const body = await req.json().catch(() => ({}));
    const paymentType = typeof body.payment_type === "string" ? body.payment_type : "";
    const bookingId = typeof body.booking_id === "string" ? body.booking_id : null;
    const artistId = typeof body.artist_id === "string" ? body.artist_id : null;
    if (!["cover_charge", "membership", "featured_boost"].includes(paymentType)) {
      return json({ error: "Invalid payment type" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!supabaseUrl || !serviceKey || !keyId || !keySecret) {
      return json({ error: "Payment service is not configured" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: pricingRow, error: pricingError } = await admin
      .from("platform_settings").select("value").eq("key", "pricing").maybeSingle();
    if (pricingError || !pricingRow?.value) return json({ error: "Pricing configuration unavailable" }, 503);
    const pricing = pricingRow.value as Record<string, unknown>;

    const metadata: Record<string, unknown> = { payment_type: paymentType };
    let amountRupees = 0;
    let linkedArtistId: string | null = null;

    if (paymentType === "cover_charge") {
      if (!bookingId) return json({ error: "Booking is required" }, 400);
      const { data: booking, error } = await admin.from("bookings")
        .select("id, customer_id, status, hold_expires_at, cover_charge_paid, artist_id")
        .eq("id", bookingId).maybeSingle();
      if (error || !booking) return json({ error: "Booking not found" }, 404);
      if (booking.customer_id !== user.id) return json({ error: "Booking does not belong to this account" }, 403);
      if (booking.cover_charge_paid || !["held", "awaiting_payment"].includes(booking.status)) {
        return json({ error: "Booking is not awaiting payment" }, 409);
      }
      if (!booking.hold_expires_at || new Date(booking.hold_expires_at).getTime() <= Date.now()) {
        return json({ error: "Appointment hold expired. Please select another slot." }, 409);
      }
      const base = Number(pricing.cover_charge);
      if (!Number.isFinite(base) || base <= 0) return json({ error: "Invalid cover charge configuration" }, 503);
      amountRupees = base;
      const { data: membership } = await admin.from("memberships").select("id")
        .eq("user_id", user.id).eq("status", "active").or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`).limit(1).maybeSingle();
      if (membership) {
        const discount = Number(pricing.member_cover_charge_discount_percent ?? 0);
        if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
          return json({ error: "Invalid member discount configuration" }, 503);
        }
        amountRupees = Math.round(base * (100 - discount)) / 100;
        metadata.member_discount_percent = discount;
      }
      metadata.booking_id = bookingId;
      linkedArtistId = booking.artist_id ?? null;
    } else if (paymentType === "membership") {
      const price = Number(pricing.membership_price);
      if (!Number.isFinite(price) || price <= 0 || pricing.membership_duration !== "lifetime") {
        return json({ error: "Lifetime membership pricing is not configured correctly" }, 503);
      }
      amountRupees = price;
    } else {
      if (!artistId) return json({ error: "Artist is required" }, 400);
      const { data: artist } = await admin.from("artists").select("id")
        .eq("id", artistId).eq("user_id", user.id).maybeSingle();
      if (!artist) return json({ error: "You can only boost your own artist profile" }, 403);
      const price = Number(pricing.featured_boost_price);
      const days = Number(pricing.featured_boost_days);
      if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(days) || days < 1 || days > 365) {
        return json({ error: "Featured boost pricing is not configured correctly" }, 503);
      }
      amountRupees = price;
      linkedArtistId = artistId;
      metadata.boost_days = days;
    }

    const amountMinor = Math.round(amountRupees * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return json({ error: "Invalid payment amount" }, 400);

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({ amount: amountMinor, currency: "INR", notes: { user_id: user.id, ...metadata } }),
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok || order.amount !== amountMinor || order.currency !== "INR" || !order.id) {
      return json({ error: order.error?.description || "Razorpay order creation failed" }, 502);
    }

    const { data: paymentRow, error: insertError } = await admin.from("payments").insert({
      booking_id: bookingId,
      customer_id: user.id,
      artist_id: linkedArtistId,
      provider: "razorpay",
      provider_order_id: order.id,
      amount_minor: amountMinor,
      currency: "INR",
      payment_type: paymentType,
      status: "created",
      metadata,
    }).select("id").single();
    if (insertError || !paymentRow) {
      console.error("Payment order persistence failed", insertError?.message);
      return json({ error: "Could not safely record payment order. Do not retry payment; contact support if Razorpay shows an order." }, 503);
    }

    return json({
      payment_id: paymentRow.id,
      order_id: order.id,
      amount: amountMinor,
      currency: "INR",
      key_id: keyId,
    });
  } catch (error) {
    console.error("create-razorpay-order failed", error);
    return json({ error: "Unable to create payment order" }, 500);
  }
});
