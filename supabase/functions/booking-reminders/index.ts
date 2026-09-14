import { requireInternal } from "../_shared/guard.ts";
// Sends booking reminder push notifications at T-1h, T-30m, T-15m.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "./_push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _g = await requireInternal(req);
  if (_g.response) return _g.response;
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const in75 = new Date(now.getTime() + 75 * 60 * 1000);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, customer_id, customer_name, date, time, artist_id, artists(name)")
      .eq("status", "confirmed")
      .gte("date", now.toISOString().slice(0, 10))
      .lte("date", in75.toISOString().slice(0, 10));

    let sent = 0;
    for (const b of bookings || []) {
      if (!b.customer_id) continue;
      const start = new Date(`${b.date}T${b.time}:00+05:30`);
      const minsLeft = Math.round((start.getTime() - now.getTime()) / 60000);
      const hit = [60, 30, 15].find(m => Math.abs(minsLeft - m) <= 2);
      if (!hit) continue;
      const artistName = (b as any).artists?.name || "your artist";
      await sendPushToUser(b.customer_id, {
        title: `Booking in ${hit} min`,
        body: `Your session with ${artistName} starts at ${b.time}. Get ready!`,
        url: "/dashboard",
        tag: `booking-${b.id}-${hit}`,
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
