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
