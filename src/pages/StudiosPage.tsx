import { Link } from "react-router-dom";
import { MapPin, Star, Users } from "lucide-react";
import { studios, artists } from "@/data/mockData";
import { Navbar } from "@/components/layout/Navbar";

const StudiosPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Bengaluru</p>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Tattoo Studios</h1>
          <p className="text-muted-foreground mt-2">Discover premium tattoo studios across the city</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studios.map((studio) => {
            const studioArtists = artists.filter(a => a.studioId === studio.id);
            return (
              <div key={studio.id} className="bg-card rounded-lg overflow-hidden border border-border hover:border-gold/30 transition-all duration-300 group">
                <div className="aspect-video overflow-hidden">
                  <img src={studio.image} alt={studio.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-1">{studio.name}</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{studio.location}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-gold text-gold" />
                      <span className="text-foreground text-sm">{studio.rating}</span>
                      <span className="text-muted-foreground text-sm">({studio.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Users className="w-3.5 h-3.5" />
                      <span>{studioArtists.length} artists</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Artists</p>
                    {studioArtists.map((artist) => (
                      <Link key={artist.id} to={`/artist/${artist.id}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover transition-colors">
                        <img src={artist.avatar} alt={artist.name} className="w-8 h-8 rounded-full object-cover border border-gold/20" />
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
    </div>
  );
};

export default StudiosPage;
