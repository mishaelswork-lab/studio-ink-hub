import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Gauge, Timer } from "lucide-react";

interface Row { id: string; event: string; value: number | null; url: string | null; created_at: string; meta: any }

const pct = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
};

export const PerfMetricsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("perf_metrics")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      setRows((data || []) as Row[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading metrics…</p>;

  const ttfb = rows.filter(r => r.event === "ttfb" && r.value != null).map(r => r.value!) as number[];
  const lcp = rows.filter(r => r.event === "lcp" && r.value != null).map(r => r.value!) as number[];
  const queries = rows.filter(r => r.event === "query" && r.value != null).map(r => r.value!) as number[];
  const failed = rows.filter(r => r.event === "failed_load");

  const cards = [
    { label: "TTFB p50 / p95", value: `${pct(ttfb, 50)} / ${pct(ttfb, 95)} ms`, icon: Timer, samples: ttfb.length },
    { label: "LCP p50 / p95", value: `${pct(lcp, 50)} / ${pct(lcp, 95)} ms`, icon: Gauge, samples: lcp.length },
    { label: "Query p50 / p95", value: `${pct(queries, 50)} / ${pct(queries, 95)} ms`, icon: Activity, samples: queries.length },
    { label: "Failed Loads (24h)", value: failed.length.toString(), icon: AlertTriangle, samples: failed.length },
  ];

  // Failed load top offenders
  const failTop = Object.entries(
    failed.reduce<Record<string, number>>((acc, r) => {
      const key = r.url || "(unknown)";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Slow query top offenders
  const slow = rows
    .filter(r => r.event === "query" && (r.value || 0) > 600)
    .slice(0, 12);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Real-User Metrics</h2>
      <p className="text-muted-foreground text-sm mb-6">Last 24 hours · {rows.length} samples</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-sm">{c.label}</p>
              <c.icon className="w-4 h-4 text-gold" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-muted-foreground text-xs mt-1">{c.samples} samples</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-foreground font-medium mb-4">Failed Loads — Top Offenders</h3>
          {failTop.length === 0 && <p className="text-muted-foreground text-sm">None reported.</p>}
          {failTop.map(([url, n]) => (
            <div key={url} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
              <p className="text-foreground text-xs truncate flex-1" title={url}>{url}</p>
              <span className="text-destructive text-xs font-mono">{n}</span>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-foreground font-medium mb-4">Slow Queries (&gt;600ms)</h3>
          {slow.length === 0 && <p className="text-muted-foreground text-sm">No slow queries recorded.</p>}
          {slow.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
              <p className="text-foreground text-xs truncate flex-1">{s.meta?.label || "query"}</p>
              <span className="text-gold text-xs font-mono">{s.value} ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerfMetricsPanel;
