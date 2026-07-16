import { PWAUpdatePrompt } from "./PWAUpdatePrompt";
import { OfflineIndicator } from "./OfflineIndicator";
import { InstallPrompt } from "./InstallPrompt";
import { PushNotifications } from "./PushNotifications";

/**
 * Mounts all PWA UI in one place: service-worker registration + update prompt,
 * the offline indicator, the custom install prompt, and Web Push (permission +
 * subscription + click routing). Rendered once at the app root. Each child is
 * self-contained and feature-detected, so this is inert in browsers without
 * service-worker support.
 */
export function PWAProvider() {
  return (
    <>
      <PWAUpdatePrompt />
      <OfflineIndicator />
      <InstallPrompt />
      <PushNotifications />
    </>
  );
}

export default PWAProvider;
