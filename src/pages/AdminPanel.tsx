import { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Users, CalendarDays, BarChart3, Settings, LogOut, Star, TrendingUp, IndianRupee, Film, Trash2, Shield, Check, X, ScrollText, Sparkles, Activity, Zap, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
const AddArtistDialog = lazy(() => import("@/components/admin/AddArtistDialog"));
const PerfMetricsPanel = lazy(() => import("@/components/admin/PerfMetricsPanel"));
const UsageHotspotsPanel = lazy(() => import("@/components/admin/UsageHotspotsPanel"));
const PlatformSettingsPanel = lazy(() => import("@/components/admin/PlatformSettingsPanel"));

const adminTabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "artists", label: "Artists", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "reels", label: "Reels", icon: Film },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "reports", label: "Design Reports", icon: Flag },
  { id: "ugc", label: "Content Reports", icon: Shield },
  { id: "featured", label: "Featured", icon: Sparkles },
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "metrics", label: "Metrics", icon: Activity },
  { id: "usage", label: "Usage", icon: Zap },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type AdminTab = typeof adminTabs[number]["id"];


// AddArtistDialog moved to its own lazy chunk for smaller initial admin bundle.

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const { signOut, user, roles } = useAuth();
  const [dbArtists, setDbArtists] = useState<any[]>([]);
  const [dbBookings, setDbBookings] = useState<any[]>([]);
  const [dbReels, setDbReels] = useState<any[]>([]);
  const [dbPayments, setDbPayments] = useState<any[]>([]);
  const [flaggedReels, setFlaggedReels] = useState<any[]>([]);
  const [designReports, setDesignReports] = useState<any[]>([]);
  const [contentReports, setContentReports] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [changeLog, setChangeLog] = useState<any[]>([]);
  const [featuredRequests, setFeaturedRequests] = useState<any[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<any[]>([]);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [rejectDialog, setRejectDialog] = useState<{ id: string; caption: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { session } = useAuth();
  const isAdmin = roles.includes("admin");
  const [serverAdmin, setServerAdmin] = useState<boolean | null>(null);

  // Server-verified admin gate before any data fetch
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const ok = !error && (data as any)?.isAdmin === true;
      setServerAdmin(ok);
      if (!ok) toast.error("Admin access denied");
    })();
  }, [session]);

  const fetchData = async () => {
    if (!serverAdmin) return;
    const [artistsRes, bookingsRes, reelsRes, paymentsRes, flaggedRes, auditRes, fReqRes, fArtRes, reportsRes, changeRes, ugcRes] = await Promise.all([
      supabase.from("artists").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("reels").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("status", "completed"),
      supabase.from("reels").select("*, artists(name)").eq("moderation_status", "flagged").order("created_at", { ascending: false }),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("featured_requests").select("*, artists(name, avatar_url, specialty)").order("created_at", { ascending: false }),
      supabase.from("featured_artists").select("*, artists(name, avatar_url, specialty)").order("priority", { ascending: false }),
      supabase.from("design_reports").select("*, daily_designs(image_url, thumb_url, source_url, description)").order("created_at", { ascending: false }).limit(200),
      supabase.from("change_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("content_reports").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setDbArtists(artistsRes.data || []);
    setDbBookings(bookingsRes.data || []);
    setDbReels(reelsRes.data || []);
    setDbPayments(paymentsRes.data || []);
    setFlaggedReels(flaggedRes.data || []);
    setAuditLog(auditRes.data || []);
    setFeaturedRequests(fReqRes.data || []);
    setFeaturedArtists(fArtRes.data || []);
    setDesignReports(reportsRes.data || []);
    setChangeLog(changeRes.data || []);
    setContentReports(ugcRes.data || []);
  };

  useEffect(() => { if (serverAdmin) fetchData(); }, [serverAdmin]);

  if (serverAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="font-heading text-xl font-bold text-foreground mb-1">403 — Forbidden</h1>
          <p className="text-muted-foreground text-sm">Admin access required.</p>
        </div>
      </div>
    );
  }

  const totalRevenue = dbPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = dbBookings.filter(b => b.status === "pending").length;

  const writeAudit = async (action: string, target_type: string, target_id: string, reason?: string, metadata?: any) => {
    if (!user) return;
    await supabase.from("admin_audit_log").insert({
      admin_id: user.id, action, target_type, target_id, reason: reason || null, metadata: metadata || {},
    });
  };

  const handleDeleteReel = async (id: string) => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    const { error } = await supabase.from("reels").delete().eq("id", id);
    if (error) { toast.error("Failed to delete reel"); return; }
    await writeAudit("reel_deleted", "reel", id);
    toast.success("Reel removed");
    setDbReels(prev => prev.filter(r => r.id !== id));
    fetchData();
  };

  const handleApproveReel = async (id: string) => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    const { error } = await supabase.from("reels").update({ moderation_status: "approved" }).eq("id", id);
    if (error) { toast.error("Failed to approve"); return; }
    await writeAudit("reel_approved", "reel", id);
    toast.success("Reel approved");
    setFlaggedReels(prev => prev.filter(r => r.id !== id));
    fetchData();
  };

  const handleRejectReel = async () => {
    if (!isAdmin || !rejectDialog) return;
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    const { id } = rejectDialog;
    const { error } = await supabase.from("reels").delete().eq("id", id);
    if (error) { toast.error("Failed to reject"); return; }
    await writeAudit("reel_rejected", "reel", id, rejectReason.trim());
    toast.success("Reel rejected & removed");
    setFlaggedReels(prev => prev.filter(r => r.id !== id));
    setRejectDialog(null);
    setRejectReason("");
    fetchData();
  };

  const handlePromoteToFeatured = async (artistId: string, requestId?: string) => {
    if (!isAdmin) { toast.error("Admin only"); return; }
    const { error } = await supabase.from("featured_artists").insert({ artist_id: artistId, active: true, priority: 10 });
    if (error) { toast.error("Failed to feature artist"); return; }
    if (requestId) {
      await supabase.from("featured_requests").update({ status: "approved", admin_notes: adminNote[requestId] || null }).eq("id", requestId);
    }
    await writeAudit("artist_featured", "artist", artistId, adminNote[requestId || ""] || undefined);
    toast.success("Artist featured!");
    fetchData();
  };

  const handleRejectFeatured = async (requestId: string) => {
    if (!isAdmin) return;
    await supabase.from("featured_requests").update({ status: "rejected", admin_notes: adminNote[requestId] || null }).eq("id", requestId);
    await writeAudit("featured_request_rejected", "featured_request", requestId, adminNote[requestId] || undefined);
    toast.success("Request rejected");
    fetchData();
  };

  const handleToggleFeatured = async (id: string, active: boolean) => {
    if (!isAdmin) return;
    await supabase.from("featured_artists").update({ active: !active }).eq("id", id);
    await writeAudit(active ? "featured_disabled" : "featured_enabled", "featured_artist", id);
    fetchData();
  };

  const handleRemoveFeatured = async (id: string, artistId: string) => {
    if (!isAdmin) return;
    await supabase.from("featured_artists").delete().eq("id", id);
    await writeAudit("featured_removed", "artist", artistId);
    toast.success("Removed from featured");
    fetchData();
  };

  const handleReportAction = async (reportId: string, designId: string, action: "dismiss" | "remove") => {
    if (!isAdmin) return;
    if (action === "remove") {
      const { error } = await supabase.from("daily_designs").delete().eq("id", designId);
      if (error) { toast.error("Failed to remove design"); return; }
      await writeAudit("design_removed", "design", designId, adminNote[reportId] || undefined);
      toast.success("Design removed");
    } else {
      await writeAudit("design_report_dismissed", "design", designId, adminNote[reportId] || undefined);
      toast.success("Report dismissed");
    }
    await supabase.from("design_reports").update({
      status: action === "remove" ? "resolved" : "dismissed",
      admin_notes: adminNote[reportId] || null,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", reportId);
    fetchData();
  };

  const handleContentReport = async (r: any, action: "remove" | "dismiss") => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    if (action === "remove") {
      if (r.content_type === "reel") {
        await supabase.from("reels").update({ moderation_status: "rejected" }).eq("id", r.content_id);
      }
      await writeAudit("content_report_actioned", r.content_type, r.content_id, adminNote[r.id] || undefined);
      toast.success("Content actioned");
    } else {
      await writeAudit("content_report_dismissed", r.content_type, r.content_id, adminNote[r.id] || undefined);
      toast.success("Report dismissed");
    }
    await supabase.from("content_reports").update({
      status: action === "remove" ? "resolved" : "dismissed",
      admin_notes: adminNote[r.id] || null,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    fetchData();
  };

  const handleLogout = async () => { await signOut(); };


  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 hidden md:flex flex-col">
        <div className="mb-8">
          <h1 className="font-heading text-lg font-bold">T<span className="text-gradient-gold">art</span></h1>
          <p className="text-gold text-xs mt-1">Admin Panel</p>
        </div>
        <nav className="space-y-1 flex-1">
          {adminTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${activeTab === tab.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              {tab.id === "moderation" && flaggedReels.length > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">{flaggedReels.length}</span>
              )}
              {tab.id === "reports" && designReports.filter((r: any) => r.status === "pending").length > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">{designReports.filter((r: any) => r.status === "pending").length}</span>
              )}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-4"><LogOut className="w-4 h-4" /> Logout</button>
      </aside>

      <div className="md:hidden bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-lg font-bold">T<span className="text-gradient-gold">art</span> <span className="text-gold text-xs">Admin</span></h1>
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
            {flaggedReels.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6 cursor-pointer" onClick={() => setActiveTab("moderation")}>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  <p className="text-foreground text-sm font-medium">{flaggedReels.length} reel{flaggedReels.length > 1 ? "s" : ""} awaiting moderation</p>
                </div>
              </div>
            )}
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
                    <span className={`text-xs px-2 py-1 rounded-full ${b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : b.status === "pending" ? "bg-gold/10 text-gold" : b.status === "completed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{b.status}</span>
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
              <Suspense fallback={<Button variant="gold" size="sm" disabled>Loading…</Button>}>
                <AddArtistDialog onAdded={fetchData} />
              </Suspense>
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
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : b.status === "pending" ? "bg-gold/10 text-gold" : b.status === "completed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{b.status}</span></td>
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

        {activeTab === "moderation" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Moderation Queue</h2>
            <p className="text-muted-foreground text-sm mb-6">Reels flagged by AI moderation for manual review</p>
            {flaggedReels.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-foreground font-medium">All clear!</p>
                <p className="text-muted-foreground text-sm mt-1">No reels pending moderation</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flaggedReels.map(reel => (
                  <div key={reel.id} className="bg-card rounded-lg border border-destructive/30 overflow-hidden">
                    <div className="relative aspect-video">
                      <video src={reel.video_url} poster={reel.thumbnail_url} className="w-full h-full object-cover" muted controls />
                    </div>
                    <div className="p-4">
                      <p className="text-foreground text-sm font-medium mb-1">{reel.caption || "No caption"}</p>
                      <p className="text-muted-foreground text-xs mb-1">By: {(reel as any).artists?.name || "Unknown"}</p>
                      <p className="text-muted-foreground text-xs mb-3">Source: {reel.source} · {new Date(reel.created_at).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="gold" className="flex-1 gap-1" onClick={() => handleApproveReel(reel.id)}>
                          <Check className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => { setRejectDialog({ id: reel.id, caption: reel.caption || "Untitled" }); setRejectReason(""); }}>
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Design Reports</h2>
            <p className="text-muted-foreground text-sm mb-6">User-flagged discovery designs awaiting review</p>
            {designReports.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <Flag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No design reports yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {designReports.map((r: any) => (
                  <div key={r.id} className="bg-card rounded-lg border border-border overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-48 aspect-square bg-secondary flex-shrink-0">
                      {r.daily_designs?.image_url ? (
                        <img src={r.daily_designs.thumb_url || r.daily_designs.image_url} alt="reported" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Design removed</div>
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div>
                          <p className="text-foreground font-medium text-sm">{r.reason}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">Reported {new Date(r.created_at).toLocaleString()} · reporter <span className="font-mono">{String(r.reporter_id).slice(0, 8)}</span></p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${r.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : r.status === "dismissed" ? "bg-muted text-muted-foreground" : "bg-gold/10 text-gold"}`}>{r.status}</span>
                      </div>
                      {r.daily_designs?.source_url && (
                        <a href={r.daily_designs.source_url} target="_blank" rel="noreferrer" className="text-gold text-xs hover:underline">View source ↗</a>
                      )}
                      {r.status === "pending" && (
                        <div className="mt-3 space-y-2">
                          <Textarea value={adminNote[r.id] || ""} onChange={(e) => setAdminNote(p => ({ ...p, [r.id]: e.target.value }))} placeholder="Internal note (optional)" className="bg-secondary border-border min-h-[50px] text-sm" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => handleReportAction(r.id, r.design_id, "remove")}>
                              <Trash2 className="w-3.5 h-3.5" /> Remove design
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleReportAction(r.id, r.design_id, "dismiss")}>
                              <X className="w-3.5 h-3.5" /> Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                      {r.admin_notes && <p className="text-muted-foreground text-xs mt-2 italic">Note: {r.admin_notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === "audit" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Admin Audit Log</h2>
            <p className="text-muted-foreground text-sm mb-6">Recent admin actions across the platform</p>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {auditLog.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">No admin actions recorded yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="p-4 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${entry.action.includes("approved") ? "bg-emerald-400" : entry.action.includes("rejected") || entry.action.includes("deleted") ? "bg-destructive" : "bg-gold"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium">{entry.action.replace(/_/g, " ")}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {entry.target_type} · <span className="font-mono">{String(entry.target_id).slice(0, 8)}</span> · admin <span className="font-mono">{String(entry.admin_id).slice(0, 8)}</span>
                        </p>
                        {entry.reason && <p className="text-muted-foreground text-xs mt-1 italic">Reason: {entry.reason}</p>}
                      </div>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h2 className="font-heading text-2xl font-bold text-foreground mt-10 mb-2">Artist & Booking Change Log</h2>
            <p className="text-muted-foreground text-sm mb-6">Every create, edit and delete on artists and bookings — recorded automatically.</p>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {changeLog.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">No record changes captured yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {changeLog.map(entry => (
                    <div key={entry.id} className="p-4 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${entry.operation === "INSERT" ? "bg-emerald-400" : entry.operation === "DELETE" ? "bg-destructive" : "bg-gold"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium">{entry.operation} on {entry.table_name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          record <span className="font-mono">{String(entry.record_id).slice(0, 8)}</span> · by{" "}
                          <span className="font-mono">{entry.changed_by ? String(entry.changed_by).slice(0, 8) : "system"}</span>
                        </p>
                        {Array.isArray(entry.changed_fields) && entry.changed_fields.length > 0 && (
                          <p className="text-muted-foreground text-xs mt-1">Fields: {entry.changed_fields.join(", ")}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {activeTab === "featured" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Featured Artists</h2>
            <p className="text-muted-foreground text-sm mb-6">Boost requests from artists and currently featured slots.</p>

            <div className="bg-card rounded-lg border border-border p-5 mb-8">
              <h3 className="text-foreground font-medium mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-gold" /> Boost Requests</h3>
              {featuredRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">No requests yet.</p>
              ) : (
                <div className="space-y-4">
                  {featuredRequests.map((r: any) => (
                    <div key={r.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <img src={r.artists?.avatar_url || "https://via.placeholder.com/40"} alt={r.artists?.name} className="w-10 h-10 rounded-full object-cover border border-gold/20" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium">{r.artists?.name || "Artist"}</p>
                          <p className="text-muted-foreground text-xs">{r.artists?.specialty} · {new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${r.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-gold/10 text-gold"}`}>{r.status}</span>
                      </div>
                      {r.message && <p className="text-foreground text-sm mb-2">{r.message}</p>}
                      <p className="text-muted-foreground text-xs mb-3">
                        {r.contact_email && <>📧 {r.contact_email}  </>}
                        {r.contact_phone && <>📞 {r.contact_phone}</>}
                      </p>
                      {r.status === "pending" && (
                        <div className="space-y-2">
                          <Textarea value={adminNote[r.id] || ""} onChange={(e) => setAdminNote(p => ({ ...p, [r.id]: e.target.value }))} placeholder="Internal note / deal details (optional)" className="bg-secondary border-border min-h-[60px]" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="gold" className="gap-1" onClick={() => handlePromoteToFeatured(r.artist_id, r.id)}>
                              <Check className="w-3.5 h-3.5" /> Approve & Feature
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => handleRejectFeatured(r.id)}>
                              <X className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}
                      {r.admin_notes && <p className="text-muted-foreground text-xs mt-2 italic">Note: {r.admin_notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-lg border border-border p-5 mb-8">
              <h3 className="text-foreground font-medium mb-4">Currently Featured</h3>
              {featuredArtists.length === 0 ? (
                <p className="text-muted-foreground text-sm">No artists featured.</p>
              ) : (
                <div className="space-y-2">
                  {featuredArtists.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <img src={f.artists?.avatar_url || "https://via.placeholder.com/40"} alt={f.artists?.name} className="w-9 h-9 rounded-full object-cover border border-gold/30" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{f.artists?.name}</p>
                        <p className="text-muted-foreground text-xs">Priority {f.priority} · {f.active ? "Active" : "Paused"}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleFeatured(f.id, f.active)}>{f.active ? "Pause" : "Resume"}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveFeatured(f.id, f.artist_id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-lg border border-border p-5">
              <h3 className="text-foreground font-medium mb-3">Manually Feature an Artist</h3>
              <p className="text-muted-foreground text-xs mb-3">Pick from artists below to feature directly.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {dbArtists.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded border border-border">
                    <img src={a.avatar_url || "https://via.placeholder.com/32"} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm truncate">{a.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{a.specialty}</p>
                    </div>
                    <Button size="sm" variant="gold" onClick={() => handlePromoteToFeatured(a.id)}>Feature</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "metrics" && (
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading metrics…</p>}>
            <PerfMetricsPanel />
          </Suspense>
        )}

        {activeTab === "usage" && (
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading usage…</p>}>
            <UsageHotspotsPanel />
          </Suspense>
        )}


        {activeTab === "settings" && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Settings</h2>
            <Suspense fallback={<p className="text-muted-foreground text-sm">Loading settings...</p>}>
              <PlatformSettingsPanel />
            </Suspense>
          </div>
        )}
      </main>

      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) { setRejectDialog(null); setRejectReason(""); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Reject Reel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-muted-foreground text-sm">Reason for rejecting <span className="text-foreground">"{rejectDialog?.caption}"</span>. Saved to the audit log.</p>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Non-tattoo content, inappropriate imagery, low quality..." className="bg-secondary border-border min-h-[100px]" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>Cancel</Button>
              <Button variant="gold" onClick={handleRejectReel} disabled={!rejectReason.trim()}>Confirm Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
