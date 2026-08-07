import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Hash, BookOpen, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface PremiumWelcomeCardProps {
  attendancePercentage?: number;
  semester?: number;
  department?: string;
  roll?: string;
}

export function PremiumWelcomeCard({
  semester = 1,
  department = 'CST',
  roll,
}: PremiumWelcomeCardProps) {
  const { user } = useAuth();

  // Show only the first two words of the name (e.g. "Md Mahadi Hasan" → "Md Mahadi")
  const shortName = user?.name?.trim().split(/\s+/).slice(0, 2).join(' ') || 'Student';

  const displayRoll = roll || user?.studentId || 'N/A';

  // Extract short dept code — take up to 4 uppercase chars if the value is long
  const deptCode = department.length <= 6
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
      {/* Soft background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-12 -right-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-300/15 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/5 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Info pills row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <CalendarDays className="h-3 w-3 opacity-80" />
            {format(new Date(), 'EEE, MMM d')}
          </span>

          {/* Roll */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Hash className="h-3 w-3 opacity-80" />
            {displayRoll}
          </span>

          {/* Semester */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <BookOpen className="h-3 w-3 opacity-80" />
            Sem {semester}
          </span>

          {/* Department code */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Building2 className="h-3 w-3 opacity-80" />
            {deptCode}
          </span>
        </div>

        {/* Main welcome text */}
        <div>
          <p className="text-sm font-medium text-white/60 tracking-wide uppercase">
            Welcome back
          </p>
          <h1 className="mt-0.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {shortName}
          </h1>
        </div>
      </div>
    </motion.div>
  );
}
