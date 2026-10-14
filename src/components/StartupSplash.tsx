import { useEffect, useState } from "react";
import logo from "@/assets/tart-logo-opening.png";
import star from "@/assets/tart-star.png";

const OPENING_KEY = "tart.opening.seen";
const PRELOAD_LIMIT_MS = 1800;

const preloadHome = async () => {
  const imageUrls = Array.from(document.querySelectorAll<HTMLImageElement>("img"))
    .slice(0, 8)
    .map((image) => image.currentSrc || image.src)
    .filter(Boolean);
  await Promise.race([
    Promise.allSettled(imageUrls.map((url) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = image.onerror = () => resolve();
      image.src = url;
    }))),
    new Promise((resolve) => window.setTimeout(resolve, PRELOAD_LIMIT_MS)),
  ]);
};

export const StartupSplash = () => {
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem(OPENING_KEY) !== "1"; } catch { return true; }
  });
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const start = performance.now();
    preloadHome().finally(() => {
      const elapsed = performance.now() - start;
      window.setTimeout(() => {
        if (!active) return;
        setClosing(true);
        try { sessionStorage.setItem(OPENING_KEY, "1"); } catch { /* Storage may be disabled. */ }
        window.setTimeout(() => active && setVisible(false), 420);
      }, Math.max(0, 950 - elapsed));
    });
    return () => { active = false; };
  }, [visible]);

  if (!visible) return null;
  return (
    <div className={`startup-splash ${closing ? "startup-splash--closing" : ""}`} role="status" aria-label="Opening Tart">
      <div className="startup-mark">
        <img src={logo} alt="" className="startup-logo" width={320} height={320} />
        <img src={star} alt="" className="startup-star" width={170} height={170} />
      </div>
      <p className="font-heading text-gold text-sm uppercase tracking-[0.28em]">Tart</p>
    </div>
  );
};