import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { isStandalone } from "@/pwa/swMessaging";

const DISMISS_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}
function remember() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    /* ignore */
  }
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect touch to disambiguate
  const iPadOS = navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}
function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  // Exclude in-app browsers / other engines that can't Add to Home Screen
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/.test(ua);
}

/**
 * Custom, non-intrusive install experience.
 *  - Android/Chromium: captures `beforeinstallprompt`, shows a branded card,
 *    fires the native prompt on demand, and remembers dismissal for 14 days.
 *  - iOS Safari: the event never fires, so we show a short "Add to Home Screen"
 *    instruction card instead (also dismissible/remembered).
 * Never shown when already installed (standalone) or after a recent dismissal.
 */
export function InstallPrompt() {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"android" | "ios">("android");
  const cardRef = useRef<HTMLDivElement | null>(null);

  const hide = useCallback(() => setVisible(false), []);

  const dismiss = useCallback(() => {
    remember();
    hide();
  }, [hide]);

  const install = useCallback(async () => {
    const evt = deferred.current;
    if (!evt) return;
    hide();
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        remember(); // installed — don't re-prompt
      } else {
        remember(); // declined — respect it for a while
      }
    } catch {
      /* ignore */
    } finally {
      deferred.current = null;
    }
  }, [hide]);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android / Chromium path
    const onBIP = (e: BeforeInstallPromptEvent) => {
      e.preventDefault(); // stop the mini-infobar; we present our own UI
      deferred.current = e;
      setMode("android");
      // small delay so we never interrupt the very first paint / interaction
      window.setTimeout(() => setVisible(true), 2500);
    };
    const onInstalled = () => {
      remember();
      setVisible(false);
      deferred.current = null;
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari path (no beforeinstallprompt) — offer manual instructions
    let iosTimer: number | undefined;
    if (isIOSSafari()) {
      setMode("ios");
      iosTimer = window.setTimeout(() => setVisible(true), 3500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  // Focus management + Escape-to-dismiss for accessibility
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    cardRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-desc"
        tabIndex={-1}
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated outline-none animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-96.png"
            alt=""
            aria-hidden="true"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 id="pwa-install-title" className="text-sm font-semibold text-foreground">
              Install SIPI Portal
            </h2>

            {mode === "android" ? (
              <>
                <p id="pwa-install-desc" className="mt-0.5 text-xs text-muted-foreground">
                  Add the app to your home screen for faster access and offline use.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={install}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Install
                  </button>
                  <button
                    onClick={dismiss}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    Not now
                  </button>
                </div>
              </>
            ) : (
              <p id="pwa-install-desc" className="mt-1 text-xs text-muted-foreground">
                Tap{" "}
                <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" aria-label="the Share button" />{" "}
                then <span className="font-medium text-foreground">Add to Home Screen</span>{" "}
                <Plus className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> to install
                this app.
              </p>
            )}
          </div>

          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
