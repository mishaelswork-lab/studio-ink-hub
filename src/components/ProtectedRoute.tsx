import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuotesLoader } from "@/components/QuotesLoader";

interface Props {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

const ProtectedRoute = ({ children, requiredRole, redirectTo = "/login" }: Props) => {
  const { user, loading, roles, session } = useAuth();
  const [serverChecked, setServerChecked] = useState<null | boolean>(null);
  const [consentChecked, setConsentChecked] = useState<null | boolean>(null);

  // Require auditable age/privacy and Terms acceptance before any protected area is rendered.
  useEffect(() => {
    let cancelled = false;
    if (!session || !user) { setConsentChecked(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from("consent_records")
        .select("purpose, policy_version")
        .eq("user_id", user.id)
        .in("purpose", ["personal_data_processing", "terms_of_service", "age_attestation"]);
      if (error) {
        if (!cancelled) setConsentChecked(false);
        return;
      }

      const existing = data ?? [];
      const hasPrivacy = existing.some((record) => record.purpose === "personal_data_processing");
      const hasTerms = existing.some((record) => record.purpose === "terms_of_service");
      const hasAgeAttestation = existing.some((record) => record.purpose === "age_attestation");
      if (hasPrivacy && hasTerms && hasAgeAttestation) {
        if (!cancelled) setConsentChecked(true);
        return;
      }

      const metadata = user.user_metadata ?? {};
      if (metadata.age_confirmed !== true || metadata.privacy_consent !== true || metadata.terms_accepted !== true) {
        await supabase.auth.signOut();
        if (!cancelled) setConsentChecked(false);
        return;
      }

      const requiredRows = [
        { purpose: "personal_data_processing", granted: true, policy_version: "privacy-2026-08-03" },
        { purpose: "terms_of_service", granted: true, policy_version: "terms-2026-11-26" },
        { purpose: "age_attestation", granted: true, policy_version: "age-18-attestation-2026-11-27" },
      ];
      const missing = requiredRows.filter((row) => !existing.some((record) => record.purpose === row.purpose && record.policy_version === row.policy_version));
      if (missing.length) {
        const { error: insertError } = await supabase.from("consent_records").insert(
          missing.map((row) => ({ ...row, user_id: user.id, user_agent: navigator.userAgent })),
        );
        if (insertError) {
          if (!cancelled) setConsentChecked(false);
          return;
        }
      }
      if (!cancelled) setConsentChecked(true);
    })();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  // For admin routes, perform a server-verified check (defense in depth on top of RLS).
  useEffect(() => {
    let cancelled = false;
    if (requiredRole !== "admin" || !session) { setServerChecked(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-admin", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!cancelled) setServerChecked(!error && (data as any)?.isAdmin === true);
      } catch {
        if (!cancelled) setServerChecked(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requiredRole, session]);

  if (loading || (user && consentChecked === null) || (requiredRole === "admin" && session && serverChecked === null)) {
    return <QuotesLoader fullScreen />;
  }

  if (!user) return <Navigate to={redirectTo} replace />;
  if (consentChecked === false) {
    const consentRedirect = requiredRole === "artist" ? "/artist-login" : requiredRole === "admin" ? "/admin" : "/login";
    return <Navigate to={consentRedirect} replace />;
  }
  if (requiredRole && !roles.includes(requiredRole)) return <Navigate to="/" replace />;
  if (requiredRole === "admin" && serverChecked === false) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
