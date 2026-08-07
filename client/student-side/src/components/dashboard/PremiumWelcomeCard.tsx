import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Hash, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ProfileCompletionTile } from './ProfileCompletionTile';

interface PremiumWelcomeCardProps {
  attendancePercentage?: number;
  semester?: number;
  department?: string;
  roll?: string;
}

export function PremiumWelcomeCard({
  department = 'CST',
  roll,
}: PremiumWelcomeCardProps) {
  const { user } = useAuth();

  const shortName = user?.name?.trim().split(/\s+/).slice(0, 2).join(' ') || 'Student';
  const displayRoll = roll || user?.studentId || 'N/A';

  const deptCode =
    department.length <= 6
      ? department.toUpperCase()
      : department.replace(/[^A-Z]/g, '').slice(0, 4) || department.slice(0, 4).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl p-5 sm:p-7 text-white shadow-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f4c35 0%, #1a7a54 45%, #0e9f6e 100%)',
      }}
    >
      {/* Background blobs — purely decorative, clipped by overflow-hidden */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-300/15 blur-2xl" />
      </div>

      <div className="relative z-10 space-y-3">
        {/* Row 1 — pills, full width */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <CalendarDays className="h-3 w-3 opacity-75" />
            {format(new Date(), 'EEE, MMM d')}
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Hash className="h-3 w-3 opacity-75" />
            {displayRoll}
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Building2 className="h-3 w-3 opacity-75" />
            {deptCode}
          </span>
        </div>

        {/* Row 2 — welcome text (left) + profile ring (right), aligned to bottom */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-white/55">
              Welcome back
            </p>
            <h1 className="mt-0.5 truncate text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {shortName}
            </h1>
          </div>

          <div className="shrink-0">
            <ProfileCompletionTile />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
