import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ArtistLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      toast.success("Welcome back, artist!");
      navigate("/artist-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
            Artist <span className="text-gradient-gold">Portal</span>
          </h1>
          <p className="text-muted-foreground text-sm">Sign in to manage your bookings</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Username</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
          </div>
          <Button type="submit" variant="gold" className="w-full">Sign In</Button>
        </form>
      </div>
    </div>
  );
};

export default ArtistLogin;
