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

  // First two words of name e.g. "Md Mahadi Hasan" → "Md Mahadi"
  const shortName = user?.name?.trim().split(/\s+/).slice(0, 2).join(' ') || 'Student';

  const displayRoll = roll || user?.studentId || 'N/A';

  // Short dept code — strip non-uppercase letters, take up to 4 chars
  const deptCode =
    department.length <= 6
      ? department.toUpperCase()
      : department.replace(/[^A-Z]/g, '').slice(0, 4) || department.slice(0, 4).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl p-5 sm:p-7 text-white shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #0f4c35 0%, #1a7a54 45%, #0e9f6e 100%)',
      }}
    >
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-300/15 blur-2xl" />
      </div>

      <div className="relative z-10 flex items-end justify-between gap-4">
        {/* Left — pills + welcome text */}
        <div className="min-w-0 space-y-3">
          {/* Info pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <CalendarDays className="h-3 w-3 opacity-75" />
              {format(new Date(), 'EEE, MMM d')}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Hash className="h-3 w-3 opacity-75" />
              {displayRoll}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Building2 className="h-3 w-3 opacity-75" />
              {deptCode}
            </span>
          </div>

          {/* Welcome text */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/55">
              Welcome back
            </p>
            <h1 className="mt-0.5 truncate text-3xl sm:text-4xl font-extrabold tracking-tight">
              {shortName}
            </h1>
          </div>
        </div>

        {/* Right — profile completion */}
        <div className="shrink-0">
          <ProfileCompletionTile />
        </div>
      </div>
    </motion.div>
  );
}
