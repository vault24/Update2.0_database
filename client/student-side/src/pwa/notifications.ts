/**
 * Web Push (client side) — standard Web Push over VAPID (no Firebase).
 *
 * Flow:
 *   1. Fetch the server's VAPID public key from /api/push/vapid-public-key/.
 *   2. Ask for notification permission (on a user gesture — see PushPermissionPrompt).
 *   3. Subscribe via PushManager and register the subscription with the backend
 *      (POST /api/push/subscribe/). This doubles as token refresh — it upserts
 *      on the unique endpoint every launch.
 *   4. The backend prunes dead endpoints automatically on send (404/410).
 *
 * Everything is feature-detected and never throws into app flow.
 */
import { apiClient, getErrorMessage } from "@/lib/api";
import { swSupported } from "@/pwa/swMessaging";

export function pushSupported(): boolean {
  return (
    swSupported() &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
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

let cachedVapidKey: string | null | undefined;

/** Fetch (and cache) the server's VAPID public key. null = push disabled. */
export async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey !== undefined) return cachedVapidKey ?? null;
  try {
    const res = await apiClient.get<{ enabled: boolean; public_key: string | null }>(
      "/push/vapid-public-key/",
    );
    cachedVapidKey = res.enabled ? res.public_key : null;
  } catch {
    cachedVapidKey = null;
  }
  return cachedVapidKey ?? null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Register a PushSubscription (JSON) with the backend. */
async function persistSubscription(sub: PushSubscriptionJSON): Promise<boolean> {
  try {
    await apiClient.post("/push/subscribe/", sub);
    return true;
  } catch (error) {
    console.warn("[PWA] failed to persist push subscription:", getErrorMessage(error));
    return false;
  }
}

/**
 * Ensure this device is subscribed and the backend knows about it.
 * Safe to call on every app launch (idempotent upsert = token refresh).
 * Returns true when a live subscription is registered.
 *
 * `interactive` = whether we're allowed to trigger the permission prompt
 * (true only from a user gesture). When false, we only proceed if permission
 * was already granted.
 */
export async function ensurePushSubscription(interactive = false): Promise<boolean> {
  if (!pushSupported()) return false;

  const key = await getVapidPublicKey();
  if (!key) return false; // server push disabled

  let permission = Notification.permission;
  if (permission === "default") {
    if (!interactive) return false;
    permission = await requestNotificationPermission();
  }
  if (permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    // If an existing subscription was made with a different key, drop it so we
    // can resubscribe with the current server key.
    if (existing) {
      const sameKey = keyMatches(existing, key);
      if (sameKey) {
        return await persistSubscription(existing.toJSON());
      }
      await existing.unsubscribe().catch(() => {});
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    return await persistSubscription(sub.toJSON());
  } catch (error) {
    console.warn("[PWA] push subscribe failed:", getErrorMessage(error));
    return false;
  }
}

function keyMatches(sub: PushSubscription, expectedKey: string): boolean {
  try {
    const applied = sub.options?.applicationServerKey;
    if (!applied) return true; // can't tell — assume ok
    const current = new Uint8Array(applied as ArrayBuffer);
    const expected = urlBase64ToUint8Array(expectedKey);
    if (current.length !== expected.length) return false;
    for (let i = 0; i < current.length; i++) if (current[i] !== expected[i]) return false;
    return true;
  } catch {
    return true;
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

/** Send a test push to the current user (verification helper). */
export async function sendTestPush(): Promise<boolean> {
  try {
    const res = await apiClient.post<{ success: boolean; sent: number }>("/push/test/", {});
    return !!res.success;
  } catch (error) {
    console.warn("[PWA] test push failed:", getErrorMessage(error));
    return false;
  }
}

/**
 * Wire the SW's pushsubscriptionchange re-subscribe: when the browser rotates
 * the subscription, the SW re-subscribes and posts the new one here to persist.
 * Call once at app start.
 */
export function listenForResubscribe(): () => void {
  if (!swSupported()) return () => {};
  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (data?.type === "PUSH_RESUBSCRIBED" && data.subscription) {
      void persistSubscription(data.subscription as PushSubscriptionJSON);
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
