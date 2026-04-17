import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  artistId: string;
  customerId: string;
  onDone?: () => void;
  trigger?: React.ReactNode;
}

export const ReviewDialog = ({ bookingId, artistId, customerId, onDone, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("reviews").upsert({
      booking_id: bookingId, artist_id: artistId, customer_id: customerId, rating, comment,
    }, { onConflict: "booking_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="gold-outline" size="sm">Leave Review</Button>}
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Rate your session</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1 my-3">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)} type="button">
              <Star className={`w-7 h-7 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the experience? (optional)" rows={4} className="bg-background border-border" />
        <Button variant="gold" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Submit Review"}</Button>
      </DialogContent>
    </Dialog>
  );
};
