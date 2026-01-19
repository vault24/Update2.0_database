import { motion } from 'framer-motion';
import { 
  BookOpen, Users, GraduationCap, TrendingUp, 
  ClipboardCheck, Award, Calendar, BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherStatsGridProps {
  stats: {
    assignedClasses: number;
    totalStudents: number;
    departments: number;
    semesters: number;
    attendanceRate?: number;
    pendingTasks?: number;
    upcomingClasses?: number;
    totalLectures?: number;
  };
}

export function TeacherStatsGrid({ stats }: TeacherStatsGridProps) {
  const statItems = [
    {
      icon: BookOpen,
      label: 'Assigned Classes',
      value: stats.assignedClasses.toString(),
      subtext: 'Active courses',
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-500/10',
    },
    {
      icon: Users,
      label: 'Total Students',
      value: stats.totalStudents.toString(),
      subtext: 'Under supervision',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: GraduationCap,
      label: 'Departments',
      value: stats.departments.toString(),
      subtext: 'Teaching across',
      color: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: BarChart3,
      label: 'Semesters',
      value: stats.semesters.toString(),
      subtext: 'Active semesters',
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-pink-500/10',
    },
    {
      icon: ClipboardCheck,
      label: 'Attendance Rate',
      value: `${stats.attendanceRate || 85}%`,
      subtext: 'Average class attendance',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Calendar,
      label: 'Today\'s Classes',
      value: (stats.upcomingClasses || 4).toString(),
      subtext: 'Scheduled for today',
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-500/10',
    },
    {
      icon: Award,
      label: 'Total Lectures',
      value: (stats.totalLectures || 127).toString(),
      subtext: 'This semester',
      color: 'from-amber-500 to-yellow-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Performance',
      value: 'A+',
      subtext: 'Student avg grade',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * index }}
          className={cn(
            "relative overflow-hidden rounded-xl md:rounded-2xl border border-border p-3 md:p-4",
            "bg-card shadow-card hover:shadow-card-hover transition-all duration-300 group"
          )}
        >
          {/* Background gradient on hover */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
            stat.bgColor
          )} />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className={cn(
                "w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg md:rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                stat.color
              )}>
                <stat.icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>

            <p className="text-lg md:text-xl lg:text-2xl font-bold mb-0.5">
              {stat.value}
            </p>
            <p className="text-[10px] md:text-xs font-medium text-foreground/80 truncate">
              {stat.label}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground truncate hidden md:block">
              {stat.subtext}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
