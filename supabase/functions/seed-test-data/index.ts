import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create artist test user
    const { data: artistUser, error: artistErr } = await supabaseAdmin.auth.admin.createUser({
      email: "artist123@artspace.com",
      password: "artist123",
      email_confirm: true,
      user_metadata: { display_name: "Arjun Mehta" },
    });

    if (artistErr && !artistErr.message.includes("already been registered")) {
      throw artistErr;
    }

    const artistUserId = artistUser?.user?.id;

    if (artistUserId) {
      // Add artist role
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: artistUserId, role: "artist" },
        { onConflict: "user_id,role" }
      );

      // Create artist profile
      await supabaseAdmin.from("artists").upsert({
        user_id: artistUserId,
        name: "Arjun Mehta",
        studio_name: "Ink Dynasty",
        specialty: "Japanese Traditional",
        bio: "Specializing in Japanese traditional tattoos with a modern twist.",
        avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
        hourly_rate: 3000,
        experience_years: 8,
        rating: 4.9,
        available: true,
        portfolio_images: [
          "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&q=80",
          "https://images.unsplash.com/photo-1590246815117-0b5bd96dd1f1?w=500&q=80",
          "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&q=80",
        ],
      }, { onConflict: "user_id" });
    }

    // Create admin user
    const { data: adminUser, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@artspace.com",
      password: "admin123",
      email_confirm: true,
      user_metadata: { display_name: "Admin" },
    });

    if (adminErr && !adminErr.message.includes("already been registered")) {
      throw adminErr;
    }

    const adminUserId = adminUser?.user?.id;
    if (adminUserId) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: adminUserId, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }

    return new Response(JSON.stringify({
      success: true,
      artist: { email: "artist123@artspace.com", password: "artist123", userId: artistUserId },
      admin: { email: "admin@artspace.com", password: "admin123", userId: adminUserId },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
