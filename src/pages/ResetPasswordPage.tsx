import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Open the password reset link from your email again.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border p-8">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Reset your password</h1>
        <p className="text-sm text-muted-foreground mb-6">Choose a new password for your ArtSpace account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="text-sm text-muted-foreground mb-1.5 block">New password</label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-sm text-muted-foreground mb-1.5 block">Confirm new password</label>
            <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-gold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
