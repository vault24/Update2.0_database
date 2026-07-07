import { Sparkles } from 'lucide-react';

/**
 * Banner shown at the top of modules that are still under construction and
 * currently display sample/placeholder data. The page and its navigation stay
 * in place so the layout can be reviewed, but users are clearly told the
 * feature is not live yet.
 */
export function ComingSoonBanner({ feature }: { feature?: string }) {
  return (
    <div
      role="status"
      className="mb-5 flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-300">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Coming Soon</p>
        <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
          {feature ? `${feature} is` : 'This feature is'} still under construction — the
          content shown here is sample data and not yet live.
        </p>
      </div>
    </div>
  );
}

export default ComingSoonBanner;
