// Offline message queue with exponential backoff
import { supabase } from "@/integrations/supabase/client";

export interface QueuedMessage {
  tempId: string;
  consultationId: string;
  senderId: string;
  message: string;
  attempts: number;
  nextRetryAt: number;
  createdAt: number;
}

const KEY = "tart.offlineQueue.v1";
const MAX_ATTEMPTS = 8;
type Listener = (queue: QueuedMessage[]) => void;
const listeners = new Set<Listener>();

const read = (): QueuedMessage[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const write = (q: QueuedMessage[]) => {
  localStorage.setItem(KEY, JSON.stringify(q));
  listeners.forEach(l => l(q));
};

export const subscribeQueue = (l: Listener) => {
  listeners.add(l);
  l(read());
  return () => { listeners.delete(l); };
};

export const enqueueMessage = (m: Omit<QueuedMessage, "attempts" | "nextRetryAt" | "createdAt">) => {
  const q = read();
  q.push({ ...m, attempts: 0, nextRetryAt: Date.now(), createdAt: Date.now() });
  write(q);
  scheduleFlush(0);
};

export const removeFromQueue = (tempId: string) => {
  write(read().filter(m => m.tempId !== tempId));
};

const backoffMs = (attempts: number) =>
  Math.min(60_000, 1000 * Math.pow(2, attempts)) + Math.floor(Math.random() * 500);

let flushTimer: number | null = null;
let flushing = false;

export const scheduleFlush = (delayMs = 0) => {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  flushTimer = window.setTimeout(flushQueue, delayMs);
};

export const flushQueue = async () => {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    let q = read();
    const now = Date.now();
    for (const item of q) {
      if (item.nextRetryAt > now) continue;
      const { data, error } = await supabase
        .from("consultation_messages")
        .insert({
          consultation_id: item.consultationId,
          sender_id: item.senderId,
          message: item.message,
        })
        .select().single();
      q = read();
      if (!error && data) {
        q = q.filter(m => m.tempId !== item.tempId);
        write(q);
        window.dispatchEvent(new CustomEvent("queue:sent", { detail: { tempId: item.tempId, message: data } }));
      } else {
        const idx = q.findIndex(m => m.tempId === item.tempId);
        if (idx >= 0) {
          q[idx].attempts += 1;
          if (q[idx].attempts >= MAX_ATTEMPTS) {
            q.splice(idx, 1);
            window.dispatchEvent(new CustomEvent("queue:failed", { detail: { tempId: item.tempId } }));
          } else {
            q[idx].nextRetryAt = Date.now() + backoffMs(q[idx].attempts);
          }
          write(q);
        }
      }
    }
    const remaining = read();
    const next = remaining.reduce((min, m) => Math.min(min, m.nextRetryAt), Infinity);
    if (Number.isFinite(next)) scheduleFlush(Math.max(500, next - Date.now()));
  } finally {
    flushing = false;
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => scheduleFlush(0));
  window.addEventListener("focus", () => scheduleFlush(0));
  setTimeout(() => scheduleFlush(0), 1000);
}
