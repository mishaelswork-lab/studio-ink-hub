// Internal analytics view showing Cloud credit hotspots by category, with
// timestamps so admins can pinpoint spend regressions quickly.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, Database, Image as ImageIcon, Bell } from "lucide-react";

type Row = {
  id: string;
  category: string;
  event: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const RANGES = [
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
];

const CAT_ICON: Record<string, JSX.Element> = {
  ai: <Zap className="w-3.5 h-3.5" />,
  db: <Database className="w-3.5 h-3.5" />,
  media: <ImageIcon className="w-3.5 h-3.5" />,
  push: <Bell className="w-3.5 h-3.5" />,
  storage: <ImageIcon className="w-3.5 h-3.5" />,
};

const UsageHotspotsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data } = await (supabase as any)
      .from("usage_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as Row[]) || []);
    setLoading(false);
  };


  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [hours]);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; last: string; category: string }>();
    for (const r of rows) {
      const key = `${r.category}:${r.event}`;
      const cur = map.get(key);
      if (cur) { cur.count += 1; if (r.created_at > cur.last) cur.last = r.created_at; }
      else map.set(key, { count: 1, last: r.created_at, category: r.category });
    }
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const byCategory = useMemo(() => {
    const t: Record<string, number> = {};
    for (const r of rows) t[r.category] = (t[r.category] || 0) + 1;
    return t;
  }, [rows]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Cloud Usage Hotspots</h2>
          <p className="text-muted-foreground text-sm">AI calls, DB writes, and media ops — recent activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-secondary rounded-md p-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setHours(r.hours)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${hours === r.hours ? "bg-card text-foreground" : "text-muted-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(byCategory).map(([cat, count]) => (
          <div key={cat} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              {CAT_ICON[cat] ?? <Zap className="w-3.5 h-3.5" />} {cat}
            </div>
            <p className="text-gradient-gold font-heading text-2xl font-bold mt-1">{count}</p>
          </div>
        ))}
        {Object.keys(byCategory).length === 0 && !loading && (
          <p className="text-muted-foreground text-sm col-span-full">No usage events in this window.</p>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <h3 className="text-foreground font-medium mb-3">Top events</h3>
        <div className="space-y-2">
          {grouped.slice(0, 10).map((g) => (
            <div key={g.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{CAT_ICON[g.category]}</span>
                <span className="text-foreground">{g.key}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground text-xs">
                <span>last {new Date(g.last).toLocaleTimeString()}</span>
                <span className="text-gold font-medium">{g.count}×</span>
              </div>
            </div>
          ))}
          {grouped.length === 0 && !loading && <p className="text-muted-foreground text-sm">Nothing recorded yet.</p>}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-foreground font-medium mb-3">Recent activity</h3>
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs border-b border-border last:border-0 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{CAT_ICON[r.category]}</span>
                <span className="text-foreground">{r.category}:{r.event}</span>
                {r.meta && Object.keys(r.meta).length > 0 && (
                  <span className="text-muted-foreground truncate max-w-[300px]">
                    {JSON.stringify(r.meta)}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
          {rows.length === 0 && !loading && <p className="text-muted-foreground text-sm">No recent events.</p>}
        </div>
      </div>
    </div>
  );
};

export default UsageHotspotsPanel;
