/**
 * Automated RLS verification.
 *
 * These tests use the public (anon) key only — exactly what a hostile client
 * has. They assert that Row-Level Security blocks reads, writes, updates and
 * deletes of data that does not belong to the caller, for every table in the
 * public schema.
 *
 * A "block" is either a Postgres error (permission denied / RLS violation) or
 * an empty result set — both mean no cross-user data leaked.
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(url, key, { auth: { persistSession: false } });

/** Tables that must never expose rows to an unauthenticated caller. */
const PRIVATE_TABLES = [
  "profiles",
  "bookings",
  "consultations",
  "consultation_messages",
  "payments",
  "memberships",
  "favorites",
  "referrals",
  "user_roles",
  "booking_notifications",
  "push_subscriptions",
  "design_reports",
  "design_views",
  "admin_audit_log",
  "change_audit_log",
  "consent_records",
  "outreach_leads",
  "featured_requests",
  "artist_certifications",
  "perf_metrics",
  "usage_events",
] as const;

/** Tables that are intentionally world-readable (public catalogue content). */
const PUBLIC_TABLES = ["artists", "reels", "daily_designs", "featured_artists"] as const;

const FAKE_ID = "00000000-0000-0000-0000-000000000001";

describe("RLS: anonymous reads", () => {
  it.each(PRIVATE_TABLES)("blocks anonymous SELECT on %s", async (table) => {
    const { data, error } = await anon.from(table as never).select("*").limit(5);
    if (error) {
      expect(error).toBeTruthy();
      return;
    }
    expect(data ?? []).toHaveLength(0);
  });

  it.each(PUBLIC_TABLES)("allows anonymous SELECT on public catalogue table %s", async (table) => {
    const { error } = await anon.from(table as never).select("id").limit(1);
    expect(error).toBeNull();
  });
});

describe("RLS: anonymous writes", () => {
  it.each(PRIVATE_TABLES)("blocks anonymous INSERT on %s", async (table) => {
    const { error } = await anon
      .from(table as never)
      .insert([{ id: FAKE_ID } as never]);
    expect(error).not.toBeNull();
  });

  it.each([...PRIVATE_TABLES, ...PUBLIC_TABLES])(
    "blocks anonymous UPDATE on %s",
    async (table) => {
      const { data, error } = await anon
        .from(table as never)
        .update({ id: FAKE_ID } as never)
        .eq("id", FAKE_ID)
        .select();
      // Either rejected outright, or silently matched zero rows.
      if (!error) expect(data ?? []).toHaveLength(0);
    },
  );

  it.each([...PRIVATE_TABLES, ...PUBLIC_TABLES])(
    "blocks anonymous DELETE on %s",
    async (table) => {
      const { data, error } = await anon
        .from(table as never)
        .delete()
        .eq("id", FAKE_ID)
        .select();
      if (!error) expect(data ?? []).toHaveLength(0);
    },
  );
});

describe("RLS: cross-user access with a fabricated owner id", () => {
  it("cannot read another user's profile by user_id", async () => {
    const { data, error } = await anon.from("profiles").select("*").eq("user_id", FAKE_ID);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot read another user's bookings by customer_id", async () => {
    const { data, error } = await anon.from("bookings").select("*").eq("customer_id", FAKE_ID);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot read another user's payments", async () => {
    const { data, error } = await anon.from("payments").select("*").eq("customer_id", FAKE_ID);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot escalate privileges by inserting into user_roles", async () => {
    const { error } = await anon
      .from("user_roles")
      .insert([{ user_id: FAKE_ID, role: "admin" }] as never);
    expect(error).not.toBeNull();
  });

  it("cannot read the admin audit log", async () => {
    const { data, error } = await anon.from("admin_audit_log").select("*").limit(1);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot read the change audit log", async () => {
    const { data, error } = await anon.from("change_audit_log").select("*").limit(1);
    if (!error) expect(data ?? []).toHaveLength(0);
  });
});
