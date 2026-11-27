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

declare global {
  interface Window {
    Razorpay: any;
  }
}

const BookingPage = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dbArtist, setDbArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({
    serviceType: "Tattoo", date: "", time: "", style: "", placement: "", size: "Medium", description: "",
  });

  useEffect(() => {
    if (!artistId) { setLoading(false); return; }
    const fetchArtist = async () => {
      const { data } = await supabase.from("artists").select("*").eq("id", artistId).eq("status", "active").eq("available", true).maybeSingle();
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

    if (!user) {
      toast.error("Please sign in to book an appointment");
      navigate("/login");
      return;
    }

    if (!artistDbId) {
      toast.success("Booking request sent!", { description: "The artist will confirm your appointment shortly." });
      sendPushNotification("🎨 Booking Confirmed!", `Great choice! Your session with ${artistName} is booked.`);
      navigate("/");
      return;
    }

    setPaying(true);

    try {
      // Convert the selected India-local appointment time to an explicit
      // offset timestamp. The database RPC validates availability and creates
      // a short-lived, idempotent hold; clients must not insert bookings directly.
      const match = form.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) throw new Error("Please select a valid appointment time");
      let hour = Number(match[1]) % 12;
      if (match[3].toUpperCase() === "PM") hour += 12;
      const localStart = new Date(`${form.date}T${String(hour).padStart(2, "0")}:${match[2]}:00+05:30`);
      if (Number.isNaN(localStart.getTime()) || localStart.getTime() <= Date.now()) {
        throw new Error("Please choose a future appointment time");
      }
      const localEnd = new Date(localStart.getTime() + 2 * 60 * 60 * 1000);
      const bookingBrief = `${form.style.trim()} — ${form.description.trim()}`;
      if (bookingBrief.trim().length < 10 || bookingBrief.length > 4000) {
        throw new Error("Please provide at least 10 characters describing your design");
      }
      const { data: holdRows, error: bookingErr } = await supabase.rpc("create_booking_hold", {
        p_artist_id: artistDbId,
        p_starts_at: localStart.toISOString(),
        p_ends_at: localEnd.toISOString(),
        p_service_type: form.serviceType,
        p_brief: bookingBrief,
        p_placement: form.placement,
        p_size_description: form.size,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (bookingErr) throw bookingErr;
      const booking = Array.isArray(holdRows) ? holdRows[0] : holdRows;
      if (!booking?.booking_id) throw new Error("Could not reserve this appointment slot");

      const orderRes = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          payment_type: "cover_charge",
          booking_id: booking.booking_id,
        },
      });

      if (orderRes.error || orderRes.data?.error) {
        throw new Error(orderRes.data?.error || orderRes.error?.message || "Could not start secure payment. Your appointment hold has not been paid.");
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        setPaying(false);
        return;
      }

      const options = {
        key: orderRes.data.key_id,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Tart",
        description: `Booking cover charge - ${artistName}`,
        order_id: orderRes.data.order_id,
        handler: async (response: any) => {
          const verification = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
          if (verification.error || !verification.data?.success) {
            toast.error(verification.data?.error || verification.error?.message || "Payment verification failed. Contact support before retrying.");
            setPaying(false);
            return;
          }
          toast.success("Payment successful! Booking confirmed.", { description: "The artist will review your appointment." });
          sendPushNotification("🎨 Booking Confirmed!", `Excellent choice! Your session with ${artistName} is confirmed. You're going to love it!`);
          navigate("/dashboard");
        },
        prefill: { email: user.email },
        theme: { color: "#c9a96e" },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Booking failed");
    } finally {
      setPaying(false);
    }
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
                <span className="text-muted-foreground">Booking Cover Charge</span>
                <span className="text-foreground font-medium">₹49 standard</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
                <span className="text-muted-foreground">Artist Rate</span>
                <span className="text-foreground">₹{artistRate}/hr</span>
              </div>
              <p className="text-muted-foreground text-xs mt-2">Active members receive a 10% cover-charge discount at checkout. Final service pricing is discussed with the artist.</p>
              
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={paying}>
              {paying ? "Processing..." : `Continue to payment & book`}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
