// Shared authentication guards for edge functions.
// Every public endpoint must call one of these before doing any work.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { User } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const guardCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const URL_ = Deno.env.get("SUPABASE_URL") ?? "";

export const adminClient = () =>
  createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });

export function tokenOf(req: Request) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

export function deny(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...guardCors, "Content-Type": "application/json" },
  });
}

/** True when the caller presented the service-role key or the cron secret (internal calls). */
export function isServiceRole(req: Request) {
  const t = tokenOf(req);
  const cron = Deno.env.get("CRON_SECRET") ?? "";
  return !!t && ((!!SERVICE_KEY && t === SERVICE_KEY) || (!!cron && t === cron));
}


export async function getUser(req: Request) {
  const t = tokenOf(req);
  if (!t || t === SERVICE_KEY) return null;
  const { data } = await adminClient().auth.getUser(t);
  return data?.user ?? null;
}

export async function hasRole(userId: string, role: string) {
  const { data } = await adminClient()
    .from("user_roles").select("role").eq("user_id", userId).eq("role", role).maybeSingle();
  return !!data;
}

/** Requires a signed-in user. Returns { user } or { response } to return early. */
export async function requireUser(req: Request): Promise<{ user?: User; response?: Response }> {
  const user = await getUser(req);
  if (!user) return { response: deny(401, "Sign in required") };
  return { user };
}

/** Requires an admin user. */
export async function requireAdmin(req: Request): Promise<{ user?: User; response?: Response }> {
  const result = await requireUser(req);
  if (!result.user) return { response: result.response ?? deny(401, "Sign in required") };
  if (!(await hasRole(result.user.id, "admin"))) return { response: deny(403, "Admin access required") };
  return { user: result.user };
}

/** Requires either the service-role key (scheduled jobs) or an admin user. */
export async function requireInternal(req: Request): Promise<{ response?: Response }> {
  if (isServiceRole(req)) return {};
  const { response } = await requireAdmin(req);
  return response ? { response } : {};
}

/** True when the user owns this artist row (or is that artist's auth user). */
export async function ownsArtist(userId: string, artistId: string) {
  if (userId === artistId) return true;
  const { data } = await adminClient()
    .from("artists").select("id").eq("id", artistId).eq("user_id", userId).maybeSingle();
  return !!data;
}
