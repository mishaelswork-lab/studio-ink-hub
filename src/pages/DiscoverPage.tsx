import { useState, useEffect, useRef, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Heart, Share2, ExternalLink, Image as ImageIcon, Play, Download, Printer } from "lucide-react";
import { reels } from "@/data/mockReels";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorite } from "@/hooks/useFavorite";
import { shareLink } from "@/lib/share";
import { ReelCard } from "@/components/discover/ReelCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SEO } from "@/lib/seo";
import { toast } from "sonner";

interface DesignRow {
  id: string;
  external_id: string;
  image_url: string;
  thumb_url: string | null;
  source_url: string | null;
  photographer: string | null;
  description: string | null;
}

const DesignCard = ({ design }: { design: DesignRow }) => {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorite("design", design.id);

  const handleShare = () => shareLink({
    title: "Tattoo stencil idea",
    text: design.description || "Check out this tattoo stencil",
    url: design.source_url || design.image_url,
  });

  const downloadDesign = async () => {
    try {
      const res = await fetch(design.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `artspace-stencil-${design.external_id.replace(/[^a-z0-9]/gi, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed — try again");
    }
  };

  const printDesign = () => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
    w.document.write(`<html><head><title>ArtSpace Stencil</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:100%;max-height:100vh}@media print{@page{margin:12mm}}</style></head><body><img src="${design.image_url}" crossorigin="anonymous" onload="window.print();"/></body></html>`);
    w.document.close();
  };

  const sendToArtist = async () => {
    if (!user) { toast.error("Sign in to share with an artist"); return; }
    const { data: cons } = await supabase
      .from("consultations").select("id, artist_id, artists!inner(name)")
      .eq("customer_id", user.id).eq("status", "active").limit(1).maybeSingle();
    if (!cons) { toast.error("Start a consultation first to share designs"); return; }
    await supabase.from("consultation_messages").insert({
      consultation_id: cons.id, sender_id: user.id, image_url: design.image_url,
      message: "Sharing this stencil idea",
    });
    toast.success(`Sent to ${(cons as any).artists?.name || "artist"}`);
  };

  return (
    <div className="break-inside-avoid mb-3 group relative rounded-lg overflow-hidden border border-border bg-white">
      <img src={design.thumb_url || design.image_url} alt={design.description || "Tattoo stencil"} loading="lazy" className="w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={toggle} className="bg-black/50 backdrop-blur rounded-full p-2">
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
        <div className="flex gap-1.5">
          <button onClick={downloadDesign} className="bg-black/50 backdrop-blur rounded-full p-2" title="Download stencil">
            <Download className="w-4 h-4 text-white" />
          </button>
          <button onClick={printDesign} className="bg-black/50 backdrop-blur rounded-full p-2" title="Print stencil">
            <Printer className="w-4 h-4 text-white" />
          </button>
          <button onClick={sendToArtist} className="bg-black/50 backdrop-blur rounded-full p-2" title="Send to artist">
            <ExternalLink className="w-4 h-4 text-white" />
          </button>
          <button onClick={handleShare} className="bg-black/50 backdrop-blur rounded-full p-2" title="Share">
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DesignsFeed = () => {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: designs = [], isLoading } = useQuery<DesignRow[]>({
    queryKey: ["daily_designs"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("daily_designs").select("*").order("fetched_at", { ascending: false }).limit(120);
      return data || [];
    },
  });

  const triggerRefresh = async () => {
    setRefreshing(true);
    const { error } = await supabase.functions.invoke("refresh-designs");
    if (error) toast.error("Refresh failed");
    else { toast.success("Designs refreshed"); await qc.invalidateQueries({ queryKey: ["daily_designs"] }); }
    setRefreshing(false);
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  if (designs.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">No designs cached yet. Pull the daily feed now.</p>
        <Button variant="gold" size="sm" onClick={triggerRefresh} disabled={refreshing}>
          {refreshing ? "Loading…" : "Load designs"}
        </Button>
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 gap-3">
      {designs.map(d => <DesignCard key={d.id} design={d} />)}
    </div>
  );
};

const ReelsFeed = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="snap-y snap-mandatory overflow-y-auto space-y-4 scrollbar-hide"
      style={{ maxHeight: "calc(100vh - 14rem)" }}
    >
      {reels.map(reel => <ReelCard key={reel.id} reel={reel} />)}
    </div>
  );
};

const DiscoverPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Discover Tattoo Art & Reels"
        description="Watch artist reels and browse fresh tattoo design ideas. Save your favourites and share them with your chosen artist on ArtSpace."
      />
      <Navbar />
      <div className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-5">
            <p className="text-gold text-sm tracking-[0.2em] uppercase mb-1">Discover</p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Reels & Designs</h1>
          </div>

          <Tabs defaultValue="reels" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4 w-full bg-secondary/50 border border-border">
              <TabsTrigger value="reels" className="gap-1.5 text-sm data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
                <Play className="w-3.5 h-3.5" />Reels
              </TabsTrigger>
              <TabsTrigger value="designs" className="gap-1.5 text-sm data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
                <ImageIcon className="w-3.5 h-3.5" />Designs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reels">
              <ReelsFeed />
            </TabsContent>

            <TabsContent value="designs">
              <DesignsFeed />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
