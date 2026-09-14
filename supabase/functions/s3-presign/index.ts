import { requireUser } from "../_shared/guard.ts";
// Generates a short-lived S3 PUT URL for direct-to-S3 uploads.
// Returns the CloudFront URL so downstream storage & display go through the CDN.
// Requires secrets: AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY, CLOUDFRONT_DOMAIN.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const _g = await requireUser(req);
  if (_g.response) return _g.response;

  const bucket = Deno.env.get("AWS_S3_BUCKET");
  const region = Deno.env.get("AWS_S3_REGION");
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const cdn = Deno.env.get("CLOUDFRONT_DOMAIN");

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !cdn) {
    return new Response(JSON.stringify({ error: "S3 not configured" }), {
      status: 501, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { folder, ownerId, filename, contentType } = await req.json();
    if (!folder || !ownerId || !filename) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const safeOwner = String(ownerId).replace(/[^a-zA-Z0-9_-]/g, "");
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "");
    const key = `${folder}/${safeOwner}/${safeName}`;

    const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const url = new URL(`https://${host}/${key}`);
    url.searchParams.set("X-Amz-Expires", "300");

    const signed = await client.sign(new Request(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": contentType || "application/octet-stream" },
    }), { aws: { signQuery: true } });

    const cdnHost = cdn.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return new Response(JSON.stringify({
      uploadUrl: signed.url,
      publicUrl: `https://${cdnHost}/${key}`,
      key,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
