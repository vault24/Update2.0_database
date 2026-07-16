import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * Registers the service worker and drives the update UX.
 *
 * registerType is "prompt", so a new version never reloads the app underneath
 * the user (critical: a teacher may be mid-way through entering marks). Instead
 * we surface a persistent toast; reloading is the user's choice. On reload the
 * waiting SW is activated (skipWaiting) and the page refreshes to the new build.
 */
export function PWAUpdatePrompt() {
  const shownUpdate = useRef(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Periodically check for a new deployment (every 60 min) while the tab
      // stays open, so long-lived sessions still pick up updates.
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }
      console.info("[PWA] service worker registered:", swUrl);
    },
    onRegisterError(error) {
      console.error("[PWA] service worker registration failed:", error);
    },
  });

  // "App ready to work offline" — shown once after the first successful install.
  useEffect(() => {
    if (offlineReady) {
      toast.success("Ready to work offline", {
        description: "SIPI Portal is installed and can now be used without a connection.",
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 4000,
        onDismiss: () => setOfflineReady(false),
        onAutoClose: () => setOfflineReady(false),
      });
    }
  }, [offlineReady, setOfflineReady]);

  // "A new version is available" — persistent, with a Reload action.
  useEffect(() => {
    if (needRefresh && !shownUpdate.current) {
      shownUpdate.current = true;
      toast("A new version is available", {
        description: "Reload to get the latest updates and fixes.",
        icon: <RefreshCw className="h-4 w-4" />,
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            // true -> activate the waiting SW then reload to the new build
            updateServiceWorker(true);
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            setNeedRefresh(false);
            shownUpdate.current = false;
          },
        },
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export default PWAUpdatePrompt;
