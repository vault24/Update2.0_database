import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { studentService, type ProfileCompletion } from '@/services/studentService';

/**
 * Profile completion status for the dashboard welcome card — it replaces the
 * name-initial avatar, which carried no information.
 *
 * Shows the percentage complete and names what is still missing. Tapping it
 * goes straight to the page that fixes the outstanding items: the Documents
 * page for a missing admission document, the Profile page for missing Career &
 * Portfolio details. At 100% it shows a settled "complete" state instead.
 *
 * Rendered on a coloured gradient card, so all styling here is white-on-glass.
 */
export function ProfileCompletionTile() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await studentService.getProfileCompletion();
        if (active) setData(res);
      } catch {
        // Non-critical: the card simply renders without the tile.
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 sm:h-[4.5rem] sm:w-[6.5rem] sm:rounded-xl">
        <Loader2 className="h-4 w-4 animate-spin text-white/70" />
      </div>
    );
  }

  if (!data) return null;

  const { percentage, complete, missing, primaryTarget } = data;
  const goTo = primaryTarget === 'documents' ? '/dashboard/documents' : '/dashboard/profile';
  // Two names is all that fits; the rest are summarised as "+N more".
  const shown = missing.slice(0, 2).map((m) => m.label);
  const extra = missing.length - shown.length;

  if (complete) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-center backdrop-blur-sm sm:block sm:h-auto sm:w-auto sm:rounded-xl sm:px-3 sm:py-2">
        <CheckCircle2 className="h-5 w-5 text-white sm:mx-auto" />
        <p className="mt-1 hidden text-[11px] font-semibold leading-tight sm:block">Profile complete</p>
        <p className="hidden text-[10px] text-white/70 sm:block">100%</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(goTo)}
      aria-label={`Profile ${percentage}% complete — ${missing.length} item${missing.length === 1 ? '' : 's'} left`}
      className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-center backdrop-blur-sm transition hover:bg-white/25 active:scale-[.98] sm:block sm:h-auto sm:w-auto sm:rounded-xl sm:px-3 sm:py-2 sm:text-left"
    >
      <div className="hidden items-center justify-between gap-2 sm:flex">
        <p className="text-[10px] uppercase tracking-wide text-white/70">Profile</p>
        <ChevronRight className="h-3.5 w-3.5 text-white/70 transition-transform group-hover:translate-x-0.5" />
      </div>

      <p className="text-sm font-extrabold leading-none sm:text-xl">{percentage}%</p>

      <div className="mt-1.5 hidden h-1.5 w-full overflow-hidden rounded-full bg-white/25 sm:block sm:w-28">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1.5 hidden max-w-[11rem] truncate text-[10px] text-white/80 sm:block">
        {shown.join(', ')}{extra > 0 ? ` +${extra} more` : ''}
      </p>
    </button>
  );
}

export default ProfileCompletionTile;
