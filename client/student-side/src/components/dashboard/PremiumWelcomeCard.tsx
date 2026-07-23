import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  ArrowRight,
  GraduationCap,
  TrendingUp,
  Clock,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface PremiumWelcomeCardProps {
  attendancePercentage?: number;
  semester?: number;
  department?: string;
  roll?: string;
}

/**
 * Compact welcome strip for the student dashboard. Deliberately small — the
 * dashboard's real content (class status, stats, quick actions) lives below,
 * so this card only carries the greeting + identity at a glance.
 */
export function PremiumWelcomeCard({
  attendancePercentage = 0,
  semester = 1,
  department = 'Computer Science',
  roll
}: PremiumWelcomeCardProps) {
  const { user } = useAuth();

  // Show only the first two words of the name (e.g. "Md Mahadi Hasan" -> "Md Mahadi").
  const shortName = user?.name?.trim().split(/\s+/).slice(0, 2).join(' ');
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-4 md:p-5 text-white shadow-lg"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-300/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10 flex items-center justify-between gap-3 md:gap-5">
        {/* Left: greeting + name + chips */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs text-white/75">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {getGreeting()}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {format(new Date(), 'EEE, MMM d')}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(), 'hh:mm a')}
            </span>
          </div>

          <h1 className="mt-0.5 truncate text-lg md:text-xl lg:text-2xl font-display font-bold">
            Welcome back, {shortName}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 md:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] md:text-xs font-medium">
              <GraduationCap className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Semester {semester}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] md:text-xs font-medium">
              <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
              {attendancePercentage}% Attendance
            </span>
            {user?.admissionStatus === 'pending' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard/admission')}
                className="group h-7 bg-white px-2.5 text-[11px] md:text-xs font-semibold text-emerald-700 shadow hover:bg-white/90"
              >
                Complete Admission
                <ArrowRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: compact identity */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="hidden sm:block rounded-xl bg-white/15 px-3 py-1.5 text-center">
            <p className="text-[9px] md:text-[10px] uppercase tracking-wide opacity-70">Roll</p>
            <p className="text-sm font-bold leading-tight tracking-wide">{roll || user?.studentId || 'N/A'}</p>
            <p className="max-w-[8rem] truncate text-[9px] md:text-[10px] opacity-70">{department}</p>
          </div>
          <div className="flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/25 text-lg md:text-xl font-bold ring-2 ring-white/30">
            {user?.name?.charAt(0)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
