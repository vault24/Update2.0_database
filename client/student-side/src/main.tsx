import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./index.css";

// After a deploy the content-hashed chunk files change. A tab opened before
// the deploy still references the old file names, so its next lazy-route
// navigation 404s and the page appears "broken". Vite reports this as
// `vite:preloadError` — reload once (rate-limited) to pick up the new build.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const KEY = "chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);
