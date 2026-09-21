import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root is missing");

createRoot(rootElement).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
