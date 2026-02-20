import { motion } from 'framer-motion';
import { 
  BarChart3, Clock, BookOpen, Award, TrendingUp, Target, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentStatsCardProps {
  gpa: number | string;
  attendancePercentage: number;
  subjectsCount: number;
  creditsCompleted?: number;
  totalCredits?: number;
  rank?: number | string;
}

export function StudentStatsCard({
  gpa,
  attendancePercentage,
  subjectsCount,
  creditsCompleted = 0,
  totalCredits = 160,
  rank = '-'
}: StudentStatsCardProps) {
  const stats = [
    {
      icon: BarChart3,
      label: 'Current GPA',
      value: typeof gpa === 'number' ? gpa.toFixed(2) : gpa,
      subLabel: 'out of 4.00',
      color: 'from-emerald-500 to-teal-600',
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      icon: Clock,
      label: 'Attendance',
      value: `${attendancePercentage}%`,
      subLabel: 'this semester',
      color: 'from-blue-500 to-indigo-600',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: BookOpen,
      label: 'Subjects',
      value: subjectsCount,
      subLabel: 'enrolled',
      color: 'from-violet-500 to-purple-600',
      iconColor: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    {
      icon: Award,
      label: 'Class Rank',
      value: rank,
      subLabel: 'in department',
      color: 'from-amber-500 to-orange-600',
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 w-full">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * index }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="group relative bg-card rounded-xl lg:rounded-2xl border border-border p-3 md:p-5 shadow-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30 min-w-0"
        >
          {/* Background gradient on hover */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br",
            stat.color
          )} style={{ opacity: 0.05 }} />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                stat.bgColor
              )}>
                <stat.icon className={cn("w-4 h-4 md:w-6 md:h-6", stat.iconColor)} />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
            </div>
            
            <p className="text-xl md:text-3xl font-bold mb-0.5 truncate">{stat.value}</p>
            <p className="text-[11px] md:text-sm font-medium text-foreground truncate">{stat.label}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.subLabel}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
