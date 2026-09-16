import { useState } from "react";
import { Plus, ImagePlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 12;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const artistSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  studio_name: z.string().trim().max(80),
  specialty: z.string().trim().max(60),
  bio: z.string().trim().max(1500),
  hourly_rate: z.number().int().min(100, "Minimum rate is ₹100").max(50000, "Maximum rate is ₹50,000"),
  experience_years: z.number().int().min(0).max(70),
});

const emptyForm = { email: "", password: "", name: "", studio_name: "", specialty: "", bio: "", hourly_rate: "1500", experience_years: "0" };

const AddArtistDialog = ({ onAdded }: { onAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > MAX_PHOTOS) { toast.error(`Up to ${MAX_PHOTOS} photos`); return; }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const added: string[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, WEBP or HEIC images"); continue; }
      if (file.size > MAX_FILE_BYTES) { toast.error("Each photo must be under 5MB"); continue; }
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const path = `portfolio/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("reels-videos").upload(path, file);
      if (error) { toast.error("Upload failed"); continue; }
      const { data } = supabase.storage.from("reels-videos").getPublicUrl(path);
      added.push(data.publicUrl);
    }
    if (added.length) setPhotos(prev => [...prev, ...added]);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = artistSchema.safeParse({
      ...form,
      hourly_rate: Number(form.hourly_rate),
      experience_years: Number(form.experience_years),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (photos.length < MIN_PHOTOS) { toast.error(`Upload at least ${MIN_PHOTOS} portfolio photos`); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-add-artist", {
        body: { ...parsed.data, portfolio_images: photos },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`${parsed.data.name} added and live`);
      setForm(emptyForm);
      setPhotos([]);
      setOpen(false);
      onAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add artist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Artist</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading text-foreground">Add New Artist</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-email">Email *</label>
              <Input id="aa-email" required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="artist@email.com" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-pass">Password *</label>
              <Input id="aa-pass" required type="password" minLength={8} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 chars" className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-name">Full Name *</label>
            <Input id="aa-name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Artist name" className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-studio">Studio</label>
              <Input id="aa-studio" value={form.studio_name} onChange={e => setForm(p => ({ ...p, studio_name: e.target.value }))} placeholder="Studio name" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-spec">Specialty</label>
              <Input id="aa-spec" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} placeholder="e.g. Japanese" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-rate">Hourly Rate (₹)</label>
              <Input id="aa-rate" type="number" min={100} max={50000} value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-exp">Experience (yrs)</label>
              <Input id="aa-exp" type="number" min={0} max={70} value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-bio">Bio</label>
            <Textarea id="aa-bio" maxLength={1500} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio..." className="bg-secondary border-border resize-none" rows={2} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">Portfolio photos * (min {MIN_PHOTOS})</label>
              <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Portfolio ${i + 1}`} loading="lazy" decoding="async" width={300} height={300} className="w-full h-full object-cover" />
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(p => p.filter(u => u !== url))} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:border-gold/40">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                  <span className="text-[11px]">{uploading ? "Uploading…" : "Add"}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} aria-label="Upload portfolio photos" />
                </label>
              )}
            </div>
            {photos.length < MIN_PHOTOS && (
              <p className="text-xs text-gold mt-2">Add {MIN_PHOTOS - photos.length} more photo{MIN_PHOTOS - photos.length > 1 ? "s" : ""} — profiles without work samples cannot be published.</p>
            )}
          </div>

          <Button type="submit" variant="gold" className="w-full" disabled={loading || uploading || photos.length < MIN_PHOTOS}>
            {loading ? "Adding..." : "Add Artist"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddArtistDialog;
