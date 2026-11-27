import { useState } from "react";
import { Crown, Zap, MessageSquare, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canSellDigitalGoods } from "@/lib/platform";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useMembership } from "@/hooks/useMembership";

interface Props { chatsRemaining?: number; showChatTrigger?: boolean }
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill: { email?: string }; theme: { color: string };
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

export const MembershipBanner = ({ chatsRemaining, showChatTrigger }: Props) => {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const { isMember } = useMembership();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const membershipPrice = settings.pricing.membership_price;
  const memberDiscount = settings.pricing.member_cover_charge_discount_percent;

  if (!canSellDigitalGoods() || isMember) return null;

  const handleSubscribe = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error("Failed to load payment gateway");
      const { data: order, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { payment_type: "membership" },
      });
      if (error || !order?.order_id) throw new Error(order?.error || error?.message || "Membership checkout is unavailable");
      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.key_id, amount: order.amount, currency: order.currency, name: "T'art",
          description: "T'art Lifetime Membership", order_id: order.order_id,
          prefill: { email: user.email || undefined }, theme: { color: "#c9a96e" },
          modal: { ondismiss: () => reject(new Error("cancelled")) },
          handler: async (response) => {
            try {
              const { data: verification, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
                body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature },
              });
              if (verifyError || verification?.success !== true) throw new Error(verification?.error || verifyError?.message || "Payment could not be verified");
              toast.success("Lifetime membership activated.");
              setOpen(false);
              window.location.reload();
              resolve();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Payment captured but membership activation needs support review");
              reject(error);
            }
          },
        });
        razorpay.open();
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "cancelled") toast.error(error instanceof Error ? error.message : "Could not complete membership payment");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="bg-gradient-to-r from-gold/15 via-gold/10 to-gold/5 rounded-xl border border-gold/30 p-5 cursor-pointer hover:border-gold/50 transition-colors">
          <div className="flex items-start gap-3">
            <Crown className="w-6 h-6 text-gold flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-foreground font-semibold mb-1">Lifetime Membership — ₹{membershipPrice}</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-gold" /> {memberDiscount}% off booking cover charges</li>
                <li className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-gold" /> Member access to artist consultations</li>
                <li className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-gold" /> One-time payment, no recurring billing</li>
              </ul>
              {showChatTrigger && chatsRemaining !== undefined && (
                <p className="text-gold text-xs mt-2 font-medium">
                  {chatsRemaining === 0 ? "You've used your free chats. Membership gives you member access." : `${chatsRemaining} free chat${chatsRemaining === 1 ? "" : "s"} remaining`}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" /> T'art Lifetime Membership
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Lifetime Membership</span>
              <span className="text-gold font-heading text-2xl font-bold">₹{membershipPrice}</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ Lifetime access with no scheduled expiry</li>
              <li>✓ {memberDiscount}% discount on booking cover charges</li>
              <li>✓ Member access to artist consultations</li>
              <li>✓ Exclusive member badge</li>
            </ul>
          </div>
          <Button variant="gold" className="w-full gap-2" onClick={handleSubscribe} disabled={loading}>
            <Crown className="w-4 h-4" />
            {loading ? "Verifying payment..." : `Get lifetime membership — ₹${membershipPrice}`}
          </Button>
          <p className="text-muted-foreground text-xs text-center">One-time payment. No recurring billing. Membership terms are available in the Terms of Service.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
