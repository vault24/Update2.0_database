import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, BookOpen, CheckCircle2, CalendarOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';

type ClassStatus = 'completed' | 'ongoing' | 'upcoming';

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  department: string;
  semester: number;
  shift: string;
  session: string;
  room: string;
  classType?: string;
}

const WEEK_DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export function TeacherScheduleWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isClassDay = WEEK_DAYS.includes(dayName as DayOfWeek);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!user?.relatedProfileId || !isClassDay) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await routineService.getRoutine({
          teacher: user.relatedProfileId,
          day_of_week: dayName as DayOfWeek,
          is_active: true,
          page_size: 50,
        });
        const mapped: ScheduleItem[] = response.results
          .map((r: ClassRoutine) => ({
            id: r.id,
            startTime: r.start_time.slice(0, 5),
            endTime: r.end_time.slice(0, 5),
            subject: r.subject_name,
            subjectCode: r.subject_code,
            department: r.department?.code || r.department?.name || '',
            semester: r.semester,
            shift: r.shift,
            session: r.session,
            room: r.class_type === 'Lab' && r.lab_name ? r.lab_name : r.room_number,
            classType: r.class_type,
          }))
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        setItems(mapped);
      } catch (err) {
        console.error('Failed to load teacher schedule:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [user?.relatedProfileId, dayName, isClassDay]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const getStatus = (item: ScheduleItem): ClassStatus => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    if (nowMinutes >= end) return 'completed';
    if (nowMinutes >= start) return 'ongoing';
    return 'upcoming';
  };

  const statusStyles: Record<ClassStatus, { bg: string; border: string; iconColor: string; badge: string; label: string }> = {
    completed: {
      bg: 'bg-muted/50',
      border: 'border-muted',
      iconColor: 'text-muted-foreground',
      badge: 'bg-muted text-muted-foreground',
      label: 'Completed',
    },
    ongoing: {
      bg: 'bg-primary/5',
      border: 'border-primary/50',
      iconColor: 'text-primary animate-pulse',
      badge: 'bg-primary text-primary-foreground',
      label: 'Ongoing',
    },
    upcoming: {
      bg: 'bg-card',
      border: 'border-border',
      iconColor: 'text-muted-foreground',
      badge: 'bg-secondary text-secondary-foreground',
      label: 'Upcoming',
    },
  };

  const classCount = items.length;

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
          <span>{classCount} {classCount === 1 ? 'Class' : 'Classes'}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarOff className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">
            {isClassDay ? 'No classes scheduled today' : 'Weekend — no classes today'}
          </p>
          <p className="text-xs mt-1">Enjoy your free time!</p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3 max-h-[320px] md:max-h-[400px] overflow-y-auto pr-1">
          {items.map((item, index) => {
            const itemStatus = getStatus(item);
            const styles = statusStyles[itemStatus];
            const StatusIcon = itemStatus === 'completed' ? CheckCircle2 : Clock;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className={cn(
                  "relative flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg md:rounded-xl border transition-all",
                  styles.bg,
                  styles.border,
                  itemStatus === 'ongoing' && 'ring-2 ring-primary/20'
                )}
              >
                <div className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0",
                  itemStatus === 'ongoing' ? 'bg-primary' : 'bg-muted'
                )}>
                  <StatusIcon className={cn(
                    "w-4 h-4 md:w-5 md:h-5",
                    itemStatus === 'ongoing' ? 'text-primary-foreground' : styles.iconColor
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn(
                        "text-xs md:text-sm font-medium truncate",
                        itemStatus === 'completed' && 'line-through text-muted-foreground'
                      )}>
                        {item.subject}
                        {item.classType === 'Lab' && (
                          <span className="ml-1.5 px-1 py-0.5 rounded text-[8px] md:text-[9px] font-semibold bg-accent/15 text-accent-foreground align-middle">LAB</span>
                        )}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </p>
                    </div>
                    <span className={cn(
                      "px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-medium flex-shrink-0",
                      styles.badge
                    )}>
                      {styles.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{item.department} · Sem {item.semester} · {item.shift}{item.session ? ` · ${item.session}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{item.room ? `Room ${item.room}` : 'Room TBA'}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
