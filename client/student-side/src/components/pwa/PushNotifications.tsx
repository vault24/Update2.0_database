import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  pushSupported,
  notificationPermission,
  ensurePushSubscription,
  listenForResubscribe,
} from "@/pwa/notifications";
import { isStandalone } from "@/pwa/swMessaging";

const DISMISS_KEY = "pwa-push-dismissed-until";
const DISMISS_DAYS = 7;

function recentlyDismissed(): boolean {
  try {
    return Date.now() < Number(localStorage.getItem(DISMISS_KEY) || 0);
  } catch {
    return false;
  }
}
function remember() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 864e5));
  } catch {
    /* ignore */
  }
}

/**
 * Drives Web Push on the client:
 *   - refreshes the subscription silently on every login when already granted
 *     (this is the "register/refresh the token in Django" step),
 *   - shows a soft prompt to enable notifications on first login (the native
 *     permission dialog is triggered from the user's click — best practice),
 *   - navigates when a notification is clicked,
 *   - persists the rotated subscription when the SW re-subscribes.
 *
 * Rendered inside the router + auth provider. Inert without SW/Push support.
 */
export function PushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const syncedFor = useRef<string | null>(null);

  // SW → app messages: notification clicks (navigate) and re-subscribe (persist).
  useEffect(() => {
    if (!pushSupported()) return;
    const stopResub = listenForResubscribe();
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "NOTIFICATION_CLICK" && typeof data.url === "string") {
        try {
          const url = new URL(data.url, window.location.origin);
          navigate(url.pathname + url.search);
        } catch {
          /* ignore malformed url */
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      stopResub();
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [navigate]);

  // On login: silently refresh the subscription if already granted; otherwise
  // consider showing the soft prompt.
  useEffect(() => {
    if (!user || !pushSupported()) return;
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    const perm = notificationPermission();
    if (perm === "granted") {
      void ensurePushSubscription(false); // silent token refresh/register
      return;
    }
    if (perm === "default" && !recentlyDismissed()) {
      // Delay so we never interrupt the login transition; standalone installs
      // (where notifications matter most) are prompted a touch sooner.
      const t = window.setTimeout(() => setShowPrompt(true), isStandalone() ? 2500 : 6000);
      return () => window.clearTimeout(t);
    }
  }, [user]);

  const enable = useCallback(async () => {
    setShowPrompt(false);
    remember();
    const ok = await ensurePushSubscription(true); // user gesture → may prompt
    if (ok) {
      toast.success("Notifications enabled", {
        description: "You'll now get alerts even when the app is closed.",
        duration: 4000,
      });
    } else if (notificationPermission() === "denied") {
      toast.message("Notifications are blocked", {
        description: "Enable them from your browser's site settings to get alerts.",
        duration: 5000,
      });
    }
  }, []);

  const dismiss = useCallback(() => {
    remember();
    setShowPrompt(false);
  }, []);

  useEffect(() => {
    if (!showPrompt) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    cardRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [showPrompt, dismiss]);

  if (!showPrompt) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[94] flex justify-center px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="pwa-push-title"
        aria-describedby="pwa-push-desc"
        tabIndex={-1}
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated outline-none animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="pwa-push-title" className="text-sm font-semibold text-foreground">
              Turn on notifications
            </h2>
            <p id="pwa-push-desc" className="mt-0.5 text-xs text-muted-foreground">
              Get notices, results and important updates instantly — even when the app is closed.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={enable}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                Enable
              </button>
              <button
                onClick={dismiss}
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss notification prompt"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PushNotifications;
