import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FeaturedBoostCard = ({ artistId }: { artistId: string }) => {
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

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.from("featured_requests").insert({
      artist_id: artistId,
      message: form.message.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error("Could not submit request"); return; }
    toast.success("Request sent! Our team will reach out for the best deal.");
    setExisting(data);
  };

  if (loading) return <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gold" /></div>;

  return (
    <div className="bg-gradient-to-br from-gold/10 via-gold/5 to-transparent border border-gold/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="font-heading text-foreground font-semibold">Get Featured</h3>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Appear above regular search results in your area. Contact our team for the best deal.
      </p>

      {existing && existing.status !== "rejected" ? (
        <div className="bg-card/50 border border-border rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-foreground text-sm font-medium">Request received — status: <span className="text-gold capitalize">{existing.status}</span></p>
            <p className="text-muted-foreground text-xs mt-1">Our team will contact you shortly with custom pricing.</p>
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
          <Button variant="gold" className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request a Featured Slot"}
          </Button>
          <p className="text-muted-foreground text-[11px] text-center">We'll contact you with the best deal.</p>
        </div>
      )}
    </div>
  );
};
