import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_artists",
  title: "List artists",
  description: "List tattoo artists on ArtSpace with optional style filter.",
  inputSchema: {
    style: z.string().optional().describe("Filter by tattoo style substring (case-insensitive)."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ style, limit }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase.from("artists").select("id, name, style, studio_name, studio_location, hourly_rate, bio, avatar_url").limit(limit ?? 20);
    if (style) q = q.ilike("style", `%${style}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { artists: data ?? [] },
    };
  },
});
