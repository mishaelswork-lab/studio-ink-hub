import { requireUser } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req);
  if (auth.response) return auth.response;
  const user = auth.user;

  try {
    const body = await req.json();
    const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const suppliedSignature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
    if (!orderId || !paymentId || !suppliedSignature) {
      return json({ error: "Missing payment details" }, 400);
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!keyId || !keySecret || !supabaseUrl || !serviceKey) {
      return json({ error: "Payment service unavailable" }, 503);
    }

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw", encoder.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const signed = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(`${orderId}|${paymentId}`));
    const expectedSignature = Array.from(new Uint8Array(signed))
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (!constantTimeEqual(expectedSignature, suppliedSignature.toLowerCase())) {
      return json({ error: "Invalid payment signature" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: recorded, error: lookupError } = await admin.from("payments")
      .select("id, customer_id, provider, provider_order_id, provider_payment_id, amount_minor, currency, status")
      .eq("provider", "razorpay").eq("provider_order_id", orderId).maybeSingle();
    if (lookupError) return json({ error: "Could not verify recorded order" }, 500);
    if (!recorded) return json({ error: "Unknown payment order" }, 404);
    if (recorded.customer_id !== user.id) return json({ error: "Payment belongs to another user" }, 403);
    if (recorded.status === "captured") {
      return recorded.provider_payment_id === paymentId
        ? json({ success: true, already_processed: true })
        : json({ error: "Order has already been processed" }, 409);
    }
    if (!["created", "pending"].includes(recorded.status)) {
      return json({ error: "Payment is not in a payable state" }, 409);
    }

    const gatewayResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
    });
    const gatewayPayment = await gatewayResponse.json();
    if (!gatewayResponse.ok) return json({ error: "Could not confirm payment with Razorpay" }, 502);
    if (gatewayPayment.order_id !== orderId) return json({ error: "Payment does not match this order" }, 400);
    if (gatewayPayment.status !== "captured") return json({ error: "Payment has not been captured" }, 409);
    if (gatewayPayment.currency !== recorded.currency ||
        Number(gatewayPayment.amount) !== Number(recorded.amount_minor)) {
      return json({ error: "Gateway amount or currency does not match recorded order" }, 400);
    }

    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_razorpay_payment", {
      p_payment_id: recorded.id,
      p_provider_payment_id: paymentId,
      p_provider_signature: suppliedSignature,
    });
    if (finalizeError) {
      console.error("Payment finalization failed", finalizeError.message);
      return json({ error: "Payment was captured but finalization needs support review" }, 500);
    }
    return json({ success: true, ...finalized });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
