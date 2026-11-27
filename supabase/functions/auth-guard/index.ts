// Rate-limited auth proxy. All password sign-in and phone OTP requests go
// through here so failures are counted and abusive identifiers/IPs get
// temporarily locked out before any token is issued.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IDENTIFIER = 5;
const MAX_FAILURES_PER_IP = 20;
const LOCKOUT_MINUTES = 15;
// OTP sends are throttled separately (they cost money / can be spammed).
const MAX_OTP_SENDS = 3;

type Action = "password" | "otp_send" | "otp_verify";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const anon = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function countFailures(column: "identifier" | "ip", value: string, kind?: Action, extraIp?: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  let q = admin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .eq("success", false)
    .gte("created_at", since);
  if (kind) q = q.eq("kind", kind);
  // Password lockouts are scoped to (identifier, source IP): an attacker who
  // fails logins from their own machine locks themselves out, but cannot
  // deliberately lock a victim's email from a different address.
  if (extraIp) q = q.eq("ip", extraIp);
  const { count } = await q;
  return count ?? 0;
}

async function countOtpSends(identifier: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await admin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("kind", "otp_send")
    .gte("created_at", since);
  return count ?? 0;
}

async function record(identifier: string, ip: string, kind: Action, success: boolean) {
  await admin.from("auth_attempts").insert({ identifier, ip, kind, success });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const action = String(body.action ?? "") as Action;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!["password", "otp_send", "otp_verify"].includes(action)) {
    return json({ error: "Invalid request" }, 400);
  }
  const identifier = action === "password" ? email : phone;
  if (!identifier || identifier.length > 255) return json({ error: "Invalid request" }, 400);
  if (action === "password" && (password.length < 1 || password.length > 200)) {
    return json({ error: "Invalid request" }, 400);
  }
  if (action === "otp_verify" && !/^\d{4,8}$/.test(token)) {
    return json({ error: "Invalid request" }, 400);
  }
  if (action !== "password" && !/^\+?\d{8,15}$/.test(identifier)) {
    return json({ error: "Invalid request" }, 400);
  }

  const ip = clientIp(req);

  // Lockout checks before any credential is touched.
  const [idFailures, ipFailures] = await Promise.all([
    countFailures("identifier", identifier, undefined, ip),
    countFailures("ip", ip),
  ]);
  if (idFailures >= MAX_FAILURES_PER_IDENTIFIER || ipFailures >= MAX_FAILURES_PER_IP) {
    return json(
      {
        error: `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
        locked: true,
        retry_after_minutes: LOCKOUT_MINUTES,
      },
      429,
    );
  }

  if (action === "otp_send" && (await countOtpSends(identifier)) >= MAX_OTP_SENDS) {
    return json(
      { error: "Too many codes requested. Please wait before requesting another.", locked: true },
      429,
    );
  }

  try {
    if (action === "password") {
      const { data, error } = await anon.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        await record(identifier, ip, action, false);
        return json({ error: "Invalid email or password." }, 401);
      }
      await record(identifier, ip, action, true);
      return json({ session: data.session });
    }

    if (action === "otp_send") {
      const { error } = await anon.auth.signInWithOtp({ phone: identifier, options: { shouldCreateUser: false } });
      // Record every send (success or not) so the throttle counts them.
      await record(identifier, ip, action, !error);
      if (error) return json({ error: "Could not send code. Please try again later." }, 400);
      return json({ sent: true });
    }

    const { data, error } = await anon.auth.verifyOtp({
      phone: identifier,
      token,
      type: "sms",
    });
    if (error || !data.session) {
      await record(identifier, ip, action, false);
      return json({ error: "Invalid or expired code." }, 401);
    }
    await record(identifier, ip, action, true);
    return json({ session: data.session });
  } catch (e) {
    console.error("auth-guard failure:", e instanceof Error ? e.message : e);
    return json({ error: "Authentication is temporarily unavailable." }, 503);
  }
});
