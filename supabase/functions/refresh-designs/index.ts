// Refreshes the daily tattoo stencil feed from Unsplash.
// Strictly targets black-and-white tattoo flash / stencil artwork on white background.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUERIES = [
  "tattoo stencil",
  "tattoo flash sheet",
  "blackwork tattoo design",
  "fine line tattoo drawing",
  "tattoo sketch black white",
  "tattoo linework design",
];

// Reject anything that mentions humans, skin, color, or lifestyle.
const HUMAN_TERMS = /\b(person|people|man|woman|girl|boy|face|portrait|selfie|hair|makeup|smile|beauty|couple|family|wedding|fashion|arm|leg|hand|back|chest|skin|body|model)\b/i;
const ART_TERMS = /\b(tattoo|stencil|flash|sketch|drawing|illustration|design|linework|blackwork|dotwork|line\s?art|ink)\b/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!key) throw new Error("UNSPLASH_ACCESS_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const rows: Record<string, unknown>[] = [];
    for (const q of QUERIES) {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&content_filter=high&color=black_and_white`;
      const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
      if (!r.ok) { console.error("unsplash err", q, r.status); continue; }
      const data = await r.json();
      for (const photo of data.results || []) {
        const blob = `${photo.alt_description || ""} ${photo.description || ""} ${(photo.tags || []).map((t: any) => t.title).join(" ")}`;
        if (HUMAN_TERMS.test(blob)) continue;
        if (!ART_TERMS.test(blob) && !ART_TERMS.test(q)) continue;
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

    let inserted = 0;
    if (rows.length) {
      const { error } = await supabase.from("daily_designs").upsert(rows, { onConflict: "external_id" });
      if (!error) inserted = rows.length;
    }

    const { data: oldRows } = await supabase
      .from("daily_designs").select("id").order("fetched_at", { ascending: false }).range(500, 9999);
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
