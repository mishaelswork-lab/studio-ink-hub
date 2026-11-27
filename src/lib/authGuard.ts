import { supabase } from "@/integrations/supabase/client";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-guard`;

type GuardResponse = { session?: { access_token: string; refresh_token: string; user: { id: string } }; sent?: boolean; error?: string };

async function call(payload: Record<string, unknown>): Promise<GuardResponse> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });
  let body: GuardResponse = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new Error(body.error || "Authentication failed. Please try again.");
  return body;
}

/** Rate-limited password sign-in. Returns the signed-in user. */
export async function guardedSignIn(email: string, password: string) {
  const { session } = await call({ action: "password", email, password });
  if (!session) throw new Error("Authentication failed. Please try again.");
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return session.user;
}

/** Rate-limited OTP send. */
export async function guardedSendOtp(phone: string) {
  await call({ action: "otp_send", phone });
}

/** Rate-limited OTP verification. */
export async function guardedVerifyOtp(phone: string, token: string) {
  const { session } = await call({ action: "otp_verify", phone, token });
  if (!session) throw new Error("Authentication failed. Please try again.");
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return session.user;
}
