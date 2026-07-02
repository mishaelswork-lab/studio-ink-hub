// Lightweight Cloud usage/credit tracker.
// Records AI calls, DB writes, and media ops so admins can spot spend regressions.
// Writes are batched and fire-and-forget to avoid adding latency to user actions.
import { supabase } from "@/integrations/supabase/client";

export type UsageCategory = "ai" | "db" | "media" | "push" | "storage";

interface Row {
  category: UsageCategory;
  event: string;
  meta?: Record<string, unknown>;
  at: string;
}

let buffer: Row[] = [];
let timer: number | null = null;
const FLUSH_MS = 3000;
const MAX_BUFFER = 20;

const flush = async () => {
  if (!buffer.length) return;
  const rows = buffer.map((r) => ({
    category: r.category,
    event: r.event,
    meta: (r.meta ?? {}) as any,
    created_at: r.at,
  }));
  buffer = [];
  try {
    await (supabase as any).from("usage_events").insert(rows);
  } catch {
    /* best-effort */
  }
};


const schedule = () => {
  if (timer || typeof window === "undefined") return;
  timer = window.setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
};

export const logUsage = (category: UsageCategory, event: string, meta?: Record<string, unknown>) => {
  buffer.push({ category, event, meta, at: new Date().toISOString() });
  if (buffer.length >= MAX_BUFFER) void flush();
  else schedule();
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => void flush());
}
