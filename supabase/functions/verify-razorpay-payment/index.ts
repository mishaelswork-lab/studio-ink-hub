import { requireUser } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _g = await requireUser(req);
  if (_g.response) return _g.response;

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id, artist_id, customer_id, amount, payment_type } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing payment details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
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
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Record payment — always attributed to the signed-in caller, never the client-supplied id
    await supabaseAdmin.from("payments").insert({
      booking_id,
      customer_id: _g.user.id,
      artist_id,
      amount,
      payment_type,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: "completed",
    });


    // Update booking if cover charge
    if (booking_id && payment_type === "cover_charge") {
      await supabaseAdmin.from("bookings").update({ cover_charge_paid: true }).eq("id", booking_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
