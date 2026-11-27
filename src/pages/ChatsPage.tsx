import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/lib/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type ConversationRow = Pick<Database["public"]["Tables"]["conversations"]["Row"], "id" | "customer_id" | "artist_id" | "design_request_id" | "created_at">;
type ArtistSummary = Pick<Database["public"]["Tables"]["artists"]["Row"], "id" | "name" | "avatar_url" | "specialty">;
type RequestSummary = Pick<Database["public"]["Tables"]["design_requests"]["Row"], "id" | "brief" | "status">;
type ChatRow = ConversationRow & { artist?: ArtistSummary; request?: RequestSummary };

const PAGE = 15;

const ChatsPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (reset = false) => {
    if (!user) { setLoading(false); return; }
    const from = reset ? 0 : pageRef.current * PAGE;
    const to = from + PAGE - 1;
    if (reset) { setLoading(true); setError(null); pageRef.current = 0; }
    else setLoadingMore(true);

    try {
      const { data: cs, error: e1 } = await supabase
        .from("conversations")
        .select("id,customer_id,artist_id,design_request_id,created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (e1) throw e1;
      const list: ConversationRow[] = cs || [];
      const artistIds = Array.from(new Set(list.map(conversation => conversation.artist_id)));
      const requestIds = Array.from(new Set(list.map(conversation => conversation.design_request_id))).filter((id): id is string => Boolean(id));
      let artists: ArtistSummary[] = [];
      let requests: RequestSummary[] = [];
      if (artistIds.length) {
        const { data, error } = await supabase.from("artists").select("id,name,avatar_url,specialty").in("id", artistIds);
        if (error) throw error;
        artists = data ?? [];
      }
      if (requestIds.length) {
        const { data, error } = await supabase.from("design_requests").select("id,brief,status").in("id", requestIds);
        if (error) throw error;
        requests = data ?? [];
      }
      const byArtist = new Map(artists.map(artist => [artist.id, artist]));
      const byRequest = new Map(requests.map(request => [request.id, request]));
      const hydrated: ChatRow[] = list.map(conversation => ({
        ...conversation,
        artist: byArtist.get(conversation.artist_id),
        request: conversation.design_request_id ? byRequest.get(conversation.design_request_id) : undefined,
      }));
      setChats(prev => reset ? hydrated : [...prev, ...hydrated]);
      setHasMore(list.length === PAGE);
      pageRef.current += 1;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load chats");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => { fetchPage(true); }, [fetchPage]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) fetchPage(false);
    }, { rootMargin: "200px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, fetchPage]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="Chats — Tart" description="Your AI tattoo match and artist conversations in one place." />
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
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-3">{error}</p>
            <Button variant="gold-outline" size="sm" onClick={() => fetchPage(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
            </Button>
          </div>
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
                  <p className="text-muted-foreground text-xs truncate">{c.request?.brief || "Design consultation"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary"}`}>{c.request?.status || "open"}</span>
              </Link>
            ))}
            <div ref={sentinelRef} className="py-4 flex justify-center">
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
              {!hasMore && chats.length > 0 && <span className="text-muted-foreground text-xs">— end —</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;
