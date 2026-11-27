import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { guardedSignIn, guardedSendOtp, guardedVerifyOtp } from "@/lib/authGuard";

// Accept only same-origin relative paths as the post-login redirect target.
const safeNext = (raw: string | null): string | null => {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};

const persistSignupConsents = async (userId: string, metadata: Record<string, unknown>) => {
  if (metadata.age_confirmed !== true || metadata.privacy_consent !== true || metadata.terms_accepted !== true) {
    throw new Error("This account has no recorded age and privacy consent. Please create your account through ArtSpace email sign-up.");
  }

  const consentRows = [
    { purpose: "personal_data_processing", granted: true, policy_version: "privacy-2026-08-03" },
    { purpose: "terms_of_service", granted: true, policy_version: "terms-2026-11-26" },
    { purpose: "age_attestation", granted: true, policy_version: "age-18-attestation-2026-11-27" },
  ];
  const purposes = consentRows.map((row) => row.purpose);
  const { data: existing, error: readError } = await supabase
    .from("consent_records")
    .select("purpose, policy_version")
    .eq("user_id", userId)
    .in("purpose", purposes);
  if (readError) throw readError;

  const missing = consentRows.filter(
    (row) => !existing?.some((record) => record.purpose === row.purpose && record.policy_version === row.policy_version),
  );
  if (missing.length) {
    const { error } = await supabase.from("consent_records").insert(
      missing.map((row) => ({ ...row, user_id: userId, user_agent: navigator.userAgent })),
    );
    if (error) throw error;
  }
};

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [consent, setConsent] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));

  // Route artists straight to /artist-dashboard, everyone else to /dashboard —
  // unless a `next` param is present (e.g. OAuth consent), in which case honor it.
  const routeAfterLogin = async () => {
    try {
      const { data: { user: u }, error: userError } = await supabase.auth.getUser();
      if (userError || !u) throw userError ?? new Error("Your session could not be verified.");

      // Do not enter the app until any signup consent carried through email verification is recorded.
      await persistSignupConsents(u.id, u.user_metadata ?? {});
      if (nextPath) {
        window.location.href = nextPath;
        return;
      }

      const { data, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      if (rolesError) throw rolesError;
      const roles = (data || []).map((r) => r.role);
      if (roles.includes("artist")) {
        navigate("/artist-dashboard");
        return;
      }
      navigate("/dashboard");
    } catch (error) {
      await supabase.auth.signOut();
      toast.error(error instanceof Error ? error.message : "Unable to complete sign-in. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (!ageOk) {
        toast.error("You must confirm you are 18 or older to use Tart");
        return;
      }
      if (!consent) {
        toast.error("Please consent to the processing of your personal data to continue");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: {
              display_name: displayName || email,
              age_confirmed: true,
              privacy_consent: true,
              terms_accepted: true,
            },
            emailRedirectTo: window.location.origin + (nextPath ?? ""),
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await persistSignupConsents(data.user.id, data.user.user_metadata ?? {});
          toast.success("Account created. Welcome to ArtSpace!");
          await routeAfterLogin();
        } else {
          toast.success("Account created. Check your email to verify your address before signing in.");
        }
      } else {
        await guardedSignIn(email, password);
        toast.success("Welcome back!");
        await routeAfterLogin();
      }
    } catch (error: unknown) {
      if (isSignUp) await supabase.auth.signOut();
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtp = async () => {
    if (!phone || phone.length < 10) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      await guardedSendOtp(fullPhone);
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      await guardedVerifyOtp(fullPhone, otp);
      toast.success("Phone verified! Welcome!");
      await routeAfterLogin();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + (nextPath ?? ""),
      });
      if (result.error) {
        toast.error("Sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome!");
      await routeAfterLogin();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md bg-card rounded-lg border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
              <span>T</span><span className="text-gradient-gold">art</span>
            </h1>
            <p className="text-muted-foreground text-sm">{isSignUp ? "Create your account" : "Sign in to your account"}</p>
          </div>

          {/* Divider */}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-xs">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Auth mode tabs */}
          <div className="flex gap-1 bg-secondary rounded-md p-1 mb-4">
            <button onClick={() => { setAuthMode("email"); setOtpSent(false); }} className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${authMode === "email" ? "bg-card text-foreground" : "text-muted-foreground"}`}>Email</button>
            <button onClick={() => { setAuthMode("phone"); setOtpSent(false); }} className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${authMode === "phone" ? "bg-card text-foreground" : "text-muted-foreground"}`}>Phone</button>
          </div>

          {authMode === "email" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
                  <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageOk}
                      onChange={e => setAgeOk(e.target.checked)}
                      className="mt-0.5 accent-[hsl(var(--gold))]"
                      aria-label="Confirm you are 18 years or older"
                    />
                    <span>I confirm I am 18 years of age or older. Tattooing and piercing are 18+ services.</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 accent-[hsl(var(--gold))]"
                      aria-label="Consent to personal data processing"
                    />
                    <span>
                      I consent to the collection and processing of my personal data as outlined in the{" "}
                      <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
                    </span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    By creating an account you also agree to our{" "}
                    <Link to="/terms" className="text-gold hover:underline">Terms of Service</Link> and{" "}
                    <Link to="/grievance" className="text-gold hover:underline">Grievance Redressal Policy</Link>,
                    including zero tolerance for objectionable content and abusive users.
                  </p>
                </div>
              )}
              <Button type="submit" variant="gold" className="w-full" disabled={loading || (isSignUp && (!consent || !ageOk))}>
                {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>

              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-sm text-muted-foreground hover:text-gold transition-colors">
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number</label>
                <p className="text-xs text-muted-foreground mb-2">Phone sign-in is for existing accounts. Create new accounts with email so age and privacy consent can be recorded.</p>
                <div className="flex gap-2">
                  <span className="flex items-center h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm">+91</span>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="9876543210" maxLength={10} className="flex-1 h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
                </div>
              </div>
              {!otpSent ? (
                <Button variant="gold" className="w-full" onClick={handlePhoneOtp} disabled={loading}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Enter OTP</label>
                    <input type="text" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" maxLength={6} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground tracking-[0.3em] text-center" />
                  </div>
                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                  <button type="button" onClick={handlePhoneOtp} className="w-full text-sm text-muted-foreground hover:text-gold transition-colors">Resend OTP</button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border text-center space-y-2">
            <Link to="/artist-login" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Artist Login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
