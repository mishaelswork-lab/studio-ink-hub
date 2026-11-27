import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, ImagePlus, Trash2, ShieldCheck, AlertTriangle, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/lib/seo";

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 24;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
// Anti-spam: no more than 6 uploads in a rolling 5 minute window.
const UPLOAD_WINDOW_MS = 5 * 60 * 1000;
const UPLOADS_PER_WINDOW = 6;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  studio_name: z.string().trim().max(80, "Studio name is too long"),
  specialty: z.string().trim().max(60, "Specialty is too long"),
  bio: z.string().trim().max(1500, "Bio must be 1500 characters or fewer"),
  hourly_rate: z.number().int().min(100, "Minimum rate is ₹100").max(50000, "Maximum rate is ₹50,000"),
  experience_years: z.number().int().min(0, "Cannot be negative").max(70, "That seems too high"),
});

const ArtistProfileEditor = () => {
  const { user, artistProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", studio_name: "", specialty: "", bio: "", hourly_rate: "1500", experience_years: "0",
  });
  const [images, setImages] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);
  const uploadTimes = useRef<number[]>([]);

  useEffect(() => {
    if (!artistProfile) return;
    setForm({
      name: artistProfile.name || "",
      studio_name: artistProfile.studio_name || "",
      specialty: artistProfile.specialty || "",
      bio: artistProfile.bio || "",
      hourly_rate: String(artistProfile.hourly_rate ?? 1500),
      experience_years: String(artistProfile.experience_years ?? 0),
    });
    setAvatar(artistProfile.avatar_url || null);
    setAvailable(!!artistProfile.available);
    let cancelled = false;
    supabase.from("portfolio_items").select("media_url")
      .eq("artist_id", artistProfile.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (!cancelled) setImages((data || []).map(item => item.media_url)); });
    setReady(true);
    return () => { cancelled = true; };
  }, [artistProfile]);

  const canPublish = images.length >= MIN_PHOTOS;
  const applicationStatus = artistProfile?.status === "active" ? "approved" : artistProfile?.status === "suspended" ? "rejected" : "pending";
  const isApproved = applicationStatus === "approved";
  const remaining = useMemo(() => Math.max(0, MIN_PHOTOS - images.length), [images.length]);

  const throttleOk = () => {
    const now = Date.now();
    uploadTimes.current = uploadTimes.current.filter(t => now - t < UPLOAD_WINDOW_MS);
    if (uploadTimes.current.length >= UPLOADS_PER_WINDOW) {
      toast.error("Too many uploads. Please wait a few minutes.");
      return false;
    }
    uploadTimes.current.push(now);
    return true;
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, WEBP or HEIC images"); return false; }
    if (file.size > MAX_FILE_BYTES) { toast.error("Each photo must be under 5MB"); return false; }
    return true;
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !artistProfile) return;
    if (images.length + files.length > MAX_PHOTOS) {
      toast.error(`A portfolio can hold at most ${MAX_PHOTOS} photos`);
      return;
    }

    setUploading(true);
    const { uploadMedia } = await import("@/lib/mediaUpload");
    const { moderateImage } = await import("@/lib/moderate");
    const added: string[] = [];

    for (const file of files.slice(0, MAX_PHOTOS)) {
      if (!validateFile(file) || !throttleOk()) continue;
      try {
        const url = await uploadMedia(file, "portfolio", artistProfile.id);
        if (images.includes(url) || added.includes(url)) continue;
        const check = await moderateImage(url);
        if (!check.allowed) {
          toast.error(`Photo rejected: ${check.reason || "must be tattoo or art work"}`);
          continue;
        }
        added.push(url);
      } catch {
        toast.error("Upload failed. Please try again.");
      }
    }

    if (added.length) {
      const rows = added.map(media_url => ({ artist_id: artistProfile.id, media_url, media_type: "image", approved: false }));
      const { error } = await supabase.from("portfolio_items").insert(rows);
      if (error) toast.error("Could not save portfolio items");
      else {
        setImages(prev => [...prev, ...added]);
        toast.success(added.length + " portfolio photo(s) submitted for review");
      }
    }
    setUploading(false);
  };

  const handleRemove = async (url: string) => {
    if (!artistProfile) return;
    const { error } = await supabase.from("portfolio_items").delete().eq("artist_id", artistProfile.id).eq("media_url", url);
    if (error) { toast.error("Could not remove photo"); return; }
    const next = images.filter(i => i !== url);
    setImages(next);
    if (next.length < MIN_PHOTOS && available) {
      await supabase.rpc("artist_set_availability", { p_available: false });
      setAvailable(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !artistProfile || !validateFile(file) || !throttleOk()) return;
    setUploading(true);
    try {
      const { uploadMedia } = await import("@/lib/mediaUpload");
      const url = await uploadMedia(file, "avatars", artistProfile.id);
      const { moderateImage } = await import("@/lib/moderate");
      const check = await moderateImage(url);
      if (!check.allowed) { toast.error("Profile photo rejected by review"); return; }
      setAvatar(url);
      const { error } = await supabase.rpc("artist_update_own_profile", {
        p_name: form.name, p_studio_name: form.studio_name, p_specialty: form.specialty,
        p_bio: form.bio, p_hourly_rate: Number(form.hourly_rate),
        p_experience_years: Number(form.experience_years), p_avatar_url: url,
      });
      if (error) { toast.error("Could not save photo"); return; }
      await refreshProfile();
      toast.success("Profile photo updated");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!artistProfile) return false;
    const parsed = profileSchema.safeParse({ name: form.name, studio_name: form.studio_name, specialty: form.specialty, bio: form.bio, hourly_rate: Number(form.hourly_rate), experience_years: Number(form.experience_years) });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return false; }
    const { error } = await supabase.rpc("artist_update_own_profile", {
      p_name: parsed.data.name, p_studio_name: parsed.data.studio_name, p_specialty: parsed.data.specialty,
      p_bio: parsed.data.bio, p_hourly_rate: parsed.data.hourly_rate,
      p_experience_years: parsed.data.experience_years, p_avatar_url: avatar,
    });
    if (error) { toast.error(error.message || "Could not save profile"); return false; }
    await refreshProfile();
    return true;
  };

  const handleSave = async (publish: boolean) => {
    if (!artistProfile) return;
    if (publish && (!canPublish || !isApproved)) {
      toast.error(!canPublish ? "Upload at least " + MIN_PHOTOS + " portfolio photos first" : "Your profile must be approved before it can go live");
      return;
    }
    setSaving(true);
    const saved = await saveProfile();
    if (saved && isApproved) {
      const { data, error } = await supabase.rpc("artist_set_availability", { p_available: publish });
      if (error) toast.error(error.message || "Could not update availability");
      else { setAvailable(data === true); toast.success(data ? "Profile is live" : "Profile saved as hidden"); }
    } else if (saved) {
      setAvailable(false);
      toast.success("Profile saved. It remains hidden until admin approval.");
    }
    setSaving(false);
  };

  const handleSubmitForReview = async () => {
    if (!artistProfile || !canPublish) return;
    setSaving(true);
    const saved = await saveProfile();
    setSaving(false);
    if (saved) toast.success("Profile saved. Your application remains pending admin approval.");
  };

  if (!user || !artistProfile || !ready) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Artist Profile | Tart" description="Manage your tattoo portfolio, rates and availability on Tart." />
      <div className="max-w-3xl mx-auto p-5 md:p-8">
        <button onClick={() => navigate("/artist-dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">My Profile</h1>
        <p className="text-muted-foreground text-sm mb-6">This is what customers see when they find you.</p>

        <div className={`rounded-lg border p-4 mb-6 flex items-start gap-3 ${isApproved ? "border-emerald-500/30 bg-emerald-500/5" : applicationStatus === "rejected" ? "border-destructive/30 bg-destructive/5" : "border-gold/30 bg-gold/5"}`}>
          {isApproved ? <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${applicationStatus === "rejected" ? "text-destructive" : "text-gold"}`} />}
          <div className="text-sm">
            {isApproved ? (
              <p className="text-foreground">
                Approved. You have {images.length} portfolio photos. {available ? "Your profile is live." : "You can now publish it."}
              </p>
            ) : applicationStatus === "rejected" ? (
              <div>
                <p className="text-foreground font-medium">Changes requested by the review team</p>
                <p className="text-muted-foreground mt-1">{artistProfile.rejection_reason || "Please update your profile and resubmit it."}</p>
              </div>
            ) : canPublish ? (
              <p className="text-foreground">Your application has the required photos and is awaiting admin approval. It remains hidden from customers.</p>
            ) : (
              <p className="text-foreground">
                Add {remaining} more photo{remaining > 1 ? "s" : ""} of your own work. Every artist needs at least {MIN_PHOTOS} photos before their profile can go live — this keeps fake listings out.
              </p>
            )}
          </div>
        </div>

        {/* Profile photo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <img
              src={avatar || "/placeholder.svg"}
              alt={form.name || "Artist profile photo"}
              width={80} height={80} loading="lazy" decoding="async"
              className="w-20 h-20 rounded-full object-cover border border-gold/30"
            />
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold flex items-center justify-center cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-background" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} aria-label="Upload profile photo" />
            </label>
          </div>
          <div>
            <p className="text-foreground font-medium">{form.name || "Your name"}</p>
            <p className="text-muted-foreground text-sm">{form.specialty || "Add your specialty"}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-10">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="ap-name">Name</label>
              <Input id="ap-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={80} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="ap-studio">Studio</label>
              <Input id="ap-studio" value={form.studio_name} onChange={e => setForm(p => ({ ...p, studio_name: e.target.value }))} maxLength={80} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="ap-specialty">Specialty</label>
              <Input id="ap-specialty" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} maxLength={60} placeholder="e.g. Fine line, Japanese" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="ap-exp">Years of experience</label>
              <Input id="ap-exp" type="number" min={0} max={70} value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="ap-rate">Hourly rate (₹)</label>
              <Input id="ap-rate" type="number" min={100} max={50000} value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="bg-secondary border-border" />
              <p className="text-xs text-muted-foreground mt-1">Between ₹100 and ₹50,000 per hour.</p>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block" htmlFor="ap-bio">About you</label>
            <Textarea id="ap-bio" rows={4} maxLength={1500} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Your style, training, what customers can expect…" className="bg-secondary border-border resize-none" />
            <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/1500</p>
          </div>
        </div>

        {/* Portfolio */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-heading text-xl font-bold text-foreground">Portfolio</h2>
            <span className="text-xs text-muted-foreground">{images.length}/{MAX_PHOTOS} photos</span>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Only your own tattoo or art work. Every upload is checked automatically, and photos that are not tattoo art are rejected.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={img} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={img} alt={`Portfolio work ${i + 1}`} loading="lazy" decoding="async" width={600} height={600} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemove(img)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {images.length < MAX_PHOTOS && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-gold/40 transition-colors cursor-pointer text-muted-foreground">
                {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <ImagePlus className="w-7 h-7" />}
                <span className="text-xs">{uploading ? "Uploading…" : "Add photos"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioUpload} aria-label="Upload portfolio photos" />
              </label>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4">
          {isApproved ? (
            <Button variant="gold" className="flex-1" disabled={saving || uploading || !canPublish} onClick={() => handleSave(true)}>
              {saving ? "Saving…" : canPublish ? "Save & go live" : `Add ${remaining} more photo${remaining > 1 ? "s" : ""} to go live`}
            </Button>
          ) : (
            <Button variant="gold" className="flex-1" disabled={saving || uploading || !canPublish} onClick={handleSubmitForReview}>
              {saving ? "Saving…" : applicationStatus === "rejected" ? "Save & resubmit" : canPublish ? "Save for review" : `Add ${remaining} more photo${remaining > 1 ? "s" : ""}`}
            </Button>
          )}
          <Button variant="outline" className="flex-1" disabled={saving || uploading} onClick={() => handleSave(false)}>
            Save as hidden
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfileEditor;
