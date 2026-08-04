import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find users inactive for 3+ days who have at least one booking (engaged users)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inactiveProfiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, last_active_at")
      .lt("last_active_at", threeDaysAgo);

    if (error) throw error;

    const results = [];
    for (const profile of inactiveProfiles || []) {
      // Check if they have bookings (they're real engaged users)
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", profile.user_id);

      if ((count || 0) > 0) {
        results.push({
          user_id: profile.user_id,
          name: profile.display_name,
          last_active: profile.last_active_at,
          message: `Hey ${profile.display_name || "there"}! Your favourite artists have new availability. Come check out what's new on Tart!`,
        });
      }
    }

    console.log(`Found ${results.length} inactive users for re-engagement`);

    return new Response(JSON.stringify({ success: true, count: results.length, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Re-engagement error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
