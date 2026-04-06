import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, CalendarDays, BarChart3, Settings, LogOut, Plus, Star, TrendingUp, IndianRupee } from "lucide-react";
import { bookings, artists, studios } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const adminTabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "artists", label: "Artists", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type AdminTab = typeof adminTabs[number]["id"];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const totalRevenue = bookings.filter(b => b.status === "completed" || b.status === "confirmed").reduce((sum, b) => sum + b.totalEstimate, 0);
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 hidden md:flex flex-col">
        <div className="mb-8">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span></h1>
          <p className="text-gold text-xs mt-1">Admin Panel</p>
        </div>
        <nav className="space-y-1 flex-1">
          {adminTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-4"><LogOut className="w-4 h-4" /> Logout</Link>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span> <span className="text-gold text-xs">Admin</span></h1>
          <Link to="/" className="text-muted-foreground text-sm">Logout</Link>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {adminTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs whitespace-nowrap ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="md:ml-64 p-6 md:p-8">
        {activeTab === "overview" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-gold" },
                { label: "Total Bookings", value: bookings.length.toString(), icon: CalendarDays, color: "text-foreground" },
                { label: "Active Artists", value: artists.filter(a => a.available).length.toString(), icon: Users, color: "text-emerald-400" },
                { label: "Pending", value: pendingCount.toString(), icon: TrendingUp, color: "text-gold" },
              ].map(stat => (
                <div key={stat.label} className="bg-card rounded-lg border border-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <p className={`font-heading text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-foreground font-medium mb-4">Recent Bookings</h3>
                {bookings.slice(0, 4).map(b => (
                  <div key={b.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-foreground text-sm">{b.customerName}</p>
                      <p className="text-muted-foreground text-xs">{b.artistName} · {b.date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                      b.status === "pending" ? "bg-gold/10 text-gold" :
                      b.status === "completed" ? "bg-primary/10 text-primary" :
                      "bg-destructive/10 text-destructive"
                    }`}>{b.status}</span>
                  </div>
                ))}
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-foreground font-medium mb-4">Top Artists</h3>
                {artists.sort((a, b) => b.rating - a.rating).slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <img src={a.avatar} alt={a.name} className="w-8 h-8 rounded-full object-cover border border-gold/20" />
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">{a.name}</p>
                      <p className="text-muted-foreground text-xs">{a.specialty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                      <span className="text-foreground text-sm">{a.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "artists" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Manage Artists</h2>
              <Button variant="gold" size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Artist</Button>
            </div>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Artist</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Studio</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Specialty</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Rating</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artists.map(a => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={a.avatar} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-foreground text-sm font-medium">{a.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">{a.studioName}</td>
                        <td className="p-4 text-gold text-sm">{a.specialty}</td>
                        <td className="p-4"><div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" /><span className="text-foreground text-sm">{a.rating}</span></div></td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${a.available ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>{a.available ? "Active" : "Inactive"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">All Bookings</h2>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Customer</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Artist</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Date</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Style</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Amount</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                        <td className="p-4 text-foreground text-sm">{b.customerName}</td>
                        <td className="p-4 text-muted-foreground text-sm">{b.artistName}</td>
                        <td className="p-4 text-muted-foreground text-sm">{b.date}</td>
                        <td className="p-4 text-gold text-sm">{b.style}</td>
                        <td className="p-4 text-foreground text-sm">₹{b.totalEstimate.toLocaleString()}</td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${
                          b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                          b.status === "pending" ? "bg-gold/10 text-gold" :
                          b.status === "completed" ? "bg-primary/10 text-primary" :
                          "bg-destructive/10 text-destructive"
                        }`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Settings</h2>
            <div className="bg-card rounded-lg border border-border p-6 max-w-lg">
              <h3 className="text-foreground font-medium mb-4">Platform Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Cover Charge (₹)</label>
                  <input type="number" defaultValue={500} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Platform Commission (%)</label>
                  <input type="number" defaultValue={15} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <Button variant="gold" onClick={() => toast.success("Settings saved!")}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
