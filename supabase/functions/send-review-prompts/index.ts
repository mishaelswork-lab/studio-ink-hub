// Sends review prompts 24h after a confirmed booking ends, if no review yet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../send-push/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, customer_id, artist_id, artists(name)")
      .eq("status", "confirmed")
      .eq("date", yesterday);

    let sent = 0;
    for (const b of bookings || []) {
      if (!b.customer_id) continue;
      const { data: existing } = await supabase.from("reviews").select("id").eq("booking_id", b.id).maybeSingle();
      if (existing) continue;
      const artistName = (b as any).artists?.name || "your artist";
      await sendPushToUser(b.customer_id, {
        title: "How was your session?",
        body: `Tell us about your experience with ${artistName}. Your review helps others choose.`,
        url: `/dashboard?review=${b.id}`,
        tag: `review-${b.id}`,
      });
      sent++;
    }
    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
