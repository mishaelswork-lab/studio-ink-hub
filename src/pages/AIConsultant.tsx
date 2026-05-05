import { useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Upload, Loader2, Image as ImageIcon, X, RotateCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/lib/seo";

interface Suggestion {
  title: string;
  style: string;
  description: string;
  placement: string;
  size: string;
  keyword: string;
  image?: string;
}

const BODY_AREAS = ["Forearm", "Upper arm", "Shoulder", "Back", "Chest", "Ribs", "Thigh", "Calf", "Ankle", "Wrist", "Neck", "Hand"];

const AIConsultant = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [bodyArea, setBodyArea] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setPreview(data);
      setImageBase64(data);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setPreview(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = ""; };

  const handleSubmit = async () => {
    if (!imageBase64 && !bodyArea) {
      toast.error("Upload a photo or pick a body area");
      return;
    }
    setLoading(true);
    setSuggestions([]);
    setError(null);
    try {
      const invokePromise = supabase.functions.invoke("tattoo-suggest", {
        body: { imageBase64, bodyArea, notes },
      });
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("Taking too long — please retry.")), 30000)
      );
      const { data, error: fnErr } = (await Promise.race([invokePromise, timeoutPromise])) as any;
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const list: Suggestion[] = data?.suggestions || [];
      setSuggestions(list);
      if (!list.length) setError("No suggestions returned. Try a different photo or area.");
    } catch (e: any) {
      const msg = e?.message || "Failed to get suggestions";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="AI Tattoo Match — ArtSpace" description="Upload a photo of where you want a tattoo and get 10 design ideas instantly." />
      <Navbar />
      <div className="pt-24 pb-24 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-gold mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm tracking-[0.2em] uppercase">AI Tattoo Match</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Find 10 designs for your spot</h1>
          <p className="text-muted-foreground text-sm mt-2">Upload a photo of the area or pick a body part — we'll suggest 10 tattoos that work.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5">
          {/* Upload */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Photo of your skin / body area</label>
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-h-60 rounded-lg border border-border" />
                <button onClick={clearImage} className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg py-10 flex flex-col items-center gap-2 hover:border-gold/40 transition-colors"
              >
                <Upload className="w-6 h-6 text-gold" />
                <span className="text-sm text-foreground">Click to upload a photo</span>
                <span className="text-xs text-muted-foreground">JPG/PNG up to 8MB</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {/* Body area picker */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Or pick a body area</label>
            <div className="flex flex-wrap gap-2">
              {BODY_AREAS.map(a => (
                <button
                  key={a}
                  onClick={() => setBodyArea(bodyArea === a ? "" : a)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${bodyArea === a ? "bg-gold text-background border-gold" : "border-border text-muted-foreground hover:text-foreground hover:border-gold/40"}`}
                >{a}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Style or theme (optional)</label>
            <input
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. minimal, mythological, floral, geometric…"
              className="w-full h-11 px-4 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          <Button variant="gold" size="lg" className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating 10 ideas…</> : <>Get 10 tattoo ideas</>}
          </Button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-10">
            <h2 className="font-heading text-2xl font-bold mb-5">Generating 10 designs…</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error + retry */}
        {!loading && error && (
          <div className="mt-10 bg-destructive/5 border border-destructive/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-foreground font-medium mb-1">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button variant="gold" onClick={handleSubmit} className="gap-2">
              <RotateCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        )}

        {/* Results */}
        {!loading && suggestions.length > 0 && (
          <div className="mt-10">
            <h2 className="font-heading text-2xl font-bold mb-5">Your 10 Designs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {suggestions.map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden hover:border-gold/30 transition-colors">
                  <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                    {s.image ? (
                      <img src={s.image} alt={s.title} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading font-semibold text-foreground leading-tight">{s.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-gold whitespace-nowrap">#{i + 1}</span>
                    </div>
                    <p className="text-gold text-xs">{s.style} • {s.size}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{s.description}</p>
                    <p className="text-muted-foreground text-[11px] italic">Placement: {s.placement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConsultant;
