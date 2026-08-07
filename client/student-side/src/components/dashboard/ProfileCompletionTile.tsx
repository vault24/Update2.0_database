import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { studentService, type ProfileCompletion } from '@/services/studentService';

/**
 * Circular SVG progress ring showing profile completion %.
 * Self-contained — fixed 72×72 px bounding box so it never
 * overlaps neighbouring elements inside the welcome card.
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
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10">
        <Loader2 className="h-4 w-4 animate-spin text-white/60" />
      </div>
    );
  }

  if (!data) return null;

  const { percentage, complete, missing, primaryTarget } = data;
  const goTo = primaryTarget === 'documents' ? '/dashboard/documents' : '/dashboard/profile';

  // SVG ring
  const size = 72;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Adaptive color
  const ringColor =
    percentage >= 80 ? '#34d399' : percentage >= 50 ? '#fbbf24' : '#f87171';

  if (complete) {
    return (
      <div className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-0.5 rounded-full bg-white/15 backdrop-blur-sm">
        <CheckCircle2 className="h-6 w-6 text-emerald-300" />
        <span className="text-[9px] font-semibold text-white/70">100%</span>
      </div>
    );
  }

  const firstMissing = missing[0]?.label ?? '';
  const extra = missing.length - 1;

  return (
    <button
      type="button"
      onClick={() => navigate(goTo)}
      aria-label={`Profile ${percentage}% complete — tap to finish`}
      className="group relative flex h-[72px] w-[72px] items-center justify-center rounded-full outline-none"
    >
      {/* SVG ring — fills the 72×72 box exactly */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
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
        {/* Progress arc */}
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

      {/* Inner label */}
      <div className="relative flex flex-col items-center leading-none">
        <span className="text-sm font-extrabold text-white">{percentage}%</span>
        <span className="mt-0.5 text-[9px] font-medium text-white/60 group-hover:text-white/90 transition-colors">
          Profile
        </span>
        {firstMissing && (
          <span className="mt-0.5 max-w-[52px] truncate text-[8px] text-white/45">
            {firstMissing}{extra > 0 ? ` +${extra}` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

export default ProfileCompletionTile;
