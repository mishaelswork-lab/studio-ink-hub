import { Link } from "react-router-dom";
import { MapPin, Star, Users, Play } from "lucide-react";
import { studios, artists } from "@/data/mockData";
import { reels } from "@/data/mockReels";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import { Navbar } from "@/components/layout/Navbar";

const Hero = () => (
  <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0">
      <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" width={1920} height={1080} />
    </div>
    <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold/20 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-gold/10 blur-[100px]" />
    </div>
    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
      <p className="text-gold font-body text-sm tracking-[0.3em] uppercase mb-6 animate-fade-in">Premium Tattoo Experiences</p>
      <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <span className="text-foreground">Art</span>
        <span className="text-gradient-gold">Space</span>
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        Discover India's finest tattoo artists. Book your next masterpiece with confidence.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <Link to="/studios">
          <Button variant="gold" size="xl">Explore Studios</Button>
        </Link>
        <Link to="/discover">
          <Button variant="gold-outline" size="xl">Watch Artist Reels</Button>
        </Link>
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
                <img src={artist.portfolio[0]} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
        <Link to="/studios">
          <Button variant="gold-outline" size="lg">View All Artists</Button>
        </Link>
      </div>
    </div>
  </section>
);

const Stats = () => (
  <section className="py-16 border-y border-border">
    <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      {[
        { value: "Pan-India", label: "Coverage" },
        { value: "100%", label: "Verified Artists" },
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
              <img src={reel.thumbnail} alt={reel.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <Hero />
    <Stats />
    <DiscoverReels />
    <FeaturedArtists />
    <footer className="py-10 border-t border-border text-center">
      <p className="text-muted-foreground text-sm">© 2026 ArtSpace. All rights reserved.</p>
    </footer>
  </div>
);

export default Index;
