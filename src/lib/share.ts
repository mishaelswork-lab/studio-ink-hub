import { toast } from "sonner";

export async function shareLink(opts: { title: string; text: string; url: string }) {
  const { title, text, url } = opts;
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try { await (navigator as any).share({ title, text, url }); return true; } catch {}
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
    return true;
  } catch {
    toast.error("Could not share");
    return false;
  }
}
