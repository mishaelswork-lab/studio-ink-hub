import { useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Users, Play, Sparkles, Sparkle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { studios, artists } from "@/data/mockData";
import { reels } from "@/data/mockReels";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/artspace-logo.webp.asset.json";
const logo = logoAsset.url;
import { Navbar } from "@/components/layout/Navbar";
import { SEO } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Warm caches so navigating into Discover/Profile/Artist feels instant.
const prefetchHomeData = () => {
  // Fire-and-forget; results sit in the HTTP cache + supabase JS internal cache.
  supabase.from("artists").select("id,name,avatar_url,studio_name,specialty,hourly_rate,rating,available,portfolio_images").limit(20);
  supabase.from("reels").select("id,artist_id,video_url,thumbnail_url,caption,likes,views").eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(20);
  supabase.from("daily_designs").select("id,image_url,thumb_url,description").order("fetched_at", { ascending: false }).limit(30);
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      supabase.from("profiles").select("*").eq("user_id", data.session.user.id).maybeSingle();
      supabase.from("favorites").select("*").eq("user_id", data.session.user.id);
    }
  });
};

const Hero = () => {
  const [reduced, setReduced] = useReducedMotion();
  return (
  <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
    {/* Refined deep gradient backdrop */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(38_55%_22%/0.45),_transparent_55%),_radial-gradient(circle_at_75%_80%,_hsl(38_45%_18%/0.4),_transparent_55%),_linear-gradient(180deg,_hsl(240_10%_4%),_hsl(240_8%_6%))]" />

    {/* Animated orbs — disabled when reduced */}
    {!reduced && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[12%] left-[8%] w-[460px] h-[460px] rounded-full bg-gold/12 blur-[150px] animate-pulse" style={{ animationDuration: "9s" }} />
        <div className="absolute bottom-[8%] right-[6%] w-[380px] h-[380px] rounded-full bg-gold/10 blur-[130px] animate-pulse" style={{ animationDuration: "11s", animationDelay: "1s" }} />
        <div className="absolute top-[55%] left-[55%] w-[300px] h-[300px] rounded-full bg-amber-500/6 blur-[110px]" />
      </div>
    )}
    {reduced && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-[420px] h-[420px] rounded-full bg-gold/8 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[8%] w-[360px] h-[360px] rounded-full bg-gold/6 blur-[120px]" />
      </div>
    )}

    {/* Subtle crosshatch */}
    <div
      className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, hsl(var(--gold)) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, hsl(var(--gold)) 0 1px, transparent 1px 14px)",
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

    {/* Reduced-motion toggle */}
    <button
      onClick={() => setReduced(!reduced)}
      aria-pressed={reduced}
      title={reduced ? "Enable animations" : "Reduce motion"}
      className="absolute top-24 right-4 z-20 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gold/80 hover:text-gold border border-gold/30 hover:border-gold/60 bg-background/40 backdrop-blur-md rounded-full px-3 py-1.5 transition-colors"
    >
      <Sparkle className={`w-3 h-3 ${reduced ? "" : "animate-pulse"}`} />
      {reduced ? "Calm mode" : "Reduce motion"}
    </button>

    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
      <img
        src={logo}
        alt="ArtSpace logo"
        className={`w-28 h-28 md:w-36 md:h-36 mx-auto mb-6 rounded-full object-cover ring-1 ring-gold/40 shadow-[var(--shadow-gold)] ${reduced ? "" : "animate-fade-in"}`}
        width={144}
        height={144}
      />
      <p className={`text-gold font-body text-sm tracking-[0.3em] uppercase mb-4 ${reduced ? "" : "animate-fade-in"}`}>Premium Art Experiences</p>
      <h1 className={`font-heading text-5xl md:text-7xl lg:text-8xl font-bold mb-4 tracking-wider ${reduced ? "" : "animate-fade-in"}`} style={reduced ? undefined : { animationDelay: "0.1s" }}>
        <span className="text-foreground">ART</span>
        <span className="text-gradient-gold">SPACE</span>
      </h1>
      <p className={`font-heading italic text-gold/90 text-lg md:text-xl mb-3 ${reduced ? "" : "animate-fade-in"}`} style={reduced ? undefined : { animationDelay: "0.15s" }}>
        A space for your "Let's do it" moment
      </p>
      <p className={`text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-10 ${reduced ? "" : "animate-fade-in"}`} style={reduced ? undefined : { animationDelay: "0.2s" }}>
        Discover India's finest artists. Book your next masterpiece with confidence.
      </p>
      <div className={`flex flex-col sm:flex-row gap-4 justify-center ${reduced ? "" : "animate-fade-in"}`} style={reduced ? undefined : { animationDelay: "0.3s" }}>
        <a href="#studios">
          <Button variant="gold" size="xl">Explore Studios</Button>
        </a>
        <Link to="/ai-consultant">
          <Button variant="gold-outline" size="xl">Try AI Tattoo Match</Button>
        </Link>
      </div>
    </div>
  </section>
  );
};

const FeaturedStrip = memo(() => {
  const { data: items = [] } = useQuery({
    queryKey: ["featured_artists_strip"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("featured_artists")
        .select("id,priority,artists(id,name,avatar_url,specialty)")
        .eq("active", true).order("priority", { ascending: false }).limit(6);
      return (data || []).filter((d: any) => d.artists);
    },
  });
  if (items.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="font-heading text-lg font-semibold text-foreground">Featured Artists</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((f: any) => (
          <Link key={f.id} to={`/artist/${f.artists.id}`} className="flex-shrink-0 w-56 bg-gradient-to-br from-gold/10 to-card border border-gold/30 rounded-xl p-4 hover:border-gold/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <img src={f.artists.avatar_url || "https://via.placeholder.com/40"} alt={f.artists.name} className="w-10 h-10 rounded-full object-cover border border-gold/30" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{f.artists.name}</p>
                <p className="text-gold text-xs truncate">{f.artists.specialty}</p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-gold">Featured</span>
          </Link>
        ))}
      </div>
    </div>
  );
});
FeaturedStrip.displayName = "FeaturedStrip";

