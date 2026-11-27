import { QuotesLoader } from "@/components/QuotesLoader";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, ArrowLeft, Mail, Phone, User as UserIcon, Heart, Trash2, Gauge } from "lucide-react";
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
import type { Database } from "@/integrations/supabase/types";
import { getArtistAvatarUrl, getReelMediaUrl } from "@/lib/portfolioMedia";

type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "display_name" | "avatar_url" | "city" | "country" | "created_at">;
type FavoriteRow = Database["public"]["Tables"]["favorites"]["Row"];
type FavoriteArtist = Pick<Database["public"]["Tables"]["artists"]["Row"], "id" | "name" | "avatar_url" | "specialty" | "studio_name" | "hourly_rate">;
type FavoriteReel = Pick<Database["public"]["Tables"]["reels"]["Row"], "id" | "artist_id" | "caption" | "video_url" | "thumbnail_url" | "created_at"> & {
  artists: Pick<Database["public"]["Tables"]["artists"]["Row"], "name" | "avatar_url"> | null;
};
type FavoriteDesign = Pick<Database["public"]["Tables"]["designs"]["Row"], "id" | "title" | "description" | "image_url" | "placement" | "style">;

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dataSaver, setDataSaver] = useDataSaver();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<ConsentChoice | null>(() => readConsent());

  // Favorites state (merged in)
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [favArtists, setFavArtists] = useState<FavoriteArtist[]>([]);
  const [favReels, setFavReels] = useState<FavoriteReel[]>([]);
  const [favDesigns, setFavDesigns] = useState<FavoriteDesign[]>([]);
  const [favTab, setFavTab] = useState<"artists" | "reels" | "designs">("artists");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profRes, favsRes] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_url,city,country,created_at").eq("id", user.id).maybeSingle(),
        supabase.from("favorites").select("*").eq("user_id", user.id),
        ]);
        if (profRes.error) throw profRes.error;
        if (favsRes.error) throw favsRes.error;
        let profileData = profRes.data;
      if (profileData?.avatar_url && !/^https?:\/\//i.test(profileData.avatar_url)) {
        const { data: signedAvatar } = await supabase.storage.from("portfolio-private").createSignedUrl(profileData.avatar_url, 900);
        profileData = { ...profileData, avatar_url: signedAvatar?.signedUrl ?? null };
      }
      setProfile(profileData);
      const favs = favsRes.data || [];
      setFavorites(favs);

      const artistIds = favs.filter(f => f.item_type === "artist").map(f => f.item_id);
      const reelIds = favs.filter(f => f.item_type === "reel").map(f => f.item_id);
      const designIds = favs.filter(f => f.item_type === "design").map(f => f.item_id);

      let artists: FavoriteArtist[] = [];
      let reels: FavoriteReel[] = [];
      let designs: FavoriteDesign[] = [];
      if (artistIds.length) {
        const { data, error } = await supabase.from("artists")
          .select("id,name,avatar_url,specialty,studio_name,hourly_rate").in("id", artistIds);
        if (error) throw error;
        artists = data ?? [];
      }
      if (reelIds.length) {
        const { data, error } = await supabase.from("reels")
          .select("id,artist_id,caption,video_url,thumbnail_url,created_at,artists(name,avatar_url)").in("id", reelIds);
        if (error) throw error;
        reels = data ?? [];
      }
      if (designIds.length) {
        const { data, error } = await supabase.from("designs")
          .select("id,title,description,image_url,placement,style").in("id", designIds);
        if (error) throw error;
        designs = data ?? [];
      }
      const signedArtists = await Promise.all(artists.map(async artist => {
        if (!artist.avatar_url) return artist;
        try { return { ...artist, avatar_url: await getArtistAvatarUrl(artist.id) }; }
        catch { return { ...artist, avatar_url: null }; }
      }));
      const signedReels = await Promise.all(reels.map(async reel => {
        try {
          const media = await getReelMediaUrl(reel.id);
          return { ...reel, video_url: media.videoUrl, thumbnail_url: media.thumbnailUrl };
        } catch { return null; }
      }));
        setFavArtists(signedArtists);
        setFavReels(signedReels.filter((reel): reel is FavoriteReel => reel !== null));
        setFavDesigns(designs);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Could not load your profile");
      } finally {
        setLoading(false);
      }
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
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG, or WebP image");
      const path = `${user.id}/profile/avatar`;
      const { error: uploadError } = await supabase.storage.from("portfolio-private").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (profileError) throw profileError;
      const { data: signedAvatar, error: signError } = await supabase.storage.from("portfolio-private").createSignedUrl(path, 900);
      if (signError || !signedAvatar?.signedUrl) throw signError || new Error("Could not load uploaded avatar");
      setProfile(prev => prev ? { ...prev, avatar_url: signedAvatar.signedUrl } : prev);
      toast.success("Profile picture updated!");
    } catch (err: unknown) {
      toast.error("Upload failed: " + (err instanceof Error ? err.message : "Please try again"));
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
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
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
                <Input value={user?.phone || "Not set"} readOnly className="bg-card opacity-70 cursor-not-allowed" />
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
                        <span className="text-xs text-muted-foreground">₹{artist.hourly_rate}/hr</span>
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
                    <img src={d.image_url} alt={d.description || "Tattoo design"} loading="lazy" className="w-full" />
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
