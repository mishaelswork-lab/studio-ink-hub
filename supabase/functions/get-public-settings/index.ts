import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const PUBLIC_KEYS = ["pricing","limits","contact","features","content"] as const;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "Settings service unavailable" }, 503);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.from("platform_settings").select("key,value").in("key", [...PUBLIC_KEYS]);
  if (error) return json({ error: "Could not load platform settings" }, 500);
  const settings: Record<string, unknown> = {};
  for (const row of data || []) if (PUBLIC_KEYS.includes(row.key as typeof PUBLIC_KEYS[number])) settings[row.key] = row.value;
  return json({ settings });
});
