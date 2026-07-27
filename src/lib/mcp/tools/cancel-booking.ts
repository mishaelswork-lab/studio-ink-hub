import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "cancel_booking",
  title: "Cancel booking",
  description:
    "Cancel one of the signed-in user's bookings. Sets status to 'cancelled'. Optionally records a reason in the description.",
  inputSchema: {
    booking_id: z.string().uuid().describe("Booking to cancel."),
    reason: z.string().optional().describe("Optional cancellation reason (appended to description)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ booking_id, reason }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const sb = userClient(ctx);
    const patch: Record<string, unknown> = { status: "cancelled" };
    if (reason) {
      const { data: cur } = await sb.from("bookings").select("description").eq("id", booking_id).maybeSingle();
      patch.description = `${cur?.description ?? ""}\n[Cancelled: ${reason}]`.trim();
    }
    const { data, error } = await sb
      .from("bookings")
      .update(patch)
      .eq("id", booking_id)
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { cancelled: data },
    };
  },
});
