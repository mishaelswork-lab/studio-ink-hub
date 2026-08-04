import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/lib/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const PAGE = 15;

const ArtistChatsPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
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
        .from("consultations")
        .select("*")
        .eq("artist_id", user.id)
        .order("updated_at", { ascending: false })
        .range(from, to);
      if (e1) throw e1;
      const list = cs || [];
      const customerIds = Array.from(new Set(list.map((c: any) => c.customer_id))).filter(Boolean);
      const { data: profiles } = customerIds.length
        ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", customerIds)
        : { data: [] as any[] };
      const byUser = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const hydrated = list.map((c: any) => ({ ...c, customer: byUser.get(c.customer_id) }));
      setChats(prev => reset ? hydrated : [...prev, ...hydrated]);
      setHasMore(list.length === PAGE);
      pageRef.current += 1;
    } catch (err: any) {
      setError(err?.message || "Could not load chats");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => { fetchPage(true); }, [fetchPage]);

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
      <SEO title="Artist Chats — Tart" description="Your customer consultations in one place." />
      <Navbar />
      <div className="pt-24 px-4 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-1">Customer Chats</h1>
        <p className="text-muted-foreground text-sm mb-6">All design consultations from customers.</p>

        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-gold" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Conversations</h2>
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
            <p className="text-muted-foreground text-sm">No conversations yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map(c => (
              <Link key={c.id} to={`/consultation/${c.id}`} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:border-gold/30 transition-colors">
                <img src={c.customer?.avatar_url || "https://via.placeholder.com/44"} alt={c.customer?.display_name || "Customer"} className="w-11 h-11 rounded-full object-cover border border-gold/20" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{c.customer?.display_name || "Customer"}</p>
                  <p className="text-muted-foreground text-xs truncate">{c.design_description || "Design consultation"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary"}`}>{c.status}</span>
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

export default ArtistChatsPage;
