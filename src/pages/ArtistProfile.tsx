import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowLeft } from "lucide-react";
import { artists } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";

const ArtistProfile = () => {
  const { id } = useParams();
  const artist = artists.find(a => a.id === id);

  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Artist not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4 max-w-5xl mx-auto">
        <Link to="/studios" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Studios
        </Link>

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <img src={artist.avatar} alt={artist.name} className="w-32 h-32 rounded-full object-cover border-2 border-gold/30 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-1">{artist.name}</h1>
            <p className="text-gold font-medium mb-2">{artist.specialty}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{artist.studioName}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{artist.experience}</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" />{artist.rating} ({artist.reviewCount} reviews)</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">{artist.bio}</p>
            <div className="flex items-center gap-4">
              <Link to={`/book/${artist.id}`}>
                <Button variant="gold" size="lg" disabled={!artist.available}>
                  {artist.available ? `Book Now · ₹${artist.hourlyRate}/hr` : "Currently Unavailable"}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Portfolio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artist.portfolio.map((img, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                <img src={img} alt={`${artist.name} work ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile;
