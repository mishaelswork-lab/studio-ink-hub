import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Search, Star, Bell, LogOut, Compass, Heart, Gift, MessageSquare, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CustomerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifiedBookings, setNotifiedBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [bookingsRes, artistsRes, consultationsRes, referralRes] = await Promise.all([
        supabase.from("bookings").select("*, artists(name, avatar_url, studio_name, specialty)").eq("customer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("artists").select("*").eq("available", true).limit(6),
        supabase.from("consultations").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("referrals").select("*").eq("referrer_id", user.id).limit(1),
      ]);
      setBookings(bookingsRes.data || []);
      setArtists(artistsRes.data || []);
      setConsultations(consultationsRes.data || []);

      // Generate referral code if none exists
      if ((referralRes.data || []).length > 0) {
        setReferralCode(referralRes.data![0].referral_code);
      } else {
        const code = `ART${user.id.slice(0, 6).toUpperCase()}`;
        await supabase.from("referrals").insert({ referrer_id: user.id, referral_code: code });
        setReferralCode(code);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Push notification permission
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
      const bookingDt = parseBookingDateTime(booking.date, booking.time);
      if (!bookingDt) return;
      const diffMins = (bookingDt.getTime() - now.getTime()) / 60000;
      const keys = [
        { mins: 60, key: `${booking.id}-60`, msg: "⏰ 1 hour left!", desc: `${booking.style} appointment coming up!` },
        { mins: 30, key: `${booking.id}-30`, msg: "⏰ 30 minutes left!", desc: `${booking.style} — get ready!` },
        { mins: 15, key: `${booking.id}-15`, msg: "🔔 15 minutes left!", desc: `${booking.style} — head to the studio!` },
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

  const parseBookingDateTime = (dateStr: string, timeStr: string): Date | null => {
    try {
      const date = new Date(dateStr);
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      let hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      date.setHours(hours, mins, 0, 0);
      return date;
    } catch { return null; }
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
  const pastBookings = bookings.filter(b => b.status === "completed" || b.status === "cancelled");
  const hasActiveBookings = activeBookings.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Your tattoo journey continues here</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-muted-foreground gap-1">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        {/* Active Bookings - Pinned */}
        {hasActiveBookings && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-gold animate-pulse" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Active Bookings</h2>
            </div>
            <div className="space-y-4">
              {activeBookings.map(booking => {
                const bookingDt = parseBookingDateTime(booking.date, booking.time);
                const isToday = bookingDt && new Date().toDateString() === bookingDt.toDateString();
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
                        <h3 className="text-foreground font-medium text-lg">{booking.style}</h3>
                        <p className="text-muted-foreground text-sm">{artist?.name} · {artist?.studio_name}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {booking.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {booking.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {booking.placement}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : "bg-gold/10 text-gold"}`}>{booking.status}</span>
                        {booking.cover_charge_paid && <span className="text-xs text-emerald-400">₹500 paid</span>}
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
            { to: "/studios", icon: CalendarDays, label: "Book Now", desc: "Schedule a session" },
          ].map(action => (
            <Link key={action.label} to={action.to} className="bg-card rounded-lg border border-border p-4 hover:border-gold/30 transition-all group">
              <action.icon className="w-5 h-5 text-gold mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-foreground text-sm font-medium">{action.label}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Referral Card */}
        <div className="bg-gradient-to-r from-gold/10 to-gold/5 rounded-xl border border-gold/20 p-5 mb-8">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-foreground font-medium mb-1">Refer & Earn ₹100 Off!</h3>
              <p className="text-muted-foreground text-sm mb-3">Share your code with friends. They get ₹100 off on their first booking!</p>
              <div className="flex items-center gap-2">
                <div className="bg-card rounded-md border border-border px-4 py-2 font-mono text-foreground text-sm tracking-wider">{referralCode}</div>
                <Button variant="gold" size="sm" onClick={copyReferral} className="gap-1">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
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
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                    <span className="text-foreground text-sm">{artist.rating}</span>
                  </div>
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
                <div key={booking.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">{booking.style}</p>
                    <p className="text-muted-foreground text-xs">{booking.date} · {booking.placement}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs ${booking.status === "completed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{booking.status}</span>
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
