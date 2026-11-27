import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
type InstagramMediaItem = { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string };
type InstagramMediaPage = { data?: InstagramMediaItem[]; paging?: { next?: string } };
const decode = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
async function cryptToken(token: string, secret: string, iv?: string) {
  const raw = decode(secret);
  if (raw.length !== 32) throw new Error("Instagram encryption key is invalid");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, iv ? ["decrypt"] : ["encrypt"]);
  if (iv) {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv) }, key, decode(token));
    return new TextDecoder().decode(plain);
  }
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode(token));
  return { ciphertext: encode(new Uint8Array(encrypted)), iv: encode(nonce) };
}
function isInstagramCdn(raw: string) {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host.endsWith(".cdninstagram.com") || host.endsWith(".fbcdn.net");
  } catch { return false; }
}
async function downloadMedia(rawUrl: string, maxBytes: number, allowed: string[]) {
  if (!isInstagramCdn(rawUrl)) throw new Error("Instagram returned an unsupported media host");
  const response = await fetch(rawUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Could not download Instagram media");
  const mime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const sizeHeader = Number(response.headers.get("content-length") || 0);
  if (!allowed.includes(mime)) throw new Error("Instagram media format is not supported");
  if (sizeHeader > maxBytes) throw new Error("Instagram media exceeds the upload size limit");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) throw new Error("Instagram media exceeds the upload size limit");
  return { bytes, mime };
}
function extension(mime: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4" } as Record<string,string>)[mime];
}
function normalizePermalink(raw: string) {
  const u = new URL(raw);
  if (!["instagram.com","www.instagram.com","m.instagram.com"].includes(u.hostname.toLowerCase())) throw new Error("Enter a valid Instagram post or Reel URL");
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length < 2 || !["p","reel","reels","tv"].includes(segments[0])) throw new Error("Use an Instagram photo post or Reel link");
  return `https://www.instagram.com/${segments[0]}/${segments[1]}/`;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), encryptionKey = Deno.env.get("INSTAGRAM_TOKEN_ENCRYPTION_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !anon || !service || !encryptionKey) return json({ error: "Instagram import is not configured" }, 503);
  if (!authHeader) return json({ error: "Authentication required" }, 401);
  const auth = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser();
  if (authError || !authData.user) return json({ error: "Authentication required" }, 401);
  let artistId = "", submittedUrl = "", captionOverride: string | null = null;
  try {
    const body = await req.json();
    artistId = typeof body?.artist_id === "string" ? body.artist_id : "";
    submittedUrl = typeof body?.instagram_url === "string" ? body.instagram_url : "";
    captionOverride = typeof body?.caption_override === "string" ? body.caption_override.slice(0, 2200) : null;
  } catch { return json({ error: "Invalid request" }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(artistId) || submittedUrl.length > 2048) return json({ error: "Invalid import details" }, 400);
  let permalink: string;
  try { permalink = normalizePermalink(submittedUrl); } catch (e) { return json({ error: e instanceof Error ? e.message : "Invalid Instagram URL" }, 400); }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: artist } = await admin.from("artists").select("id,user_id").eq("id", artistId).maybeSingle();
  if (!artist || artist.user_id !== authData.user.id) return json({ error: "Artist access denied" }, 403);
  const { data: connection } = await admin.from("instagram_connections").select("*")
    .eq("artist_id", artistId).eq("user_id", authData.user.id).maybeSingle();
  if (!connection) return json({ error: "Connect your Instagram professional account first" }, 409);

  try {
    let token = await cryptToken(connection.access_token_ciphertext, encryptionKey, connection.access_token_iv) as string;
    if (new Date(connection.token_expires_at).getTime() < Date.now() + 7 * 86400000) {
      const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
      refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
      refreshUrl.searchParams.set("access_token", token);
      const refreshResponse = await fetch(refreshUrl);
      if (!refreshResponse.ok) throw new Error("Instagram connection expired. Reconnect your account.");
      const refreshed = await refreshResponse.json();
      if (typeof refreshed.access_token !== "string") throw new Error("Instagram token refresh failed");
      token = refreshed.access_token;
      const encrypted = await cryptToken(token, encryptionKey) as { ciphertext: string; iv: string };
      await admin.from("instagram_connections").update({
        access_token_ciphertext: encrypted.ciphertext, access_token_iv: encrypted.iv,
        token_expires_at: new Date(Date.now() + Number(refreshed.expires_in || 5184000) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("artist_id", artistId);
    }

    let next: string | null = null;
    const candidates: InstagramMediaItem[] = [];
    const graphVersion = Deno.env.get("INSTAGRAM_GRAPH_API_VERSION") || "v27.0";
    const graphBase = `https://graph.instagram.com/${graphVersion}`;
    const first = new URL(`${graphBase}/me/media`);
    first.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
    first.searchParams.set("limit", "100");
    first.searchParams.set("access_token", token);
    next = first.toString();
    for (let page = 0; next && page < 5; page++) {
      const pageUrl: URL = new URL(next as string);
      if (pageUrl.hostname !== "graph.instagram.com" || !pageUrl.pathname.startsWith(`/${graphVersion}/`)) throw new Error("Instagram returned an invalid pagination URL");
      const response: Response = await fetch(pageUrl);
      if (!response.ok) throw new Error("Could not read Instagram media. Check account permissions.");
      const result: InstagramMediaPage = await response.json();
      if (Array.isArray(result.data)) candidates.push(...result.data);
      next = typeof result.paging?.next === "string" ? result.paging.next : null;
      const match = candidates.find(item => {
        try { return typeof item.permalink === "string" && normalizePermalink(item.permalink) === permalink; } catch { return false; }
      });
      if (match) break;
    }
    const media: InstagramMediaItem | undefined = candidates.find(item => {
      try { return normalizePermalink(item.permalink) === permalink; } catch { return false; }
    });
    if (!media) throw new Error("This post was not found in the connected Instagram account. Only media owned by that account can be imported.");
    if (media.media_type === "CAROUSEL_ALBUM") {
      const childrenUrl = new URL(`${graphBase}/${encodeURIComponent(media.id)}/children`);
      childrenUrl.searchParams.set("fields", "id,media_type,media_url");
      childrenUrl.searchParams.set("limit", "50");
      childrenUrl.searchParams.set("access_token", token);
      const childrenResponse = await fetch(childrenUrl);
      if (!childrenResponse.ok) throw new Error("Could not read photos in this Instagram carousel");
      const children = await childrenResponse.json();
      const photos = (Array.isArray(children.data) ? children.data as InstagramMediaItem[] : []).filter((item): item is InstagramMediaItem & { media_url: string } => item.media_type === "IMAGE" && typeof item.media_url === "string");
      if (!photos.length) throw new Error("This carousel has no importable photos");
      const imported: { item_id: string; media_type: "photo" }[] = [];
      for (const photo of photos) {
        const { data: duplicatePhoto } = await admin.from("portfolio_items").select("id")
          .eq("artist_id", artistId).eq("instagram_media_id", photo.id).maybeSingle();
        if (duplicatePhoto) continue;
        let path: string | null = null;
        try {
          const image = await downloadMedia(photo.media_url, 5 * 1024 * 1024, ["image/jpeg","image/png","image/webp"]);
          path = `${artist.user_id}/${artist.id}/${crypto.randomUUID()}.${extension(image.mime)}`;
          const { error: storageError } = await admin.storage.from("portfolio-private").upload(path, image.bytes, { contentType: image.mime, upsert: false, cacheControl: "3600" });
          if (storageError) continue;
          const caption = captionOverride ?? (typeof media.caption === "string" ? media.caption.slice(0, 2200) : null);
          const { data: row, error: insertError } = await admin.from("portfolio_items").insert({
            artist_id: artistId, media_url: path, media_type: "image", caption,
            source_url: permalink, instagram_media_id: photo.id, approved: false,
          }).select("id").single();
          if (insertError || !row) {
            await admin.storage.from("portfolio-private").remove([path]);
            continue;
          }
          imported.push({ item_id: row.id, media_type: "photo" });
        } catch {
          if (path) await admin.storage.from("portfolio-private").remove([path]);
        }
      }
      if (!imported.length) return json({ success: true, duplicate: true, items: [] });
      return json({ success: true, media_type: "photo", items: imported, moderation_status: "pending" });
    }
    if (!["IMAGE","VIDEO"].includes(media.media_type)) throw new Error("This Instagram post type is not supported for portfolio import.");
    const isVideo = media.media_type === "VIDEO";
    const { data: duplicate } = isVideo
      ? await admin.from("reels").select("id").eq("artist_id", artistId).eq("instagram_media_id", media.id).maybeSingle()
      : await admin.from("portfolio_items").select("id").eq("artist_id", artistId).eq("instagram_media_id", media.id).maybeSingle();
    if (duplicate) return json({ success: true, duplicate: true, media_type: isVideo ? "reel" : "photo", item_id: duplicate.id });

    if (typeof media.media_url !== "string") {
      throw new Error("Instagram did not provide a downloadable media file. Copyrighted or restricted content may not be available through Meta's API.");
    }
    const downloaded = await downloadMedia(media.media_url, isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024,
      isVideo ? ["video/mp4"] : ["image/jpeg","image/png","image/webp"]);
    const objectPath = `${artist.user_id}/${artist.id}/${crypto.randomUUID()}.${extension(downloaded.mime)}`;
    const bucket = isVideo ? "portfolio-reels" : "portfolio-private";
    const { error: uploadError } = await admin.storage.from(bucket).upload(objectPath, downloaded.bytes, {
      contentType: downloaded.mime, upsert: false, cacheControl: "3600",
    });
    if (uploadError) throw new Error("Could not store imported media privately");

    let thumbnailPath: string | null = null;
    if (isVideo && typeof media.thumbnail_url === "string" && isInstagramCdn(media.thumbnail_url)) {
      try {
        const thumb = await downloadMedia(media.thumbnail_url, 5 * 1024 * 1024, ["image/jpeg","image/png","image/webp"]);
        thumbnailPath = `${artist.user_id}/${artist.id}/${crypto.randomUUID()}.${extension(thumb.mime)}`;
        const { error } = await admin.storage.from("portfolio-private").upload(thumbnailPath, thumb.bytes, { contentType: thumb.mime, upsert: false });
        if (error) thumbnailPath = null;
      } catch { thumbnailPath = null; }
    }

    const caption = captionOverride ?? (typeof media.caption === "string" ? media.caption.slice(0, 2200) : null);
    if (isVideo) {
      const { data: inserted, error } = await admin.from("reels").insert({
        artist_id: artistId, video_url: objectPath, thumbnail_url: thumbnailPath,
        caption, instagram_url: permalink, instagram_media_id: media.id,
        source: "instagram", moderation_status: "pending",
      }).select("id").single();
      if (error || !inserted) {
        await admin.storage.from(bucket).remove([objectPath]);
        if (thumbnailPath) await admin.storage.from("portfolio-private").remove([thumbnailPath]);
        throw new Error("Could not save Reel submission");
      }
      return json({ success: true, media_type: "reel", item_id: inserted.id, items: [{ item_id: inserted.id, media_type: "reel" }], moderation_status: "pending" });
    }
    const { data: inserted, error } = await admin.from("portfolio_items").insert({
      artist_id: artistId, media_url: objectPath, media_type: "image",
      caption, source_url: permalink, instagram_media_id: media.id, approved: false,
    }).select("id").single();
    if (error || !inserted) {
      await admin.storage.from(bucket).remove([objectPath]);
      throw new Error("Could not save photo submission");
    }
    return json({ success: true, media_type: "photo", item_id: inserted.id, items: [{ item_id: inserted.id, media_type: "photo" }], moderation_status: "pending" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Instagram import failed" }, 400);
  }
});
