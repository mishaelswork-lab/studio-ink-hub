import { adminClient, guardCors, requireUser } from "../_shared/guard.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...guardCors, "Content-Type": "application/json" },
  });

async function collectObjectPaths(
  admin: ReturnType<typeof adminClient>,
  bucket: string,
  prefix: string,
  visited = new Set<string>(),
): Promise<string[]> {
  if (visited.has(prefix)) return [];
  visited.add(prefix);

  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Storage listing failed for ${bucket}`);

    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      // Storage folders have no object id or metadata; files have an object id.
      if (!entry.id && !entry.metadata) {
        paths.push(...await collectObjectPaths(admin, bucket, path, visited));
      } else {
        paths.push(path);
      }
    }

    if (entries.length < 1000) break;
    offset += entries.length;
  }

  return paths;
}

async function removeUserObjects(
  admin: ReturnType<typeof adminClient>,
  bucket: string,
  userId: string,
) {
  const paths = await collectObjectPaths(admin, bucket, userId);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
    if (error) throw new Error(`Storage cleanup failed for ${bucket}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: guardCors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (auth.response) return auth.response;

  try {
    const admin = adminClient();
    const userId = auth.user.id;

    // The RPC refuses deletion while the user has unresolved bookings or is the last admin.
    // It also marks deletion pending before any private media is removed.
    const { data: prepared, error: prepareError } = await admin.rpc("prepare_account_deletion", {
      p_user_id: userId,
    });
    if (prepareError || prepared?.success !== true) {
      console.error("Account deletion preparation failed", prepareError?.message ?? "Unexpected RPC response");
      return json({ error: "Account cannot be deleted yet. Resolve outstanding bookings or contact support." }, 409);
    }

    // Remove private user media with service-role access. This is retryable: if storage cleanup
    // or Auth deletion fails, another authenticated request can resume from remaining objects.
    await removeUserObjects(admin, "portfolio-private", userId);
    await removeUserObjects(admin, "portfolio-reels", userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Auth account deletion failed", deleteError.message);
      return json({ error: "Your account is prepared for deletion, but final removal failed. Contact support." }, 503);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Account deletion cleanup failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Account deletion is pending. Contact support if retrying does not complete it." }, 503);
  }
});
