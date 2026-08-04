// Notify the other party of a new consultation message via web push
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { consultationId, senderId, preview } = await req.json();
    if (!consultationId || !senderId) {
      return new Response(JSON.stringify({ error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: c } = await supabase.from("consultations")
      .select("customer_id, artist_id").eq("id", consultationId).maybeSingle();
    if (!c) return new Response(JSON.stringify({ ok: true, skipped: "no-consultation" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const recipientId = c.customer_id === senderId ? c.artist_id : c.customer_id;
    if (!recipientId) return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") || "mailto:hello@tart.app",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", recipientId);
    let sent = 0;
    const payload = JSON.stringify({
      title: "New message on Tart",
      body: (preview || "You have a new reply").slice(0, 140),
      url: `/chats/${consultationId}`,
      tag: `chat-${consultationId}`,
    });
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
