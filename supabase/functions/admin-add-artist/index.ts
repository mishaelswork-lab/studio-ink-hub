import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Account service unavailable");
    const supabaseAdmin = createClient(url, key);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, studio_name, specialty, bio, hourly_rate, experience_years } =
      await req.json();

    const bad = (msg: string) =>
      new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || email.length > 255) {
      return bad("Enter a valid email address");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return bad("Password must be at least 8 characters");
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 80) {
      return bad("Name must be between 2 and 80 characters");
    }
    if (bio && (typeof bio !== "string" || bio.length > 1500)) return bad("Bio must be 1500 characters or fewer");
    if (studio_name != null && (typeof studio_name !== "string" || studio_name.length > 80)) return bad("Studio name must be 80 characters or fewer");
    if (specialty != null && (typeof specialty !== "string" || specialty.length > 60)) return bad("Specialty must be 60 characters or fewer");

    const rate = Number(hourly_rate ?? 1500);
    if (!Number.isInteger(rate) || rate < 100 || rate > 50000) return bad("Hourly rate must be between 100 and 50000");
    const years = Number(experience_years ?? 0);
    if (!Number.isInteger(years) || years < 0 || years > 70) return bad("Experience years must be between 0 and 70");

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { display_name: name.trim() },
    });

    if (createErr) throw createErr;

    if (!newUser.user) throw new Error("Account creation failed");
    const userId = newUser.user.id;

    // Production artists.user_id references profiles(id); no auth.users
    // profile-creation trigger exists in this project, so create it explicitly.
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      display_name: name.trim(),
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not create artist profile");
    }

    // Add artist role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "artist" });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not create artist access");
    }

    // Create artist profile
    const slugBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "artist";
    const { data: artist, error: artistErr } = await supabaseAdmin.from("artists").insert({
      user_id: userId,
      slug: slugBase + "-" + userId.slice(0, 8),
      name: name.trim(),
      studio_name: studio_name?.trim() || null,
      specialty: specialty?.trim() || null,
      bio: bio?.trim() || null,
      hourly_rate: rate,
      experience_years: years,
      status: "pending",
      available: false,
    }).select().single();

    if (artistErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not create artist profile");
    }

    return new Response(JSON.stringify({ success: true, artist }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Could not create the artist account. Please try again or contact support." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
