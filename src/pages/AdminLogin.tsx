import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { guardedSignIn } from "@/lib/authGuard";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await guardedSignIn(email, password);

      // Navigate immediately for snappy UX; verify role in parallel.
      const rolePromise = supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
      const { data: role } = await rolePromise;
      if (!role) {
        await supabase.auth.signOut();
        toast.error("This account does not have admin access.");
        navigate("/admin");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
            Admin <span className="text-gradient-gold">Panel</span>
          </h1>
          <p className="text-muted-foreground text-sm">Restricted access</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@artspace.com" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 pt-6 border-t border-border text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-gold transition-colors">← Customer Login</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
