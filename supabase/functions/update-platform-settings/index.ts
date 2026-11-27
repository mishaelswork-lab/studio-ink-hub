import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ALLOWED = new Set(["pricing","limits","contact","features","content"]);
function validate(key: string, value: Record<string, unknown>) {
  if (key === "pricing") {
    if (value.cover_charge !== undefined && (!Number.isSafeInteger(value.cover_charge) || Number(value.cover_charge) < 1 || Number(value.cover_charge) > 10000)) return false;
    if (value.member_cover_charge_discount_percent !== undefined && (!Number.isSafeInteger(value.member_cover_charge_discount_percent) || Number(value.member_cover_charge_discount_percent) < 0 || Number(value.member_cover_charge_discount_percent) > 100)) return false;
    if (value.membership_price !== undefined && (!Number.isSafeInteger(value.membership_price) || Number(value.membership_price) < 1 || Number(value.membership_price) > 100000)) return false;
    if (value.membership_duration !== undefined && value.membership_duration !== "lifetime") return false;
    if (value.featured_boost_price !== undefined && (!Number.isSafeInteger(value.featured_boost_price) || Number(value.featured_boost_price) < 1 || Number(value.featured_boost_price) > 100000)) return false;
    if (value.featured_boost_days !== undefined && (!Number.isSafeInteger(value.featured_boost_days) || Number(value.featured_boost_days) < 1 || Number(value.featured_boost_days) > 365)) return false;
  }
  return true;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), header = req.headers.get("Authorization");
  if (!url || !anon || !service || !header) return json({ error: "Authentication required" }, 401);
  const auth = createClient(url, anon, { global: { headers: { Authorization: header } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await auth.auth.getUser();
  if (!authData.user) return json({ error: "Authentication required" }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: role } = await admin.from("user_roles").select("user_id").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Admin access required" }, 403);
  let key = "", value: Record<string, unknown> = {};
  try {
    const body = await req.json();
    key = typeof body?.key === "string" ? body.key : "";
    value = body?.value && typeof body.value === "object" && !Array.isArray(body.value) ? body.value : {};
  } catch { return json({ error: "Invalid request" }, 400); }
  if (!ALLOWED.has(key) || !validate(key, value)) return json({ error: "Invalid settings group or values" }, 400);
  const { error } = await admin.from("platform_settings").upsert({ key, value, updated_by: authData.user.id }, { onConflict: "key" });
  if (error) return json({ error: "Could not save platform settings" }, 500);
  await admin.from("admin_audit_log").insert({ admin_id: authData.user.id, action: "platform_settings_updated", target_type: "platform_settings", target_id: authData.user.id, metadata: { key } });
  return json({ success: true });
});
