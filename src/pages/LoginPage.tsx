import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";

const LoginPage = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) { toast.error("Enter a valid phone number"); return; }
    setOtpSent(true);
    toast.success("OTP sent to " + phone);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Login successful!");
    navigate("/studios");
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
            <p className="text-muted-foreground text-sm">Sign in with your phone number</p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number</label>
                <div className="flex gap-2">
                  <span className="h-10 px-3 flex items-center rounded-md bg-secondary border border-border text-muted-foreground text-sm">+91</span>
                  <input type="tel" required maxLength={10} placeholder="Enter phone number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} className="flex-1 h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
                </div>
              </div>
              <Button type="submit" variant="gold" className="w-full">Send OTP</Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Enter OTP</label>
                <input type="text" required maxLength={6} placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm text-center tracking-[0.5em] focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground placeholder:tracking-normal" />
              </div>
              <Button type="submit" variant="gold" className="w-full">Verify & Login</Button>
              <button type="button" onClick={() => setOtpSent(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Change Number</button>
            </form>
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
