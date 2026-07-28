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
import { ProfileCompletionTile } from './ProfileCompletionTile';

interface PremiumWelcomeCardProps {
  attendancePercentage?: number;
  semester?: number;
  department?: string;
  roll?: string;
}

/**
 * Welcome card for the student dashboard.
 *
 * Proportions follow the Board Results hero (`ResultHero`): `p-5 sm:p-6`, a
 * small soft label line on top, then a wrapping row of the main text block and
 * a right-hand tile. That layout breathes properly on a phone, where the older
 * tight single row was cramped.
 *
 * The right-hand tile is the profile completion status — it replaced the
 * name-initial avatar, which told the student nothing.
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
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-5 sm:p-6 text-white shadow-lg shadow-emerald-600/20"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-300/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10 min-w-0">
        {/* Soft label line — greeting, date, time */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {getGreeting()}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {format(new Date(), 'EEE, MMM d')}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(), 'hh:mm a')}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl sm:text-2xl font-display font-bold">
              Welcome back, {shortName}
            </h1>
            <p className="mt-0.5 truncate text-sm text-white/75">
              Roll {roll || user?.studentId || 'N/A'} · {department}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] sm:text-xs font-medium">
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Semester {semester}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] sm:text-xs font-medium">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {attendancePercentage}% Attendance
              </span>
              {user?.admissionStatus === 'pending' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/dashboard/admission')}
                  className="group h-7 bg-white px-2.5 text-[11px] sm:text-xs font-semibold text-emerald-700 shadow hover:bg-white/90"
                >
                  Complete Admission
                  <ArrowRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Right tile: how complete this student's profile is, and the way
              to finish it. Full width on the narrowest screens so the
              percentage and the missing items stay readable. */}
          <div className="w-full shrink-0 sm:w-auto">
            <ProfileCompletionTile />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
