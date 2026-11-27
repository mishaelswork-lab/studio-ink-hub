import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getArtistAvatarUrl, getPortfolioMediaUrl } from "@/lib/portfolioMedia";

type PublicArtist = {
  id: string;
  name: string | null;
  specialty: string | null;
  studio_name: string | null;
  avatar_url: string | null;
  hourly_rate: number;
  available: boolean;
  status: string | null;
  portfolio: string[];
  rating: number;
  reviewCount: number;
  studioName: string;
  studioId: string;
  avatar: string;
  hourlyRate: number;
};

export const isPublishedArtist = (artist: { status: string | null; available: boolean; portfolio: string[] }) =>
  artist.status === "active" && artist.available === true && new Set(artist.portfolio || []).size >= 2;

export function usePublicArtists() {
  return useQuery({
    queryKey: ["public-artists"],
    staleTime: 60_000,
    queryFn: async (): Promise<PublicArtist[]> => {
      const { data: artists, error } = await supabase.from("artists")
        .select("id,name,specialty,studio_name,avatar_url,hourly_rate,available,status")
        .eq("status", "active").eq("available", true);
      if (error) throw error;
      const artistIds = (artists || []).map(a => a.id);
      if (!artistIds.length) return [];
      const [{ data: portfolioRows }, { data: reviews }] = await Promise.all([
        supabase.from("portfolio_items").select("id,artist_id").in("artist_id", artistIds).eq("approved", true),
        supabase.from("reviews").select("artist_id,rating").in("artist_id", artistIds),
      ]);
      const portfolioByArtist = new Map<string, string[]>();
      await Promise.all((portfolioRows || []).map(async item => {
        try {
          const url = await getPortfolioMediaUrl(item.id);
          portfolioByArtist.set(item.artist_id, [...(portfolioByArtist.get(item.artist_id) || []), url]);
        } catch { /* inaccessible or expired media is omitted */ }
      }));
      const reviewsByArtist = new Map<string, number[]>();
      for (const review of reviews || []) {
        reviewsByArtist.set(review.artist_id, [...(reviewsByArtist.get(review.artist_id) || []), review.rating]);
      }
      const resolved = await Promise.all((artists || []).map(async artist => {
        let avatar = "/placeholder.svg";
        if (artist.avatar_url) {
          try { avatar = await getArtistAvatarUrl(artist.id); } catch { /* placeholder remains */ }
        }
        const portfolio = portfolioByArtist.get(artist.id) || [];
        const artistReviews = reviewsByArtist.get(artist.id) || [];
        const rating = artistReviews.length ? artistReviews.reduce((sum, value) => sum + value, 0) / artistReviews.length : 0;
        return {
          ...artist,
          portfolio,
          rating,
          reviewCount: artistReviews.length,
          studioName: artist.studio_name || "Independent artist",
          studioId: artist.studio_name || "Independent artist",
          avatar,
          hourlyRate: artist.hourly_rate,
        };
      }));
      return resolved.filter(isPublishedArtist);
    },
  });
}

export function artistStudios(artists: NonNullable<ReturnType<typeof usePublicArtists>["data"]>) {
  return Array.from(new Set(artists.map(a => a.studioName))).map(name => {
    const members = artists.filter(a => a.studioName === name);
    return { id: name, name, location: "Bengaluru", image: members[0]?.portfolio[0] || "/placeholder.svg", rating: members[0]?.rating || 0, reviewCount: members[0]?.reviewCount || 0 };
  });
}