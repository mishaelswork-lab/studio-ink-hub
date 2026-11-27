import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStudios from "./tools/list-studios";
import listArtists from "./tools/list-artists";
import getArtist from "./tools/get-artist";
import listMyBookings from "./tools/list-my-bookings";
import listMyFavorites from "./tools/list-my-favorites";

// Direct supabase.co issuer (never the .lovable.cloud proxy) built at build-time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tart-mcp",
  title: "Tart",
  version: "0.2.0",
  instructions:
    "ArtSpace read-only tools: browse active artists and studios, read the signed-in user’s bookings, and read the signed-in user’s saved ideas. Booking creation, cancellation, payment, messaging, and notification mutations are not exposed through this integration.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listStudios,
    listArtists,
    getArtist,
    listMyBookings,
    listMyFavorites,
  ],
});
