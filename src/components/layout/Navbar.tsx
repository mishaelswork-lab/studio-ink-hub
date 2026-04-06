import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/studios", label: "Studios" },
    { to: "/ai-consultant", label: "AI Consultant" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-heading text-xl font-bold">
          <span className="text-foreground">Art</span>
          <span className="text-gradient-gold">Space</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors ${location.pathname === link.to ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/artist-login">
            <Button variant="ghost" size="sm" className="text-muted-foreground">Artist Login</Button>
          </Link>
          <Link to="/login">
            <Button variant="gold" size="sm">Book Now</Button>
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/artist-login" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm">Artist Login</Button>
            </Link>
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button variant="gold" size="sm">Book Now</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
