import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { canSellDigitalGoods } from "@/lib/platform";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill: { email?: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
};
declare global { interface Window { Razorpay: new (options: RazorpayOptions) => { open: () => void } } }

const loadRazorpay = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export const FeaturedBoostCard = ({ artistId }: { artistId: string }) => {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const boostPrice = settings.pricing.featured_boost_price;
  const boostDays = settings.pricing.featured_boost_days;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("featured_artists").select("expires_at")
        .eq("artist_id", artistId).eq("active", true).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (!cancelled) {
        setExpiresAt(data?.expires_at || null);
        setLoading(false);
      }
    };
    if (artistId) void load();
    return () => { cancelled = true; };
  }, [artistId]);

  const submitPaid = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    setSubmitting(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error("Could not load Razorpay checkout");
      const { data: order, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { payment_type: "featured_boost", artist_id: artistId },
      });
      if (error || !order?.order_id) throw new Error(order?.error || error?.message || "Could not create boost order");
      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.key_id, amount: order.amount, currency: order.currency, name: "T'art",
          description: `Featured Artist Boost — ${boostDays} days`, order_id: order.order_id,
          prefill: { email: user.email || undefined }, theme: { color: "#c9a96e" },
          handler: async (response) => {
            try {
              const { data: verification, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
                body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature },
              });
              if (verifyError || verification?.success !== true) throw new Error(verification?.error || verifyError?.message || "Payment could not be verified");
              const { data: activeBoost } = await supabase.from("featured_artists").select("expires_at")
                .eq("artist_id", artistId).eq("active", true).maybeSingle();
              setExpiresAt(activeBoost?.expires_at || new Date(Date.now() + boostDays * 86400000).toISOString());
              toast.success("Payment verified. Your featured boost is active.");
              resolve();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Payment captured but boost activation needs support review");
              reject(error);
            }
          },
          modal: { ondismiss: () => reject(new Error("cancelled")) },
        });
        razorpay.open();
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "cancelled") toast.error(error instanceof Error ? error.message : "Featured boost failed");
    } finally { setSubmitting(false); }
  };

  if (!canSellDigitalGoods()) return null;
  if (loading) return <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gold" /></div>;

  return (
    <div className="bg-gradient-to-br from-gold/10 via-gold/5 to-transparent border border-gold/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="font-heading text-foreground font-semibold">Get Featured</h3>
      </div>
      {expiresAt ? (
        <div className="bg-card/50 border border-border rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground text-sm font-medium">Your featured placement is active</p>
            <p className="text-muted-foreground text-xs mt-1">Expires {new Date(expiresAt).toLocaleDateString()}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-sm mb-4">Appear above regular search results in your area for {boostDays} days.</p>
          <Button variant="gold" className="w-full gap-2" onClick={submitPaid} disabled={submitting}>
            <Crown className="w-4 h-4" />
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${boostPrice} & Get Featured (${boostDays} days)`}
          </Button>
          <p className="text-muted-foreground text-[11px] text-center mt-3">Secured by Razorpay. Boost activates only after server-side payment verification.</p>
        </>
      )}
    </div>
  );
};
