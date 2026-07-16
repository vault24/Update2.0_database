/**
 * Background Sync (client side).
 *
 * The heavy lifting lives in the service worker: failed POSTs to the idempotent
 * `/api/notices/bulk-mark-read/` endpoint are queued by Workbox's
 * BackgroundSyncPlugin and replayed automatically when connectivity returns.
 * This module exposes feature detection and a helper to request a one-off sync,
 * so app code can opt more idempotent endpoints in later.
 */
import { swSupported } from "@/pwa/swMessaging";

type SyncManagerCapable = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

export function backgroundSyncSupported(): boolean {
  return swSupported() && typeof window !== "undefined" && "SyncManager" in window;
}

/**
 * Ask the browser to fire a `sync` event (with `tag`) for the SW once the
 * device is online. Safe no-op where Background Sync is unsupported (e.g. iOS).
 */
export async function requestBackgroundSync(tag: string): Promise<boolean> {
  if (!backgroundSyncSupported()) return false;
  try {
    const reg = (await navigator.serviceWorker.ready) as SyncManagerCapable;
    await reg.sync?.register(tag);
    return true;
  } catch {
    return false;
  }
}
