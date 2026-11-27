import { QuotesLoader } from "@/components/QuotesLoader";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useMembership } from "@/hooks/useMembership";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Crown } from "lucide-react";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  prefill: { email?: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
};
type RazorpayInstance = { open: () => void };
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
type BookingArtist = {
  id: string;
  name: string | null;
  hourly_rate: number;
  studio_name: string | null;
  available: boolean;
  status: string | null;
}

const BookingPage = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMember } = useMembership();
  const { settings } = usePlatformSettings();
  const [dbArtist, setDbArtist] = useState<BookingArtist | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({
    serviceType: "Tattoo", date: "", time: "", style: "", placement: "", size: "Medium", description: "",
  });

  useEffect(() => {
    if (!artistId) { setLoading(false); return; }
    const fetchArtist = async () => {
      const { data } = await supabase.from("artists").select("id,name,hourly_rate,studio_name,available,status").eq("id", artistId).eq("status", "active").eq("available", true).maybeSingle();
      setDbArtist(data);
      setLoading(false);
    };
    fetchArtist();
  }, [artistId]);

  const artist = dbArtist;

  if (loading) {
    return <QuotesLoader fullScreen />;
  }

  if (!artist) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Artist not found.</p></div>;
  }

  const artistName = artist.name;
  const artistRate = artist.hourly_rate;
  const artistStudio = artist.studio_name;
  const artistDbId = dbArtist?.id;

  const baseCover = settings.pricing.cover_charge;
  const memberDiscountPercent = settings.pricing.member_cover_charge_discount_percent;
  const coverCharge = isMember
    ? Math.round(baseCover * (100 - memberDiscountPercent)) / 100
    : baseCover;

  const sendPushNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/placeholder.svg" });
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in to book an appointment"); navigate("/login"); return; }
    if (!artistDbId) { toast.error("This artist is not currently bookable"); return; }
    const brief = [form.style.trim(), form.description.trim()].filter(Boolean).join("\n");
    if (brief.length < 10) { toast.error("Please add at least 10 characters describing your design"); return; }
    const localStart = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(localStart.getTime()) || localStart.getTime() <= Date.now() + 2 * 60 * 1000) { toast.error("Choose an appointment time at least two minutes from now"); return; }
    const startsAt = localStart.toISOString();
    const endsAt = new Date(localStart.getTime() + 2 * 60 * 60 * 1000).toISOString();
    setPaying(true);
    try {
      const { data: holdRows, error: holdError } = await supabase.rpc("create_booking_hold", {
        p_artist_id: artistDbId, p_starts_at: startsAt, p_ends_at: endsAt, p_service_type: form.serviceType,
        p_brief: brief, p_placement: form.placement, p_size_description: form.size, p_idempotency_key: crypto.randomUUID(),
      });
      if (holdError) throw holdError;
      const booking = Array.isArray(holdRows) ? holdRows[0] : holdRows;
      if (!booking?.booking_id) throw new Error("Could not create a secure booking hold");
      const orderRes = await supabase.functions.invoke("create-razorpay-order", { body: { payment_type: "cover_charge", booking_id: booking.booking_id } });
      if (orderRes.error || orderRes.data?.error) throw new Error(orderRes.data?.error || orderRes.error?.message || "Could not start payment. Your slot hold will expire automatically.");
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Failed to load Razorpay checkout. Your slot hold will expire automatically.");
      const options: RazorpayOptions = {
        key: orderRes.data.key_id, amount: orderRes.data.amount, currency: orderRes.data.currency,
        name: "T'art", description: `Booking cover charge — ${artistName}`, order_id: orderRes.data.order_id,
        handler: async (response) => {
          setPaying(true);
          try {
            const { data: verification, error: verificationError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature },
            });
            if (verificationError || verification?.success !== true) throw new Error(verification?.error || verificationError?.message || "Payment could not be verified");
            toast.success("Payment verified. Your booking request is with the artist.");
            sendPushNotification("Booking request sent", `Your cover charge for ${artistName} was verified.`);
            navigate("/dashboard");
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Payment verification failed";
            toast.error(message, { description: "Do not pay again. Check your bookings or contact support if the amount was debited." });
          } finally { setPaying(false); }
        },
        prefill: { email: user.email || undefined }, theme: { color: "#c9a96e" }, modal: { ondismiss: () => setPaying(false) },
      };
      new window.Razorpay(options).open();
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Booking failed"); setPaying(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <Link to={`/artist/${artist.id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {artistName}
        </Link>

        <div className="bg-card rounded-lg border border-border p-6 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Book Appointment</h1>
          <p className="text-muted-foreground text-sm mb-6">with {artistName} · {artistStudio}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Service</label>
              <div className="grid grid-cols-2 gap-2">
                {["Tattoo", "Piercing"].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, serviceType: s }))}
                    className={`h-10 rounded-md border text-sm transition-colors ${form.serviceType === s ? "bg-gold text-background border-gold" : "bg-secondary border-border text-foreground hover:border-gold/40"}`}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Date</label>
                <input type="date" required value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Time</label>
                <select required value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold">
                  <option value="">Select time</option>
                  {["10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">{form.serviceType === "Piercing" ? "Piercing type" : "Art Style"}</label>
              <input type="text" required placeholder={form.serviceType === "Piercing" ? "e.g. Helix, Septum, Nostril..." : "e.g. Japanese Dragon, Mandala..."} value={form.style} onChange={e => setForm(p => ({...p, style: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Placement</label>
                <input type="text" required placeholder="e.g. Forearm, Back..." value={form.placement} onChange={e => setForm(p => ({...p, placement: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Size</label>
                <select value={form.size} onChange={e => setForm(p => ({...p, size: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold">
                  {["Small","Medium","Large","Extra Large"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
              <textarea required rows={3} placeholder="Describe your idea in detail..." value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground resize-none" />
            </div>

            <div className="bg-secondary/50 rounded-md p-4 border border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Cover Charge</span>
                {isMember ? (
                  <span className="text-foreground font-medium"><span className="line-through text-muted-foreground mr-1.5">₹{baseCover.toFixed(2)}</span>₹{coverCharge.toFixed(2)}</span>
                ) : (
                  <span className="text-foreground font-medium">₹{baseCover.toFixed(2)}</span>
                )}
              </div>
              {isMember && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gold flex items-center gap-1"><Crown className="w-3 h-3" /> Member Discount</span>
                  <span className="text-gold font-medium">-₹250</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground font-semibold">Total</span>
                <span className="text-foreground font-bold">₹{coverCharge}</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
                <span className="text-muted-foreground">Artist Rate</span>
                <span className="text-foreground">₹{artistRate}/hr</span>
              </div>
              <p className="text-muted-foreground text-xs mt-2">Final price will be discussed with the artist after confirmation.</p>
              {!isMember && <p className="text-gold text-xs mt-1">💡 Members receive a {memberDiscountPercent}% cover-charge discount.</p>}
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={paying}>
              {paying ? "Processing..." : `Pay ₹${coverCharge} & Book`}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
