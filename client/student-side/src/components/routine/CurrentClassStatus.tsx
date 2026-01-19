import { motion } from 'framer-motion';
import { PlayCircle, Clock, ArrowRight, Coffee, Moon, CheckCircle, BookOpen, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type ClassPeriod = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  room: string;
  teacher: string;
};

type CurrentClassStatusProps = {
  runningClass: ClassPeriod | null;
  upcomingClass: ClassPeriod | null;
  isBreak: boolean;
  classesCompleted: boolean;
  totalClasses: number;
  currentTime: Date;
};

export function CurrentClassStatus({
  runningClass,
  upcomingClass,
  isBreak,
  classesCompleted,
  totalClasses,
  currentTime,
}: CurrentClassStatusProps) {
  const getTimeRemaining = (endTime: string) => {
    const [hours, minutes] = endTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes, 0, 0);
    const diff = endDate.getTime() - currentTime.getTime();
    const mins = Math.floor(diff / 60000);
    return mins > 0 ? mins : 0;
  };

  const getTimeUntil = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const diff = startDate.getTime() - currentTime.getTime();
    const mins = Math.floor(diff / 60000);
    return mins > 0 ? mins : 0;
  };

  // Determine status
  let statusType: 'running' | 'upcoming' | 'break' | 'completed' | 'noClass';
  if (runningClass) {
    statusType = 'running';
  } else if (isBreak && upcomingClass) {
    statusType = 'break';
  } else if (classesCompleted && totalClasses > 0) {
    statusType = 'completed';
  } else if (upcomingClass) {
    statusType = 'upcoming';
  } else {
    statusType = 'noClass';
  }

  const statusConfig = {
    running: {
      gradient: 'from-primary via-primary/90 to-primary/80',
      icon: PlayCircle,
      title: 'Class in Progress',
      iconAnimate: true,
    },
    upcoming: {
      gradient: 'from-blue-500 via-blue-500/90 to-indigo-500/80',
      icon: ArrowRight,
      title: 'Up Next',
      iconAnimate: false,
    },
    break: {
      gradient: 'from-amber-500 via-orange-500/90 to-amber-500/80',
      icon: Coffee,
      title: 'Break Time',
      iconAnimate: false,
    },
    completed: {
      gradient: 'from-emerald-500 via-green-500/90 to-emerald-500/80',
      icon: CheckCircle,
      title: 'All Done!',
      iconAnimate: false,
    },
    noClass: {
      gradient: 'from-slate-500 via-slate-500/90 to-slate-600/80',
      icon: Moon,
      title: 'No Classes',
      iconAnimate: false,
    },
  };

  const config = statusConfig[statusType];
  const Icon = config.icon;
  const displayClass = runningClass || upcomingClass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 text-white shadow-lg",
        `bg-gradient-to-r ${config.gradient}`
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center",
            config.iconAnimate && "animate-pulse"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/70">{config.title}</p>
            <p className="text-sm font-semibold">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Content */}
        {displayClass ? (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold truncate">{displayClass.subject}</h3>
                <p className="text-sm text-white/80">{displayClass.code}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {displayClass.startTime} - {displayClass.endTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {displayClass.room}
              </span>
            </div>

            {/* Progress or Time Indicator */}
            {statusType === 'running' && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/70">Time remaining</span>
                  <span className="font-semibold">{getTimeRemaining(displayClass.endTime)} min</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.max(0, Math.min(100, 100 - (getTimeRemaining(displayClass.endTime) / 45) * 100))}%` 
                    }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>
            )}

            {(statusType === 'upcoming' || statusType === 'break') && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    Starts in <span className="font-bold">{getTimeUntil(displayClass.startTime)} min</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/80">
              {statusType === 'completed' 
                ? `You completed ${totalClasses} classes today!` 
                : 'No classes scheduled for today'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
