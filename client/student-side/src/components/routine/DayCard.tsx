import { motion } from 'framer-motion';
import { BookOpen, FlaskConical, Coffee, Monitor, PlayCircle, Clock, MapPin, User } from 'lucide-react';
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

type DayCardProps = {
  day: string;
  classes: (ClassPeriod | null)[];
  timeSlots: string[];
  isToday: boolean;
  runningClassId?: string;
  upcomingClassId?: string;
};

const subjectColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Mathematics: { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500' },
  Physics: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500' },
  Chemistry: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
  English: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500' },
  Computer: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-600 dark:text-cyan-400', icon: 'text-cyan-500' },
  default: { bg: 'bg-primary/15', border: 'border-primary/30', text: 'text-primary', icon: 'text-primary' },
};

const getSubjectIcon = (subject: string) => {
  if (subject.includes('Lab')) return FlaskConical;
  if (subject === 'Break') return Coffee;
  if (subject === 'Computer') return Monitor;
  return BookOpen;
};

const getSubjectColor = (subject: string) => {
  const baseSubject = subject.split(' ')[0];
  return subjectColors[baseSubject] || subjectColors.default;
};

export function DayCard({ day, classes, timeSlots, isToday, runningClassId, upcomingClassId }: DayCardProps) {
  const validClasses = classes.filter((c) => c !== null);
  const classCount = validClasses.length;
  const labCount = validClasses.filter((c) => c?.subject.toLowerCase().includes('lab')).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "w-full min-w-[280px] max-w-[340px] bg-card rounded-2xl border shadow-card overflow-hidden flex-shrink-0 snap-center",
        isToday ? "border-primary/50 ring-2 ring-primary/20" : "border-border"
      )}
    >
      {/* Day Header */}
      <div className={cn(
        "px-4 py-3 border-b",
        isToday ? "bg-primary/10 border-primary/20" : "bg-muted/30 border-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-base font-bold",
              isToday ? "text-primary" : "text-foreground"
            )}>
              {day}
            </h3>
            {isToday && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
                Today
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {classCount}
            </span>
            {labCount > 0 && (
              <span className="flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                {labCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {classCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coffee className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No classes scheduled</p>
          </div>
        ) : (
          classes.map((period, index) => {
            if (!period) return null;
            const Icon = getSubjectIcon(period.subject);
            const colors = getSubjectColor(period.subject);
            const isRunning = runningClassId === period.id;
            const isUpcoming = upcomingClassId === period.id;
            const isLab = period.subject.toLowerCase().includes('lab');

            return (
              <motion.div
                key={period.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative p-3 rounded-xl border transition-all",
                  colors.bg,
                  colors.border,
                  isRunning && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                  isUpcoming && "ring-2 ring-warning/50 ring-offset-1 ring-offset-card"
                )}
              >
                {/* Status Badge */}
                {(isRunning || isUpcoming) && (
                  <div className={cn(
                    "absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    isRunning ? "bg-primary text-primary-foreground" : "bg-warning text-warning-foreground"
                  )}>
                    <PlayCircle className={cn("w-3 h-3", isRunning && "animate-pulse")} />
                    {isRunning ? "Now" : "Next"}
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{period.startTime} - {period.endTime}</span>
                  {isLab && (
                    <span className="ml-auto px-1.5 py-0.5 text-[9px] font-semibold bg-warning/20 text-warning-foreground rounded">
                      LAB
                    </span>
                  )}
                </div>

                {/* Subject */}
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    colors.bg
                  )}>
                    <Icon className={cn("w-4 h-4", colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", colors.text)}>
                      {period.subject}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{period.code}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-2 pt-2 border-t border-current/10 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {period.room}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3" />
                    {period.teacher}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
