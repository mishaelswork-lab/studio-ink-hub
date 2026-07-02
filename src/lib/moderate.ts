// Debounced + cached wrapper around the moderate-image edge function.
// Ensures we only call moderation on the final upload — repeated calls for the
// same URL within the TTL are coalesced into one network round-trip, and rapid
// re-invocations (e.g. from preview / edit flows) are debounced.
import { supabase } from "@/integrations/supabase/client";
import { logUsage } from "@/lib/usage";

type Result = { allowed: boolean; reason?: string };

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 400;

const cache = new Map<string, { at: number; result: Result }>();
const inflight = new Map<string, Promise<Result>>();
const timers = new Map<string, number>();

const callModerate = async (imageUrl: string): Promise<Result> => {
  const t0 = performance.now();
  try {
    const { data, error } = await supabase.functions.invoke("moderate-image", { body: { imageUrl } });
    if (error) throw error;
    const result: Result = { allowed: !!data?.allowed, reason: data?.reason };
    cache.set(imageUrl, { at: Date.now(), result });
    logUsage("ai", "moderate-image", { ms: Math.round(performance.now() - t0), allowed: result.allowed });
    return result;
  } catch (e) {
    logUsage("ai", "moderate-image", { ms: Math.round(performance.now() - t0), error: true });
    // Fail open — mark as flagged for admin review upstream.
    return { allowed: true, reason: "verification unavailable" };
  }
};

/**
 * Moderate an image URL. Coalesces duplicate calls, caches results for 5 min,
 * and debounces bursts so intermediate preview/edit renders do not spend
 * Cloud credits. Callers should still only invoke this on the final commit.
 */
export const moderateImage = (imageUrl: string): Promise<Result> => {
  if (!imageUrl) return Promise.resolve({ allowed: true });

  const cached = cache.get(imageUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return Promise.resolve(cached.result);

  const existing = inflight.get(imageUrl);
  if (existing) return existing;

  const prev = timers.get(imageUrl);
  if (prev) window.clearTimeout(prev);

  const p = new Promise<Result>((resolve) => {
    const id = window.setTimeout(async () => {
      timers.delete(imageUrl);
      const r = await callModerate(imageUrl);
      inflight.delete(imageUrl);
      resolve(r);
    }, DEBOUNCE_MS);
    timers.set(imageUrl, id);
  });
  inflight.set(imageUrl, p);
  return p;
};
