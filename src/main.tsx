import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "highlight.js/styles/github.css";
import "./styles/styles.css";
import App from "./App";
import { normalizePrettyUrl } from "./lib/router";

// Suporta URLs "bonitas" (ex.: /github.com/owner/repo) servidas com fallback SPA.
normalizePrettyUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
