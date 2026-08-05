import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  pricing: {
    cover_charge: number;
    commission_percent: number;
    membership_price: number;
    membership_months: number;
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
    cover_charge: 500,
    commission_percent: 15,
    membership_price: 199,
    membership_months: 3,
    featured_boost_price: 999,
    featured_boost_days: 30,
  },
  limits: { guest_design_limit: 30, ai_design_count: 10, max_upload_mb: 10, booking_window_days: 60 },
  contact: { support_email: "artspacehelp@gmail.com", grievance_officer: "Mishael Jose Anil Kadungamparambil", whatsapp: "" },
  features: {
    ai_designs: true,
    reels: true,
    piercing_service: true,
    featured_boosts: true,
    push_notifications: true,
    maintenance_mode: false,
  },
  content: { tagline: "Where tattoo becomes art", announcement: "" },
};

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase.from("platform_settings").select("key, value");
  if (error) throw error;
  const merged: any = structuredClone(DEFAULT_SETTINGS);
  for (const row of data ?? []) {
    const key = row.key as keyof PlatformSettings;
    if (merged[key]) merged[key] = { ...merged[key], ...(row.value as object) };
  }
  return merged as PlatformSettings;
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
  const { data: session } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key, value: value as any, updated_by: session.user?.id ?? null }, { onConflict: "key" });
  if (error) throw error;
}
