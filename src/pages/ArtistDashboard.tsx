import { useState } from "react";
import { CalendarDays, ImagePlus, DollarSign, Clock, Check, X, LogOut, Film, Upload } from "lucide-react";
import { bookings, artists } from "@/data/mockData";
import { reels } from "@/data/mockReels";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const artist = artists[0]; // Mock logged-in artist

const tabs = [
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "portfolio", label: "Portfolio", icon: ImagePlus },
  { id: "reels", label: "Reels", icon: Film },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "earnings", label: "Earnings", icon: DollarSign },
] as const;

type Tab = typeof tabs[number]["id"];

const ArtistDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const artistBookings = bookings.filter(b => b.artistId === artist.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 hidden md:flex flex-col">
        <div className="mb-8">
          <h1 className="font-heading text-lg font-bold">
            Art<span className="text-gradient-gold">Space</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1">Artist Dashboard</p>
        </div>

        <div className="flex items-center gap-3 mb-8 p-3 rounded-lg bg-secondary/50">
          <img src={artist.avatar} alt={artist.name} className="w-10 h-10 rounded-full object-cover border border-gold/30" />
          <div>
            <p className="text-foreground text-sm font-medium">{artist.name}</p>
            <p className="text-gold text-xs">{artist.specialty}</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-4">
          <LogOut className="w-4 h-4" /> Logout
        </Link>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span></h1>
          <Link to="/" className="text-muted-foreground text-sm">Logout</Link>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs whitespace-nowrap ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="md:ml-64 p-6 md:p-8">
        {activeTab === "bookings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Bookings</h2>
            <div className="space-y-4">
              {artistBookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
              {artistBookings.map(booking => (
                <div key={booking.id} className="bg-card rounded-lg border border-border p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-foreground font-medium">{booking.customerName}</h3>
                      <p className="text-muted-foreground text-sm">{booking.date} · {booking.time}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                      booking.status === "pending" ? "bg-gold/10 text-gold" :
                      booking.status === "completed" ? "bg-primary/10 text-primary" :
                      "bg-destructive/10 text-destructive"
                    }`}>{booking.status}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{booking.style} · {booking.placement} · {booking.size}</p>
                  <p className="text-muted-foreground text-sm mb-4">{booking.description}</p>
                  {booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="gold" onClick={() => toast.success("Booking accepted!")} className="gap-1"><Check className="w-3.5 h-3.5" /> Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.info("Booking rejected")} className="gap-1"><X className="w-3.5 h-3.5" /> Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Portfolio</h2>
              <Button variant="gold" size="sm" className="gap-1"><ImagePlus className="w-4 h-4" /> Upload</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {artist.portfolio.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={img} alt={`Work ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-gold/30 transition-colors cursor-pointer">
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "availability" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Availability</h2>
            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
              {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-foreground text-sm font-medium">{day}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">{day === "Sunday" ? "Closed" : "10:00 AM – 7:00 PM"}</span>
                    <div className={`w-8 h-5 rounded-full flex items-center ${day === "Sunday" ? "bg-secondary justify-start" : "bg-gold/30 justify-end"} px-0.5 cursor-pointer`}>
                      <div className={`w-4 h-4 rounded-full ${day === "Sunday" ? "bg-muted-foreground" : "bg-gold"}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "earnings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Earnings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "This Month", value: "₹25,500" },
                { label: "Total Bookings", value: "12" },
                { label: "Completed", value: "8" },
              ].map(stat => (
                <div key={stat.label} className="bg-card rounded-lg border border-border p-5">
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                  <p className="text-gradient-gold font-heading text-2xl font-bold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-foreground font-medium mb-4">Recent Transactions</h3>
              {artistBookings.filter(b => b.status === "completed" || b.status === "confirmed").map(b => (
                <div key={b.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-foreground text-sm">{b.customerName}</p>
                    <p className="text-muted-foreground text-xs">{b.date} · {b.style}</p>
                  </div>
                  <span className="text-gold font-medium">₹{b.totalEstimate.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArtistDashboard;
