import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  pricing: {
    cover_charge: number;
    member_cover_charge_discount_percent: number;
    commission_percent: number;
    membership_price: number;
    membership_duration: "lifetime";
    membership_months: number | null;
    featured_boost_price: number;
    featured_boost_days: number;
  };
  limits: {
    guest_design_limit: number;
    ai_design_count: number;
    max_upload_mb: number;
    booking_window_days: number;
  };
  contact: {
    support_email: string;
    grievance_officer: string;
    whatsapp: string;
  };
  features: {
    ai_designs: boolean;
    reels: boolean;
    piercing_service: boolean;
    featured_boosts: boolean;
    push_notifications: boolean;
    maintenance_mode: boolean;
  };
  content: {
    tagline: string;
    announcement: string;
  };
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  pricing: {
    cover_charge: 49,
    member_cover_charge_discount_percent: 10,
    commission_percent: 15,
    membership_price: 395,
    membership_duration: "lifetime",
    membership_months: null,
    featured_boost_price: 500,
    featured_boost_days: 30,
  },
  limits: { guest_design_limit: 30, ai_design_count: 10, max_upload_mb: 5, booking_window_days: 60 },
  contact: { support_email: "artspacehelp@gmail.com", grievance_officer: "Mishael Jose Anil Kadungamparambil", whatsapp: "" },
  features: {
    ai_designs: true,
    reels: true,
    piercing_service: true,
    featured_boosts: true,
    push_notifications: true,
    maintenance_mode: false,
  },
  content: { tagline: "Where art of tattoos gets a start.", announcement: "" },
};

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase.functions.invoke("get-public-settings");
  if (error) throw error;
  const merged = structuredClone(DEFAULT_SETTINGS);
  const groups = data?.settings && typeof data.settings === "object" ? data.settings : {};
  const target = merged as unknown as Record<keyof PlatformSettings, Record<string, unknown>>;
  for (const key of Object.keys(merged) as (keyof PlatformSettings)[]) {
    const value = groups[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = { ...target[key], ...(value as Record<string, unknown>) };
    }
  }
  return merged;
}

export function usePlatformSettings() {
  const query = useQuery({
    queryKey: ["platform-settings"],
    queryFn: fetchPlatformSettings,
    staleTime: 5 * 60 * 1000,
  });
  return { settings: query.data ?? DEFAULT_SETTINGS, ...query };
}

export async function savePlatformSettingGroup(key: keyof PlatformSettings, value: object) {
  const { data, error } = await supabase.functions.invoke("update-platform-settings", { body: { key, value } });
  if (error || data?.success !== true) throw error || new Error(data?.error || "Could not save settings");
}
