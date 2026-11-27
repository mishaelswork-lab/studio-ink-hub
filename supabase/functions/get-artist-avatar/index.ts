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
  if (!url || !anonKey || !serviceKey) return json({ error: "Media service unavailable" }, 503);
  if (!authHeader) return json({ error: "Authentication required" }, 401);

  const auth = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser();
  if (authError || !authData.user) return json({ error: "Authentication required" }, 401);

  let artistId = "";
  try {
    const body = await req.json();
    artistId = typeof body?.artist_id === "string" ? body.artist_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(artistId)) return json({ error: "Invalid artist" }, 400);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: artist, error } = await admin.from("artists")
    .select("id,user_id,status,avatar_url").eq("id", artistId).maybeSingle();
  if (error || !artist || !artist.avatar_url) return json({ error: "Avatar not found" }, 404);
  const isOwner = !!userId && artist.user_id === userId;
  const isPublic = artist.status === "active";
  if (!isOwner && !isPublic) return json({ error: "Forbidden" }, 403);

  const objectPath = artist.avatar_url;
  if (typeof objectPath !== "string" || objectPath.startsWith("http") ||
      !objectPath.startsWith(`${artist.user_id}/${artist.id}/`)) {
    return json({ error: "Avatar path is invalid" }, 409);
  }
  const { data: signed, error: signError } = await admin.storage.from("portfolio-private").createSignedUrl(objectPath, 120);
  if (signError || !signed?.signedUrl) return json({ error: "Unable to access avatar" }, 500);
  return json({ signed_url: signed.signedUrl, expires_in: 120 });
});
