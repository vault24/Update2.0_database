/**
 * Web Push infrastructure (client side).
 *
 * The backend push endpoint is not wired up yet, so subscribe/unsubscribe are
 * built and safe to call but become active only once VITE_VAPID_PUBLIC_KEY and
 * the backend `/api/push/subscribe/` endpoint exist. Everything is
 * feature-detected and never throws into app flow.
 */
import { apiClient, getErrorMessage } from "@/lib/api";
import { swSupported } from "@/pwa/swMessaging";

export function pushSupported(): boolean {
  return swSupported() && typeof window !== "undefined" && "PushManager" in window && "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : "denied";
}

/** Ask the user for notification permission. Returns the resulting state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!pushSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Subscribe this device to push and register the subscription with the backend.
 * No-ops (returns null) until VITE_VAPID_PUBLIC_KEY is configured.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapid) {
    // Infrastructure present; backend/VAPID not configured yet.
    return null;
  }
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      }));
    // Register with backend so the server can send pushes to this device.
    await apiClient.post("/push/subscribe/", sub.toJSON());
    return sub;
  } catch (error) {
    console.warn("[PWA] push subscription failed:", getErrorMessage(error));
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    try {
      await apiClient.post("/push/unsubscribe/", { endpoint: sub.endpoint });
    } catch {
      /* best-effort server cleanup */
    }
    return await sub.unsubscribe();
  } catch {
    return false;
  }
}
