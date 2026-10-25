import { useEffect, useState } from "react";

const KEY = "tart.dataSaver";

/**
 * Data saver mode: when on, heavy media (full-size images, video autoplay)
 * is replaced with lightweight versions to reduce mobile data usage.
 */
export const useDataSaver = (): [boolean, (v: boolean) => void] => {
  const [saver, setSaver] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(KEY, saver ? "1" : "0");
    document.documentElement.dataset.dataSaver = saver ? "true" : "false";
  }, [saver]);

  return [saver, setSaver];
};

/** Read-only helper for non-interactive components (no localStorage writes). */
export const isDataSaverOn = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
};
