import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { artists as mockArtists } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
    date: "", time: "", style: "", placement: "", size: "Medium", description: "",
  });

  // Try DB artist first, fallback to mock
  const mockArtist = mockArtists.find(a => a.id === artistId);

  useEffect(() => {
    const fetchArtist = async () => {
      const { data } = await supabase.from("artists").select("*").eq("id", artistId!).maybeSingle();
      setDbArtist(data);
      setLoading(false);
    };
    fetchArtist();
  }, [artistId]);

  const artist = dbArtist || mockArtist;

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!artist) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Artist not found.</p></div>;
  }

  const artistName = dbArtist ? dbArtist.name : mockArtist!.name;
  const artistRate = dbArtist ? dbArtist.hourly_rate : mockArtist!.hourlyRate;
  const artistStudio = dbArtist ? dbArtist.studio_name : mockArtist!.studioName;
  const artistDbId = dbArtist?.id;

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
      toast.success("Booking request sent! ₹500 cover charge will be collected via Razorpay.", { description: "The artist will confirm your appointment shortly." });
      navigate("/");
      return;
    }

    setPaying(true);

    try {
      // Create booking first
      const { data: booking, error: bookingErr } = await supabase.from("bookings").insert({
        customer_id: user.id,
        artist_id: artistDbId,
        customer_name: user.user_metadata?.display_name || user.email || "Customer",
        date: form.date,
        time: form.time,
        style: form.style,
        placement: form.placement,
        size: form.size,
        description: form.description,
        total_estimate: artistRate * 2,
      }).select().single();

      if (bookingErr) throw bookingErr;

      // Create Razorpay order
      const orderRes = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: 500, booking_id: booking.id, payment_type: "cover_charge" },
      });

      if (orderRes.error || orderRes.data?.error) {
        // Razorpay not configured - still allow booking without payment
        toast.success("Booking created! Payment will be configured soon.", { description: "The artist will confirm your appointment." });
        navigate("/");
        return;
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
        name: "ArtSpace",
        description: `Cover Charge - ${artistName}`,
        order_id: orderRes.data.order_id,
        handler: async (response: any) => {
          await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: booking.id,
              artist_id: artistDbId,
              customer_id: user.id,
              amount: 500,
              payment_type: "cover_charge",
            },
          });
          toast.success("Payment successful! Booking confirmed.", { description: "The artist will review your appointment." });
          navigate("/");
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
      <div className="pt-20 pb-16 px-4 max-w-2xl mx-auto">
        <Link to={dbArtist ? "/" : `/artist/${mockArtist!.id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {artistName}
        </Link>

        <div className="bg-card rounded-lg border border-border p-6 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Book Appointment</h1>
          <p className="text-muted-foreground text-sm mb-6">with {artistName} · {artistStudio}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="text-sm text-muted-foreground mb-1.5 block">Tattoo Style</label>
              <input type="text" required placeholder="e.g. Japanese Dragon, Mandala..." value={form.style} onChange={e => setForm(p => ({...p, style: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
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
              <textarea required rows={3} placeholder="Describe your tattoo idea in detail..." value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground resize-none" />
            </div>

            <div className="bg-secondary/50 rounded-md p-4 border border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Cover Charge (non-refundable)</span>
                <span className="text-foreground font-medium">₹500</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Artist Rate</span>
                <span className="text-foreground">₹{artistRate}/hr</span>
              </div>
              <p className="text-muted-foreground text-xs mt-2">Final price will be discussed with the artist after confirmation.</p>
              <p className="text-gold text-xs mt-1">💡 Pay at the parlour using ArtSpace for exclusive offers!</p>
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={paying}>
              {paying ? "Processing..." : "Pay ₹500 & Book"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
