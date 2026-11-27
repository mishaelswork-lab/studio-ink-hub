import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
async function encryptToken(token: string, secret: string) {
  const raw = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY must be base64-encoded 32 bytes");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return { ciphertext: b64(new Uint8Array(encrypted)), iv: b64(iv) };
}
Deno.serve(async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const requestUrl = new URL(req.url);
  const appUrl = Deno.env.get("ARTSPACE_APP_URL") || "https://artspaceconnect.com";
  const redirect = (status: string) => Response.redirect(new URL("/artist-dashboard?instagram=" + status, appUrl), 302);
  const code = requestUrl.searchParams.get("code"), state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) return redirect("denied");
  if (!code || !state || state.length > 128) return redirect("invalid");
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("INSTAGRAM_APP_ID"), appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
  const redirectUri = Deno.env.get("INSTAGRAM_REDIRECT_URI"), encryptionKey = Deno.env.get("INSTAGRAM_TOKEN_ENCRYPTION_KEY");
  if (!url || !service || !appId || !appSecret || !redirectUri || !encryptionKey) return redirect("unconfigured");
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: oauthState } = await admin.from("instagram_oauth_states").select("*")
    .eq("state", state).is("consumed_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!oauthState) return redirect("expired");
  const { data: consumed } = await admin.from("instagram_oauth_states").update({ consumed_at: new Date().toISOString() })
    .eq("state", state).is("consumed_at", null).select("state").maybeSingle();
  if (!consumed) return redirect("replayed");
  try {
    const form = new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    if (!shortResponse.ok) throw new Error("Instagram code exchange failed");
    const shortToken = await shortResponse.json();
    if (typeof shortToken.access_token !== "string") throw new Error("Instagram returned no access token");
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl);
    if (!longResponse.ok) throw new Error("Instagram long-lived token exchange failed");
    const longToken = await longResponse.json();
    if (typeof longToken.access_token !== "string") throw new Error("Instagram returned no long-lived token");
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "id,username");
    profileUrl.searchParams.set("access_token", longToken.access_token);
    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) throw new Error("Instagram profile lookup failed");
    const profile = await profileResponse.json();
    if (typeof profile.id !== "string" || typeof profile.username !== "string") throw new Error("Instagram profile is incomplete");
    const encrypted = await encryptToken(longToken.access_token, encryptionKey);
    const expiresAt = new Date(Date.now() + Number(longToken.expires_in || 5184000) * 1000).toISOString();
    const { error } = await admin.from("instagram_connections").upsert({
      artist_id: oauthState.artist_id, user_id: oauthState.user_id,
      instagram_user_id: profile.id, instagram_username: profile.username,
      access_token_ciphertext: encrypted.ciphertext, access_token_iv: encrypted.iv, token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "artist_id" });
    if (error) throw new Error("Could not save Instagram connection");
    return redirect("connected");
  } catch {
    return redirect("failed");
  }
});
