/**
 * Platform detection helpers.
 *
 * Apple treats memberships and promotional "boosts" as digital goods and
 * requires In-App Purchase for them. Booking fees for a real-world tattoo or
 * piercing service are exempt. Until IAP is wired up, digital-goods purchases
 * are hidden inside the native iOS shell (they remain available on the web and
 * on Android, where Razorpay is permitted for this category).
 */

type CapacitorGlobal = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const cap = (): CapacitorGlobal | undefined =>
  typeof window !== "undefined" ? (window as any).Capacitor : undefined;

export const isNativeApp = (): boolean => cap()?.isNativePlatform?.() === true;

export const nativePlatform = (): "ios" | "android" | "web" => {
  const p = cap()?.getPlatform?.();
  if (p === "ios" || p === "android") return p;
  return "web";
};

export const isNativeIOS = (): boolean => isNativeApp() && nativePlatform() === "ios";

/** Digital goods (membership, featured boost) may not be sold outside IAP on iOS. */
export const canSellDigitalGoods = (): boolean => !isNativeIOS();
