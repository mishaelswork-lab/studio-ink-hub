import { useState, useEffect } from "react";
import { CalendarDays, ImagePlus, DollarSign, Clock, Check, X, LogOut, Film, Upload, Link2, Instagram, IndianRupee, MessageSquare, Award, Plus, Trash2, Sparkles } from "lucide-react";
import { FeaturedBoostCard } from "@/components/FeaturedBoostCard";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const tabs = [
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "portfolio", label: "Portfolio", icon: ImagePlus },
  { id: "reels", label: "Reels", icon: Film },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "consultations", label: "Chats", icon: MessageSquare },
  { id: "boost", label: "Get Featured", icon: Sparkles },
  { id: "availability", label: "Hours", icon: Clock },
  { id: "earnings", label: "Earnings", icon: DollarSign },
] as const;

type Tab = typeof tabs[number]["id"];
type DaySchedule = { start: string; end: string; off: boolean };
type AvailabilityHours = Record<string, DaySchedule>;

const defaultHours: AvailabilityHours = {
  monday: { start: "10:00", end: "18:00", off: false },
  tuesday: { start: "10:00", end: "18:00", off: false },
  wednesday: { start: "10:00", end: "18:00", off: false },
  thursday: { start: "10:00", end: "18:00", off: false },
  friday: { start: "10:00", end: "18:00", off: false },
  saturday: { start: "10:00", end: "18:00", off: false },
  sunday: { start: "10:00", end: "18:00", off: true },
};

