import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email } },
        });
        if (error) throw error;
        toast.success("Account created! You're now signed in.");
        navigate("/studios");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/studios");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
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
          </form>

          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-sm text-muted-foreground hover:text-gold mt-4 transition-colors">
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>

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
