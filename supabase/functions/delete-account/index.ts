import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const userId = userData.user.id;

    const admin = createClient(url, serviceKey);

    // Block deletion while money-bearing commitments are open.
    const { data: openBookings } = await admin
      .from("bookings")
      .select("id")
      .eq("customer_id", userId)
      .in("status", ["pending", "accepted", "confirmed"]);
    if (openBookings && openBookings.length > 0) {
      return json(
        { error: "You have upcoming bookings. Please cancel or complete them before deleting your account." },
        409,
      );
    }

    const { data: artistRow } = await admin
      .from("artists").select("id").eq("user_id", userId).maybeSingle();
    if (artistRow) {
      const { data: artistBookings } = await admin
        .from("bookings").select("id").eq("artist_id", artistRow.id)
        .in("status", ["pending", "accepted", "confirmed"]);
      if (artistBookings && artistBookings.length > 0) {
        return json(
          { error: "You have active client bookings. Please settle or cancel them before deleting your account." },
          409,
        );
      }
    }

    // Consultations this user is part of (messages cascade with the consultation).
    const { data: consults } = await admin
      .from("consultations").select("id")
      .or(`customer_id.eq.${userId},artist_id.eq.${userId}`);
    const consultIds = (consults || []).map(c => c.id);
    if (consultIds.length) {
      await admin.from("consultation_messages").delete().in("consultation_id", consultIds);
      await admin.from("consultations").delete().in("id", consultIds);
    }

    // Personal data — hard delete.
    await Promise.all([
      admin.from("favorites").delete().eq("user_id", userId),
      admin.from("design_views").delete().eq("user_id", userId),
      admin.from("push_subscriptions").delete().eq("user_id", userId),
      admin.from("booking_notifications").delete().eq("user_id", userId),
      admin.from("consent_records").delete().eq("user_id", userId),
      admin.from("content_reports").delete().eq("reporter_id", userId),
      admin.from("design_reports").delete().eq("reporter_id", userId),
      admin.from("user_blocks").delete().eq("blocker_id", userId),
      admin.from("user_blocks").delete().eq("blocked_id", userId),
      admin.from("memberships").delete().eq("user_id", userId),
      admin.from("reviews").delete().eq("customer_id", userId),
      admin.from("profiles").delete().eq("user_id", userId),
      admin.from("user_roles").delete().eq("user_id", userId),
    ]);

    // Artist-owned content.
    if (artistRow) {
      await admin.from("reels").delete().eq("artist_id", artistRow.id);
      await admin.from("artist_certifications").delete().eq("artist_id", artistRow.id);
      await admin.from("featured_artists").delete().eq("artist_id", artistRow.id);
      await admin.from("featured_requests").delete().eq("artist_id", artistRow.id);
      await admin.from("artists").delete().eq("id", artistRow.id);
    }

    // Financial / dispute records are retained but de-identified.
    await admin.from("bookings")
      .update({ customer_id: null, customer_name: "Deleted user", customer_phone: null, description: null })
      .eq("customer_id", userId);
    await admin.from("payments").update({ customer_id: null }).eq("customer_id", userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: "Account deletion failed. Please contact support." }, 500);

    return json({ success: true });
  } catch {
    return json({ error: "Account deletion failed. Please contact support." }, 500);
  }
});
