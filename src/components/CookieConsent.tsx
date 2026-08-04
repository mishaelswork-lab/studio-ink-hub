import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { readConsent, recordConsent } from "@/lib/consent";

/**
 * DPDP Act 2023 consent notice for non-essential (analytics) cookies.
 * Opt-in only: nothing analytics-related runs until the user accepts.
 */
export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(readConsent() === null);
    // Defer so it never competes with first paint.
    const t = window.setTimeout(sync, 600);
    window.addEventListener("tart:consent-changed", sync);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("tart:consent-changed", sync);
    };
  }, []);

  if (!visible) return null;

  const decide = async (analytics: boolean) => {
    setBusy(true);
    await recordConsent(analytics);
    setBusy(false);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
      className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4"
    >
      <div className="max-w-3xl mx-auto rounded-lg border border-border bg-card/95 backdrop-blur-xl p-4 shadow-lg">
        <p className="text-sm text-foreground font-heading mb-1">Your choice about cookies</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use strictly necessary cookies to keep you signed in and to secure the app — these cannot
          be switched off. With your consent we also record anonymised usage and performance analytics
          to improve Tart. You can withdraw consent at any time from your profile. See our{" "}
          <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Button variant="gold" size="sm" className="flex-1" disabled={busy} onClick={() => decide(true)}>
            Accept analytics
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-border" disabled={busy} onClick={() => decide(false)}>
            Essential only
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
