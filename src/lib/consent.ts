import { supabase } from "@/integrations/supabase/client";

export const CONSENT_POLICY_VERSION = "v1";
const STORAGE_KEY = "tart_consent_v1";
const ANON_KEY = "tart_anon_id";

export type ConsentChoice = {
  essential: true;
  analytics: boolean;
  version: string;
  decidedAt: string;
};

/** Stable pseudonymous id so a consent record can be proven without an account. */
export const getAnonId = (): string => {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "unavailable";
  }
};

export const readConsent = (): ConsentChoice | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    if (parsed?.version !== CONSENT_POLICY_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const analyticsAllowed = (): boolean => readConsent()?.analytics === true;

/**
 * Persist the choice locally (so the banner stays dismissed) and write an
 * immutable, RLS-protected audit record of the consent to the backend.
 */
export const recordConsent = async (analytics: boolean): Promise<ConsentChoice> => {
  const choice: ConsentChoice = {
    essential: true,
    analytics,
    version: CONSENT_POLICY_VERSION,
    decidedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* storage blocked — banner will reappear, consent is still logged below */
  }

  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    await supabase.from("consent_records").insert([
      {
        user_id: userId,
        anon_id: userId ? null : getAnonId(),
        purpose: "analytics_cookies",
        granted: analytics,
        policy_version: CONSENT_POLICY_VERSION,
        user_agent: navigator.userAgent.slice(0, 300),
      },
    ]);
  } catch {
    /* never block the UI on consent logging */
  }

  window.dispatchEvent(new CustomEvent("tart:consent-changed", { detail: choice }));
  return choice;
};

/** Clears the stored decision so the banner shows again (withdrawal of consent). */
export const resetConsent = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("tart:consent-changed", { detail: null }));
};
