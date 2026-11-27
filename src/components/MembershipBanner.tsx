import { useState } from "react";
import { Crown, Zap, MessageSquare, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canSellDigitalGoods } from "@/lib/platform";

interface Props {
  chatsRemaining?: number;
  showChatTrigger?: boolean;
}

declare global {
  interface Window { Razorpay: any }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export const MembershipBanner = ({ chatsRemaining, showChatTrigger }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Apple treats memberships as digital goods requiring IAP — hide inside the iOS shell.
  if (!canSellDigitalGoods()) return null;


  // Membership activation is granted server-side by verify-razorpay-payment
  // after a successful payment — never directly from the browser.
  const handleSubscribe = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load payment gateway"); return; }

      const { data: order, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { payment_type: "membership" },
      });
      if (error || !order?.order_id) {
        toast.error(order?.error || "Payment gateway not configured yet");
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "Tart",
          description: "Tart Premium — ₹395 lifetime membership",
          order_id: order.order_id,
          prefill: { email: user.email },
          theme: { color: "#c9a96e" },
          modal: { ondismiss: () => reject(new Error("cancelled")) },
          handler: async (resp: any) => {
            try {
              const verification = await supabase.functions.invoke("verify-razorpay-payment", {
                body: {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              if (verification.error || !verification.data?.success) {
                throw new Error(verification.data?.error || verification.error?.message || "Membership activation could not be confirmed");
              }
              toast.success("🎉 Welcome to Tart Premium!");
              setOpen(false);
              window.location.reload();
              resolve();
            } catch (e) {
              toast.error("Payment captured, but activation failed. Contact support.");
              reject(e);
            }
          },
        });
        rzp.open();
      });
    } catch (e) {
      if ((e as Error)?.message !== "cancelled") toast.error("Could not complete subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="bg-gradient-to-r from-gold/15 via-gold/10 to-gold/5 rounded-xl border border-gold/30 p-5 cursor-pointer hover:border-gold/50 transition-colors">
          <div className="flex items-start gap-3">
            <Crown className="w-6 h-6 text-gold flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-foreground font-semibold mb-1">Upgrade to Premium — ₹395 lifetime</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-gold" /> Slashed cover charges on all bookings</li>
                <li className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-gold" /> Unlimited artist chats</li>
                <li className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-gold" /> Exclusive member discounts</li>
              </ul>
              {showChatTrigger && chatsRemaining !== undefined && (
                <p className="text-gold text-xs mt-2 font-medium">
                  {chatsRemaining === 0 ? "⚠️ You've used all 3 free chats. Upgrade to continue!" : `${chatsRemaining} free chat${chatsRemaining === 1 ? "" : "s"} remaining`}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" /> Tart Premium
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Premium Membership</span>
              <span className="text-gold font-heading text-2xl font-bold">₹395<span className="text-sm text-muted-foreground font-normal"> lifetime</span></span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ 10% off booking cover charges</li>
              <li>✓ Unlimited design consultations with any artist</li>
              <li>✓ Lifetime membership access</li>
              <li>✓ Priority booking confirmation</li>
              <li>✓ Exclusive member badge</li>
            </ul>
          </div>
          <Button variant="gold" className="w-full gap-2" onClick={handleSubscribe} disabled={loading}>
            <Crown className="w-4 h-4" />
            {loading ? "Activating..." : "Get lifetime membership — ₹395"}
          </Button>
          <p className="text-muted-foreground text-xs text-center">One-time payment. Lifetime membership access.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
