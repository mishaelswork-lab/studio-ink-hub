/**
 * Real-user performance monitoring.
 * Disabled by default to avoid background Cloud database writes on every visit.
 * Set VITE_ENABLE_CLOUD_TELEMETRY=true only during a short diagnostic window.
 */

type PerfRow = { event: string; value?: number; url?: string; meta?: Record<string, unknown> };

const telemetryEnabled = import.meta.env.VITE_ENABLE_CLOUD_TELEMETRY === "true";
let buffer: PerfRow[] = [];
let timer: number | null = null;

const flush = async () => {
  if (!buffer.length) return;
  buffer = [];
};

const schedule = () => {
  if (timer) return;
  timer = window.setTimeout(() => { timer = null; flush(); }, 4000);
};

import { analyticsAllowed } from "@/lib/consent";

export const recordPerf = (row: PerfRow) => {
  if (!telemetryEnabled || !analyticsAllowed()) return;
  buffer.push(row);
  if (buffer.length >= 10) flush();
  else schedule();
};

let initialized = false;
export const initPerf = () => {
  if (!telemetryEnabled || initialized || typeof window === "undefined" || !analyticsAllowed()) return;
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
  if (!telemetryEnabled) return run();
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
