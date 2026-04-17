// Classifies an image URL as tattoo/art using Lovable AI Gemini vision.
// Returns { allowed: boolean, reason: string }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) throw new Error("imageUrl required");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You classify images for a tattoo art platform. Respond ONLY in compact JSON: {\"allowed\":true|false,\"reason\":\"...\"}. Allowed = tattoo art, tattoo design sketches, body-art photos, art ideas/inspiration drawings. Disallowed = anything unrelated (food, real people unrelated to tattoos, brands, NSFW non-art, scenery without art, screenshots, memes)." },
          { role: "user", content: [
            { type: "text", text: "Is this image a tattoo or tattoo-art idea suitable for a tattoo platform?" },
            { type: "image_url", image_url: { url: imageUrl } },
          ]},
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI gateway ${r.status}: ${t}`);
    }
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { parsed = { allowed: false, reason: "parse error" }; }
    return new Response(JSON.stringify({ allowed: !!parsed.allowed, reason: parsed.reason || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, allowed: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
