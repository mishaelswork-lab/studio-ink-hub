import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const DeleteAccountCard = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (confirm !== "DELETE") { toast.error('Type DELETE to confirm'); return; }
    if (!session) { toast.error("Please sign in again"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setBusy(false);
    const err = (data as any)?.error;
    if (error || err) {
      toast.error(err || "Could not delete your account. Please contact support.");
      return;
    }
    toast.success("Your account has been deleted.");
    await signOut();
    navigate("/");
  };

  return (
    <div className="mt-6 bg-card rounded-lg border border-destructive/30 p-4">
      <p className="text-foreground text-sm font-medium mb-1 flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-destructive" /> Delete my account
      </p>
      <p className="text-muted-foreground text-xs mb-3">
        Permanently deletes your profile, saved ideas, consultations, messages, artist portfolio photos and
        Reels, and connected Instagram tokens. Completed booking and payment records are retained in
        de-identified form for financial and dispute records. Active bookings must be resolved first.
        This cannot be undone.
      </p>

      {!open ? (
        <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-1.5" onClick={() => setOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" /> Delete my account
        </Button>
      ) : (
        <div className="space-y-2">
          <Input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="bg-secondary border-border"
            aria-label="Type DELETE to confirm account deletion"
          />
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy || confirm !== "DELETE"}>
              {busy ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountCard;
