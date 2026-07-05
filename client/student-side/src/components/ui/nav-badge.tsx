import { cn } from '@/lib/utils';

interface NavBadgeProps {
  count: number;
  /** Render a small dot instead of a number (used when the sidebar is collapsed). */
  dot?: boolean;
  className?: string;
}

/**
 * Small unread-count pill shown on sidebar nav items. Renders nothing when the
 * count is 0. Caps display at "9+".
 */
export function NavBadge({ count, dot, className }: NavBadgeProps) {
  if (!count || count < 1) return null;

  if (dot) {
    return (
      <span
        aria-label={`${count} new`}
        className={cn(
          'absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-sidebar',
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-label={`${count} new`}
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5',
        'text-[10px] font-bold leading-none text-destructive-foreground',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
