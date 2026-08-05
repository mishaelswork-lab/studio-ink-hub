import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePlatformSettings,
  savePlatformSettingGroup,
  DEFAULT_SETTINGS,
  type PlatformSettings,
} from "@/hooks/usePlatformSettings";

const NumberField = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) => (
  <div>
    <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold"
    />
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const TextField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
    <input
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground"
    />
  </div>
);

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    aria-pressed={value}
    className="w-full flex items-center justify-between px-3 py-2.5 rounded-md bg-secondary border border-border text-sm text-foreground"
  >
    <span>{label}</span>
    <span className={`w-10 h-5 rounded-full relative transition-colors ${value ? "bg-gold" : "bg-muted"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </span>
  </button>
);

const Card = ({ title, description, children, onSave, saving }: { title: string; description: string; children: React.ReactNode; onSave: () => void; saving: boolean }) => (
  <div className="bg-card rounded-lg border border-border p-6">
    <h3 className="text-foreground font-medium">{title}</h3>
    <p className="text-muted-foreground text-xs mb-4">{description}</p>
    <div className="space-y-3">{children}</div>
    <Button variant="gold" className="mt-5" onClick={onSave} disabled={saving}>
      {saving ? "Saving..." : "Save"}
    </Button>
  </div>
);

const PlatformSettingsPanel = () => {
  const { settings, isLoading } = usePlatformSettings();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setDraft(structuredClone(settings));
  }, [settings]);

  const patch = <K extends keyof PlatformSettings>(group: K, part: Partial<PlatformSettings[K]>) =>
    setDraft((d) => ({ ...d, [group]: { ...d[group], ...part } }));

  const save = async (group: keyof PlatformSettings) => {
    setSaving(group);
    try {
      await savePlatformSettingGroup(group, draft[group]);
      await qc.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save settings");
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading settings...</p>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title="Pricing" description="Charges applied across bookings, memberships and boosts." onSave={() => save("pricing")} saving={saving === "pricing"}>
        <NumberField label="Cover charge (₹)" value={draft.pricing.cover_charge} onChange={(v) => patch("pricing", { cover_charge: v })} />
        <NumberField label="Platform commission (%)" value={draft.pricing.commission_percent} onChange={(v) => patch("pricing", { commission_percent: v })} />
        <NumberField label="Membership price (₹)" value={draft.pricing.membership_price} onChange={(v) => patch("pricing", { membership_price: v })} />
        <NumberField label="Membership duration (months)" value={draft.pricing.membership_months} onChange={(v) => patch("pricing", { membership_months: v })} />
        <NumberField label="Featured boost price (₹)" value={draft.pricing.featured_boost_price} onChange={(v) => patch("pricing", { featured_boost_price: v })} />
        <NumberField label="Featured boost duration (days)" value={draft.pricing.featured_boost_days} onChange={(v) => patch("pricing", { featured_boost_days: v })} />
      </Card>

      <Card title="Limits" description="Guardrails for guests, AI generation and uploads." onSave={() => save("limits")} saving={saving === "limits"}>
        <NumberField label="Designs visible to signed-out users" value={draft.limits.guest_design_limit} onChange={(v) => patch("limits", { guest_design_limit: v })} />
        <NumberField label="AI designs generated per request" value={draft.limits.ai_design_count} onChange={(v) => patch("limits", { ai_design_count: v })} />
        <NumberField label="Max upload size (MB)" value={draft.limits.max_upload_mb} onChange={(v) => patch("limits", { max_upload_mb: v })} />
        <NumberField label="Booking window (days ahead)" value={draft.limits.booking_window_days} onChange={(v) => patch("limits", { booking_window_days: v })} />
      </Card>

      <Card title="Contact & compliance" description="Shown on support, legal and grievance pages." onSave={() => save("contact")} saving={saving === "contact"}>
        <TextField label="Support email" value={draft.contact.support_email} onChange={(v) => patch("contact", { support_email: v })} />
        <TextField label="Grievance officer" value={draft.contact.grievance_officer} onChange={(v) => patch("contact", { grievance_officer: v })} />
        <TextField label="WhatsApp number" value={draft.contact.whatsapp} onChange={(v) => patch("contact", { whatsapp: v })} placeholder="+91..." />
      </Card>

      <Card title="Feature flags" description="Turn parts of the app on or off without a release." onSave={() => save("features")} saving={saving === "features"}>
        <Toggle label="AI tattoo match" value={draft.features.ai_designs} onChange={(v) => patch("features", { ai_designs: v })} />
        <Toggle label="Reels / Discover videos" value={draft.features.reels} onChange={(v) => patch("features", { reels: v })} />
        <Toggle label="Piercing service" value={draft.features.piercing_service} onChange={(v) => patch("features", { piercing_service: v })} />
        <Toggle label="Featured artist boosts" value={draft.features.featured_boosts} onChange={(v) => patch("features", { featured_boosts: v })} />
        <Toggle label="Push notifications" value={draft.features.push_notifications} onChange={(v) => patch("features", { push_notifications: v })} />
        <Toggle label="Maintenance mode" value={draft.features.maintenance_mode} onChange={(v) => patch("features", { maintenance_mode: v })} />
      </Card>

      <Card title="Content" description="Headline copy and site-wide announcements." onSave={() => save("content")} saving={saving === "content"}>
        <TextField label="Hero tagline" value={draft.content.tagline} onChange={(v) => patch("content", { tagline: v })} />
        <TextField label="Announcement banner" value={draft.content.announcement} onChange={(v) => patch("content", { announcement: v })} placeholder="Leave empty to hide" />
      </Card>
    </div>
  );
};

export default PlatformSettingsPanel;
