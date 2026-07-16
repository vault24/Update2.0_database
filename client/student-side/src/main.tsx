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

// Fade out the launch screen once React has painted its first frame. A short
// minimum keeps it from flashing on fast loads; two rAFs ensure the app has
// actually painted underneath before we reveal it.
(function hideLaunchScreen() {
  const MIN_VISIBLE_MS = 500;
  const start = performance.now();
  const remove = () => {
    const splash = document.getElementById("app-splash");
    if (!splash) return;
    if (window.__SIPI_SPLASH_TIMEOUT__) window.clearTimeout(window.__SIPI_SPLASH_TIMEOUT__);
    splash.classList.add("app-splash--hide");
    // Drop the node after the fade so it never intercepts events.
    window.setTimeout(() => splash.remove(), 500);
  };
  const afterPaint = () => {
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - start));
    window.setTimeout(remove, wait);
  };
  requestAnimationFrame(() => requestAnimationFrame(afterPaint));
})();
