import { motion } from 'framer-motion';
import { 
  Clock, MapPin, Users, Coffee, BookOpen, 
  ChevronLeft, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';

type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';

interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  department: string;
  semester: number;
  room: string;
  type: 'class' | 'lab' | 'break';
}

interface ClassRoutine {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  department: {
    id: string;
    name: string;
  };
  semester: number;
  room_number: string;
  class_type: string;
  lab_name?: string;
}

const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const typeStyles = {
  class: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    icon: BookOpen,
    iconBg: 'bg-primary',
  },
  lab: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: BookOpen,
    iconBg: 'bg-emerald-500',
  },
  break: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: Coffee,
    iconBg: 'bg-amber-500',
  },
};

interface TeacherScheduleTabProps {
  teacherId: string;
}

export function TeacherScheduleTab({ teacherId }: TeacherScheduleTabProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const today = new Date().getDay();
    if (today === 0) return 'Sunday';
    if (today >= 1 && today <= 4) return days[today] as DayOfWeek;
    return 'Sunday'; // Default to Sunday for Friday/Saturday
  });
  
  const [schedule, setSchedule] = useState<Record<DayOfWeek, ScheduleSlot[]>>({
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherRoutine();
  }, [teacherId]);

  const fetchTeacherRoutine = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch teacher's routine from API
      const response = await apiClient.get<{ count: number; routines: ClassRoutine[] }>(
        `/class-routines/my-routine/`,
        { teacher: teacherId }
      );

      // Transform API data to schedule format
      const scheduleByDay: Record<DayOfWeek, ScheduleSlot[]> = {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
      };

      response.routines.forEach((routine) => {
        const day = routine.day_of_week as DayOfWeek;
        if (days.includes(day)) {
          scheduleByDay[day].push({
            id: routine.id,
            startTime: routine.start_time.substring(0, 5), // Format HH:MM
            endTime: routine.end_time.substring(0, 5),
            subject: routine.subject_name,
            subjectCode: routine.subject_code,
            department: routine.department.name,
            semester: routine.semester,
            room: routine.room_number,
            type: routine.class_type.toLowerCase() === 'lab' ? 'lab' : 'class',
          });
        }
      });

      // Sort each day's schedule by start time
      Object.keys(scheduleByDay).forEach((day) => {
        scheduleByDay[day as DayOfWeek].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
      });

      setSchedule(scheduleByDay);
    } catch (err: any) {
      console.error('Error fetching teacher routine:', err);
      setError(err.message || 'Failed to load teacher schedule');
    } finally {
      setLoading(false);
    }
  };

  const currentDayIndex = days.indexOf(selectedDay);

  const goToPrevDay = () => {
    if (currentDayIndex > 0) {
      setSelectedDay(days[currentDayIndex - 1]);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex < days.length - 1) {
      setSelectedDay(days[currentDayIndex + 1]);
    }
  };

  const totalClasses = Object.values(schedule).flat().filter(s => s.type !== 'break').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
        <p className="text-destructive font-medium mb-2">Failed to load schedule</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchTeacherRoutine} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Week Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm md:text-base lg:text-lg font-semibold">Weekly Overview</h3>
          <span className="text-[10px] md:text-xs text-muted-foreground">
            {totalClasses} classes this week
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {days.map((day) => {
            const dayClasses = schedule[day].filter(s => s.type !== 'break');
            const isSelected = day === selectedDay;
            const isToday = new Date().getDay() === days.indexOf(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative p-2 md:p-3 rounded-lg md:rounded-xl border transition-all",
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card hover:bg-muted border-border"
                )}
              >
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                )}
                <p className="text-[10px] md:text-xs font-medium">{day.slice(0, 3)}</p>
                <p className={cn(
                  "text-lg md:text-xl font-bold",
                  isSelected ? "text-primary-foreground" : ""
                )}>
                  {dayClasses.length}
                </p>
                <p className={cn(
                  "text-[9px] md:text-[10px]",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  classes
                </p>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Day Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevDay}
          disabled={currentDayIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <h3 className="text-base md:text-lg font-semibold">{selectedDay}'s Schedule</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextDay}
          disabled={currentDayIndex === days.length - 1}
          className="gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Schedule Timeline */}
      <div className="space-y-3 md:space-y-4">
        {schedule[selectedDay].length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-xl md:rounded-2xl border border-border p-8 text-center"
          >
            <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No classes scheduled for {selectedDay}</p>
          </motion.div>
        ) : (
          schedule[selectedDay].map((slot, index) => {
            const styles = typeStyles[slot.type];
            const Icon = styles.icon;

            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={cn(
                  "bg-card rounded-xl md:rounded-2xl border p-4 md:p-5 shadow-card transition-all",
                  styles.border,
                  slot.type !== 'break' && "hover:shadow-card-hover"
                )}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Time Column */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center",
                      styles.iconBg
                    )}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="w-0.5 h-full bg-border mt-2 hidden md:block" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm md:text-base font-semibold">{slot.subject}</h4>
                        {slot.subjectCode && (
                          <p className="text-xs text-muted-foreground">{slot.subjectCode}</p>
                        )}
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] md:text-xs font-medium capitalize",
                        styles.bg
                      )}>
                        {slot.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[10px] md:text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                      {slot.room && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{slot.type === 'lab' ? slot.room : `Room ${slot.room}`}</span>
                        </div>
                      )}
                      {slot.department && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{slot.department} - Sem {slot.semester}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
