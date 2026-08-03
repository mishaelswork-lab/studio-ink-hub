import { useState, useEffect, useRef, useMemo, memo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Heart, Share2, ExternalLink, Image as ImageIcon, Play, Download, Printer, Flag, FileText } from "lucide-react";
import { reels } from "@/data/mockReels";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorite } from "@/hooks/useFavorite";
import { shareLink } from "@/lib/share";
import { ReelCard } from "@/components/discover/ReelCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

const REPORT_REASONS = [
  "Not a tattoo/stencil",
  "Inappropriate content",
  "Contains a real person",
  "Low quality / broken image",
  "Other",
];

const fileBase = (d: DesignRow) => `artspace-stencil-${d.external_id.replace(/[^a-z0-9]/gi, "-")}`;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const useDesignActions = (design: DesignRow) => {
  const { user } = useAuth();

  const handleShare = async () => {
    const ok = await shareLink({
      title: "Tattoo stencil idea",
      text: design.description || "Check out this tattoo stencil",
      url: design.source_url || design.image_url,
    });
    return ok;
  };

  const downloadPNG = async () => {
    const t = toast.loading("Preparing PNG…");
    try {
      const res = await fetch(design.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase(design)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PNG downloaded", { id: t });
    } catch {
      toast.error("Download failed — try again", { id: t });
    }
  };

  const downloadPDF = async () => {
    const t = toast.loading("Building PDF…");
    try {
      const { jsPDF } = await import("jspdf");
      const img = await loadImage(design.image_url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: img.naturalHeight >= img.naturalWidth ? "p" : "l" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const maxW = pw - margin * 2;
      const maxH = ph - margin * 2 - 10;
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;
      pdf.addImage(dataUrl, "JPEG", (pw - w) / 2, margin, w, h);
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text("ArtSpace — stencil reference", pw / 2, ph - margin / 2, { align: "center" });
      pdf.save(`${fileBase(design)}.pdf`);
      toast.success("PDF downloaded", { id: t });
    } catch {
      toast.error("PDF failed — try the PNG download", { id: t });
    }
  };

  const printDesign = () => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
    w.document.write(`<html><head><title>ArtSpace Stencil</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:100%;max-height:100vh}@media print{@page{margin:12mm}}</style></head><body><img src="${design.image_url}" crossorigin="anonymous" onload="window.print();"/></body></html>`);
    w.document.close();
    toast.success("Print sheet opened");
  };

  const sendToArtist = async () => {
    if (!user) { toast.error("Sign in to share with an artist"); return; }
    const t = toast.loading("Sending to your artist…");
    const { data: cons } = await supabase
      .from("consultations").select("id, artist_id, artists!inner(name)")
      .eq("customer_id", user.id).eq("status", "active").limit(1).maybeSingle();
    if (!cons) { toast.error("Start a consultation first to share designs", { id: t }); return; }
    const { error } = await supabase.from("consultation_messages").insert({
      consultation_id: cons.id, sender_id: user.id, image_url: design.image_url,
      message: "Sharing this stencil idea",
    });
    if (error) toast.error("Could not send — try again", { id: t });
    else toast.success(`Sent to ${(cons as any).artists?.name || "artist"}`, { id: t });
  };

  return { handleShare, downloadPNG, downloadPDF, printDesign, sendToArtist };
};


const ActionRow = ({
  design, onReport, onClose, isFavorite, toggle, variant,
}: {
  design: DesignRow; onReport: (d: DesignRow) => void; onClose?: () => void;
  isFavorite: boolean; toggle: () => void; variant: "sheet" | "lightbox";
}) => {
  const { handleShare, downloadPNG, downloadPDF, printDesign, sendToArtist } = useDesignActions(design);

  const items = [
    { label: isFavorite ? "Saved" : "Save idea", icon: Heart, onClick: toggle, active: isFavorite },
    { label: "Send to artist", icon: ExternalLink, onClick: sendToArtist },
    { label: "Print stencil", icon: Printer, onClick: printDesign },
    { label: "PNG", icon: Download, onClick: downloadPNG },
    { label: "PDF", icon: FileText, onClick: downloadPDF },
    { label: "Share", icon: Share2, onClick: handleShare },
    { label: "Report", icon: Flag, onClick: () => onReport(design) },
  ];


  if (variant === "lightbox") {
    return (
      <div className="grid grid-cols-3 gap-2 p-3">
        {items.map(it => (
          <button
            key={it.label}
            onClick={() => { it.onClick(); }}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-secondary/60 border border-border text-xs text-foreground hover:bg-secondary transition-colors"
          >
            <it.icon className={`w-4 h-4 ${it.active ? "fill-red-500 text-red-500" : "text-gold"}`} />
            {it.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map(it => (
        <button
          key={it.label}
          onClick={() => { it.onClick(); onClose?.(); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground active:bg-secondary/60"
        >
          <it.icon className={`w-4 h-4 ${it.active ? "fill-red-500 text-red-500" : "text-gold"}`} />
          {it.label}
        </button>
      ))}
    </div>
  );
};

const DesignCard = ({ design, onReport }: { design: DesignRow; onReport: (d: DesignRow) => void }) => {
  const { isFavorite, toggle } = useFavorite("design", design.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const MOVE_TOLERANCE = 12; // px — beyond this the gesture is a scroll, not a long press

  const cancelPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    startPos.current = null;
  };

  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressed.current = false;
    cancelPress();
    startPos.current = { x: e.clientX, y: e.clientY };

    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(12);
      setSheetOpen(true);
    }, 450);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pressTimer.current || !startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) cancelPress();
  };

  const handleClick = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    setLightbox(true);
  };

  return (
    <>
      <div
        className="break-inside-avoid mb-3 group relative rounded-lg overflow-hidden border border-border bg-white cursor-pointer select-none touch-pan-y [-webkit-touch-callout:none]"
        onPointerDown={startPress}
        onPointerMove={onMove}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); if (!longPressed.current) { longPressed.current = true; setSheetOpen(true); } }}
      >

        <img
          src={design.thumb_url || design.image_url}
          alt={design.description || "Tattoo stencil"}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full object-cover pointer-events-none"
        />
        {isFavorite && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur rounded-full p-1.5">
            <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-card border-border p-0 pb-6 rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2 text-left">
            <SheetTitle className="font-heading text-base text-foreground">Design options</SheetTitle>
          </SheetHeader>
          <ActionRow design={design} onReport={onReport} onClose={() => setSheetOpen(false)} isFavorite={isFavorite} toggle={toggle} variant="sheet" />
        </SheetContent>
      </Sheet>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-3xl bg-background/95 border-border p-0 overflow-hidden">
          <div className="bg-white flex items-center justify-center max-h-[65vh]">
            <img
              src={design.image_url}
              alt={design.description || "Tattoo stencil"}
              className="max-h-[65vh] w-auto object-contain"
            />
          </div>
          <ActionRow design={design} onReport={(d) => { setLightbox(false); onReport(d); }} isFavorite={isFavorite} toggle={toggle} variant="lightbox" />
        </DialogContent>
      </Dialog>
    </>
  );
};

