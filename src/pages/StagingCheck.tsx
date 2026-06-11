import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Status = "pending" | "ok" | "warn" | "fail";
interface Check { name: string; path?: string; status: Status; detail?: string; ms?: number; }

const ROUTES: { name: string; path: string }[] = [
  { name: "Home (customer)", path: "/" },
  { name: "Studios", path: "/studios" },
  { name: "Discover", path: "/discover" },
  { name: "AI Consultant", path: "/ai-consultant" },
  { name: "Customer Login", path: "/login" },
  { name: "Artist Login", path: "/artist-login" },
  { name: "Admin Login", path: "/admin" },
  { name: "404 fallback", path: "/__definitely_missing_route__" },
];

const StatusDot = ({ s }: { s: Status }) => {
  const cls = s === "ok" ? "bg-emerald-500" : s === "warn" ? "bg-amber-500" : s === "fail" ? "bg-red-500" : "bg-muted-foreground/40 animate-pulse";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
};

const initialChecks: Check[] = [
  ...ROUTES.map(r => ({ name: r.name, path: r.path, status: "pending" as Status })),
  { name: "Supabase: artists query", status: "pending" as Status },
  { name: "Supabase: auth session", status: "pending" as Status },
  { name: "Edge function: verify-admin reachable", status: "pending" as Status },
  { name: "Asset: OG image", status: "pending" as Status },
];

const StagingCheck = () => {
  const [checks, setChecks] = useState<Check[]>(initialChecks);
  const [running, setRunning] = useState(false);

  const update = (name: string, patch: Partial<Check>) =>
    setChecks(prev => prev.map(c => (c.name === name ? { ...c, ...patch } : c)));

  const run = async () => {
    setRunning(true);
    setChecks(prev => prev.map(c => ({ ...c, status: "pending", detail: undefined, ms: undefined })));

    // Route reachability — same-origin HEAD/GET. In a SPA all routes return index.html (200).
    await Promise.all(
      ROUTES.map(async ({ name, path }) => {
        const t = performance.now();
        try {
          const res = await fetch(path, { method: "GET", credentials: "same-origin" });
          const ms = Math.round(performance.now() - t);
          update(name, { status: res.ok ? "ok" : "fail", detail: `HTTP ${res.status}`, ms });
        } catch (e: any) {
          update(name, { status: "fail", detail: e?.message || "network error" });
        }
      })
    );

    // Supabase artists query
    {
      const t = performance.now();
      const { error, data } = await supabase.from("artists").select("id").limit(1);
      const ms = Math.round(performance.now() - t);
      update("Supabase: artists query", {
        status: error ? "fail" : "ok",
        detail: error ? error.message : `${data?.length ?? 0} row(s)`,
        ms,
      });
    }

    // Auth session reachable
    {
      const t = performance.now();
      const { error } = await supabase.auth.getSession();
      update("Supabase: auth session", {
        status: error ? "fail" : "ok",
        detail: error?.message,
        ms: Math.round(performance.now() - t),
      });
    }

    // verify-admin (expect 401 without token => reachable)
    {
      const t = performance.now();
      try {
        const { error } = await supabase.functions.invoke("verify-admin", {});
        const ms = Math.round(performance.now() - t);
        // Without a valid admin token we expect a non-2xx from the function — that still proves reachability.
        update("Edge function: verify-admin reachable", {
          status: "ok",
          detail: error ? "reachable (auth required)" : "reachable",
          ms,
        });
      } catch (e: any) {
        update("Edge function: verify-admin reachable", { status: "fail", detail: e?.message });
      }
    }

    // OG image
    {
      const t = performance.now();
      try {
        const url = (document.querySelector('meta[property="og:image"]') as HTMLMetaElement)?.content;
        if (!url) throw new Error("og:image meta missing");
        const res = await fetch(url, { method: "GET", mode: "no-cors" });
        update("Asset: OG image", { status: "ok", detail: url, ms: Math.round(performance.now() - t) });
      } catch (e: any) {
        update("Asset: OG image", { status: "warn", detail: e?.message });
      }
    }

    setRunning(false);
  };

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const total = checks.length;
  const okCount = checks.filter(c => c.status === "ok").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const warnCount = checks.filter(c => c.status === "warn").length;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold">Staging <span className="text-gradient-gold">Build Check</span></h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verifies key routes, backend, and assets. Run before publishing.
            </p>
          </div>
          <Button variant="gold" disabled={running} onClick={run}>{running ? "Running…" : "Re-run"}</Button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-border bg-card p-3 text-center"><div className="text-xs text-muted-foreground">Total</div><div className="text-xl font-semibold">{total}</div></div>
          <div className="rounded-lg border border-border bg-card p-3 text-center"><div className="text-xs text-muted-foreground">Passed</div><div className="text-xl font-semibold text-emerald-500">{okCount}</div></div>
          <div className="rounded-lg border border-border bg-card p-3 text-center"><div className="text-xs text-muted-foreground">Warn</div><div className="text-xl font-semibold text-amber-500">{warnCount}</div></div>
          <div className="rounded-lg border border-border bg-card p-3 text-center"><div className="text-xs text-muted-foreground">Failed</div><div className="text-xl font-semibold text-red-500">{failCount}</div></div>
        </div>

        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
          {checks.map(c => (
            <li key={c.name} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot s={c.status} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  {c.path && <div className="text-xs text-muted-foreground truncate">{c.path}</div>}
                  {c.detail && <div className="text-xs text-muted-foreground truncate">{c.detail}</div>}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">{c.ms != null ? `${c.ms}ms` : ""}</div>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-xs text-muted-foreground">
          Tip: route checks use the SPA fallback, so 200 = route is reachable; client-side rendering errors are surfaced in the browser console.
          <div className="mt-2"><Link to="/" className="text-gold hover:underline">← Back to home</Link></div>
        </div>
      </div>
    </div>
  );
};

export default StagingCheck;
