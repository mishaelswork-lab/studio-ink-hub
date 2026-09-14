import { requireUser } from "../_shared/guard.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _g = await requireUser(req);
  if (_g.response) return _g.response;

  try {
    const { messages } = await req.json();
    const MANUS_AI_API_KEY = Deno.env.get("MANUS_AI_API_KEY");
    if (!MANUS_AI_API_KEY) throw new Error("MANUS_AI_API_KEY is not configured");

    const systemMessage = {
      role: "system",
      content: `You are Tart's AI Tattoo Style Consultant — an expert in tattoo art, styles, and placement advice. You help customers discover the perfect tattoo style based on their personality and preferences.

You know about these India-based studios and artists:
- **Ink Dynasty** (Indiranagar, Bengaluru): Arjun Mehta (Japanese Traditional, ₹3000/hr), Priya Sharma (Watercolor & Illustrative, ₹2500/hr)
- **Sacred Skin Studio** (Koramangala, Bengaluru): Vikram Rathore (Geometric & Dotwork, ₹3500/hr), Neha Kapoor (Minimalist & Fine Line, ₹2000/hr)
- **Needle & Thread** (Jayanagar, Bengaluru): Rohan Desai (Blackwork & Tribal, ₹3000/hr)
- **Eternal Marks** (HSR Layout, Bengaluru): Aisha Khan (Realism & Portraits, ₹4000/hr)

When recommending, suggest specific artists and studios. Keep responses warm, knowledgeable, and concise. Use markdown formatting and emojis sparingly.`,
    };

    const response = await fetch("https://api.manus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANUS_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "manus-1",
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("Manus AI error:", status, text);

      // Fallback to Lovable AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log("Falling back to Lovable AI");
        const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });

        if (fallbackResponse.ok) {
          return new Response(fallbackResponse.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
      }

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
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
