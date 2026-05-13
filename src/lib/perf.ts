/**
 * Real-user performance monitoring.
 * Captures TTFB, LCP, and failed resource loads, batches them, and ships
 * to the perf_metrics table. Anonymous-friendly (no auth required).
 */
import { supabase } from "@/integrations/supabase/client";

type PerfRow = { event: string; value?: number; url?: string; meta?: Record<string, unknown> };

let buffer: PerfRow[] = [];
let timer: number | null = null;

const flush = async () => {
  if (!buffer.length) return;
  const rows = buffer.splice(0, buffer.length);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("perf_metrics").insert(
      rows.map(r => ({
        event: r.event,
        value: r.value ?? null,
        url: r.url ?? location.pathname,
        user_id: user?.id ?? null,
        meta: (r.meta ?? {}) as any,
      })) as any
    );
  } catch {
    /* swallow — perf telemetry must never break the app */
  }
};

const schedule = () => {
  if (timer) return;
  timer = window.setTimeout(() => { timer = null; flush(); }, 4000);
};

export const recordPerf = (row: PerfRow) => {
  buffer.push(row);
  if (buffer.length >= 10) flush();
  else schedule();
};

let initialized = false;
export const initPerf = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // TTFB / nav timing
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      recordPerf({ event: "ttfb", value: Math.round(nav.responseStart), url: location.pathname });
      recordPerf({ event: "dom_content_loaded", value: Math.round(nav.domContentLoadedEventEnd) });
    }
  } catch { /* noop */ }

  // LCP
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) recordPerf({ event: "lcp", value: Math.round(last.renderTime || last.loadTime || last.startTime) });
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* noop */ }

  // Failed resource loads
  window.addEventListener("error", (e) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const tag = t.tagName?.toLowerCase();
    if (tag === "img" || tag === "script" || tag === "link") {
      const src = (t as any).src || (t as any).href || "";
      recordPerf({ event: "failed_load", url: src, meta: { tag } });
    }
  }, true);

  // Flush on unload
  window.addEventListener("pagehide", flush);
};

/** Wrap a Supabase query to record its latency. */
export const trackQuery = async <T>(label: string, run: () => Promise<T>): Promise<T> => {
  const t0 = performance.now();
  try {
    const r = await run();
    recordPerf({ event: "query", value: Math.round(performance.now() - t0), meta: { label, ok: true } });
    return r;
  } catch (err: any) {
    recordPerf({ event: "query", value: Math.round(performance.now() - t0), meta: { label, ok: false, msg: err?.message } });
    throw err;
  }
};
