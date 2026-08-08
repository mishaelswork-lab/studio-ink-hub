import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canSellDigitalGoods } from "@/lib/platform";
import { SUPPORT_EMAIL, mailto } from "@/lib/contact";

const BOOST_PRICE = 999; // ₹999 / 30-day featured slot (starter)

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

export const FeaturedBoostCard = ({ artistId }: { artistId: string }) => {
  const { user } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ message: "", contact_email: "", contact_phone: "" });

  useEffect(() => {
    if (!artistId) return;
    (async () => {
      const { data } = await supabase
        .from("featured_requests")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setExisting(data);
      setLoading(false);
    })();
  }, [artistId]);

  const submitRequestRow = async (paid: boolean, paymentId?: string) => {
    const { data, error } = await supabase.from("featured_requests").insert({
      artist_id: artistId,
      message: [form.message.trim(), paid ? `[PAID via Razorpay: ${paymentId}]` : null].filter(Boolean).join(" — ") || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      status: paid ? "paid" : "pending",
    }).select().single();
    if (error) throw error;
    return data;
  };

  const submitFree = async () => {
    setSubmitting(true);
    try {
      const data = await submitRequestRow(false);
      toast.success("Request sent! Our team will reach out for the best deal.");
      setExisting(data);
    } catch {
      toast.error("Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPaid = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    setSubmitting(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load checkout");

      const { data: order, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: BOOST_PRICE, payment_type: "featured_boost" },
      });
      if (error || !order?.order_id) throw new Error("Order failed");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "Tart",
          description: "Featured Artist Boost",
          order_id: order.order_id,
          prefill: { email: form.contact_email || user.email, contact: form.contact_phone || "" },
          theme: { color: "#c7974a" },
          handler: async (resp: any) => {
            try {
              await supabase.functions.invoke("verify-razorpay-payment", {
                body: {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  customer_id: user.id,
                  amount: BOOST_PRICE,
                  payment_type: "featured_boost",
                },
              });
              const row = await submitRequestRow(true, resp.razorpay_payment_id);
              setExisting(row);
              toast.success("Payment received — boost request submitted!");
              resolve();
            } catch (e) {
              toast.error("Payment captured, but request failed. Contact support.");
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error("cancelled")) },
        });
        rzp.open();
      }).catch(() => {});
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
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
          <a href={mailto("Featured placement enquiry")} className="text-gold hover:underline">{SUPPORT_EMAIL}</a> for options.
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
        Appear above regular search results in your area for 30 days. Pay now to instantly submit, or request a custom deal.
      </p>


      {existing && existing.status !== "rejected" ? (
        <div className="bg-card/50 border border-border rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-foreground text-sm font-medium">Request received — status: <span className="text-gold capitalize">{existing.status}</span></p>
            <p className="text-muted-foreground text-xs mt-1">Our team will contact you shortly.</p>
            {existing.admin_notes && <p className="text-muted-foreground text-xs mt-2 italic">Note: {existing.admin_notes}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder="Tell us about your goals (optional)"
            rows={2}
            className="bg-secondary border-border resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="Email (optional)" className="bg-secondary border-border" />
            <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="Phone (optional)" className="bg-secondary border-border" />
          </div>
          <Button variant="gold" className="w-full gap-2" onClick={submitPaid} disabled={submitting}>
            <Crown className="w-4 h-4" />
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${BOOST_PRICE} & Get Featured (30 days)`}
          </Button>
          <Button variant="outline" className="w-full" onClick={submitFree} disabled={submitting}>
            Or request a custom deal
          </Button>
          <p className="text-muted-foreground text-[11px] text-center">Secured by Razorpay. Approval typically within 24h.</p>
        </div>
      )}
    </div>
  );
};
