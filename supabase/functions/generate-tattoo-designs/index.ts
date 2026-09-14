import { requireUser } from "../_shared/guard.ts";
// Generates black-and-white tattoo stencil designs based on user-uploaded art.
// Uses Lovable AI Gateway Gemini image model.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VARIATIONS = [
  "fine-line minimalist",
  "bold blackwork with heavy shading",
  "dotwork stippled",
  "neo-traditional linework",
  "geometric symmetrical",
  "sketchy hand-drawn",
];

const buildPrompt = (variation: string, notes: string) =>
  `Create a professional black-and-white tattoo stencil design incorporating the reference art in the image. Style: ${variation}. ${notes ? `Additional theme: ${notes}. ` : ""}Requirements: strictly BLACK INK on a clean solid WHITE BACKGROUND, high-contrast stencil-ready linework, no color, no gradients other than tattoo shading, no human skin, no photograph — pure tattoo flash / stencil artwork suitable for printing and tracing. Centered composition with margins. No text or watermarks.`;

async function generateOne(apiKey: string, imageBase64: string, variation: string, notes: string): Promise<string | null> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: buildPrompt(variation, notes) },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) { console.error("gen err", variation, r.status, await r.text()); return null; }
  const data = await r.json();
  const b64 = data?.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _g = await requireUser(req);
  if (_g.response) return _g.response;
  try {
    const { imageBase64, notes, count } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 required");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const n = Math.max(1, Math.min(count || 6, VARIATIONS.length));
    const chosen = VARIATIONS.slice(0, n);
    const results = await Promise.all(chosen.map(v => generateOne(apiKey, imageBase64, v, notes || "")));
    const designs = results
      .map((image, i) => image ? { title: `Design ${i + 1}`, style: chosen[i], image } : null)
      .filter(Boolean);

    if (!designs.length) throw new Error("Generation failed. Please retry.");

    return new Response(JSON.stringify({ designs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    const status = /rate|429/i.test(msg) ? 429 : /credit|402/i.test(msg) ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
