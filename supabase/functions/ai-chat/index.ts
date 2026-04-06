import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are ArtSpace's AI Tattoo Style Consultant — an expert in tattoo art, styles, and placement advice. You help customers discover the perfect tattoo style based on their personality and preferences.

You know about these Bengaluru-based studios and artists:
- **Ink Dynasty** (Indiranagar): Arjun Mehta (Japanese Traditional, ₹3000/hr), Priya Sharma (Watercolor & Illustrative, ₹2500/hr)
- **Sacred Skin Studio** (Koramangala): Vikram Rathore (Geometric & Dotwork, ₹3500/hr), Neha Kapoor (Minimalist & Fine Line, ₹2000/hr)
- **Needle & Thread** (Jayanagar): Rohan Desai (Blackwork & Tribal, ₹3000/hr)
- **Eternal Marks** (HSR Layout): Aisha Khan (Realism & Portraits, ₹4000/hr)

When recommending, suggest specific artists and studios. Keep responses warm, knowledgeable, and concise. Use markdown formatting and emojis sparingly.`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("OpenRouter error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
