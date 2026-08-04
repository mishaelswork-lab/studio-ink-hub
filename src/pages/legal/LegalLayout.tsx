import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LegalLayoutProps {
  title: string;
  updated?: string;
  children: ReactNode;
}

export const LegalLayout = ({ title, updated, children }: LegalLayoutProps) => (
  <main className="pt-24 pb-20 px-4">
    <article className="max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-2">{title}</h1>
      {updated && <p className="text-muted-foreground text-xs mb-8">{updated}</p>}
      <div
        className="space-y-4 text-muted-foreground text-sm leading-relaxed
          [&_h2]:font-heading [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
          [&_strong]:text-foreground
          [&_a]:text-gold hover:[&_a]:underline"
      >
        {children}
      </div>
      <nav className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
        <Link to="/privacy" className="text-muted-foreground hover:text-gold">Privacy Policy</Link>
        <Link to="/terms" className="text-muted-foreground hover:text-gold">Terms of Service</Link>
        <Link to="/grievance" className="text-muted-foreground hover:text-gold">Grievance Redressal</Link>
        <Link to="/" className="text-muted-foreground hover:text-gold">Back to Tart</Link>
      </nav>
    </article>
  </main>
);
