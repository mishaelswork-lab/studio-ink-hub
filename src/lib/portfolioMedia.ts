import { supabase } from "@/integrations/supabase/client";

export async function getPortfolioMediaUrl(itemId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-portfolio-media", {
    body: { item_id: itemId },
  });
  if (error || typeof data?.signed_url !== "string") {
    throw error || new Error("Portfolio media is unavailable");
  }
  return data.signed_url;
}

export async function getArtistAvatarUrl(artistId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-artist-avatar", {
    body: { artist_id: artistId },
  });
  if (error || typeof data?.signed_url !== "string") {
    throw error || new Error("Artist avatar is unavailable");
  }
  return data.signed_url;
}

export async function getReelMediaUrl(reelId: string): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const { data, error } = await supabase.functions.invoke("get-reel-media", {
    body: { reel_id: reelId },
  });
  if (error || typeof data?.video_url !== "string") {
    throw error || new Error("Reel media is unavailable");
  }
  return { videoUrl: data.video_url, thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null };
}
