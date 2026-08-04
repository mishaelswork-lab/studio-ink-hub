import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { LegalLayout } from "./LegalLayout";
import { SUPPORT_EMAIL, mailto } from "@/lib/contact";

const GRIEVANCE_OFFICER = {
  name: "Mishael Jose Anil Kadungamparambil",
  designation: "Grievance Officer & Nodal Contact, Tart",
  email: SUPPORT_EMAIL,
  address: "Bengaluru, Karnataka, India",
  hours: "Monday to Friday, 10:00 - 18:00 IST",
};

const complaintSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(255, "Email is too long"),
  phone: z
    .string()
    .trim()
    .max(15, "Phone number is too long")
    .refine(v => v === "" || /^[0-9+\-\s]{8,15}$/.test(v), "Enter a valid phone number"),
  category: z.string().min(1, "Select a category"),
  details: z
    .string()
    .trim()
    .min(20, "Please describe the issue in at least 20 characters")
    .max(2000, "Please keep the description under 2000 characters"),
});

const CATEGORIES = [
  "Booking or appointment issue",
  "Payment or refund issue",
  "Artist conduct",
  "Inappropriate content on the platform",
  "Data privacy request (DPDP Act)",
  "Other",
];

const field =
  "w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground";

const GrievancePolicy = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", category: CATEGORIES[0], details: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = complaintSchema.safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""])));
      toast.error("Please correct the highlighted fields");
      return;
    }
    setErrors({});
    const d = parsed.data;
    const body = [
      `Name: ${d.name}`,
      `Email: ${d.email}`,
      `Phone: ${d.phone || "not provided"}`,
      `Category: ${d.category}`,
      "",
      "Details:",
      d.details,
    ].join("\n");
    window.location.href = mailto(`Grievance: ${d.category}`, body);
    toast.success("Opening your email app with the complaint prefilled");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <LegalLayout title="Grievance Redressal Policy" updated="Last updated: 3 August 2026">
        <p>
          Tart is committed to resolving user complaints fairly and promptly, in line with the
          Digital Personal Data Protection Act, 2023 and the Information Technology (Intermediary
          Guidelines) Rules, 2021.
        </p>

        <h2>Grievance Officer</h2>
        <ul>
          <li><strong>Name:</strong> {GRIEVANCE_OFFICER.name}</li>
          <li><strong>Designation:</strong> {GRIEVANCE_OFFICER.designation}</li>
          <li><strong>Email:</strong> <a href={mailto("Grievance")}>{GRIEVANCE_OFFICER.email}</a></li>
          <li><strong>Address:</strong> {GRIEVANCE_OFFICER.address}</li>
          <li><strong>Working hours:</strong> {GRIEVANCE_OFFICER.hours}</li>
        </ul>

        <h2>How we handle complaints</h2>
        <ul>
          <li>We acknowledge every complaint within 24 hours of receipt.</li>
          <li>We resolve complaints within 15 days, and data-privacy grievances within 30 days.</li>
          <li>You receive a written outcome at the email address you provide.</li>
          <li>If you are not satisfied, you may escalate to the Data Protection Board of India.</li>
        </ul>

        <h2>File a complaint</h2>
        <form onSubmit={handleSubmit} className="not-prose space-y-4 mt-4" noValidate>
          <div>
            <label htmlFor="g-name" className="text-sm text-muted-foreground mb-1.5 block">Full name</label>
            <input id="g-name" className={field} value={form.name} onChange={set("name")} maxLength={100} placeholder="Your name" />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="g-email" className="text-sm text-muted-foreground mb-1.5 block">Email</label>
            <input id="g-email" type="email" className={field} value={form.email} onChange={set("email")} maxLength={255} placeholder="you@example.com" />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="g-phone" className="text-sm text-muted-foreground mb-1.5 block">Phone (optional)</label>
            <input id="g-phone" className={field} value={form.phone} onChange={set("phone")} maxLength={15} placeholder="+91 98765 43210" />
            {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label htmlFor="g-category" className="text-sm text-muted-foreground mb-1.5 block">Category</label>
            <select id="g-category" className={field} value={form.category} onChange={set("category")}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="g-details" className="text-sm text-muted-foreground mb-1.5 block">Describe the issue</label>
            <textarea
              id="g-details"
              rows={5}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground"
              value={form.details}
              onChange={set("details")}
              placeholder="Include dates, booking reference and what went wrong."
            />
            {errors.details && <p className="text-destructive text-xs mt-1">{errors.details}</p>}
          </div>
          <Button type="submit" variant="gold" className="w-full">Submit complaint</Button>
          <p className="text-xs text-muted-foreground">
            Submitting opens your email client with the complaint addressed to our Grievance Officer.
          </p>
        </form>
      </LegalLayout>
    </div>
  );
};

export default GrievancePolicy;
