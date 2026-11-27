import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_artist",
  title: "Get artist",
  description: "Fetch a single artist's full public profile by id.",
  inputSchema: { id: z.string().uuid().describe("Artist id (UUID).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from("artists").select("id, name, slug, bio, styles, specialty, studio_name, city, country, hourly_rate, experience_years, avatar_url, available, status, verified_at").eq("id", id).eq("status", "active").maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Artist not found" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { artist: data } };
  },
});
