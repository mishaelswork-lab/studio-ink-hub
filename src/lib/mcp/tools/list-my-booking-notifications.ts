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
  name: "list_my_booking_notifications",
  title: "List booking notifications",
  description:
    "List booking status-change notifications (accepted/rejected/cancelled/updated) for the signed-in user. Poll this to proactively inform the user of new updates.",
  inputSchema: {
    unread_only: z.boolean().optional().describe("Only return unread notifications."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unread_only, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = userClient(ctx)
      .from("booking_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (unread_only) q = q.is("read_at", null);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { notifications: data ?? [] },
    };
  },
});
