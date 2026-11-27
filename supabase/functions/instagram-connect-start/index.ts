import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), appId = Deno.env.get("INSTAGRAM_APP_ID");
  const redirectUri = Deno.env.get("INSTAGRAM_REDIRECT_URI"), authHeader = req.headers.get("Authorization");
  if (!url || !anon || !service || !appId || !redirectUri) return json({ error: "Instagram connection is not configured" }, 503);
  if (!authHeader) return json({ error: "Authentication required" }, 401);
  const auth = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser();
  if (authError || !authData.user) return json({ error: "Authentication required" }, 401);
  let artistId = "";
  try { const body = await req.json(); artistId = typeof body?.artist_id === "string" ? body.artist_id : ""; }
  catch { return json({ error: "Invalid request" }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(artistId)) return json({ error: "Invalid artist" }, 400);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: artist } = await admin.from("artists").select("id,user_id").eq("id", artistId).maybeSingle();
  if (!artist || artist.user_id !== authData.user.id) return json({ error: "Artist access denied" }, 403);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  const { error } = await admin.from("instagram_oauth_states").insert({
    state, artist_id: artistId, user_id: authData.user.id, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) return json({ error: "Could not start Instagram connection" }, 500);
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "instagram_business_basic");
  authUrl.searchParams.set("state", state);
  return json({ auth_url: authUrl.toString() });
});
