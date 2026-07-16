import { PWAUpdatePrompt } from "./PWAUpdatePrompt";
import { OfflineIndicator } from "./OfflineIndicator";
import { InstallPrompt } from "./InstallPrompt";

/**
 * Mounts all PWA UI in one place: service-worker registration + update prompt,
 * the offline indicator, and the custom install prompt. Rendered once at the
 * app root. Each child is self-contained and feature-detected, so this is inert
 * in browsers without service-worker support.
 */
export function PWAProvider() {
  return (
    <>
      <PWAUpdatePrompt />
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}

export default PWAProvider;
