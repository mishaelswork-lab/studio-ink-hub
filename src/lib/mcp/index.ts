import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStudios from "./tools/list-studios";
import listArtists from "./tools/list-artists";
import getArtist from "./tools/get-artist";
import listMyBookings from "./tools/list-my-bookings";
import listMyConsultations from "./tools/list-my-consultations";
import sendConsultationMessage from "./tools/send-consultation-message";
import listMyFavorites from "./tools/list-my-favorites";

// Direct supabase.co issuer (never the .lovable.cloud proxy) built at build-time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "artspace-mcp",
  title: "ArtSpace",
  version: "0.1.0",
  instructions:
    "ArtSpace tools: browse tattoo studios and artists, and — for the signed-in user — read bookings, consultations, favorites, and send messages in existing consultation threads. All per-user tools run as the authenticated user under RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listStudios,
    listArtists,
    getArtist,
    listMyBookings,
    listMyConsultations,
    sendConsultationMessage,
    listMyFavorites,
  ],
});
