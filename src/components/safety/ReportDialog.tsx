import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ReportableType = "reel" | "artist" | "message" | "design";

const REASONS = [
  "Nudity or sexual content",
  "Hate speech or harassment",
  "Violence or gore",
  "Spam or scam",
  "Copyright / stolen artwork",
  "Involves a minor",
  "Other objectionable content",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contentType: ReportableType;
  contentId: string;
  label?: string;
}

export const ReportDialog = ({ open, onOpenChange, contentType, contentId, label }: Props) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Please sign in to report content"); return; }
    if (!reason) { toast.error("Choose a reason"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("content_reports").insert({
      content_type: contentType,
      content_id: contentId,
      reporter_id: user.id,
      reason,
      details: details.trim().slice(0, 1000) || null,
    });
    setSubmitting(false);
    if (error) { toast.error("Could not submit the report. Please try again."); return; }
    toast.success("Report received — our team reviews flagged content within 24 hours.");
    setReason("");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" /> Report {label || contentType}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <p className="text-muted-foreground text-xs">
            Tart has zero tolerance for objectionable content or abusive users. Reports are reviewed
            within 24 hours and offending content is removed.
          </p>
          <div className="space-y-1.5">
            {REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                  reason === r ? "border-gold/50 bg-gold/10 text-gold" : "border-border bg-secondary/40 text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            maxLength={1000}
            placeholder="Anything else we should know? (optional)"
            className="bg-secondary border-border min-h-[70px] text-sm"
          />
          <Button variant="gold" className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
