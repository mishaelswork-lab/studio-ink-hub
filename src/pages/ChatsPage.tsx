import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/lib/seo";

const ChatsPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: cs } = await supabase
        .from("consultations")
        .select("*")
        .eq("customer_id", user.id)
        .order("updated_at", { ascending: false });
      const list = cs || [];
      // hydrate artist info
      const artistUserIds = Array.from(new Set(list.map((c: any) => c.artist_id))).filter(Boolean);
      const { data: artists } = artistUserIds.length
        ? await supabase.from("artists").select("user_id,name,avatar_url,specialty").in("user_id", artistUserIds)
        : { data: [] as any[] };
      const byUser = new Map((artists || []).map((a: any) => [a.user_id, a]));
      setChats(list.map((c: any) => ({ ...c, artist: byUser.get(c.artist_id) })));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="Chats — ArtSpace" description="Your AI tattoo match and artist conversations in one place." />
      <Navbar />
      <div className="pt-24 px-4 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-1">Chats</h1>
        <p className="text-muted-foreground text-sm mb-6">Talk to artists or get instant AI design ideas.</p>

        <Link
          to="/ai-consultant"
          className="block bg-gradient-to-r from-gold/15 via-gold/5 to-transparent border border-gold/30 rounded-xl p-5 mb-6 hover:border-gold/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium">AI Tattoo Match</p>
              <p className="text-muted-foreground text-xs">Upload a photo or pick a body area — get 10 design ideas instantly.</p>
            </div>
            <span className="text-gold text-xs uppercase tracking-wider">Open →</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-gold" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Artist Conversations</h2>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
        ) : chats.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No artist chats yet.</p>
            <Link to="/studios" className="text-gold text-sm hover:underline mt-2 inline-block">Browse artists →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map(c => (
              <Link key={c.id} to={`/consultation/${c.id}`} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:border-gold/30 transition-colors">
                <img src={c.artist?.avatar_url || "https://via.placeholder.com/44"} alt={c.artist?.name || "Artist"} className="w-11 h-11 rounded-full object-cover border border-gold/20" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{c.artist?.name || "Artist"}</p>
                  <p className="text-muted-foreground text-xs truncate">{c.design_description || "Design consultation"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary"}`}>{c.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;
