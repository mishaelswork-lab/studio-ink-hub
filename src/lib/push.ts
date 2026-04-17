import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC = "BNH8yX6q8gYx-PLACEHOLDER"; // injected at runtime via env, see useEnsurePush

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;

    // Fetch VAPID public key from edge function (so we don't hardcode)
    const { data: keyData } = await supabase.functions.invoke("get-vapid-key");
    const publicKey = keyData?.publicKey || VAPID_PUBLIC;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent,
    }, { onConflict: "endpoint" });
    return true;
  } catch (e) {
    console.warn("Push registration failed", e);
    return false;
  }
}

export function notify(title: string, body: string, url?: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/placeholder.svg", data: { url } });
  }
}
