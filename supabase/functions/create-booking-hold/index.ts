import { requireUser, guardCors } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...guardCors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: guardCors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof body.artist_id !== "string" || !uuid.test(body.artist_id)) {
      return json({ error: "A valid artist is required" }, 400);
    }
    if (typeof body.starts_at !== "string" || typeof body.ends_at !== "string" ||
        !Number.isFinite(Date.parse(body.starts_at)) || !Number.isFinite(Date.parse(body.ends_at))) {
      return json({ error: "Valid appointment times are required" }, 400);
    }
    const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key : "";
    if (idempotencyKey.length < 16 || idempotencyKey.length > 100) {
      return json({ error: "Invalid booking request key" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!supabaseUrl || !anonKey || !token) return json({ error: "Booking service unavailable" }, 503);

    // Invoke the SECURITY DEFINER RPC with the customer's JWT so auth.uid()
    // remains the source of identity; never pass a client-supplied customer ID.
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.rpc("create_booking_hold", {
      p_artist_id: body.artist_id,
      p_starts_at: body.starts_at,
      p_ends_at: body.ends_at,
      p_service_type: body.service_type,
      p_brief: body.brief,
      p_placement: body.placement ?? "",
      p_size_description: body.size_description ?? "",
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const status = error.code === "42501" ? 401 :
        error.code === "P0002" ? 404 :
        error.code === "23P01" || error.code === "23505" ? 409 :
        error.code === "22023" ? 400 : 422;
      return json({ error: error.message || "Could not create booking hold" }, status);
    }
    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking?.booking_id) return json({ error: "Booking hold was not created" }, 500);
    return json({
      booking_id: booking.booking_id,
      design_request_id: booking.design_request_id,
      status: booking.booking_status,
      hold_expires_at: booking.hold_expires_at,
    }, 201);
  } catch {
    return json({ error: "Invalid booking request" }, 400);
  }
});
