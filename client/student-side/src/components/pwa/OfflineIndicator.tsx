import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Detects connectivity changes and reflects them in the UI:
 *   - a slim fixed banner while offline (so the state is always visible), and
 *   - transition toasts when the connection drops / returns.
 * The banner respects the safe-area inset so it clears notches in standalone.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const wasOffline = useRef(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        wasOffline.current = false;
        toast.success("Back online", {
          description: "Your connection has been restored.",
          icon: <Wifi className="h-4 w-4" />,
          duration: 3000,
        });
      }
    };
    const goOffline = () => {
      setOnline(false);
      wasOffline.current = true;
      toast.error("You are offline", {
        description: "Showing saved content. Some actions are paused until you reconnect.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: 5000,
      });
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground shadow-md"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You&rsquo;re offline — showing saved content.</span>
    </div>
  );
}

export default OfflineIndicator;
