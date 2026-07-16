/**
 * Small helpers for talking to the service worker from the app.
 * Everything is feature-detected and wrapped so it is a safe no-op in browsers
 * without service-worker support (or before the SW has registered).
 */

export function swSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/** Post a message to the active service worker, if any. */
export async function postToSW(message: unknown): Promise<void> {
  if (!swSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const target = reg?.active ?? navigator.serviceWorker.controller;
    target?.postMessage(message);
  } catch {
    // ignore — messaging the SW must never break app flow
  }
}

/**
 * Ask the service worker to drop cached reference data + images.
 * Called on logout so one user's cached reference data / images don't linger
 * for the next person on a shared device.
 */
export async function purgeSWCaches(): Promise<void> {
  await postToSW({ type: "PURGE_CACHES" });
}

/** True when running as an installed PWA (standalone / fullscreen). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches;
  // iOS Safari exposes navigator.standalone
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mm || iosStandalone);
}
