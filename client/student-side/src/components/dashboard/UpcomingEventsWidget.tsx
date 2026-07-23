import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { examRoutineService, type RoutineExam } from '@/services/examRoutineService';

interface UpcomingEvent {
  id: string;
  title: string;
  subtitle: string;
  date: Date;
  time: string;
  isReferred: boolean;
  examType: string;
}

const to12h = (time: string) => {
  const [hStr, m] = time.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

/** Real upcoming events, built from the student's personalized BTEB exam
 *  routine (final + mid). Clicking anything opens the Exam Routine page. */
export function UpcomingEventsWidget() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [finalRes, midRes] = await Promise.allSettled([
          examRoutineService.getMyRoutine('final'),
          examRoutineService.getMyRoutine('mid'),
        ]);

        const collected: UpcomingEvent[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pushExams = (exams: RoutineExam[] | undefined, examType: string) => {
          (exams || []).forEach((exam) => {
            const date = parseISO(exam.date);
            if (isNaN(date.getTime()) || date < today) return;
            collected.push({
              id: `${examType}-${exam.subjectCode}-${exam.date}`,
              title: exam.subjectName || exam.subjectCode,
              subtitle: `${exam.subjectCode} · ${examType}${exam.isReferred ? ' · Referred' : ''}`,
              date,
              time: to12h(exam.startTime),
              isReferred: exam.isReferred,
              examType,
            });
          });
        };

        if (finalRes.status === 'fulfilled' && finalRes.value.available) {
          pushExams(finalRes.value.exams, 'Final Exam');
        }
        if (midRes.status === 'fulfilled' && midRes.value.available) {
          pushExams(midRes.value.exams, 'Mid Exam');
        }

        collected.sort((a, b) => a.date.getTime() - b.date.getTime());
        if (active) setEvents(collected.slice(0, 4));
      } catch {
        // Non-critical dashboard widget — fall through to the empty state.
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    const days = differenceInCalendarDays(date, new Date());
    if (days < 7) return format(date, 'EEEE');
    return format(date, 'EEE, MMM d');
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold">Upcoming Exams</h3>
        </div>
        <button
          onClick={() => navigate('/dashboard/exam-routine')}
          className="text-sm text-primary hover:underline flex items-center gap-1 py-1.5 px-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No upcoming exams</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your exam schedule will appear here once a routine is published.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((event, index) => (
            <motion.button
              key={event.id}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => navigate('/dashboard/exam-routine')}
              className={cn(
                'w-full text-left flex items-center gap-3 p-3 rounded-xl',
                'bg-secondary/30 hover:bg-secondary/50 active:bg-secondary/60 transition-all',
                'border border-transparent hover:border-border'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
                  event.isReferred
                    ? 'from-amber-500 to-orange-500'
                    : 'from-emerald-500 to-teal-600'
                )}
              >
                {event.isReferred
                  ? <RefreshCcw className="w-5 h-5 text-white" />
                  : <FileText className="w-5 h-5 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{event.title}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span
                    className={cn(
                      'font-medium',
                      isToday(event.date) && 'text-destructive'
                    )}
                  >
                    {getDateLabel(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.time}
                  </span>
                  <span className="hidden sm:inline truncate">{event.subtitle}</span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
