import { requireUser } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await requireUser(req);
  if (auth.response) return auth.response;
  const user = auth.user;

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const suppliedSignature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
    if (!orderId || !paymentId || !suppliedSignature) return json({ error: "Missing payment details" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!supabaseUrl || !serviceKey || !keyId || !keySecret) {
      return json({ error: "Payment service is not configured" }, 503);
    }

    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(keySecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );
    const signatureBytes = hexToBytes(suppliedSignature);
    if (!signatureBytes || !await crypto.subtle.verify(
      "HMAC", key, signatureBytes, new TextEncoder().encode(`${orderId}|${paymentId}`),
    )) {
      return json({ error: "Invalid payment signature" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: paymentRow, error: lookupError } = await admin.from("payments")
      .select("id, customer_id, provider, provider_order_id, amount_minor, currency, status")
      .eq("provider_order_id", orderId).eq("provider", "razorpay").maybeSingle();
    if (lookupError || !paymentRow) return json({ error: "Payment order not found" }, 404);
    if (paymentRow.customer_id !== user.id) return json({ error: "Payment order belongs to another account" }, 403);
    if (paymentRow.currency !== "INR" || !Number.isSafeInteger(Number(paymentRow.amount_minor)) ||
        Number(paymentRow.amount_minor) <= 0) {
      return json({ error: "Stored payment attribution is invalid" }, 409);
    }
    if (paymentRow.status === "captured") {
      return json({ success: true, already_processed: true });
    }
    if (!["created", "pending"].includes(paymentRow.status)) {
      return json({ error: "Payment order is not payable" }, 409);
    }

    const gatewayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) } },
    );
    const gatewayPayment = await gatewayResponse.json();
    if (!gatewayResponse.ok) return json({ error: "Could not verify payment with Razorpay" }, 502);
    if (gatewayPayment.order_id !== orderId ||
        Number(gatewayPayment.amount) !== Number(paymentRow.amount_minor) ||
        gatewayPayment.currency !== "INR") {
      return json({ error: "Gateway payment does not match the recorded order" }, 409);
    }
    // The canonical finalizer only grants entitlements for captured payments.
    if (gatewayPayment.status !== "captured") {
      return json({ error: "Payment has not been captured. No booking or membership was activated." }, 409);
    }

    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_razorpay_payment", {
      p_payment_id: paymentRow.id,
      p_provider_payment_id: paymentId,
      p_provider_signature: suppliedSignature,
    });
    if (finalizeError || finalized?.success !== true) {
      console.error("Payment finalization failed", finalizeError?.message ?? finalized);
      return json({ error: "Payment was received but account activation could not be confirmed. Contact support; do not pay again." }, 503);
    }
    return json({ success: true, already_processed: finalized.already_processed === true });
  } catch (error) {
    console.error("verify-razorpay-payment failed", error);
    return json({ error: "Unable to verify payment" }, 500);
  }
});
