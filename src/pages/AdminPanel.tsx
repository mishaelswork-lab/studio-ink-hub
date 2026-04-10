import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, CalendarDays, BarChart3, Settings, LogOut, Plus, Star, TrendingUp, IndianRupee, Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const adminTabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "artists", label: "Artists", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "reels", label: "Reels", icon: Film },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type AdminTab = typeof adminTabs[number]["id"];

const AddArtistDialog = ({ onAdded }: { onAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", studio_name: "", specialty: "", bio: "", hourly_rate: "1500", experience_years: "0" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-add-artist", {
        body: { ...form, hourly_rate: parseInt(form.hourly_rate), experience_years: parseInt(form.experience_years) },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Artist ${form.name} added successfully!`);
      setForm({ email: "", password: "", name: "", studio_name: "", specialty: "", bio: "", hourly_rate: "1500", experience_years: "0" });
      setOpen(false);
      onAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add artist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Artist</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading text-foreground">Add New Artist</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email *</label>
              <Input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="artist@email.com" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password *</label>
              <Input required type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 chars" className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Full Name *</label>
            <Input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Artist name" className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Studio</label>
              <Input value={form.studio_name} onChange={e => setForm(p => ({ ...p, studio_name: e.target.value }))} placeholder="Studio name" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Specialty</label>
              <Input value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} placeholder="e.g. Japanese" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Hourly Rate (₹)</label>
              <Input type="number" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Experience (yrs)</label>
              <Input type="number" value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Bio</label>
            <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio..." className="bg-secondary border-border resize-none" rows={2} />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Artist"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const { signOut } = useAuth();
  const [dbArtists, setDbArtists] = useState<any[]>([]);
  const [dbBookings, setDbBookings] = useState<any[]>([]);
  const [dbReels, setDbReels] = useState<any[]>([]);
  const [dbPayments, setDbPayments] = useState<any[]>([]);

  const fetchData = async () => {
    const [artistsRes, bookingsRes, reelsRes, paymentsRes] = await Promise.all([
      supabase.from("artists").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("reels").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("status", "completed"),
    ]);
    setDbArtists(artistsRes.data || []);
    setDbBookings(bookingsRes.data || []);
    setDbReels(reelsRes.data || []);
    setDbPayments(paymentsRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const totalRevenue = dbPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = dbBookings.filter(b => b.status === "pending").length;

  const handleDeleteReel = async (id: string) => {
    const { error } = await supabase.from("reels").delete().eq("id", id);
    if (error) { toast.error("Failed to delete reel"); return; }
    toast.success("Reel removed");
    setDbReels(prev => prev.filter(r => r.id !== id));
  };

  const handleLogout = async () => { await signOut(); };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 hidden md:flex flex-col">
        <div className="mb-8">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span></h1>
          <p className="text-gold text-xs mt-1">Admin Panel</p>
        </div>
        <nav className="space-y-1 flex-1">
          {adminTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-4"><LogOut className="w-4 h-4" /> Logout</button>
      </aside>

      <div className="md:hidden bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-lg font-bold">Art<span className="text-gradient-gold">Space</span> <span className="text-gold text-xs">Admin</span></h1>
          <button onClick={handleLogout} className="text-muted-foreground text-sm">Logout</button>
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
                { label: "Total Bookings", value: dbBookings.length.toString(), icon: CalendarDays, color: "text-foreground" },
                { label: "Active Artists", value: dbArtists.filter(a => a.available).length.toString(), icon: Users, color: "text-emerald-400" },
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
                {dbBookings.length === 0 && <p className="text-muted-foreground text-sm">No bookings yet.</p>}
                {dbBookings.slice(0, 4).map(b => (
                  <div key={b.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-foreground text-sm">{b.customer_name}</p>
                      <p className="text-muted-foreground text-xs">{b.date} · {b.time}</p>
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
                {dbArtists.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <img src={a.avatar_url || "https://via.placeholder.com/40"} alt={a.name} className="w-8 h-8 rounded-full object-cover border border-gold/20" />
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
              <AddArtistDialog onAdded={fetchData} />
            </div>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Artist</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Studio</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Specialty</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Rate</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Rating</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbArtists.map(a => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={a.avatar_url || "https://via.placeholder.com/40"} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-foreground text-sm font-medium">{a.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">{a.studio_name || "—"}</td>
                        <td className="p-4 text-gold text-sm">{a.specialty || "—"}</td>
                        <td className="p-4 text-foreground text-sm">₹{a.hourly_rate}/hr</td>
                        <td className="p-4"><div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" /><span className="text-foreground text-sm">{a.rating}</span></div></td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${a.available ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>{a.available ? "Active" : "Inactive"}</span></td>
                      </tr>
                    ))}
                    {dbArtists.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No artists yet. Add one above.</td></tr>
                    )}
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
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Date</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Style</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Cover Paid</th>
                      <th className="text-left text-muted-foreground text-xs uppercase tracking-wider p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbBookings.map(b => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 text-foreground text-sm">{b.customer_name}</td>
                        <td className="p-4 text-muted-foreground text-sm">{b.date} · {b.time}</td>
                        <td className="p-4 text-gold text-sm">{b.style}</td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${b.cover_charge_paid ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>{b.cover_charge_paid ? "Paid" : "Unpaid"}</span></td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${
                          b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                          b.status === "pending" ? "bg-gold/10 text-gold" :
                          b.status === "completed" ? "bg-primary/10 text-primary" :
                          "bg-destructive/10 text-destructive"
                        }`}>{b.status}</span></td>
                      </tr>
                    ))}
                    {dbBookings.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No bookings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reels" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Manage Reels</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {dbReels.map(reel => (
                <div key={reel.id} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-border group">
                  <video src={reel.video_url} poster={reel.thumbnail_url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-xs line-clamp-2">{reel.caption || "No caption"}</p>
                    <p className="text-white/50 text-xs mt-1">{reel.source}</p>
                  </div>
                  <button onClick={() => handleDeleteReel(reel.id)} className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
              {dbReels.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No reels uploaded yet.</p>}
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
