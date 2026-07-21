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
