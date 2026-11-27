export type PublishableArtist = {
  status: string | null;
  available: boolean;
  portfolio: string[];
};

export const isPublishedArtist = (artist: PublishableArtist) =>
  artist.status === "active" && artist.available === true && new Set(artist.portfolio || []).size >= 2;
