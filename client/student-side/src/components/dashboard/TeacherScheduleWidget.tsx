import { motion } from 'framer-motion';
import { Clock, MapPin, Users, BookOpen, Coffee, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleItem {
  id: string;
  time: string;
  subject: string;
  department: string;
  semester: number;
  room: string;
  status: 'completed' | 'ongoing' | 'upcoming' | 'break';
}

// Mock schedule data - In real app, this would come from API
const mockSchedule: ScheduleItem[] = [
  { id: '1', time: '09:00 - 10:30', subject: 'Database Systems', department: 'CSE', semester: 4, room: '301', status: 'completed' },
  { id: '2', time: '10:30 - 11:00', subject: 'Tea Break', department: '', semester: 0, room: '', status: 'break' },
  { id: '3', time: '11:00 - 12:30', subject: 'Software Engineering', department: 'CSE', semester: 5, room: '402', status: 'ongoing' },
  { id: '4', time: '14:00 - 15:30', subject: 'Web Development', department: 'CSE', semester: 6, room: '305', status: 'upcoming' },
  { id: '5', time: '15:30 - 17:00', subject: 'Computer Networks', department: 'EEE', semester: 5, room: '201', status: 'upcoming' },
];

export function TeacherScheduleWidget() {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const getStatusStyles = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-muted/50',
          border: 'border-muted',
          icon: CheckCircle2,
          iconColor: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
        };
      case 'ongoing':
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/50',
          icon: Clock,
          iconColor: 'text-primary animate-pulse',
          badge: 'bg-primary text-primary-foreground',
        };
      case 'upcoming':
        return {
          bg: 'bg-card',
          border: 'border-border',
          icon: Clock,
          iconColor: 'text-muted-foreground',
          badge: 'bg-secondary text-secondary-foreground',
        };
      case 'break':
        return {
          bg: 'bg-amber-500/5',
          border: 'border-amber-500/30',
          icon: Coffee,
          iconColor: 'text-amber-500',
          badge: 'bg-amber-500/20 text-amber-600',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <h2 className="text-sm md:text-base lg:text-lg font-semibold">Today's Schedule</h2>
          <p className="text-[10px] md:text-xs text-muted-foreground">{dayName}, {dateStr}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-medium">
          <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5" />
          <span>{mockSchedule.filter(s => s.status !== 'break').length} Classes</span>
        </div>
      </div>

      <div className="space-y-2 md:space-y-3 max-h-[320px] md:max-h-[400px] overflow-y-auto pr-1">
        {mockSchedule.map((item, index) => {
          const styles = getStatusStyles(item.status);
          const StatusIcon = styles.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={cn(
                "relative flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg md:rounded-xl border transition-all",
                styles.bg,
                styles.border,
                item.status === 'ongoing' && 'ring-2 ring-primary/20'
              )}
            >
              {/* Timeline dot */}
              <div className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0",
                item.status === 'ongoing' ? 'bg-primary' : 'bg-muted'
              )}>
                <StatusIcon className={cn(
                  "w-4 h-4 md:w-5 md:h-5",
                  item.status === 'ongoing' ? 'text-primary-foreground' : styles.iconColor
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn(
                      "text-xs md:text-sm font-medium truncate",
                      item.status === 'completed' && 'line-through text-muted-foreground'
                    )}>
                      {item.subject}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {item.time}
                    </p>
                  </div>
                  <span className={cn(
                    "px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-medium flex-shrink-0",
                    styles.badge
                  )}>
                    {item.status === 'break' ? 'Break' : item.status}
                  </span>
                </div>

                {item.status !== 'break' && (
                  <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2">
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{item.department} - Sem {item.semester}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>Room {item.room}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
