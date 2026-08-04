import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStudios from "./tools/list-studios";
import listArtists from "./tools/list-artists";
import getArtist from "./tools/get-artist";
import listMyBookings from "./tools/list-my-bookings";
import createBooking from "./tools/create-booking";
import cancelBooking from "./tools/cancel-booking";
import listMyBookingNotifications from "./tools/list-my-booking-notifications";
import markBookingNotificationRead from "./tools/mark-booking-notification-read";
import listMyConsultations from "./tools/list-my-consultations";
import sendConsultationMessage from "./tools/send-consultation-message";
import listMyFavorites from "./tools/list-my-favorites";

// Direct supabase.co issuer (never the .lovable.cloud proxy) built at build-time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tart-mcp",
  title: "Tart",
  version: "0.2.0",
  instructions:
    "Tart tools: browse tattoo studios and artists; for the signed-in user, create/cancel bookings (tattoo or piercing, ₹500 cover charge via Razorpay), read bookings, poll booking status-change notifications, read consultations and send messages in existing threads, and read saved favorites. All per-user tools run as the authenticated user under RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listStudios,
    listArtists,
    getArtist,
    listMyBookings,
    createBooking,
    cancelBooking,
    listMyBookingNotifications,
    markBookingNotificationRead,
    listMyConsultations,
    sendConsultationMessage,
    listMyFavorites,
  ],
});
