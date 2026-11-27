import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function removeUserStorage(admin: ReturnType<typeof createClient<any>>, bucket: string, userId: string) {
  const paths: string[] = [];
  const walk = async (folder: string): Promise<void> => {
    let offset = 0;
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Could not enumerate private ${bucket} objects`);
      const entries = data ?? [];
      for (const entry of entries) {
        const path = `${folder}/${entry.name}`;
        if (entry.id == null && entry.metadata == null) {
          await walk(path);
        } else {
          paths.push(path);
        }
      }
      if (entries.length < 100) break;
      offset += entries.length;
    }
  };

  await walk(userId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`Could not remove private ${bucket} objects`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\\s+/i, "").trim();
    if (!token) return json({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Account deletion is unavailable" }, 503);

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const userId = userData.user.id;

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // This transaction rechecks active bookings and the last-admin safeguard,
    // anonymises financial references, and removes the account's authored content.
    const { data: prepared, error: prepareError } = await admin.rpc("prepare_account_deletion", {
      p_user_id: userId,
    });
    if (prepareError) {
      const message = prepareError.message || "Could not prepare account deletion";
      const status = /OPEN_CUSTOMER_BOOKINGS|OPEN_ARTIST_BOOKINGS|LAST_ADMIN_ACCOUNT/.test(message) ? 409 :
        prepareError.code === "P0002" ? 404 : 500;
      const friendlyMessage = message.includes("OPEN_CUSTOMER_BOOKINGS")
        ? "You have active bookings as a customer. Cancel or complete them before deleting your account."
        : message.includes("OPEN_ARTIST_BOOKINGS")
          ? "You have active client bookings. Complete or cancel them before deleting your artist account."
          : message.includes("LAST_ADMIN_ACCOUNT")
            ? "Transfer administrator access to another trusted admin before deleting this account."
            : status === 404 ? "Your account profile could not be found. Please contact support." : "Could not prepare account deletion. Please retry or contact support.";
      return json({ error: friendlyMessage }, status);
    }
    if (!prepared?.success) return json({ error: "Could not prepare account deletion" }, 500);

    // Storage must be cleared before Auth deletion: Supabase prevents deleting
    // an Auth user while that user still owns Storage objects. A retry is safe:
    // the database preparation is idempotent and the object paths are user-scoped.
    for (const bucket of ["portfolio-private", "portfolio-reels"]) {
      await removeUserStorage(admin, bucket, userId);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Auth account deletion failed after data anonymisation:", deleteError.message);
      return json({ error: "Your personal content has been removed and financial history retained, but sign-in removal is pending. Please retry or contact support." }, 500);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Account deletion failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Account deletion could not be completed. Please retry or contact support." }, 500);
  }
});
