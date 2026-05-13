import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initPerf } from "./lib/perf";

// Defer perf init until after first paint so it never blocks LCP itself.
if (typeof window !== "undefined") {
  ("requestIdleCallback" in window ? (window as any).requestIdleCallback : setTimeout)(initPerf, 1);
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
