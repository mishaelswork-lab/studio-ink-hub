import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getArtistAvatarUrl, getPortfolioMediaUrl } from "@/lib/portfolioMedia";
import { isPublishedArtist } from "@/lib/artistPublication";
export { isPublishedArtist } from "@/lib/artistPublication";

type PublicArtist = {
  id: string;
  name: string | null;
  specialty: string | null;
  studio_name: string | null;
  city: string | null;
  country: string | null;
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

export function usePublicArtists() {
  return useQuery({
    queryKey: ["public-artists"],
    staleTime: 60_000,
    queryFn: async (): Promise<PublicArtist[]> => {
      const { data: artists, error } = await supabase.from("artists")
        .select("id,name,specialty,studio_name,city,country,avatar_url,hourly_rate,available,status")
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
  const grouped = new Map<string, PublicArtist[]>();
  for (const artist of artists) {
    if (!artist.studio_name?.trim()) continue;
    const key = [artist.studio_name.trim(), artist.city?.trim() || "", artist.country?.trim() || ""].join("::");
    grouped.set(key, [...(grouped.get(key) || []), artist]);
  }

  return Array.from(grouped.entries()).map(([id, members]) => {
    const reviewCount = members.reduce((sum, member) => sum + member.reviewCount, 0);
    const ratingTotal = members.reduce((sum, member) => sum + member.rating * member.reviewCount, 0);
    const city = members[0]?.city?.trim();
    const country = members[0]?.country?.trim();
    return {
      id,
      name: members[0].studio_name!.trim(),
      location: [city, country].filter(Boolean).join(", ") || "Location not provided",
      image: members.find(member => member.portfolio.length > 0)?.portfolio[0] || "/placeholder.svg",
      rating: reviewCount ? ratingTotal / reviewCount : 0,
      reviewCount,
    };
  });
}
