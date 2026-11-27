import { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canSellDigitalGoods } from "@/lib/platform";
import { SUPPORT_EMAIL, mailto } from "@/lib/contact";

const BOOST_PRICE = 500; // ₹500 / 30-day featured slot

declare global {
  interface Window { Razorpay: any }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

type FeaturedPlacement = { active: boolean; expires_at: string };

export const FeaturedBoostCard = ({ artistId }: { artistId: string }) => {
  const { user } = useAuth();
  const [existing, setExisting] = useState<FeaturedPlacement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refreshPlacement = useCallback(async () => {
    if (!artistId) return null;
    const { data, error } = await supabase
      .from("featured_artists")
      .select("active, expires_at")
      .eq("artist_id", artistId)
      .eq("active", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    setExisting(data);
    return data;
  }, [artistId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("featured_artists")
          .select("active, expires_at")
          .eq("artist_id", artistId)
          .eq("active", true)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (error) throw error;
        if (mounted) setExisting(data);
      } catch {
        if (mounted) toast.error("Could not load featured placement status");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [artistId]);

  const submitPaid = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    setSubmitting(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load secure checkout");

      const { data: order, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { payment_type: "featured_boost", artist_id: artistId },
      });
      if (error || !order?.order_id) throw new Error("Could not create payment order");

      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "Tart",
          description: "Featured Artist Boost — 30 days",
          order_id: order.order_id,
          prefill: { email: user.email },
          theme: { color: "#c9a96e" },
          handler: async (response: any) => {
            try {
              const verification = await supabase.functions.invoke("verify-razorpay-payment", {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              if (verification.error || verification.data?.success !== true) {
                throw new Error(verification.data?.error || verification.error?.message || "Payment activation could not be confirmed");
              }
              // The database finalizer creates featured_artists atomically with payment capture.
              const placement = await refreshPlacement();
              if (!placement) {
                throw new Error("Payment verified, but the featured placement is not yet visible. Contact support; do not pay again.");
              }
              toast.success("Payment verified — your featured boost is active!");
              resolve();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Payment may be captured. Contact support; do not pay again.");
              reject(error);
            }
          },
          modal: { ondismiss: () => reject(new Error("Checkout closed")) },
        });
        checkout.open();
      }).catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment could not be completed";
      if (message !== "Checkout closed") toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gold" /></div>;

  if (!canSellDigitalGoods()) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-gold" />
          <h3 className="font-heading text-foreground font-semibold">Get Featured</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          Featured placement isn't purchasable in this app. Contact our team at{" "}
          <a href={mailto("Featured placement enquiry")} className="text-gold hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gold/10 via-gold/5 to-transparent border border-gold/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="font-heading text-foreground font-semibold">Get Featured</h3>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Appear above regular search results in your area for 30 days. Your boost activates immediately after verified ₹500 payment.
      </p>

      {existing ? (
        <div className="bg-card/50 border border-border rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground text-sm font-medium">Featured boost active</p>
            <p className="text-muted-foreground text-xs mt-1">
              Active until {new Date(existing.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="gold" className="w-full gap-2" onClick={submitPaid} disabled={submitting}>
            <Crown className="w-4 h-4" />
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${BOOST_PRICE} & Get Featured (30 days)`}
          </Button>
          <p className="text-muted-foreground text-xs text-center">
            Need a custom deal? <a href={mailto("Featured placement enquiry")} className="text-gold hover:underline">Contact {SUPPORT_EMAIL}</a>.
          </p>
          <p className="text-muted-foreground text-[11px] text-center">Secured by Razorpay. Activation is controlled by server-side payment verification.</p>
        </div>
      )}
    </div>
  );
};
