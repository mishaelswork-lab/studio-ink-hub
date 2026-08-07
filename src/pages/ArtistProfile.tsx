import { QuotesLoader } from "@/components/QuotesLoader";
import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowLeft, Heart, MessageSquare, Share2, Award, Flag, Ban } from "lucide-react";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorite } from "@/hooks/useFavorite";
import { useBlock } from "@/hooks/useBlock";
import { ReportDialog } from "@/components/safety/ReportDialog";
import { artists as mockArtists } from "@/data/mockData";
const CinematicGallery = lazy(() =>
  import("@/components/CinematicGallery").then(m => ({ default: m.CinematicGallery }))
);
import { shareLink } from "@/lib/share";
import { SEO } from "@/lib/seo";
import { toast } from "sonner";

const ArtistProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [dbArtist, setDbArtist] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggle: toggleFav, loading: favLoading } = useFavorite("artist", id);
  const [reportOpen, setReportOpen] = useState(false);
  const { isBlocked, toggle: toggleBlock, loading: blockLoading } = useBlock(dbArtist?.user_id);

  const mockArtist = mockArtists.find(a => a.id === id);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: art }, { data: revs }, { data: certData }] = await Promise.all([
        supabase.from("artists").select("*").eq("id", id!).maybeSingle(),
        supabase.from("reviews").select("rating, comment, created_at").eq("artist_id", id!).order("created_at", { ascending: false }).limit(10),
        supabase.from("artist_certifications").select("*").eq("artist_id", id!).order("created_at", { ascending: false }),
      ]);
      setDbArtist(art);
      setReviews(revs || []);
      setCerts(certData || []);
      setLoading(false);
    };
    fetchAll();

    const channel = supabase
      .channel(`artist-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "artists", filter: `id=eq.${id}` }, (payload) => {
        setDbArtist((prev: any) => ({ ...prev, ...(payload.new as object) }));
        const wasAvail = (payload.old as any)?.available;
        const isAvail = (payload.new as any)?.available;
        if (wasAvail !== isAvail) toast.info(isAvail ? "Artist is now available" : "Artist marked unavailable");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const browseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    browseTimerRef.current = setTimeout(() => {
      const artistName = dbArtist?.name || mockArtist?.name || "this artist";
      toast.info(`Still browsing ${artistName}?`, {
        description: "Ready to book? Start a consultation or book a session now!",
        duration: 15000,
      });
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Still browsing ${artistName}?`, { body: "Looks like you love their work!", icon: "/placeholder.svg" });
      }
    }, 5 * 60 * 1000);
    return () => { if (browseTimerRef.current) clearTimeout(browseTimerRef.current); };
  }, [dbArtist, mockArtist]);

  if (loading) {
    return <QuotesLoader fullScreen />;
  }
  const artist = dbArtist || mockArtist;
  if (!artist) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Artist not found.</p></div>;

  const name = dbArtist ? dbArtist.name : mockArtist!.name;
  const specialty = dbArtist ? dbArtist.specialty : mockArtist!.specialty;
  const studioName = dbArtist ? dbArtist.studio_name : mockArtist!.studioName;
  const experience = dbArtist ? `${dbArtist.experience_years} years` : mockArtist!.experience;
  const rating = dbArtist ? dbArtist.rating : mockArtist!.rating;
  const bio = dbArtist ? dbArtist.bio : mockArtist!.bio;
  const hourlyRate = dbArtist ? dbArtist.hourly_rate : mockArtist!.hourlyRate;
  const avatarUrl = dbArtist ? dbArtist.avatar_url : mockArtist!.avatar;
  const portfolio: string[] = dbArtist ? (dbArtist.portfolio_images || []) : mockArtist!.portfolio;
  const available = dbArtist ? dbArtist.available : mockArtist!.available;
  const artistId = dbArtist ? dbArtist.id : mockArtist!.id;
  const hasCerts = certs.length > 0;
  const hasVerifiedCert = certs.some(c => c.verified);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: specialty,
    image: avatarUrl,
    description: bio,
    address: { "@type": "PostalAddress", addressCountry: "IN" },
    aggregateRating: rating ? { "@type": "AggregateRating", ratingValue: rating, reviewCount: reviews.length || 1 } : undefined,
    worksFor: { "@type": "Organization", name: studioName },
    offers: { "@type": "Offer", price: hourlyRate, priceCurrency: "INR" },
  };

  const shareProfile = () => shareLink({
    title: `${name} on Tart`,
    text: `${specialty} artist at ${studioName}`,
    url: window.location.href,
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title={`${name} — ${specialty} artist`} description={`Book ${name}, a ${specialty} artist at ${studioName}. ${(bio || "").slice(0, 100)}`} image={avatarUrl} type="profile" jsonLd={jsonLd} />
      <Navbar />
      <div className="pt-20 pb-16 px-4 max-w-5xl mx-auto">
        <Link to="/studios" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Studios
        </Link>

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="relative flex-shrink-0">
            <img src={avatarUrl || "https://via.placeholder.com/128"} alt={name} className="w-32 h-32 rounded-full object-cover border-2 border-gold/30" />
            {hasVerifiedCert && (
              <div className="absolute -bottom-1 -right-1 bg-gold rounded-full p-1.5" title="Certified Artist">
                <Award className="w-4 h-4 text-background" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">{name}</h1>
                {hasVerifiedCert && <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full font-medium">Certified</span>}
              </div>
              <div className="flex gap-1">
                {user && (
                  <button onClick={toggleFav} disabled={favLoading} className="p-2 rounded-full hover:bg-card transition-colors">
                    <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </button>
                )}
                <button onClick={shareProfile} className="p-2 rounded-full hover:bg-card transition-colors" aria-label="Share profile">
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                </button>
                {user && (
                  <button onClick={() => setReportOpen(true)} className="p-2 rounded-full hover:bg-card transition-colors" aria-label="Report this artist">
                    <Flag className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
                {user && dbArtist?.user_id && dbArtist.user_id !== user.id && (
                  <button onClick={toggleBlock} disabled={blockLoading} className="p-2 rounded-full hover:bg-card transition-colors" aria-label={isBlocked ? "Unblock this artist" : "Block this artist"} title={isBlocked ? "Unblock" : "Block"}>
                    <Ban className={`w-5 h-5 ${isBlocked ? "text-destructive" : "text-muted-foreground"}`} />
                  </button>
                )}
              </div>
            </div>
            <ReportDialog open={reportOpen} onOpenChange={setReportOpen} contentType="artist" contentId={artistId} label="artist" />
            <p className="text-gold font-medium mb-2">{specialty}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{studioName}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{experience}</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" />{rating}</span>
              <span className={`flex items-center gap-1 ${available ? "text-emerald-400" : "text-destructive"}`}>
                <span className={`w-2 h-2 rounded-full ${available ? "bg-emerald-400" : "bg-destructive"} animate-pulse`} />
                {available ? "Available now" : "Unavailable"}
              </span>
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

        {/* Certifications */}
        {hasCerts && (
          <div className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Certifications</h2>
            <div className="flex flex-wrap gap-3">
              {certs.map(cert => (
                <div key={cert.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${cert.verified ? "border-gold/30 bg-gold/5" : "border-border bg-card"}`}>
                  <Award className={`w-4 h-4 ${cert.verified ? "text-gold" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-foreground text-sm font-medium">{cert.certification_name}</p>
                    {cert.issuing_body && <p className="text-muted-foreground text-xs">{cert.issuing_body}</p>}
                  </div>
                  {cert.verified && <span className="text-xs bg-gold/10 text-gold px-1.5 py-0.5 rounded-full ml-1">Verified</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Portfolio</h2>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 gap-4">{portfolio.slice(0, 6).map((_, i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}</div>}>
            <CinematicGallery images={portfolio} alt={`${name} portfolio`} />
          </Suspense>
        </div>

        {reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Reviews</h2>
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-gold text-gold" />)}
                  </div>
                  {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistProfile;
