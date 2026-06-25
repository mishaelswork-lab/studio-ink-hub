// Refreshes the daily tattoo design feed from Unsplash.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUERIES = ["tattoo", "tattoo art", "tattoo design", "blackwork tattoo", "fine line tattoo", "japanese tattoo"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!key) throw new Error("UNSPLASH_ACCESS_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let inserted = 0;
    const rows: Record<string, unknown>[] = [];
    for (const q of QUERIES) {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&content_filter=high&orientation=portrait`;
      const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
      if (!r.ok) { console.error("unsplash err", q, r.status); continue; }
      const data = await r.json();
      for (const photo of data.results || []) {
        rows.push({
          external_id: `unsplash:${photo.id}`,
          image_url: photo.urls.regular,
          thumb_url: photo.urls.small,
          source_url: photo.links.html,
          photographer: photo.user?.name,
          description: photo.alt_description || photo.description || q,
        });
      }
    }

    if (rows.length) {
      const { error } = await supabase.from("daily_designs").upsert(rows, { onConflict: "external_id" });
      if (!error) inserted = rows.length;
    }

    // Trim to most recent 500
    const { data: oldRows } = await supabase
      .from("daily_designs")
      .select("id")
      .order("fetched_at", { ascending: false })
      .range(500, 9999);
    if (oldRows && oldRows.length) {
      await supabase.from("daily_designs").delete().in("id", oldRows.map((r: any) => r.id));
    }

    return new Response(JSON.stringify({ inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
