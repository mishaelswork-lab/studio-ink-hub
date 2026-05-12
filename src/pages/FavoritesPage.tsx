import { QuotesLoader } from "@/components/QuotesLoader";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, Trash2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FavoritesPage = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"artists" | "reels" | "designs">("artists");

  useEffect(() => {
    if (!user) return;
    const fetchFavorites = async () => {
      const { data: favs } = await supabase.from("favorites").select("*").eq("user_id", user.id);
      setFavorites(favs || []);

      const artistIds = (favs || []).filter(f => f.item_type === "artist").map(f => f.item_id);
      const reelIds = (favs || []).filter(f => f.item_type === "reel").map(f => f.item_id);
      const designIds = (favs || []).filter(f => f.item_type === "design").map(f => f.item_id);

      if (artistIds.length > 0) {
        const { data } = await supabase.from("artists").select("*").in("id", artistIds);
        setArtists(data || []);
      }
      if (reelIds.length > 0) {
        const { data } = await supabase.from("reels").select("*, artists(name, avatar_url)").in("id", reelIds);
        setReels(data || []);
      }
      if (designIds.length > 0) {
        const { data } = await supabase.from("daily_designs").select("*").in("id", designIds);
        setDesigns(data || []);
      }
      setLoading(false);
    };
    fetchFavorites();
  }, [user]);

  const removeFavorite = async (itemType: string, itemId: string) => {
    const { error } = await supabase.from("favorites").delete().eq("user_id", user!.id).eq("item_type", itemType).eq("item_id", itemId);
    if (error) { toast.error("Failed to remove"); return; }
    setFavorites(prev => prev.filter(f => !(f.item_type === itemType && f.item_id === itemId)));
    if (itemType === "artist") setArtists(prev => prev.filter(a => a.id !== itemId));
    if (itemType === "reel") setReels(prev => prev.filter(r => r.id !== itemId));
    if (itemType === "design") setDesigns(prev => prev.filter(d => d.id !== itemId));
    toast.success("Removed from favorites");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="pt-20 px-4 max-w-3xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-muted-foreground text-sm mb-4 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5 text-gold fill-gold" />
          <h1 className="font-heading text-2xl font-bold text-foreground">My Favorites</h1>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(["artists", "reels", "designs"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm capitalize whitespace-nowrap ${tab === t ? "bg-gold/10 text-gold border border-gold/20" : "bg-card text-muted-foreground border border-border"}`}>
              {t} ({t === "artists" ? artists.length : t === "reels" ? reels.length : designs.length})
            </button>
          ))}
        </div>

        {tab === "artists" && (
          <div className="space-y-3">
            {artists.length === 0 && <p className="text-muted-foreground text-sm">No favorite artists yet. Browse studios to add some!</p>}
            {artists.map(artist => (
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

        {tab === "reels" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {reels.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No saved reels yet. Discover reels to save them!</p>}
            {reels.map(reel => (
              <div key={reel.id} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-border group">
                <video src={reel.video_url} poster={reel.thumbnail_url} className="w-full h-full object-cover" muted />
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

        {tab === "designs" && (
          <div className="columns-2 md:columns-3 gap-3">
            {designs.length === 0 && <p className="text-muted-foreground text-sm">No saved designs. Browse Discover → Designs to save inspiration!</p>}
            {designs.map(d => (
              <div key={d.id} className="break-inside-avoid mb-3 relative group rounded-lg overflow-hidden border border-border">
                <img src={d.thumb_url || d.image_url} alt={d.description || "Tattoo design"} loading="lazy" className="w-full" />
                <button onClick={() => removeFavorite("design", d.id)} className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
