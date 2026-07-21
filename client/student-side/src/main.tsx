import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { PortalExperience } from "@/components/portal/PortalExperience";
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

// Keep the app upright. A PWA whose manifest permits any orientation can rotate
// to landscape even when the phone's auto-rotate is OFF. Manifest
// `orientation: portrait` fixes new installs; this locks the already-running
// app immediately where the platform allows it (standalone PWAs on Android).
// It's a no-op where locking isn't permitted (e.g. a normal browser tab, which
// requires fullscreen) — the call is guarded so it never throws.
(function lockPortrait() {
  try {
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
      | undefined;
    if (orientation?.lock) {
      orientation.lock("portrait").catch(() => {
        /* rejected (unsupported / not standalone) — ignore */
      });
    }
  } catch {
    /* unsupported — no-op */
  }
})();

// Public result portal by HOST. `result.spisg.gov.bd` shares this student
// build; the dedicated result.html entry is the ideal path, but if the origin
// falls back to serving index.html (e.g. before the result vhost / cert is
// live, or behind a proxy) this guarantees the host still shows the PUBLIC
// result portal — never the login page. No AuthProvider, no dashboard, no
// service worker registration.
const host = window.location.hostname;
const isResultHost = host === "result.spisg.gov.bd" || host.startsWith("result.");

const root = createRoot(document.getElementById("root")!);
if (isResultHost) {
  root.render(
    <ThemeProvider>
      <PortalExperience standalone />
    </ThemeProvider>
  );
} else {
  root.render(
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}
