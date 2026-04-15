import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowLeft, Heart, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorite } from "@/hooks/useFavorite";
import { artists as mockArtists } from "@/data/mockData";

const ArtistProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [dbArtist, setDbArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggle: toggleFav, loading: favLoading } = useFavorite("artist", id);

  const mockArtist = mockArtists.find(a => a.id === id);

  useEffect(() => {
    supabase.from("artists").select("*").eq("id", id!).maybeSingle().then(({ data }) => {
      setDbArtist(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const artist = dbArtist || mockArtist;
  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Artist not found.</p>
      </div>
    );
  }

  const name = dbArtist ? dbArtist.name : mockArtist!.name;
  const specialty = dbArtist ? dbArtist.specialty : mockArtist!.specialty;
  const studioName = dbArtist ? dbArtist.studio_name : mockArtist!.studioName;
  const experience = dbArtist ? `${dbArtist.experience_years} years` : mockArtist!.experience;
  const rating = dbArtist ? dbArtist.rating : mockArtist!.rating;
  const bio = dbArtist ? dbArtist.bio : mockArtist!.bio;
  const hourlyRate = dbArtist ? dbArtist.hourly_rate : mockArtist!.hourlyRate;
  const avatarUrl = dbArtist ? dbArtist.avatar_url : mockArtist!.avatar;
  const portfolio = dbArtist ? (dbArtist.portfolio_images || []) : mockArtist!.portfolio;
  const available = dbArtist ? dbArtist.available : mockArtist!.available;
  const artistId = dbArtist ? dbArtist.id : mockArtist!.id;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-20 pb-16 px-4 max-w-5xl mx-auto">
        <Link to="/studios" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Studios
        </Link>

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <img src={avatarUrl || "https://via.placeholder.com/128"} alt={name} className="w-32 h-32 rounded-full object-cover border-2 border-gold/30 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-1">{name}</h1>
              {user && (
                <button onClick={toggleFav} disabled={favLoading} className="p-2 rounded-full hover:bg-card transition-colors">
                  <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                </button>
              )}
            </div>
            <p className="text-gold font-medium mb-2">{specialty}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{studioName}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{experience}</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" />{rating}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">{bio}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link to={`/book/${artistId}`}>
                <Button variant="gold" size="lg" disabled={!available}>
                  {available ? `Book Now · ₹${hourlyRate}/hr` : "Currently Unavailable"}
                </Button>
              </Link>
              {user && dbArtist && (
                <Link to={`/consult/${artistId}`}>
                  <Button variant="outline" size="lg" className="gap-2 border-border text-foreground">
                    <MessageSquare className="w-4 h-4" /> Design Consultation
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Portfolio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio.map((img: string, i: number) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                <img src={img} alt={`${name} work ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile;
