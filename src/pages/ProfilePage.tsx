import { QuotesLoader } from "@/components/QuotesLoader";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, ArrowLeft, Mail, Phone, User as UserIcon, Heart, Star, Trash2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { readConsent, recordConsent, resetConsent, type ConsentChoice } from "@/lib/consent";
import { useDataSaver } from "@/hooks/useDataSaver";
import DeleteAccountCard from "@/components/account/DeleteAccountCard";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dataSaver, setDataSaver] = useDataSaver();
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<ConsentChoice | null>(() => readConsent());

  // Favorites state (merged in)
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favArtists, setFavArtists] = useState<any[]>([]);
  const [favReels, setFavReels] = useState<any[]>([]);
  const [favDesigns, setFavDesigns] = useState<any[]>([]);
  const [favTab, setFavTab] = useState<"artists" | "reels" | "designs">("artists");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profRes, favsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("favorites").select("*").eq("user_id", user.id),
      ]);
      setProfile(profRes.data);
      const favs = favsRes.data || [];
      setFavorites(favs);

      const artistIds = favs.filter(f => f.item_type === "artist").map(f => f.item_id);
      const reelIds = favs.filter(f => f.item_type === "reel").map(f => f.item_id);
      const designIds = favs.filter(f => f.item_type === "design").map(f => f.item_id);

      const [aRes, rRes, dRes] = await Promise.all([
        artistIds.length ? supabase.from("artists").select("*").in("id", artistIds) : Promise.resolve({ data: [] as any[] }),
        reelIds.length ? supabase.from("reels").select("*, artists(name, avatar_url)").in("id", reelIds) : Promise.resolve({ data: [] as any[] }),
        designIds.length ? supabase.from("daily_designs").select("*").in("id", designIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      setFavArtists(aRes.data || []);
      setFavReels(rRes.data || []);
      setFavDesigns(dRes.data || []);
      setLoading(false);
    })();
  }, [user]);

  const removeFavorite = async (itemType: string, itemId: string) => {
    const { error } = await supabase.from("favorites").delete().eq("user_id", user!.id).eq("item_type", itemType).eq("item_id", itemId);
    if (error) { toast.error("Failed to remove"); return; }
    setFavorites(prev => prev.filter(f => !(f.item_type === itemType && f.item_id === itemId)));
    if (itemType === "artist") setFavArtists(prev => prev.filter(a => a.id !== itemId));
    if (itemType === "reel") setFavReels(prev => prev.filter(r => r.id !== itemId));
    if (itemType === "design") setFavDesigns(prev => prev.filter(d => d.id !== itemId));
    toast.success("Removed from favorites");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("reels-videos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("reels-videos").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <QuotesLoader />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="pt-20 px-4 max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground text-sm mb-6 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">My Profile</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-6 bg-card">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5"><Heart className="w-3.5 h-3.5" /> Saved Ideas</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-gold/30">
                  <AvatarImage src={profile?.avatar_url} alt={displayName} />
                  <AvatarFallback className="text-lg bg-gold/10 text-gold">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>
              <p className="text-muted-foreground text-xs mt-2">Tap to change photo</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5"><UserIcon className="w-3.5 h-3.5" /> Display Name</label>
                <Input value={displayName} readOnly className="bg-card opacity-70 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5"><Mail className="w-3.5 h-3.5" /> Email</label>
                <Input value={user?.email || "Not set"} readOnly className="bg-card opacity-70 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" /> Phone</label>
                <Input value={profile?.phone || user?.phone || "Not set"} readOnly className="bg-card opacity-70 cursor-not-allowed" />
              </div>
            </div>

            <p className="text-muted-foreground text-xs mt-4">Contact support to update name, email, or phone number.</p>

            <div className="mt-8 bg-card rounded-lg border border-border p-4">
              <p className="text-foreground text-sm font-medium mb-1 flex items-center gap-1.5"><Gauge className="w-4 h-4 text-gold" /> Data saver</p>
              <p className="text-muted-foreground text-xs mb-3">
                Reduce the amount of data used: reels don't autoplay and only load when you tap play, and designs load in lightweight sizes.
              </p>
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-sm text-foreground">{dataSaver ? "Data saver on" : "Data saver off"}</span>
                <button
                  role="switch"
                  aria-checked={dataSaver}
                  onClick={() => setDataSaver(!dataSaver)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border border-border transition-colors ${dataSaver ? "bg-gold" : "bg-secondary"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform ${dataSaver ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </label>
            </div>

            <div className="mt-4 bg-card rounded-lg border border-border p-4">
              <p className="text-foreground text-sm font-medium mb-1">Privacy & cookies</p>
              <p className="text-muted-foreground text-xs mb-3">
                Current choice: {consent === null ? "not decided" : consent.analytics ? "analytics allowed" : "essential cookies only"}.
                You can change or withdraw your consent at any time.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-border" onClick={async () => { await recordConsent(false); setConsent(readConsent()); }}>
                  Withdraw analytics consent
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { resetConsent(); setConsent(null); }}>
                  Review consent choices
                </Button>
                <Link to="/privacy"><Button variant="ghost" size="sm">Privacy Policy</Button></Link>
              </div>
            </div>

            <DeleteAccountCard />

            <Button variant="destructive" className="w-full mt-8" onClick={() => { signOut(); navigate("/"); }}>Sign Out</Button>

          </TabsContent>

          <TabsContent value="favorites">
            <div className="flex gap-2 mb-5 overflow-x-auto">
              {(["artists", "reels", "designs"] as const).map(t => (
                <button key={t} onClick={() => setFavTab(t)} className={`px-4 py-2 rounded-full text-sm capitalize whitespace-nowrap ${favTab === t ? "bg-gold/10 text-gold border border-gold/20" : "bg-card text-muted-foreground border border-border"}`}>
                  {t} ({t === "artists" ? favArtists.length : t === "reels" ? favReels.length : favDesigns.length})
                </button>
              ))}
            </div>

            {favTab === "artists" && (
              <div className="space-y-3">
                {favArtists.length === 0 && <p className="text-muted-foreground text-sm">No favorite artists yet.</p>}
                {favArtists.map(artist => (
                  <div key={artist.id} className="bg-card rounded-lg border border-border p-4 flex items-center gap-4">
                    <img src={artist.avatar_url || "https://via.placeholder.com/48"} alt={artist.name} className="w-12 h-12 rounded-full object-cover border border-gold/30" />
                    <div className="flex-1 min-w-0">
                      <Link to={`/artist/${artist.id}`} className="text-foreground font-medium hover:text-gold transition-colors">{artist.name}</Link>
                      <p className="text-muted-foreground text-xs">{artist.specialty} · {artist.studio_name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-gold text-gold" />
                        <span className="text-xs text-foreground">{artist.rating}</span>
                        <span className="text-xs text-muted-foreground ml-2">₹{artist.hourly_rate}/hr</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/book/${artist.id}`}><Button variant="gold" size="sm">Book</Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => removeFavorite("artist", artist.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {favTab === "reels" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {favReels.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No saved reels yet.</p>}
                {favReels.map(reel => (
                  <div key={reel.id} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-border group">
                    <video src={reel.video_url} poster={reel.thumbnail_url} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <button onClick={() => removeFavorite("reel", reel.id)} className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-medium">{reel.artists?.name}</p>
                      <p className="text-white/70 text-[10px] line-clamp-1">{reel.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {favTab === "designs" && (
              <div className="columns-2 md:columns-3 gap-3">
                {favDesigns.length === 0 && <p className="text-muted-foreground text-sm">No saved designs.</p>}
                {favDesigns.map(d => (
                  <div key={d.id} className="break-inside-avoid mb-3 relative group rounded-lg overflow-hidden border border-border">
                    <img src={d.thumb_url || d.image_url} alt={d.description || "Tattoo design"} loading="lazy" className="w-full" />
                    <button onClick={() => removeFavorite("design", d.id)} className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;
