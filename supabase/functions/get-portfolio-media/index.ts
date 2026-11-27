import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !anonKey || !serviceKey || !authHeader) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  let itemId: string;
  try {
    const body = await req.json();
    itemId = typeof body?.item_id === "string" ? body.item_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(itemId)) return json({ error: "Invalid portfolio item" }, 400);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: item, error: itemError } = await admin
    .from("portfolio_items")
    .select("id, artist_id, media_url, approved, artists!inner(user_id, status)")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) return json({ error: "Media not found" }, 404);
  const artist = Array.isArray(item.artists) ? item.artists[0] : item.artists;
  const isOwner = artist?.user_id === authData.user.id;
  const isPublic = item.approved === true && artist?.status === "active";

  let isAdmin = false;
  if (!isOwner && !isPublic) {
    const { data: role } = await admin.from("user_roles")
      .select("user_id").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle();
    isAdmin = !!role;
  }
  if (!isOwner && !isPublic && !isAdmin) return json({ error: "Forbidden" }, 403);

  const objectPath = item.media_url;
  if (typeof objectPath !== "string" || objectPath.startsWith("http") ||
      !objectPath.startsWith(`${artist?.user_id}/${item.artist_id}/`)) {
    return json({ error: "Media path is invalid" }, 409);
  }

  const { data: signed, error: signError } = await admin.storage
    .from("portfolio-private")
    .createSignedUrl(objectPath, 120);
  if (signError || !signed?.signedUrl) return json({ error: "Unable to access media" }, 500);

  return json({ signed_url: signed.signedUrl, expires_in: 120 });
});
