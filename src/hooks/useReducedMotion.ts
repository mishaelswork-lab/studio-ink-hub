import { useEffect, useState } from "react";

const KEY = "tart.reducedMotion";

export const useReducedMotion = (): [boolean, (v: boolean) => void] => {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(KEY);
    if (saved !== null) return saved === "1";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });

  useEffect(() => {
    localStorage.setItem(KEY, reduced ? "1" : "0");
    document.documentElement.dataset.reducedMotion = reduced ? "true" : "false";
  }, [reduced]);

  return [reduced, setReduced];
};
