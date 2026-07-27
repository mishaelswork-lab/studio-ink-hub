// Refreshes daily designs from a curated Pinterest board via its public RSS feed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOARD_RSS = Deno.env.get("PINTEREST_BOARD_RSS")
  || "https://www.pinterest.com/mishaelworkonly/art-stencils.rss";

// Extract items from RSS
function parseItems(xml: string) {
  const items: { pinId: string; link: string; img: string; title: string }[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const link = /<link>([^<]+)<\/link>/.exec(block)?.[1]?.trim() || "";
    const guid = /<guid[^>]*>([^<]+)<\/guid>/.exec(block)?.[1]?.trim() || link;
    const title = (/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] || "").trim();
    const desc = /<description>([\s\S]*?)<\/description>/.exec(block)?.[1] || "";
    // description is HTML-escaped; decode &quot; then find <img src="...">
    const decoded = desc.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const img = /<img\s+src="([^"]+)"/i.exec(decoded)?.[1] || "";
    const pinId = /\/pin\/(\d+)/.exec(guid)?.[1] || "";
    if (pinId && img) items.push({ pinId, link, img, title });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const r = await fetch(BOARD_RSS, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    const xml = await r.text();
    if (!r.ok) throw new Error(`Pinterest RSS ${r.status}: ${xml.slice(0, 200)}`);
    const items = parseItems(xml);
    console.log("fetched", xml.length, "bytes, parsed", items.length, "items");

    const rows = items.map((it) => {
      // Upgrade thumbnail to a larger image; 736x is reliably served.
      const full = it.img.replace(/\/(60x60_RS|236x|474x|564x)\//, "/736x/");
      return {
        external_id: `pinterest:${it.pinId}`,
        image_url: full,
        thumb_url: it.img,
        source_url: it.link,
        photographer: null,
        description: it.title || "Tattoo stencil",
      };
    });

    let inserted = 0;
    if (rows.length) {
      const { error } = await supabase
        .from("daily_designs")
        .upsert(rows, { onConflict: "external_id" });
      if (error) throw error;
      inserted = rows.length;
    }

    return new Response(JSON.stringify({ inserted, items: items.length, bytes: xml.length, hasItem: xml.includes("<item>"), sample: xml.slice(400, 1400), board: BOARD_RSS }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
