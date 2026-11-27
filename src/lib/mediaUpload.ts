import { supabase } from "@/integrations/supabase/client";
import { logUsage } from "@/lib/usage";

export type UploadFolder = "portfolio";

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Upload portfolio media to private storage. The returned value is an object
 * path, never a public URL. Public delivery is handled by get-portfolio-media.
 */
export async function uploadMedia(file: File, folder: UploadFolder, artistId: string): Promise<string> {
  if (folder !== "portfolio") throw new Error("Unsupported upload category");
  if (!extensionByType[file.type]) throw new Error("Only JPEG, PNG, and WebP images are allowed");
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("Image must be 5MB or smaller");

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in required");
  const objectPath = `${auth.user.id}/${artistId}/${crypto.randomUUID()}.${extensionByType[file.type]}`;

  const { error } = await supabase.storage.from("portfolio-private").upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) throw error;

  logUsage("media", "private-portfolio-upload", { size: file.size, type: file.type });
  return objectPath;
}
