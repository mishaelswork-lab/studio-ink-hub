import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const artistSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  studio_name: z.string().trim().max(80),
  specialty: z.string().trim().max(60),
  bio: z.string().trim().max(1500),
  hourly_rate: z.number().int().min(100, "Minimum rate is ₹100").max(50000, "Maximum rate is ₹50,000"),
  experience_years: z.number().int().min(0).max(70),
});

const emptyForm = { email: "", password: "", name: "", studio_name: "", specialty: "", bio: "", hourly_rate: "1500", experience_years: "0" };

const AddArtistDialog = ({ onAdded }: { onAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = artistSchema.safeParse({
      ...form,
      hourly_rate: Number(form.hourly_rate),
      experience_years: Number(form.experience_years),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-add-artist", {
        body: parsed.data,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`${parsed.data.name} can now sign in and complete their application`);
      setForm(emptyForm);
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
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-email">Email *</label>
              <Input id="aa-email" required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="artist@email.com" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-pass">Password *</label>
              <Input id="aa-pass" required type="password" minLength={8} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 chars" className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-name">Full Name *</label>
            <Input id="aa-name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Artist name" className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-studio">Studio</label>
              <Input id="aa-studio" value={form.studio_name} onChange={e => setForm(p => ({ ...p, studio_name: e.target.value }))} placeholder="Studio name" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-spec">Specialty</label>
              <Input id="aa-spec" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} placeholder="e.g. Japanese" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-rate">Hourly Rate (₹)</label>
              <Input id="aa-rate" type="number" min={100} max={50000} value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-exp">Experience (yrs)</label>
              <Input id="aa-exp" type="number" min={0} max={70} value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block" htmlFor="aa-bio">Bio</label>
            <Textarea id="aa-bio" maxLength={1500} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio..." className="bg-secondary border-border resize-none" rows={2} />
          </div>

          <p className="text-xs text-muted-foreground border border-border rounded-md p-3">
            The artist will sign in, upload at least two photos of their own work, and submit the profile for your approval. Nothing is published before approval.
          </p>

          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create artist account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddArtistDialog;
