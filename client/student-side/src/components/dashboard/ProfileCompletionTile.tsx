import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { studentService, type ProfileCompletion } from '@/services/studentService';

/**
 * Profile completion ring for the dashboard welcome card.
 *
 * Shows an SVG circular progress ring with the percentage inside.
 * At 100% switches to a "complete" check state.
 * Clicking navigates to the relevant page to fix missing items.
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
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <Loader2 className="h-4 w-4 animate-spin text-white/60" />
      </div>
    );
  }

  if (!data) return null;

  const { percentage, complete, missing, primaryTarget } = data;
  const goTo = primaryTarget === 'documents' ? '/dashboard/documents' : '/dashboard/profile';

  // SVG ring dimensions
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on progress
  const ringColor =
    percentage >= 80 ? '#34d399' : percentage >= 50 ? '#fbbf24' : '#f87171';

  if (complete) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
          <CheckCircle2 className="h-7 w-7 text-emerald-300" />
        </div>
        <p className="text-[10px] font-semibold text-white/70">Complete</p>
      </div>
    );
  }

  const shown = missing.slice(0, 1).map((m) => m.label);
  const extra = missing.length - shown.length;

  return (
    <button
      type="button"
      onClick={() => navigate(goTo)}
      aria-label={`Profile ${percentage}% complete — tap to finish`}
      className="group flex flex-col items-center gap-1 outline-none"
    >
      {/* Ring */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* Percentage label inside ring */}
        <span className="absolute text-sm font-extrabold text-white leading-none">
          {percentage}%
        </span>
      </div>

      {/* Label below ring */}
      <div className="text-center">
        <p className="text-[10px] font-semibold text-white/70 group-hover:text-white transition-colors">
          Profile
        </p>
        {shown.length > 0 && (
          <p className="max-w-[80px] truncate text-[9px] text-white/50">
            {shown[0]}{extra > 0 ? ` +${extra}` : ''}
          </p>
        )}
      </div>
    </button>
  );
}

export default ProfileCompletionTile;
