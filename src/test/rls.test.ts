/**
 * Optional live RLS integration tests.
 * Set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY to run anonymous checks.
 * Signed-in tampering checks additionally require TEST_USER_EMAIL/PASSWORD.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL || process.env.TEST_SUPABASE_URL) as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.TEST_SUPABASE_ANON_KEY) as string | undefined;
const hasCredentials = Boolean(url && key);
const anon = hasCredentials ? createClient(url!, key!, { auth: { persistSession: false } }) : null;

const PRIVATE_TABLES = [
  "profiles", "bookings", "design_requests", "conversations", "messages", "payments",
  "memberships", "favorites", "user_roles", "admin_audit_log", "instagram_connections",
  "instagram_oauth_states", "platform_settings", "saved_designs", "availability_exceptions",
  "artist_leads",
] as const;
const PUBLIC_TABLES = ["artists", "designs", "portfolio_items", "reels", "featured_artists"] as const;
const FAKE_ID = "00000000-0000-0000-0000-000000000001";

describe.skipIf(!hasCredentials)("RLS: anonymous reads and writes", () => {
  it("does not expose pending or suspended artist profiles", async () => {
    const { data, error } = await anon!.from("artists").select("id,status").neq("status", "active");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it.each(PRIVATE_TABLES)("blocks anonymous SELECT on %s", async (table) => {
    const { data, error } = await anon!.from(table as never).select("*").limit(5);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it.each(PUBLIC_TABLES)("allows the public catalogue SELECT policy on %s", async (table) => {
    const { error } = await anon!.from(table as never).select("id").limit(1);
    expect(error).toBeNull();
  });

  it.each(PRIVATE_TABLES)("blocks anonymous INSERT on %s", async (table) => {
    const { error } = await anon!.from(table as never).insert([{ id: FAKE_ID }] as never);
    expect(error).not.toBeNull();
  });

  it.each([...PRIVATE_TABLES, ...PUBLIC_TABLES])("blocks anonymous UPDATE on %s", async (table) => {
    const { data, error } = await anon!.from(table as never).update({ id: FAKE_ID } as never).eq("id", FAKE_ID).select();
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it.each([...PRIVATE_TABLES, ...PUBLIC_TABLES])("blocks anonymous DELETE on %s", async (table) => {
    const { data, error } = await anon!.from(table as never).delete().eq("id", FAKE_ID).select();
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot read another user's profile by id", async () => {
    const { data, error } = await anon!.from("profiles").select("id").eq("id", FAKE_ID);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot read another user's bookings", async () => {
    const { data, error } = await anon!.from("bookings").select("id").eq("customer_id", FAKE_ID);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot read payment records", async () => {
    const { data, error } = await anon!.from("payments").select("id").eq("customer_id", FAKE_ID);
    if (!error) expect(data ?? []).toHaveLength(0);
  });
});

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;
describe.skipIf(!hasCredentials || !testEmail || !testPassword)("RLS: signed-in user tampering", () => {
  let authed: ReturnType<typeof createClient>;
  let userId = "";

  beforeAll(async () => {
    const client = createClient(url!, key!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: testEmail!, password: testPassword! });
    expect(error).toBeNull();
    expect(data.session).toBeTruthy();
    userId = data.user!.id;
    authed = createClient(url!, key!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session!.access_token}` } },
    });
  });

  it("cannot activate a lifetime membership directly", async () => {
    const { error } = await authed.from("memberships").insert({ user_id: userId, plan: "premium", amount: 395, currency: "INR", status: "active" } as never);
    expect(error).not.toBeNull();
  });

  it("cannot forge the free-chat counter", async () => {
    const { error } = await authed.from("profiles").update({ chat_count: 7 } as never).eq("id", userId);
    expect(error).not.toBeNull();
  });

  it("cannot record an arbitrary captured payment", async () => {
    const { error } = await authed.from("payments").insert({
      customer_id: userId, provider: "razorpay", amount_minor: 99999900, currency: "INR",
      payment_type: "membership", status: "captured",
    } as never);
    expect(error).not.toBeNull();
  });

  it("cannot approve their own portfolio media", async () => {
    const { error } = await authed.from("portfolio_items").update({ approved: true } as never).eq("artist_id", FAKE_ID);
    expect(error).not.toBeNull();
  });
});