const InstagramImportDialog = ({ onImport, type }: { onImport: (url: string, caption: string) => void; type: "reel" | "photo" }) => {
  const [igUrl, setIgUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [open, setOpen] = useState(false);

  const handleImport = () => {
    if (!igUrl.trim()) { toast.error("Please enter an Instagram URL"); return; }
    if (!igUrl.includes("instagram.com")) { toast.error("Please enter a valid Instagram URL"); return; }
    onImport(igUrl.trim(), caption.trim());
    setIgUrl(""); setCaption(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 border-border text-foreground">
          <Instagram className="w-4 h-4" /> Import {type === "reel" ? "Reel" : "Photo"} from IG
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground">Import from Instagram</DialogTitle>
          <DialogDescription className="text-muted-foreground">Paste the URL of your Instagram {type}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Instagram URL</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={`https://www.instagram.com/${type === "reel" ? "reel" : "p"}/...`} value={igUrl} onChange={e => setIgUrl(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Caption (optional)</label>
            <Textarea placeholder="Add a caption..." value={caption} onChange={e => setCaption(e.target.value)} className="bg-secondary border-border text-foreground resize-none" rows={3} />
          </div>
          <Button variant="gold" className="w-full gap-2" onClick={handleImport}><Instagram className="w-4 h-4" /> Import</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ArtistDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const { user, artistProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [newCert, setNewCert] = useState({ name: "", issuing_body: "", url: "" });
  const [availability, setAvailability] = useState<AvailabilityHours>(defaultHours);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    if (!artistProfile || !user) return;
    const fetchData = async () => {
      const [bookingsRes, reelsRes, paymentsRes, consultationsRes, certsRes] = await Promise.all([
        supabase.from("bookings").select("*").eq("artist_id", artistProfile.id).order("created_at", { ascending: false }),
        supabase.from("reels").select("*").eq("artist_id", artistProfile.id).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("artist_id", artistProfile.id).eq("status", "completed"),
        supabase.from("consultations").select("*").eq("artist_id", user.id).order("created_at", { ascending: false }),
        supabase.from("artist_certifications").select("*").eq("artist_id", artistProfile.id).order("created_at", { ascending: false }),
      ]);
      setBookings(bookingsRes.data || []);
      setReels(reelsRes.data || []);
      setPayments(paymentsRes.data || []);
      setConsultations(consultationsRes.data || []);
      setCerts(certsRes.data || []);
      if (artistProfile.availability_hours) {
        setAvailability(artistProfile.availability_hours as AvailabilityHours);
      }
    };
    fetchData();
  }, [artistProfile, user]);

  const handleAddCert = async () => {
    if (!artistProfile || !newCert.name.trim()) { toast.error("Certification name required"); return; }
    const { error } = await supabase.from("artist_certifications").insert({
      artist_id: artistProfile.id,
      certification_name: newCert.name.trim(),
      issuing_body: newCert.issuing_body.trim() || null,
      certificate_url: newCert.url.trim() || null,
    });
    if (error) { toast.error("Failed to add"); return; }
    toast.success("Certification added! Admin will verify it.");
    setNewCert({ name: "", issuing_body: "", url: "" });
    const { data } = await supabase.from("artist_certifications").select("*").eq("artist_id", artistProfile.id).order("created_at", { ascending: false });
    setCerts(data || []);
  };

  const handleDeleteCert = async (id: string) => {
    await supabase.from("artist_certifications").delete().eq("id", id);
    setCerts(prev => prev.filter(c => c.id !== id));
    toast.success("Certification removed");
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Booking ${status}!`);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  // Safeguard: only allow tattoo/art uploads (AI moderation + admin override).
  // Uses a debounced+cached wrapper so preview/intermediate calls collapse into
  // a single moderation round-trip per final image URL.
  const moderate = async (imageUrl: string): Promise<boolean> => {
    const { moderateImage } = await import("@/lib/moderate");
    const r = await moderateImage(imageUrl);
    if (!r.allowed) toast.error(`Upload blocked: ${r.reason || "not tattoo/art"}. An admin can override.`);
    return r.allowed;
  };

  const handleInstagramImport = async (url: string, caption: string) => {
    if (!artistProfile) return;
    const ok = await moderate(url);
    const { logUsage } = await import("@/lib/usage");
    logUsage("media", "reel-insert", { source: "instagram" });
    const { error } = await supabase.from("reels").insert({
      artist_id: artistProfile.id,
      video_url: url,
      instagram_url: url,
      caption,
      source: "instagram",
      moderation_status: ok ? "approved" : "flagged",
    });
    if (error) { toast.error("Failed to import"); return; }
    toast.success(ok ? "Instagram reel imported!" : "Imported but flagged for admin review");
    const { data } = await supabase.from("reels").select("*").eq("artist_id", artistProfile.id).order("created_at", { ascending: false });
    setReels(data || []);
  };

  const handleInstagramPhotoImport = async (url: string, caption: string) => {
    if (!artistProfile) return;
    const ok = await moderate(url);
    if (!ok) return;
    const currentImages = artistProfile.portfolio_images || [];
    const { error } = await supabase.from("artists").update({
      portfolio_images: [...currentImages, url],
    }).eq("id", artistProfile.id);
    if (error) { toast.error("Failed to import"); return; }
    toast.success("Portfolio photo added from Instagram!");
    artistProfile.portfolio_images = [...currentImages, url];
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !artistProfile) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    // Upload via S3+CloudFront when configured (falls back to Supabase Storage).
    const { uploadMedia } = await import("@/lib/mediaUpload");
    let publicUrl: string;
    try {
      publicUrl = await uploadMedia(file, "portfolio", artistProfile.id);
    } catch {
      toast.error("Upload failed"); return;
    }

    // Moderate ONLY the final URL (debounced + cached — no calls on previews).
    const ok = await moderate(publicUrl);
    if (!ok) return;

    const currentImages = artistProfile.portfolio_images || [];
    const { error } = await supabase.from("artists").update({
      portfolio_images: [...currentImages, publicUrl],
    }).eq("id", artistProfile.id);
    if (error) { toast.error("Failed to save"); return; }
    artistProfile.portfolio_images = [...currentImages, publicUrl];
    toast.success("Photo added to portfolio!");
  };


  const handleSaveAvailability = async () => {
    if (!artistProfile) return;
    setSavingHours(true);
    const { error } = await supabase.from("artists").update({ availability_hours: availability as any }).eq("id", artistProfile.id);
    setSavingHours(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Availability updated!");
  };

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setAvailability(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const coverCharges = payments.filter(p => p.payment_type === "cover_charge");
  const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

  if (!artistProfile) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading artist profile...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 hidden md:flex flex-col">
        <div className="mb-8">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span></h1>
          <p className="text-muted-foreground text-xs mt-1">Artist Dashboard</p>
        </div>
        <div className="flex items-center gap-3 mb-8 p-3 rounded-lg bg-secondary/50">
          <img src={artistProfile.avatar_url || "https://via.placeholder.com/40"} alt={artistProfile.name} className="w-10 h-10 rounded-full object-cover border border-gold/30" />
          <div>
            <p className="text-foreground text-sm font-medium">{artistProfile.name}</p>
            <p className="text-gold text-xs">{artistProfile.specialty}</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-4"><LogOut className="w-4 h-4" /> Logout</button>
      </aside>

      <div className="md:hidden bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span></h1>
          <button onClick={handleLogout} className="text-muted-foreground text-sm">Logout</button>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs whitespace-nowrap ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="md:ml-64 p-6 md:p-8">
        {activeTab === "bookings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Bookings</h2>
            <div className="space-y-4">
              {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
              {bookings.map(booking => (
                <div key={booking.id} className="bg-card rounded-lg border border-border p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-foreground font-medium">{booking.customer_name}</h3>
                      <p className="text-muted-foreground text-sm">{booking.date} · {booking.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.cover_charge_paid && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">₹500 Paid</span>}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                        booking.status === "pending" ? "bg-gold/10 text-gold" :
                        booking.status === "completed" ? "bg-primary/10 text-primary" :
                        "bg-destructive/10 text-destructive"
                      }`}>{booking.status}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">{booking.style} · {booking.placement} · {booking.size}</p>
                  {booking.description && <p className="text-muted-foreground text-sm mb-4">{booking.description}</p>}
                  {booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="gold" onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")} className="gap-1"><Check className="w-3.5 h-3.5" /> Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")} className="gap-1"><X className="w-3.5 h-3.5" /> Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Portfolio</h2>
              <div className="flex gap-2">
                <InstagramImportDialog onImport={handleInstagramPhotoImport} type="photo" />
                <label>
                  <Button variant="gold" size="sm" className="gap-1 cursor-pointer" asChild>
                    <span><ImagePlus className="w-4 h-4" /> Upload</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePortfolioUpload} />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(artistProfile.portfolio_images || []).map((img: string, i: number) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={img} alt={`Work ${i + 1}`} loading="lazy" decoding="async" width={600} height={600} className="w-full h-full object-cover" />
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-gold/30 transition-colors cursor-pointer">
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePortfolioUpload} />
              </label>
            </div>
          </div>
        )}

        {activeTab === "reels" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">Reels</h2>
              <InstagramImportDialog onImport={handleInstagramImport} type="reel" />
            </div>
            <p className="text-muted-foreground text-sm mb-6">Upload short videos or import from Instagram to showcase your work.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {reels.map(reel => (
                <div key={reel.id} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-border group cursor-pointer">
                  <video src={reel.video_url} poster={reel.thumbnail_url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  {reel.instagram_url && <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"><Instagram className="w-3.5 h-3.5 text-white" /></div>}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-xs line-clamp-2">{reel.caption}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-white/70 text-xs">
                      <span>❤️ {reel.likes}</span>
                      <span>👁 {(reel.views / 1000).toFixed(1)}K</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="aspect-[9/16] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-gold/30 transition-colors cursor-pointer gap-2">
                <Film className="w-8 h-8 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Add Reel</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "consultations" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Design Consultations</h2>
            <div className="space-y-4">
              {consultations.length === 0 && <p className="text-muted-foreground">No consultation requests yet.</p>}
              {consultations.map(c => (
                <Link key={c.id} to={`/consultation/${c.id}`} className="bg-card rounded-lg border border-border p-5 block hover:border-gold/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-foreground font-medium">{c.design_description?.slice(0, 60) || "Design consultation"}...</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary"}`}>{c.status}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
                  {c.reference_images?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {c.reference_images.slice(0, 3).map((img: string, i: number) => (
                        <img key={i} src={img} alt="ref" className="w-12 h-12 rounded object-cover border border-border" />
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === "certifications" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Certifications</h2>
            <p className="text-muted-foreground text-sm mb-6">Add your certifications. Verified certs earn a badge on your profile.</p>

            <div className="bg-card rounded-lg border border-border p-5 mb-6">
              <h3 className="text-foreground font-medium mb-3">Add Certification</h3>
              <div className="space-y-3">
                <Input placeholder="Certification name *" value={newCert.name} onChange={e => setNewCert(p => ({ ...p, name: e.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Issuing body (optional)" value={newCert.issuing_body} onChange={e => setNewCert(p => ({ ...p, issuing_body: e.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Certificate URL (optional)" value={newCert.url} onChange={e => setNewCert(p => ({ ...p, url: e.target.value }))} className="bg-secondary border-border" />
                <Button variant="gold" size="sm" className="gap-1" onClick={handleAddCert}><Plus className="w-3.5 h-3.5" /> Add</Button>
              </div>
            </div>

            <div className="space-y-3">
              {certs.length === 0 && <p className="text-muted-foreground text-sm">No certifications added yet.</p>}
              {certs.map(cert => (
                <div key={cert.id} className={`flex items-center justify-between p-4 rounded-lg border ${cert.verified ? "border-gold/30 bg-gold/5" : "border-border bg-card"}`}>
                  <div className="flex items-center gap-3">
                    <Award className={`w-5 h-5 ${cert.verified ? "text-gold" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-foreground text-sm font-medium">{cert.certification_name}</p>
                      {cert.issuing_body && <p className="text-muted-foreground text-xs">{cert.issuing_body}</p>}
                    </div>
                    {cert.verified && <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full">Verified</span>}
                    {!cert.verified && <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Pending</span>}
                  </div>
                  <button onClick={() => handleDeleteCert(cert.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "boost" && artistProfile && (
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Get Featured</h2>
            <p className="text-muted-foreground text-sm mb-6">Stand out — get displayed above regular results in your area.</p>
            <FeaturedBoostCard artistId={artistProfile.id} />
          </div>
        )}

        {activeTab === "availability" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Availability</h2>
              <Button variant="gold" size="sm" onClick={handleSaveAvailability} disabled={savingHours}>
                {savingHours ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
              {Object.entries(availability).map(([day, schedule]) => (
                <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                  <span className="text-foreground text-sm font-medium capitalize">{day}</span>
                  <div className="flex items-center gap-3">
                    {!schedule.off && (
                      <>
                        <input type="time" value={schedule.start} onChange={e => updateDay(day, "start", e.target.value)} className="h-8 px-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                        <span className="text-muted-foreground text-sm">to</span>
                        <input type="time" value={schedule.end} onChange={e => updateDay(day, "end", e.target.value)} className="h-8 px-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                      </>
                    )}
                    {schedule.off && <span className="text-muted-foreground text-sm">Closed</span>}
                    <button onClick={() => updateDay(day, "off", !schedule.off)} className={`w-10 h-5 rounded-full flex items-center ${schedule.off ? "bg-secondary justify-start" : "bg-gold/30 justify-end"} px-0.5 cursor-pointer transition-all`}>
                      <div className={`w-4 h-4 rounded-full transition-colors ${schedule.off ? "bg-muted-foreground" : "bg-gold"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "earnings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Earnings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Earnings", value: `₹${totalEarnings.toLocaleString()}` },
                { label: "Cover Charges Received", value: `₹${(coverCharges.length * 500).toLocaleString()}` },
                { label: "Total Bookings", value: bookings.length.toString() },
              ].map(stat => (
                <div key={stat.label} className="bg-card rounded-lg border border-border p-5">
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                  <p className="text-gradient-gold font-heading text-2xl font-bold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
            {coverCharges.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-foreground font-medium mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-gold" /> Cover Charges</h3>
                {coverCharges.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-foreground text-sm">Cover Charge Payment</p>
                      <p className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-gold font-medium">₹{p.amount}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-foreground font-medium mb-4">All Payments</h3>
              {payments.length === 0 && <p className="text-muted-foreground text-sm">No payments yet.</p>}
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-foreground text-sm capitalize">{p.payment_type.replace("_", " ")}</p>
                    <p className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-gold font-medium">₹{p.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArtistDashboard;
