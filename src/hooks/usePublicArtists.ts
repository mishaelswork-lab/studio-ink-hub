import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const isPublishedArtist = (artist: { application_status: string; available: boolean | null; portfolio_images: string[] | null }) =>
  artist.application_status === "approved" && artist.available === true && new Set(artist.portfolio_images || []).size >= 2;

export function usePublicArtists() {
  return useQuery({
    queryKey: ["public-artists"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("artists")
        .select("id,name,specialty,studio_name,avatar_url,portfolio_images,hourly_rate,rating,available,application_status")
        .eq("application_status", "approved").eq("available", true);
      if (error) throw error;
      return (data || []).filter(isPublishedArtist).map(a => ({
        ...a, studioName: a.studio_name || "Independent artist", studioId: a.studio_name || "Independent artist",
        avatar: a.avatar_url || "/placeholder.svg", portfolio: a.portfolio_images || [], hourlyRate: a.hourly_rate, reviewCount: 0,
      }));
    },
  });
}

export function artistStudios(artists: NonNullable<ReturnType<typeof usePublicArtists>["data"]>) {
  return Array.from(new Set(artists.map(a => a.studioName))).map(name => {
    const members = artists.filter(a => a.studioName === name);
    return { id: name, name, location: "Bengaluru", image: members[0]?.portfolio[0] || "/placeholder.svg", rating: members[0]?.rating || 0, reviewCount: 0 };
  });
}