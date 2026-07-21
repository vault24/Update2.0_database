import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";
import { useSiteSettings } from "@/hooks/useApi";

/** Site-wide emergency notice, toggled from Website Settings. Dismissible per
 *  session so it never traps the reader. */
export function EmergencyBanner() {
  const { data } = useSiteSettings();
  const { pick } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  if (!data?.emergency_notice_enabled || dismissed) return null;
  const text = pick(data, "emergency_notice");
  if (!text) return null;

  return (
    <div role="alert" className="relative z-40 bg-destructive text-destructive-foreground">
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-5 py-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="flex-1">{text}</p>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="rounded p-1 hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