const StudiosSection = () => (
  <section id="studios" className="py-20 px-4 scroll-mt-20">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Bengaluru</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Tattoo Studios</h2>
        <p className="text-muted-foreground text-sm mt-2">Discover premium tattoo studios across the city</p>
      </div>
      <FeaturedStrip />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studios.map(studio => {
          const studioArtists = artists.filter(a => a.studioId === studio.id);
          return (
            <div key={studio.id} className="bg-card rounded-lg overflow-hidden border border-border hover:border-gold/30 transition-all duration-300 group">
              <div className="aspect-video overflow-hidden">
                <img src={studio.image} alt={studio.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <h3 className="font-heading text-xl font-semibold text-foreground mb-1">{studio.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                  <MapPin className="w-3.5 h-3.5" /><span>{studio.location}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-gold text-gold" />
                    <span className="text-foreground text-sm">{studio.rating}</span>
                    <span className="text-muted-foreground text-sm">({studio.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Users className="w-3.5 h-3.5" /><span>{studioArtists.length} artists</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Artists</p>
                  {studioArtists.map(artist => (
                    <Link key={artist.id} to={`/artist/${artist.id}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover transition-colors">
                      <img src={artist.avatar} alt={artist.name} loading="lazy" className="w-8 h-8 rounded-full object-cover border border-gold/20" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{artist.name}</p>
                        <p className="text-gold text-xs">{artist.specialty}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${artist.available ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

const FeaturedArtists = () => (
  <section className="py-20 px-4">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Handpicked Talent</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Featured Artists</h2>
        <p className="text-muted-foreground text-sm mt-2">Book sessions with the best artists across India</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists.filter(a => a.available).slice(0, 3).map((artist) => (
          <Link key={artist.id} to={`/artist/${artist.id}`} className="group">
            <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-gold/30 transition-all duration-300 hover:shadow-[var(--shadow-gold)]">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={artist.portfolio[0]} alt={artist.name} loading="lazy" decoding="async" width={600} height={600} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <img src={artist.avatar} alt={artist.name} className="w-10 h-10 rounded-full object-cover border border-gold/30" />
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">{artist.name}</h3>
                    <p className="text-muted-foreground text-sm">{artist.studioName}</p>
                  </div>
                </div>
                <p className="text-gold text-sm font-medium mb-2">{artist.specialty}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-gold text-gold" />
                    <span className="text-foreground text-sm">{artist.rating}</span>
                    <span className="text-muted-foreground text-sm">({artist.reviewCount})</span>
                  </div>
                  <span className="text-muted-foreground text-sm">₹{artist.hourlyRate}/hr</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="text-center mt-10">
        <a href="#studios">
          <Button variant="gold-outline" size="lg">View All Studios</Button>
        </a>
      </div>
    </div>
  </section>
);

const Stats = () => (
  <section className="py-16 border-y border-border">
    <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 gap-8 text-center">
      {[
        { value: "₹100 Off", label: "Refer & Earn" },
      ].map((stat) => (
        <div key={stat.label}>
          <p className="text-gradient-gold font-heading text-3xl md:text-4xl font-bold">{stat.value}</p>
          <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  </section>
);

const DiscoverReels = () => (
  <section className="py-20 px-4 bg-card/30">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Watch & Discover</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Artist Reels</h2>
        <p className="text-muted-foreground text-sm mt-2">See artists in action — swipe through short videos of incredible work</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {reels.slice(0, 5).map(reel => (
          <Link key={reel.id} to="/discover" className="flex-shrink-0 w-48 md:w-56 snap-start group">
            <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-border hover:border-gold/30 transition-all">
              <img src={reel.thumbnail} alt={reel.caption} loading="lazy" decoding="async" width={400} height={600} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-12 h-12 text-white/90 fill-white/90" />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <img src={reel.artistAvatar} alt={reel.artistName} className="w-6 h-6 rounded-full border border-gold/30" />
                  <span className="text-white text-xs font-medium">{reel.artistName}</span>
                </div>
                <p className="text-white/70 text-xs line-clamp-2">{reel.caption}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="text-center mt-8">
        <Link to="/discover">
          <Button variant="gold-outline" size="lg">View All Reels</Button>
        </Link>
      </div>
    </div>
  </section>
);

const Index = () => {
  useEffect(() => {
    const idle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1));
    const id = idle(prefetchHomeData);
    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel) cancel(id);
    };
  }, []);
  return (
  <div className="min-h-screen bg-background">
    <SEO
      title="ArtSpace — Premium Art & Tattoo Experiences in India"
      description="Discover India's finest tattoo and body-art artists. Browse portfolios, watch reels, get design ideas and book your next masterpiece on ArtSpace."
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ArtSpace",
        url: "https://artspace.lovable.app/",
      }}
    />
    <Navbar />
    <Hero />
    <Stats />
    <DiscoverReels />
    <FeaturedArtists />
    <StudiosSection />
    <footer className="py-10 border-t border-border text-center">
      <p className="text-muted-foreground text-sm">© 2026 ArtSpace. All rights reserved.</p>
    </footer>
  </div>
  );
};

export default Index;
