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
    { icon: BookOpen, label: 'Classes', value: stats?.assignedClasses || 0, color: 'bg-violet-500/20 text-violet-300' },
    { icon: Users, label: 'Students', value: stats?.totalStudents || 0, color: 'bg-emerald-500/20 text-emerald-300' },
    { icon: GraduationCap, label: 'Departments', value: stats?.departments || 0, color: 'bg-amber-500/20 text-amber-300' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 md:p-6 lg:p-8 text-white"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm font-medium opacity-90">{getGreeting()}</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-1 md:mb-2"
            >
              Welcome back, {user?.name?.split(' ')[0]}!
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/80 text-sm md:text-base max-w-md"
            >
              Manage your classes, track student performance, and stay connected with your department.
            </motion.p>

            {/* Teacher Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-3 md:mt-4 inline-flex items-center gap-2 md:gap-3 bg-white/15 backdrop-blur-xl rounded-full px-3 md:px-4 py-1.5 md:py-2"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs opacity-80">Faculty Member</p>
                <p className="text-xs md:text-sm font-semibold">{user?.department || 'Department'}</p>
              </div>
            </motion.div>
          </div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-2 md:gap-3 lg:flex lg:flex-col lg:gap-2"
          >
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={cn(
                  "flex items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-2.5 backdrop-blur-sm",
                  "bg-white/10 hover:bg-white/15 transition-colors"
                )}
              >
                <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center", stat.color)}>
                  <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <p className="text-base md:text-lg lg:text-xl font-bold">{stat.value}</p>
                  <p className="text-[9px] md:text-[10px] lg:text-xs opacity-80">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