const PAGE = 30;

const DesignsFeed = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [reportDialog, setReportDialog] = useState<DesignRow | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportNote, setReportNote] = useState("");
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const { data: designs = [], isLoading } = useQuery<DesignRow[]>({
    queryKey: ["daily_designs"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_designs")
        .select("*")
        .like("external_id", "pinterest:%")
        .order("fetched_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  // Guests see a capped preview of 30 designs; signed-in users get the endless feed.
  const GUEST_LIMIT = 30;
  const isGuest = !user;
  const effectiveCount = isGuest ? Math.min(GUEST_LIMIT, designs.length) : count;

  const feed = useMemo(() => {
    if (!designs.length) return [] as { key: string; design: DesignRow }[];
    const out: { key: string; design: DesignRow }[] = [];
    let cycle = 0;
    while (out.length < effectiveCount) {
      const round = designs.map((d, i) => ({ d, i }));
      if (cycle > 0) {
        // deterministic reshuffle per cycle so repeats don't feel identical
        round.sort((a, b) => ((a.i * 9301 + cycle * 49297) % 233280) - ((b.i * 9301 + cycle * 49297) % 233280));
      }
      for (const { d } of round) {
        out.push({ key: `${d.id}-${cycle}`, design: d });
        if (out.length >= effectiveCount) break;
      }
      cycle++;
    }
    return out;
  }, [designs, effectiveCount]);

  useEffect(() => {
    if (isGuest) return;
    const el = sentinel.current;
    if (!el || !designs.length) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setCount(c => c + PAGE);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [designs.length, isGuest]);



  const triggerRefresh = async () => {
    setRefreshing(true);
    const { error } = await supabase.functions.invoke("refresh-designs");
    if (error) toast.error("Refresh failed");
    else { toast.success("Designs refreshed"); await qc.invalidateQueries({ queryKey: ["daily_designs"] }); }
    setRefreshing(false);
  };

  const submitReport = async () => {
    if (!user) { toast.error("Sign in to report"); return; }
    if (!reportDialog) return;
    const reasonText = reportReason + (reportNote.trim() ? ` — ${reportNote.trim()}` : "");
    const { error } = await supabase.from("design_reports").insert({
      design_id: reportDialog.id, reporter_id: user.id, reason: reasonText,
    });
    if (error) {
      if ((error as any).code === "23505") toast.error("You already reported this design");
      else toast.error("Report failed — try again");
    } else {
      toast.success("Thanks — our team will review it");
    }
    setReportDialog(null); setReportNote(""); setReportReason(REPORT_REASONS[0]);
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  if (designs.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">No designs cached yet. Pull the latest pins.</p>
        <Button variant="gold" size="sm" onClick={triggerRefresh} disabled={refreshing}>
          {refreshing ? "Loading…" : "Load designs"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-muted-foreground text-[11px] text-center mb-3">Tap to enlarge · Press and hold for quick options</p>

      <div className="columns-2 md:columns-3 gap-3">
        {feed.map(({ key, design }) => <DesignCard key={key} design={design} onReport={setReportDialog} />)}
      </div>

      {isGuest ? (
        <div className="mt-8 text-center space-y-3 border-t border-border pt-6">
          <p className="text-muted-foreground text-sm">
            You're viewing 30 free designs. Sign in to browse the full board.
          </p>
          <Link to="/login">
            <Button variant="gold" size="sm">Sign in to see more</Button>
          </Link>
        </div>
      ) : (
        <div ref={sentinel} className="h-10 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gold/60 border-t-transparent rounded-full animate-spin" />
        </div>
      )}


      <Dialog open={!!reportDialog} onOpenChange={(o) => { if (!o) setReportDialog(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Report this design</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-muted-foreground text-sm">Help us keep the discovery feed clean. Our team will review your report.</p>
            <div className="space-y-1.5">
              {REPORT_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" name="reason" value={r} checked={reportReason === r} onChange={() => setReportReason(r)} className="accent-gold" />
                  {r}
                </label>
              ))}
            </div>
            <Textarea value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder="Additional details (optional)" className="bg-secondary border-border min-h-[70px] text-sm" maxLength={500} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setReportDialog(null)}>Cancel</Button>
              <Button variant="gold" size="sm" onClick={submitReport}>Submit report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
