import { motion } from 'framer-motion';
import { Radio, Clock, MapPin, Users, CalendarCheck2, CalendarOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTeacherClassNotifications,
  timeToMinutes,
  formatClassTime,
  formatCountdown,
} from '@/hooks/useTeacherClassNotifications';

/**
 * Teacher "Current Class" box.
 * - Highlights the class currently running.
 * - Otherwise shows the next upcoming class with a live countdown.
 * (Class notifications themselves fire from useTeacherClassNotifications,
 *  which is also mounted at layout level so alerts work on every page.)
 */
export function TeacherClassStatusBox() {
  const { classes, currentClass, nextClass, nowMinutes, isClassDay } = useTeacherClassNotifications();

  const allDone = classes.length > 0 && !currentClass && !nextClass;

  if (!isClassDay || classes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-5 shadow-card flex items-center gap-4"
      >
        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <CalendarOff className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm md:text-base">No classes today</p>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isClassDay ? 'Your schedule is clear for today.' : "It's the weekend — enjoy your day off!"}
          </p>
        </div>
      </motion.div>
    );
  }

  if (currentClass) {
    const end = timeToMinutes(currentClass.endTime);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-xl md:rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card p-4 md:p-5 shadow-card"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
            <Radio className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] md:text-xs font-bold uppercase tracking-wide">
                Current Class
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                ends in {formatCountdown(end - nowMinutes)}
              </span>
            </div>
            <p className="font-bold text-base md:text-lg mt-1.5 truncate">{currentClass.subject}</p>
            <div className="flex items-center gap-3 md:gap-4 mt-1.5 text-xs md:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatClassTime(currentClass.startTime)} – {formatClassTime(currentClass.endTime)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Room {currentClass.room || 'TBA'}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{currentClass.department} · Sem {currentClass.semester} · {currentClass.shift}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (nextClass) {
    const start = timeToMinutes(nextClass.startTime);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-5 shadow-card"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] md:text-xs font-bold uppercase tracking-wide">
                Next Class
              </span>
              <span className={cn(
                "text-[10px] md:text-xs font-semibold",
                start - nowMinutes <= 10 ? 'text-primary' : 'text-muted-foreground'
              )}>
                starts in {formatCountdown(start - nowMinutes)}
              </span>
            </div>
            <p className="font-bold text-base md:text-lg mt-1.5 truncate">{nextClass.subject}</p>
            <div className="flex items-center gap-3 md:gap-4 mt-1.5 text-xs md:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatClassTime(nextClass.startTime)} – {formatClassTime(nextClass.endTime)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Room {nextClass.room || 'TBA'}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{nextClass.department} · Sem {nextClass.semester} · {nextClass.shift}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return allDone ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-xl md:rounded-2xl border border-success/30 bg-gradient-to-r from-success/5 to-card p-4 md:p-5 shadow-card flex items-center gap-4"
    >
      <div className="w-11 h-11 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
        <CalendarCheck2 className="w-5 h-5 text-success" />
      </div>
      <div>
        <p className="font-semibold text-sm md:text-base">All classes completed</p>
        <p className="text-xs md:text-sm text-muted-foreground">
          You finished all {classes.length} {classes.length === 1 ? 'class' : 'classes'} for today. Great work!
        </p>
      </div>
    </motion.div>
  ) : null;
}
