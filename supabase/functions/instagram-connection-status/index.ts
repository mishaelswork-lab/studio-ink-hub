import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), header = req.headers.get("Authorization");
  if (!url || !anon || !service || !header) return json({ error: "Authentication required" }, 401);
  const auth = createClient(url, anon, { global: { headers: { Authorization: header } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: user } = await auth.auth.getUser();
  if (!user.user) return json({ error: "Authentication required" }, 401);
  let artistId = "";
  try { artistId = (await req.json())?.artist_id || ""; } catch { return json({ error: "Invalid request" }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(artistId)) return json({ error: "Invalid artist" }, 400);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: artist } = await admin.from("artists").select("id,user_id").eq("id", artistId).maybeSingle();
  if (!artist || artist.user_id !== user.user.id) return json({ error: "Artist access denied" }, 403);
  const { data: connection } = await admin.from("instagram_connections")
    .select("instagram_username,token_expires_at").eq("artist_id", artistId).maybeSingle();
  return json({ connected: !!connection, username: connection?.instagram_username ?? null, expires_at: connection?.token_expires_at ?? null });
});
