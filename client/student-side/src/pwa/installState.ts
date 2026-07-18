/**
 * Global install-prompt state.
 *
 * `beforeinstallprompt` fires once, early, and the event can only be used once.
 * We capture it here at module load (imported from the always-mounted
 * PWAProvider, so the listener is registered before the event fires) and keep
 * the deferred event available so BOTH the popup (InstallPrompt) and the manual
 * "Install App" button in Settings can trigger the native install — whichever
 * the user reaches first.
 */
import { isStandalone } from "@/pwa/swMessaging";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: BeforeInstallPromptEvent) => {
    e.preventDefault(); // suppress the mini-infobar; we present our own UI
    deferredPrompt = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

/** True when the browser has offered an installable prompt we still hold. */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/** True once installed (appinstalled fired, or running standalone). */
export function isInstalled(): boolean {
  return installed || isStandalone();
}

/** Subscribe to install-state changes (prompt availability / installed). */
export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/** Trigger the native install prompt. Consumes the deferred event. */
export async function promptInstall(): Promise<InstallOutcome> {
  const evt = deferredPrompt;
  if (!evt) return "unavailable";
  deferredPrompt = null;
  emit();
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") installed = true;
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}

export { isStandalone };
