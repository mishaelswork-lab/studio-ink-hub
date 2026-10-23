import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { guardedSendOtp, guardedVerifyOtp } from "@/lib/authGuard";

const ArtistLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const navigate = useNavigate();

  // Ensure the signed-in account is actually an artist; sign everyone else out.
  const requireArtist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "artist")
        .maybeSingle();
      if (!role) {
        await supabase.auth.signOut();
        toast.error("This account is not registered as an artist.");
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Handles the return trip from Google/Apple OAuth and already-signed-in visits.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const ok = await requireArtist();
      if (!cancelled && ok) {
        toast.success("Welcome back, artist!");
        navigate("/artist-dashboard", { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/artist-login",
      });
      if (result.error) {
        toast.error("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }
      if (result.redirected) return; // browser takes over
      const ok = await requireArtist();
      if (ok) {
        toast.success("Welcome back, artist!");
        navigate("/artist-dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const ok = await requireArtist();
      if (!ok) {
        navigate("/artist-login");
        return;
      }
      toast.success("Welcome back, artist!");
      navigate("/artist-dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      await guardedSendOtp(fullPhone);
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
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
      const ok = await requireArtist();
      if (!ok) {
        navigate("/artist-login");
        return;
      }
      toast.success("Phone verified! Welcome back, artist!");
      navigate("/artist-dashboard");
    } catch (error: any) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border p-8">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
            Artist <span className="text-gradient-gold">Portal</span>
          </h1>
          <p className="text-muted-foreground text-sm">Sign in to manage your bookings</p>
        </div>

        {/* Artist-only social sign-in (Google / Apple) */}
        <Button variant="outline" className="w-full gap-2 mb-2 border-border text-foreground" onClick={() => handleOAuth("google")} disabled={loading}>
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full gap-2 mb-3 border-border text-foreground" onClick={() => handleOAuth("apple")} disabled={loading}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.36 12.72c.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.05 1.52-.71 2.85-.71 1.33 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.32-3.54zM14.2 5.4c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.59-1.23z"/></svg>
          Continue with Apple
        </Button>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Use the same email as your artist account — Google or Apple sign-in links to it automatically.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Auth mode tabs */}
        <div className="flex gap-2 mb-4">
          <Button variant={authMode === "email" ? "gold" : "outline"} size="sm" className="flex-1" onClick={() => setAuthMode("email")} disabled={loading}>
            Email
          </Button>
          <Button variant={authMode === "phone" ? "gold" : "outline"} size="sm" className="flex-1" onClick={() => setAuthMode("phone")} disabled={loading}>
            Phone
          </Button>
        </div>

        {authMode === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="artist123@tart.com" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
            </div>
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Phone number</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" disabled={otpSent} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground disabled:opacity-60" />
            </div>
            {otpSent ? (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Verification code</label>
                  <input type="text" required inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
                </div>
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={handleSendOtp} disabled={loading}>
                  Resend OTP
                </Button>
              </>
            ) : (
              <Button type="button" variant="gold" className="w-full" onClick={handleSendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            )}
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-border text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-gold transition-colors">← Customer Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ArtistLogin;
