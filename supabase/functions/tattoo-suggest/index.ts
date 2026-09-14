import { requireUser } from "../_shared/guard.ts";
// Suggests 10 tattoo designs that suit a body area photo (or text description).
// Uses Lovable AI Gateway (multimodal) for design ideas, Unsplash for sample imagery.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Suggestion {
  title: string;
  style: string;
  description: string;
  placement: string;
  size: string;
  keyword: string;
  image?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _g = await requireUser(req);
  if (_g.response) return _g.response;

  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, bodyArea, notes } = body as {
      imageBase64?: string; bodyArea?: string; notes?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const UNSPLASH = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userParts: any[] = [];
    if (imageBase64) {
      userParts.push({ type: "image_url", image_url: { url: imageBase64 } });
    }
    userParts.push({
      type: "text",
      text: `You are a senior tattoo art consultant. Based on the ${imageBase64 ? "photo of the body area" : "body area description"}${bodyArea ? ` (${bodyArea})` : ""}${notes ? `, customer notes: ${notes}` : ""}, propose exactly 10 tattoo designs that would look great there. Consider anatomy, flow, scale, and aesthetics. STRICTLY return tattoo art only — no other content.`,
    });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You ONLY discuss tattoo art and design. Refuse anything else." },
          { role: "user", content: userParts },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_tattoos",
            description: "Return 10 tattoo design suggestions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  minItems: 10, maxItems: 10,
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      style: { type: "string", description: "e.g. Fine line, Geometric, Japanese, Watercolor" },
                      description: { type: "string" },
                      placement: { type: "string" },
                      size: { type: "string", enum: ["Small", "Medium", "Large"] },
                      keyword: { type: "string", description: "1-3 word search query for an inspiration image" },
                    },
                    required: ["title", "style", "description", "placement", "size", "keyword"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_tattoos" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: status === 429 ? "Rate limit, please try shortly." : status === 402 ? "AI credits exhausted." : "AI failed" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { suggestions: [] };
    const suggestions: Suggestion[] = args.suggestions || [];

    // Hydrate with Unsplash thumbnails (parallel, best-effort).
    if (UNSPLASH && suggestions.length) {
      await Promise.all(suggestions.map(async (s) => {
        try {
          const q = encodeURIComponent(`${s.keyword} tattoo`);
          const r = await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=portrait`, {
            headers: { Authorization: `Client-ID ${UNSPLASH}` },
          });
          if (r.ok) {
            const j = await r.json();
            s.image = j.results?.[0]?.urls?.small;
          }
        } catch (_) { /* ignore */ }
      }));
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tattoo-suggest error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
