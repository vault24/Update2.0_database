/**
 * VerifiedBadge — blue seal shown beside the names of the official student
 * developers who built this platform.
 *
 * Usage: `<VerifiedBadge roll={student.currentRollNumber} />` anywhere a
 * student name is rendered. Renders nothing when the roll is not on the
 * verified roster (see `@/lib/verifiedContributors`), so call sites never
 * need their own membership checks.
 *
 * Hover opens the contributor popover on desktop; tap toggles it on mobile.
 */
import { useRef, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getVerifiedContributor } from '@/lib/verifiedContributors';

interface VerifiedBadgeProps {
  roll: string | number | null | undefined;
  /** Icon size in px (default 16). Popover size is unaffected. */
  size?: number;
  className?: string;
}

export function VerifiedBadge({ roll, size = 16, className }: VerifiedBadgeProps) {
  const contributor = getVerifiedContributor(roll);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  if (!contributor) return null;

  // Hover intent: open immediately, close after a short grace period so the
  // pointer can travel into the popover without it snapping shut.
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${contributor.name} — Verified Project Contributor`}
          className={cn(
            'inline-flex shrink-0 items-center align-middle rounded-full outline-none',
            'focus-visible:ring-2 focus-visible:ring-sky-500/60',
            className,
          )}
          onMouseEnter={() => { cancelClose(); setOpen(true); }}
          onMouseLeave={scheduleClose}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        >
          <BadgeCheck
            style={{ width: size, height: size }}
            className="fill-sky-500 text-white drop-shadow-sm"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-72 p-0 overflow-hidden"
        // Keep clicks inside the popover from bubbling into row onClick
        // handlers (e.g. list rows that navigate on click).
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 bg-sky-500/10 px-4 py-2.5 border-b border-sky-500/20">
          <BadgeCheck className="w-4 h-4 fill-sky-500 text-white shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            Verified Project Contributor
          </p>
        </div>

        {/* Identity */}
        <div className="px-4 pt-3">
          <p className="font-semibold text-sm text-foreground leading-tight">{contributor.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Roll: {contributor.roll}</p>
          <p className="text-xs font-medium text-sky-600 dark:text-sky-400 mt-1.5">{contributor.role}</p>
        </div>

        {/* Contribution summary */}
        <ul className="px-4 pt-2.5 pb-3.5 space-y-1">
          {contributor.contributions.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-[5px] h-1 w-1 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground/80">
          Official student developer of this platform
        </p>
      </PopoverContent>
    </Popover>
  );
}

export default VerifiedBadge;
