import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import { settingsService } from '@/services/settingsService';

/**
 * Continuous scrolling maintenance notice shown under the top bar for every
 * user. Content and on/off state come from system settings (admin-controlled).
 * Renders nothing when disabled or when there is no message.
 */
export function MaintenanceNoticeBanner() {
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      try {
        const settings = await settingsService.getSystemSettings();
        if (!mounted.current) return;
        setEnabled(!!settings.maintenance_notice_enabled);
        setText((settings.maintenance_notice_text || '').trim());
      } catch {
        // Settings are non-critical for page function — fail silently.
      }
    };
    load();
    // Refresh periodically so toggling it in admin reaches open sessions.
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const show = enabled && text.length > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative z-20 overflow-hidden border-b border-amber-500/30 bg-amber-500/15"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 px-3 py-2 text-amber-700 dark:text-amber-300">
            <Megaphone className="h-4 w-4 shrink-0" />
            <div className="marquee-track relative flex-1 overflow-hidden">
              {/* Two copies give a seamless, gap-free continuous loop. */}
              <div className="marquee-content flex whitespace-nowrap">
                <span className="px-6 text-sm font-medium">{text}</span>
                <span className="px-6 text-sm font-medium" aria-hidden="true">{text}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
