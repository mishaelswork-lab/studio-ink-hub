import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Heart, Eye, Play, Pause, Volume2, VolumeX, Bookmark } from "lucide-react";
import { reels, Reel } from "@/data/mockReels";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ReelCard = ({ reel }: { reel: Reel }) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("item_type", "reel").eq("item_id", reel.id).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, reel.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setPlaying(true);
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause(); else videoRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  const toggleSave = async () => {
    if (!user) { toast.error("Please sign in to save reels"); return; }
    if (saved) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_type", "reel").eq("item_id", reel.id);
      setSaved(false);
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, item_type: "reel", item_id: reel.id });
      setSaved(true);
      toast.success("Saved to favorites!");
    }
  };

  return (
    <div ref={cardRef} className="relative w-full snap-start snap-always flex-shrink-0 rounded-xl overflow-hidden bg-card border border-border" style={{ height: "calc(100vh - 10rem)", maxHeight: "700px", minHeight: "500px" }}>
      <video ref={videoRef} src={reel.videoUrl} poster={reel.thumbnail} loop muted={muted} playsInline className="absolute inset-0 w-full h-full object-cover" onClick={togglePlay} />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20" onClick={togglePlay}>
          <Play className="w-16 h-16 text-white/80 fill-white/80" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-1">
          <Heart className={`w-7 h-7 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          <span className="text-white text-xs font-medium">{liked ? reel.likes + 1 : reel.likes}</span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <Eye className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-medium">{(reel.views / 1000).toFixed(1)}K</span>
        </div>
        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <Bookmark className={`w-6 h-6 ${saved ? "fill-gold text-gold" : "text-white"}`} />
          <span className="text-white text-xs">{saved ? "Saved" : "Save"}</span>
        </button>
        <button onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <Link to={`/artist/${reel.artistId}`} className="flex items-center gap-2.5 mb-2.5">
          <img src={reel.artistAvatar} alt={reel.artistName} className="w-9 h-9 rounded-full object-cover border-2 border-gold/50" />
          <div>
            <p className="text-white text-sm font-semibold">{reel.artistName}</p>
            <p className="text-white/60 text-xs">{reel.studioName}</p>
          </div>
        </Link>
        <p className="text-white/90 text-sm leading-relaxed">{reel.caption}</p>
      </div>
    </div>
  );
};

const DiscoverPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <p className="text-gold text-sm tracking-[0.2em] uppercase mb-1">Discover</p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Artist Reels</h1>
            <p className="text-muted-foreground text-sm mt-1">Watch artists in action and find your next tattoo inspiration</p>
          </div>
          <div className="snap-y snap-mandatory overflow-y-auto space-y-4" style={{ maxHeight: "calc(100vh - 12rem)" }}>
            {reels.map(reel => (
              <ReelCard key={reel.id} reel={reel} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
