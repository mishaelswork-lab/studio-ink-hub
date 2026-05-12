import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

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

export default AddArtistDialog;
