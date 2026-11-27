import { QuotesLoader } from "@/components/QuotesLoader";
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Search, Bell, LogOut, Compass, Heart, MessageSquare, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ReviewDialog } from "@/components/ReviewDialog";
import { MembershipBanner } from "@/components/MembershipBanner";
import { useMembership } from "@/hooks/useMembership";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type BookingWithDetails = Pick<Database["public"]["Tables"]["bookings"]["Row"], "id" | "artist_id" | "design_request_id" | "starts_at" | "ends_at" | "status" | "cover_charge_paid" | "hold_expires_at" | "created_at"> & {
  artists: Pick<Database["public"]["Tables"]["artists"]["Row"], "name" | "avatar_url" | "studio_name" | "specialty"> | null;
  design_requests: Pick<Database["public"]["Tables"]["design_requests"]["Row"], "brief" | "placement" | "size_description"> | null;
};
type ArtistCard = Pick<Database["public"]["Tables"]["artists"]["Row"], "id" | "name" | "avatar_url" | "specialty" | "studio_name" | "hourly_rate">;
type ConsultationCard = Pick<Database["public"]["Tables"]["conversations"]["Row"], "id" | "customer_id" | "artist_id" | "design_request_id" | "created_at"> & { design_description: string; status: string };

const CustomerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [artists, setArtists] = useState<ArtistCard[]>([]);
  const [consultations, setConsultations] = useState<ConsultationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifiedBookings, setNotifiedBookings] = useState<Set<string>>(new Set());
  const { isMember, chatsRemaining } = useMembership();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [bookingsRes, artistsRes, conversationsRes] = await Promise.all([
        supabase.from("bookings")
          .select("id,artist_id,design_request_id,starts_at,ends_at,status,cover_charge_paid,hold_expires_at,created_at,artists(name,avatar_url,studio_name,specialty),design_requests(brief,placement,size_description)")
          .eq("customer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("artists").select("id,name,avatar_url,specialty,studio_name,hourly_rate")
          .eq("status", "active").eq("available", true).limit(6),
        supabase.from("conversations").select("id,customer_id,artist_id,design_request_id,created_at").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setBookings(bookingsRes.data || []);
      setArtists(artistsRes.data || []);
      const requestIds = Array.from(new Set((conversationsRes.data || []).map(c => c.design_request_id))).filter((id): id is string => Boolean(id));
      const { data: requests } = requestIds.length
        ? await supabase.from("design_requests").select("id,brief,status").in("id", requestIds)
        : { data: [] as { id: string; brief: string; status: string | null }[] };
      const requestById = new Map((requests || []).map(request => [request.id, request]));
      setConsultations((conversationsRes.data || []).map(c => ({
        ...c,
        design_description: requestById.get(c.design_request_id || "")?.brief || "Design consultation",
        status: requestById.get(c.design_request_id || "")?.status || "open",
      })));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendPushNotification = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/placeholder.svg" });
    }
  }, []);

  const checkReminders = useCallback(() => {
    const now = new Date();
    const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
    activeBookings.forEach(booking => {
      const bookingDt = new Date(booking.starts_at);
      if (Number.isNaN(bookingDt.getTime())) return;
      const diffMins = (bookingDt.getTime() - now.getTime()) / 60000;
      const keys = [
        { mins: 60, key: `${booking.id}-60`, msg: "1 hour left!", desc: `${booking.design_requests?.brief || "Tattoo appointment"} coming up!` },
        { mins: 30, key: `${booking.id}-30`, msg: "30 minutes left!", desc: `${booking.design_requests?.brief || "Tattoo appointment"} — get ready!` },
        { mins: 15, key: `${booking.id}-15`, msg: "15 minutes left!", desc: `${booking.design_requests?.brief || "Tattoo appointment"} — head to the studio!` },
      ];
      keys.forEach(({ mins, key, msg, desc }) => {
        if (diffMins <= mins && diffMins > (mins === 60 ? 30 : mins === 30 ? 15 : 0) && !notifiedBookings.has(key)) {
          toast.info(msg, { description: desc, duration: 10000 });
          sendPushNotification(msg, desc);
          setNotifiedBookings(prev => new Set(prev).add(key));
        }
      });
    });
  }, [bookings, notifiedBookings, sendPushNotification]);

  useEffect(() => {
    if (bookings.length === 0) return;
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [bookings, checkReminders]);

  const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
  const pastBookings = bookings.filter(b => b.status === "completed" || b.status === "cancelled");
  const hasActiveBookings = activeBookings.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <QuotesLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}
              </h1>
              {isMember && <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Crown className="w-3 h-3" /> Premium</span>}
            </div>
            <p className="text-muted-foreground text-sm mt-1">Your art journey continues here</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-muted-foreground gap-1">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        {/* Membership upsell for non-members */}
        {!isMember && (
          <div className="mb-6">
            <MembershipBanner chatsRemaining={chatsRemaining} showChatTrigger />
          </div>
        )}

        {/* Active Bookings */}
        {hasActiveBookings && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-gold animate-pulse" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Active Bookings</h2>
            </div>
            <div className="space-y-4">
              {activeBookings.map(booking => {
                const bookingDt = new Date(booking.starts_at);
                const isToday = !Number.isNaN(bookingDt.getTime()) && new Date().toDateString() === bookingDt.toDateString();
                const artist = booking.artists;
                return (
                  <div key={booking.id} className={`bg-card rounded-xl border p-5 ${isToday ? "border-gold shadow-[0_0_20px_-5px_hsl(var(--gold)/0.3)]" : "border-border"}`}>
                    {isToday && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                        <span className="text-gold text-xs font-medium uppercase tracking-wider">Today's Appointment</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {artist?.avatar_url && <img src={artist.avatar_url} alt={artist.name} className="w-14 h-14 rounded-full object-cover border-2 border-gold/30 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-medium text-lg">{booking.design_requests?.brief?.replace(/^\[[^\]]+\]\s*/, "") || "Tattoo appointment"}</h3>
                        <p className="text-muted-foreground text-sm">{artist?.name} · {artist?.studio_name}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {bookingDt.toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {bookingDt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {booking.design_requests?.placement || "Placement to be confirmed"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : "bg-gold/10 text-gold"}`}>{booking.status}</span>
                        {booking.cover_charge_paid && <span className="text-xs text-emerald-400">Cover charge paid</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { to: "/studios", icon: Search, label: "Browse Studios", desc: "Find artists near you" },
            { to: "/discover", icon: Compass, label: "Discover", desc: "Watch artist reels" },
            { to: "/favorites", icon: Heart, label: "Favorites", desc: "Saved artists & reels" },
            { to: "/chats", icon: MessageSquare, label: "Chats", desc: "AI & artist chats" },
          ].map(action => (
            <Link key={action.label} to={action.to} className="bg-card rounded-lg border border-border p-4 hover:border-gold/30 transition-all group">
              <action.icon className="w-5 h-5 text-gold mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-foreground text-sm font-medium">{action.label}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Active Consultations */}
        {consultations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-gold" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Design Consultations</h2>
            </div>
            <div className="space-y-3">
              {consultations.map(c => (
                <Link key={c.id} to={`/consultation/${c.id}`} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between hover:border-gold/30 transition-colors block">
                  <div>
                    <p className="text-foreground text-sm font-medium line-clamp-1">{c.design_description || "Design consultation"}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary"}`}>{c.status}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Artists */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">Popular Artists</h2>
            <Link to="/studios" className="text-gold text-sm hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.slice(0, 3).map(artist => (
              <Link key={artist.id} to={`/artist/${artist.id}`} className="bg-card rounded-lg border border-border p-4 hover:border-gold/30 transition-all group">
                <div className="flex items-center gap-3">
                  <img src={artist.avatar_url || "https://via.placeholder.com/48"} alt={artist.name} className="w-12 h-12 rounded-full object-cover border border-gold/30" />
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{artist.name}</p>
                    <p className="text-muted-foreground text-xs truncate">{artist.specialty} · {artist.studio_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-muted-foreground text-xs">View artist profile</span>
                  <span className="text-muted-foreground text-xs">₹{artist.hourly_rate}/hr</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Past Bookings</h2>
            <div className="space-y-3">
              {pastBookings.slice(0, 5).map(booking => (
                <div key={booking.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{booking.design_requests?.brief?.replace(/^\[[^\]]+\]\s*/, "") || "Tattoo appointment"}</p>
                    <p className="text-muted-foreground text-xs">{new Date(booking.starts_at).toLocaleDateString()} · {booking.design_requests?.placement || "Placement not provided"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.status === "completed" && user && (
                      <ReviewDialog bookingId={booking.id} artistId={booking.artist_id} customerId={user.id} />
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs ${booking.status === "completed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{booking.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
