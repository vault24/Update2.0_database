import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, GraduationCap, Users, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherWelcomeCardProps {
  stats?: {
    assignedClasses: number;
    totalStudents: number;
    departments: number;
  };
}

export function TeacherWelcomeCard({ stats }: TeacherWelcomeCardProps) {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickStats = [
    { icon: BookOpen, label: 'Classes', value: stats?.assignedClasses || 0, color: 'bg-white/20 text-white' },
    { icon: Users, label: 'Students', value: stats?.totalStudents || 0, color: 'bg-teal-400/25 text-teal-100' },
    { icon: GraduationCap, label: 'Departments', value: stats?.departments || 0, color: 'bg-amber-400/25 text-amber-200' },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-4 sm:p-5 text-white shadow-lg shadow-emerald-600/20"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-300/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <Sparkles className="w-3 h-3" />
              <span className="font-medium">{getGreeting()}</span>
            </div>

            <h1 className="mt-0.5 truncate text-lg sm:text-xl lg:text-2xl font-display font-bold">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>

            {/* The blurb is desktop-only — on a phone it is the biggest block
                of the card and adds nothing the teacher does not know. */}
            <p className="hidden lg:block mt-1 max-w-md text-sm text-white/80">
              Manage your classes, track student performance, and stay connected with your department.
            </p>

            {/* Faculty badge */}
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-white/20 px-2.5 py-1 sm:px-3 sm:py-1.5">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold truncate max-w-[12rem]">
                {user?.department || 'Department'}
              </span>
              <span className="text-[10px] text-white/70 hidden sm:inline">· Faculty</span>
            </div>
          </div>

          {/* Quick Stats — a compact 3-up row on mobile, stacked on desktop. */}
          <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-2 shrink-0">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-0',
                  'bg-white/10 hover:bg-white/15 transition-colors'
                )}
              >
                <div className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0', stat.color)}>
                  <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-bold leading-none">{stat.value}</p>
                  <p className="text-[9px] sm:text-[10px] opacity-80 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
