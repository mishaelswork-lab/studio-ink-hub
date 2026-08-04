import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthClient = (supabase.auth as any).oauth as OAuthClient;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      if (!oauthClient?.getAuthorizationDetails) {
        return setError("OAuth client not available. Please update the app.");
      }
      const { data, error } = await oauthClient.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message ?? "Failed to load authorization");
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthClient.approveAuthorization(authorizationId)
      : await oauthClient.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message ?? "Authorization failed");
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6">
          <h1 className="font-heading text-xl text-foreground mb-2">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-5">
        <div>
          <h1 className="font-heading text-2xl text-foreground">
            Connect <span className="text-gradient-gold">{clientName}</span> to Tart
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {clientName} will be able to call this app's enabled tools while you are signed in.
          </p>
        </div>

        <ul className="text-sm text-foreground space-y-1.5">
          <li>• Share your basic profile</li>
          <li>• Share your email address</li>
          <li>• Browse studios and artists on your behalf</li>
          <li>• Read your bookings, consultations, and saved ideas</li>
          <li>• Send messages in your existing consultation threads</li>
        </ul>

        <p className="text-xs text-muted-foreground">
          This does not bypass Tart's permissions or backend policies. You can revoke access anytime.
        </p>

        <div className="flex gap-3 pt-2">
          <Button variant="gold" className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? "Working…" : "Approve"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
