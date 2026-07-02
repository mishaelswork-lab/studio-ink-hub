// Unified media upload: prefers AWS S3 (served via CloudFront) to keep
// Cloud egress costs down, falls back to Supabase Storage when the S3
// edge function is not configured.
import { supabase } from "@/integrations/supabase/client";
import { logUsage } from "@/lib/usage";

export type UploadFolder = "portfolio" | "reels" | "avatars";

const extOf = (file: File) => {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/")[1] || "bin";
};

async function s3Upload(file: File, folder: UploadFolder, ownerId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("s3-presign", {
      body: {
        folder,
        ownerId,
        filename: `${Date.now()}.${extOf(file)}`,
        contentType: file.type || "application/octet-stream",
      },
    });
    if (error || !data?.uploadUrl || !data?.publicUrl) return null;

    const put = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) return null;

    logUsage("media", "s3-upload", { folder, size: file.size, type: file.type });
    return data.publicUrl as string;
  } catch {
    return null;
  }
}

async function supabaseUpload(file: File, folder: UploadFolder, ownerId: string): Promise<string> {
  const path = `${folder}/${ownerId}/${Date.now()}.${extOf(file)}`;
  const { error } = await supabase.storage.from("reels-videos").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("reels-videos").getPublicUrl(path);
  logUsage("media", "supabase-upload", { folder, size: file.size, type: file.type });
  return data.publicUrl;
}

/** Upload a file and return its public URL (CloudFront when S3 is configured). */
export async function uploadMedia(file: File, folder: UploadFolder, ownerId: string): Promise<string> {
  const s3 = await s3Upload(file, folder, ownerId);
  if (s3) return s3;
  return supabaseUpload(file, folder, ownerId);
}
