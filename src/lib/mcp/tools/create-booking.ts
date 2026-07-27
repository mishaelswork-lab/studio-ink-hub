import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const COVER_CHARGE_INR = 500;

export default defineTool({
  name: "create_booking",
  title: "Create booking",
  description:
    "Create a tattoo or piercing booking for the signed-in user and initialize the ₹500 cover-charge Razorpay order. Returns the booking id plus a payment_intent the user completes at /booking to confirm.",
  inputSchema: {
    artist_id: z.string().uuid().describe("Artist to book with."),
    service_type: z.enum(["tattoo", "piercing"]).describe("Service being booked."),
    date: z.string().min(1).describe("Preferred date, e.g. 2026-08-14."),
    time: z.string().min(1).describe("Preferred time slot, e.g. 3:00 PM."),
    style: z.string().min(1).describe("Tattoo style or piercing type (e.g. 'Fine line', 'Helix')."),
    placement: z.string().min(1).describe("Body placement, e.g. 'left forearm'."),
    size: z.string().optional().describe("Approx size (Small/Medium/Large). Defaults to Medium."),
    description: z.string().optional().describe("Any extra detail for the artist."),
    customer_name: z.string().min(1).describe("Customer's full name."),
    customer_phone: z.string().optional().describe("Contact phone number."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const sb = userClient(ctx);
    const styleTagged = input.service_type === "piercing" ? `[Piercing] ${input.style}` : input.style;

    const { data: booking, error } = await sb
      .from("bookings")
      .insert({
        customer_id: ctx.getUserId(),
        artist_id: input.artist_id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone ?? null,
        date: input.date,
        time: input.time,
        style: styleTagged,
        placement: input.placement,
        size: input.size ?? "Medium",
        description: input.description ?? null,
        status: "pending",
        total_estimate: 0,
      })
      .select()
      .maybeSingle();

    if (error || !booking)
      return { content: [{ type: "text", text: error?.message ?? "Failed to create booking" }], isError: true };

    // Try to create a Razorpay order for the cover charge. Non-fatal if it fails.
    let paymentIntent: unknown = null;
    let paymentNote: string | null = null;
    try {
      const resp = await fetch(`${process.env.SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.getToken()}`,
          apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({
          amount: COVER_CHARGE_INR,
          currency: "INR",
          booking_id: booking.id,
          payment_type: "cover_charge",
        }),
      });
      const body = await resp.json();
      if (resp.ok) paymentIntent = body;
      else paymentNote = body?.error ?? `Razorpay order failed (HTTP ${resp.status})`;
    } catch (e) {
      paymentNote = (e as Error).message;
    }

    const summary = {
      booking_id: booking.id,
      status: booking.status,
      service_type: input.service_type,
      cover_charge_inr: COVER_CHARGE_INR,
      payment_intent: paymentIntent,
      payment_note: paymentNote,
      complete_payment_url: `/booking?resume=${booking.id}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
