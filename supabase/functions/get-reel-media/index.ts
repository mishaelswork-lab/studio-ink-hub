import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), authHeader = req.headers.get("Authorization");
  if (!url || !anon || !service) return json({ error: "Media service unavailable" }, 503);

  let userId: string | null = null;
  if (authHeader) {
    const auth = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await auth.auth.getUser();
    userId = data.user?.id ?? null;
  }
  let reelId = "";
  try {
    const body = await req.json();
    reelId = typeof body?.reel_id === "string" ? body.reel_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(reelId)) return json({ error: "Invalid Reel" }, 400);
  } catch { return json({ error: "Invalid request" }, 400); }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: reel, error } = await admin.from("reels")
    .select("id,artist_id,video_url,thumbnail_url,moderation_status,artists!inner(user_id,status)")
    .eq("id", reelId).maybeSingle();
  if (error || !reel) return json({ error: "Reel not found" }, 404);
  const artist = Array.isArray(reel.artists) ? reel.artists[0] : reel.artists;
  const isOwner = !!userId && artist?.user_id === userId;
  const isPublic = reel.moderation_status === "approved" && artist?.status === "active";
  let isAdmin = false;
  if (userId && !isOwner && !isPublic) {
    const { data: role } = await admin.from("user_roles").select("user_id")
      .eq("user_id", userId).eq("role", "admin").maybeSingle();
    isAdmin = !!role;
  }
  if (!isOwner && !isPublic && !isAdmin) return json({ error: "Forbidden" }, 403);
  const videoPath = reel.video_url;
  if (typeof videoPath !== "string" || videoPath.startsWith("http") ||
      !videoPath.startsWith(`${artist?.user_id}/${reel.artist_id}/`)) return json({ error: "Invalid Reel path" }, 409);
  const { data: video, error: videoError } = await admin.storage.from("portfolio-reels").createSignedUrl(videoPath, 120);
  if (videoError || !video?.signedUrl) return json({ error: "Unable to access Reel" }, 500);

  let thumbnailUrl: string | null = null;
  if (reel.thumbnail_url) {
    const thumbPath = reel.thumbnail_url;
    if (typeof thumbPath !== "string" || thumbPath.startsWith("http") ||
        !thumbPath.startsWith(`${artist?.user_id}/${reel.artist_id}/`)) return json({ error: "Invalid thumbnail path" }, 409);
    const { data: thumb } = await admin.storage.from("portfolio-private").createSignedUrl(thumbPath, 120);
    thumbnailUrl = thumb?.signedUrl ?? null;
  }
  return json({ video_url: video.signedUrl, thumbnail_url: thumbnailUrl, expires_in: 120 });
});
