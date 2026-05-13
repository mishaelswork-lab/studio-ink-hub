import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ART_QUOTES } from "@/lib/artQuotes";

interface Props {
  intervalMs?: number;
  className?: string;
  /** When true, fills the viewport. Otherwise renders inline. */
  fullScreen?: boolean;
}

export const QuotesLoader = ({ intervalMs = 60000, className = "", fullScreen = false }: Props) => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * ART_QUOTES.length));

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // honor user preference
    const t = setInterval(() => setIdx(i => (i + 1) % ART_QUOTES.length), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  const wrapClasses = fullScreen
    ? "min-h-screen flex flex-col items-center justify-center bg-background px-6"
    : "py-12 flex flex-col items-center justify-center";

  return (
    <div className={`${wrapClasses} ${className}`} role="status" aria-live="polite">
      <Loader2 className="w-6 h-6 text-gold animate-spin mb-6" />
      <p
        key={idx}
        className="max-w-md text-center text-foreground/90 italic font-heading text-base md:text-lg animate-fade-in"
      >
        “{ART_QUOTES[idx].split(" — ")[0]}”
      </p>
      <p className="text-gold/70 text-xs mt-2 tracking-widest uppercase">
        {ART_QUOTES[idx].includes(" — ") ? ART_QUOTES[idx].split(" — ")[1] : "ArtSpace"}
      </p>
    </div>
  );
};
