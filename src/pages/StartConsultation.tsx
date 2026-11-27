import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMembership } from "@/hooks/useMembership";
import { MembershipBanner } from "@/components/MembershipBanner";
import type { Database } from "@/integrations/supabase/types";

type ArtistSummary = Pick<Database["public"]["Tables"]["artists"]["Row"], "id" | "name" | "avatar_url" | "specialty" | "studio_name" | "status">;

const StartConsultation = () => {
  const { artistId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<ArtistSummary | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { canChat, chatsRemaining, isMember } = useMembership();

  useEffect(() => {
    supabase.from("artists").select("id,name,avatar_url,specialty,studio_name,status").eq("id", artistId!).eq("status", "active").maybeSingle().then(({ data }) => setArtist(data));
  }, [artistId]);

  const handleSubmit = async () => {
    if (!user || !artistId || !description.trim()) {
      toast.error("Please describe your design idea");
      return;
    }
    if (!canChat) {
      toast.error("You've used all 3 free chats. Upgrade to Premium for unlimited consultations!");
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.rpc("start_consultation", {
      p_artist_id: artistId,
      p_brief: description.trim(),
      p_reference_images: [],
    });

    if (error || !data) {
      toast.error(error?.message || "Failed to start consultation");
      setSubmitting(false);
      return;
    }

    toast.success("Consultation started!");
    navigate(`/consultation/${data}`);
  };

  if (!artist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-20 px-4 max-w-2xl mx-auto">
        <Link to={`/artist/${artistId}`} className="inline-flex items-center gap-1 text-muted-foreground text-sm mb-6 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Start Design Consultation</h1>
        <p className="text-muted-foreground text-sm mb-6">Chat with {artist.name} about your custom tattoo design.</p>

        {!isMember && (
          <div className="mb-6">
            <MembershipBanner chatsRemaining={chatsRemaining} showChatTrigger />
          </div>
        )}

        <div className="bg-card rounded-lg border border-border p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <img src={artist.avatar_url || "https://via.placeholder.com/48"} alt={artist.name} className="w-12 h-12 rounded-full object-cover border border-gold/30" />
            <div>
              <p className="text-foreground font-medium">{artist.name}</p>
              <p className="text-muted-foreground text-xs">{artist.specialty} · {artist.studio_name}</p>
            </div>
          </div>

          {!canChat ? (
            <div className="text-center py-6">
              <Crown className="w-10 h-10 text-gold mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">Free chats used up</p>
              <p className="text-muted-foreground text-sm">Upgrade to Premium for unlimited artist consultations</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Describe your design idea *</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your tattoo idea, style preferences, size, placement..."
                  rows={4}
                  className="bg-secondary border-border text-foreground resize-none"
                />
              </div>

              <Button variant="gold" className="w-full gap-2" onClick={handleSubmit} disabled={submitting || !description.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Start Consultation
                {!isMember && chatsRemaining !== undefined && <span className="text-xs opacity-70">({chatsRemaining} free left)</span>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartConsultation;
