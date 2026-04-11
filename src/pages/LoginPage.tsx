import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName || email } },
        });
        if (error) throw error;
        toast.success("Account created! You're now signed in.");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtp = async () => {
    if (!phone || phone.length < 10) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
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
      const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success("Phone verified! Welcome!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed");
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
              <span>Art</span><span className="text-gradient-gold">Space</span>
            </h1>
            <p className="text-muted-foreground text-sm">{isSignUp ? "Create your account" : "Sign in to your account"}</p>
          </div>

          {/* Google Sign In */}
          <Button variant="outline" className="w-full gap-2 mb-4 border-border text-foreground" onClick={handleGoogleSignIn} disabled={loading}>
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>

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
              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
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
            <Link to="/admin" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Admin Login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
