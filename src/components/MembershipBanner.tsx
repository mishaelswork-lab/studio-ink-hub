import { useState } from "react";
import { Crown, Zap, MessageSquare, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  chatsRemaining?: number;
  showChatTrigger?: boolean;
}

export const MembershipBanner = ({ chatsRemaining, showChatTrigger }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(true);
    const { error } = await supabase.from("memberships").insert({
      user_id: user.id,
      plan: "premium",
      amount: 199,
      status: "active",
    });
    if (error) {
      toast.error("Failed to activate membership");
    } else {
      toast.success("🎉 Welcome to ArtSpace Premium!");
      setOpen(false);
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="bg-gradient-to-r from-gold/15 via-gold/10 to-gold/5 rounded-xl border border-gold/30 p-5 cursor-pointer hover:border-gold/50 transition-colors">
          <div className="flex items-start gap-3">
            <Crown className="w-6 h-6 text-gold flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-foreground font-semibold mb-1">Upgrade to Premium — ₹199 / 3 months</h3>
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
            <Crown className="w-5 h-5 text-gold" /> ArtSpace Premium
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Premium Membership</span>
              <span className="text-gold font-heading text-2xl font-bold">₹199<span className="text-sm text-muted-foreground font-normal"> / 3 mo</span></span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ Cover charge slashed to ₹250 (from ₹500)</li>
              <li>✓ Unlimited design consultations with any artist</li>
              <li>✓ 10% off on all booking estimates</li>
              <li>✓ Priority booking confirmation</li>
              <li>✓ Exclusive member badge</li>
            </ul>
          </div>
          <Button variant="gold" className="w-full gap-2" onClick={handleSubscribe} disabled={loading}>
            <Crown className="w-4 h-4" />
            {loading ? "Activating..." : "Subscribe — ₹199 / 3 months"}
          </Button>
          <p className="text-muted-foreground text-xs text-center">Cancel anytime. Billed every 3 months.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
