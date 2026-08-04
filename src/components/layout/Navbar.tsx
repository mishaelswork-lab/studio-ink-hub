import { Link, useLocation } from "react-router-dom";
import { Menu, X, Home, Compass, User, LayoutDashboard, LogIn, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoAsset from "@/assets/artspace-logo.webp.asset.json";
const logo = logoAsset.url;

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, roles } = useAuth();

  const isArtist = roles.includes("artist");
  const isAdmin = roles.includes("admin");

  const links = [
    { to: "/", label: "Home", icon: Home },
    { to: "/discover", label: "Discover", icon: Compass },
    { to: isArtist ? "/artist-chats" : "/chats", label: "Chats", icon: MessageSquare },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top navbar - desktop */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold tracking-wider">
            <img src={logo} alt="Tart" className="w-8 h-8 rounded-full object-cover ring-1 ring-gold/40" />
            <span className="text-foreground">ART</span>
            <span className="text-gradient-gold">SPACE</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className={`text-sm transition-colors ${isActive(link.to) ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isArtist && <Link to="/artist-dashboard"><Button variant="ghost" size="sm" className="text-muted-foreground">Dashboard</Button></Link>}
                {isAdmin && <Link to="/admin/dashboard"><Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button></Link>}
                <Link to="/dashboard"><Button variant="gold" size="sm">My Bookings</Button></Link>
                <Link to="/profile"><Button variant="ghost" size="icon" className="rounded-full"><User className="w-4 h-4" /></Button></Link>
              </>
            ) : (
              <>
                <Link to="/artist-login"><Button variant="ghost" size="sm" className="text-muted-foreground">Artist Login</Button></Link>
                <Link to="/login"><Button variant="gold" size="sm">Book Now</Button></Link>
              </>
            )}
          </div>

          {/* Mobile hamburger - only for extra menu items */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown for extra actions */}
        {open && (
          <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
            {user ? (
              <>
                {isArtist && <Link to="/artist-dashboard" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">Artist Dashboard</Link>}
                {isAdmin && <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">Admin Panel</Link>}
                <Link to="/profile" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">Edit Profile</Link>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/artist-login" onClick={() => setOpen(false)}><Button variant="ghost" size="sm">Artist Login</Button></Link>
                <Link to="/login" onClick={() => setOpen(false)}><Button variant="gold" size="sm">Book Now</Button></Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={`flex flex-col items-center gap-1 px-3 py-2 ${isActive(link.to) ? "text-gold" : "text-muted-foreground"}`}>
              <link.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          ))}
          {user ? (
            <Link to="/dashboard" className={`flex flex-col items-center gap-1 px-3 py-2 ${isActive("/dashboard") ? "text-gold" : "text-muted-foreground"}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium">Bookings</span>
            </Link>
          ) : (
            <Link to="/login" className={`flex flex-col items-center gap-1 px-3 py-2 ${isActive("/login") ? "text-gold" : "text-muted-foreground"}`}>
              <LogIn className="w-5 h-5" />
              <span className="text-[10px] font-medium">Login</span>
            </Link>
          )}
          <Link to={user ? "/profile" : "/login"} className={`flex flex-col items-center gap-1 px-3 py-2 ${isActive("/profile") ? "text-gold" : "text-muted-foreground"}`}>
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </>
  );
};
