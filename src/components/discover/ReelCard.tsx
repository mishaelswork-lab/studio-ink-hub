import { useState, useRef, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { Heart, Eye, Play, Volume2, VolumeX, Bookmark, Share2 } from "lucide-react";
import { Reel } from "@/data/mockReels";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorite } from "@/hooks/useFavorite";
import { shareLink } from "@/lib/share";

const ReelCardImpl = ({ reel }: { reel: Reel }) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const { isFavorite: saved, toggle: toggleSave } = useFavorite("reel", reel.id);

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

  const handleShare = () => shareLink({
    title: `${reel.artistName} on ArtSpace`,
    text: reel.caption,
    url: `${window.location.origin}/artist/${reel.artistId}`,
  });

  return (
    <div ref={cardRef} className="relative w-full snap-start snap-always flex-shrink-0 rounded-xl overflow-hidden bg-card border border-border" style={{ height: "calc(100vh - 12rem)", maxHeight: "700px", minHeight: "500px" }}>
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
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-6 h-6 text-white" />
          <span className="text-white text-xs">Share</span>
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

export const ReelCard = memo(ReelCardImpl);
ReelCard.displayName = "ReelCard";
