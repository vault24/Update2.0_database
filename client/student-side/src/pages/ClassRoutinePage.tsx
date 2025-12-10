import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FlaskConical,
  Coffee,
  Monitor,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

type DisplayClassPeriod = {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  room: string;
  teacher: string;
};

const subjectColors: Record<string, string> = {
  Mathematics: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300',
  Physics: 'from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300',
  Chemistry: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  English: 'from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-700 dark:text-orange-300',
  Computer: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
  Break: 'from-muted to-muted border-border text-muted-foreground',
};

const getSubjectIcon = (subject: string) => {
  if (subject.includes('Lab')) return FlaskConical;
  if (subject === 'Break') return Coffee;
  if (subject === 'Computer') return Monitor;
  return BookOpen;
};

export default function ClassRoutinePage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [routine, setRoutine] = useState<ClassRoutine[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Record<DayOfWeek, (DisplayClassPeriod | null)[]>>({
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileDepartment, setProfileDepartment] = useState<string | undefined>(undefined);
  const [profileSemester, setProfileSemester] = useState<number | undefined>(undefined);
  const [profileShift, setProfileShift] = useState<string | undefined>(undefined);

  const formatTime = (time: string) => time?.slice(0, 5) || '';

  const buildSchedule = (routines: ClassRoutine[]) => {
    const normalized: DisplayClassPeriod[] = routines.map((routineItem) => ({
      id: routineItem.id,
      day: routineItem.day_of_week,
      startTime: formatTime(routineItem.start_time),
      endTime: formatTime(routineItem.end_time),
      subject: routineItem.subject_name,
      code: routineItem.subject_code,
      room: routineItem.room_number || 'TBA',
      teacher: routineItem.teacher?.full_name_english || 'TBA',
    }));

    const timeToMinutes = (value: string) => {
      const [h, m] = value.split(':').map(Number);
      return h * 60 + m;
    };

    const slotKeys = Array.from(new Set(normalized.map((item) => `${item.startTime}-${item.endTime}`))).sort(
      (a, b) => {
        const [aStart] = a.split('-');
        const [bStart] = b.split('-');
        return timeToMinutes(aStart) - timeToMinutes(bStart);
      }
    );

    const initialSchedule: Record<DayOfWeek, (DisplayClassPeriod | null)[]> = {
      Sunday: slotKeys.map(() => null),
      Monday: slotKeys.map(() => null),
      Tuesday: slotKeys.map(() => null),
      Wednesday: slotKeys.map(() => null),
      Thursday: slotKeys.map(() => null),
    };

    normalized.forEach((period) => {
      const key = `${period.startTime}-${period.endTime}`;
      const index = slotKeys.indexOf(key);
      if (index >= 0) {
        initialSchedule[period.day][index] = period;
      }
    });

    return {
      timeSlots: slotKeys.map((slot) => slot.replace('-', ' - ')),
      schedule: initialSchedule,
    };
  };

  useEffect(() => {
    if (!authLoading && user) {
      // Load missing academic profile fields if not present on auth user
      const ensureProfile = async () => {
        try {
          // Skip student profile fetch for teachers
          if (user.role === 'teacher') {
            setProfileLoaded(true);
            return;
          }

          if (user.department && user.semester) {
            setProfileDepartment(user.department);
            setProfileSemester(user.semester);
            setProfileShift(user.shift as string | undefined);
            setProfileLoaded(true);
            return;
          }
          if (user.relatedProfileId) {
            const student = await studentService.getStudent(user.relatedProfileId);
            const deptId = typeof student.department === 'string' ? student.department : student.department?.id;
            setProfileDepartment(deptId);
            setProfileSemester(student.semester);
            setProfileShift(student.shift);
          }
        } catch (err) {
          // fall back to existing user fields if available
          setError(getErrorMessage(err));
        } finally {
          setProfileLoaded(true);
        }
      };

      ensureProfile();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (profileLoaded && user) {
      // Skip routine fetch for teachers
      if (user.role === 'teacher') {
        setLoading(false);
        setError('Class routine is not available for teachers. Please use the teacher dashboard.');
        return;
      }
      fetchRoutine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, user]);

  const fetchRoutine = async () => {
    // Don't fetch routine for teachers
    if (user?.role === 'teacher') {
      setLoading(false);
      setError('Class routine is not available for teachers. Please use the teacher dashboard.');
      return;
    }

    const departmentId = profileDepartment || user?.department;
    const semesterValue = profileSemester || user?.semester;
    const shiftValue = profileShift || (user as any)?.shift || 'Day';

    if (!departmentId || !semesterValue) {
      // Await profile resolution before showing error
      if (profileLoaded) {
        setError('User profile incomplete');
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await routineService.getMyRoutine({
        department: departmentId,
        semester: semesterValue,
        shift: shiftValue as any,
      });
      setRoutine(data.routines);
      const { timeSlots, schedule } = buildSchedule(data.routines);
      setTimeSlots(timeSlots);
      setSchedule(schedule);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load routine', {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const hasData = useMemo(() => routine.length > 0 && timeSlots.length > 0, [routine.length, timeSlots.length]);
  const weeklySchedule = schedule;

  const todayClasses = weeklySchedule[selectedDay]?.filter((c) => c) || [];
  const totalClasses = todayClasses.length;
  const labSessions = todayClasses.filter((c) => c?.subject?.toLowerCase().includes('lab')).length;
  const theorySessions = totalClasses - labSessions;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading routine...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && routine.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Routine</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
          <Button onClick={fetchRoutine} variant="hero">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!loading && !error && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No routine available</h3>
            <p className="text-muted-foreground mb-4">Your department has not published a routine yet.</p>
          </div>
          <Button onClick={fetchRoutine} variant="hero">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4"
      >
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold">Class Routine</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">Your weekly schedule at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        {[
          { label: 'Classes Today', value: totalClasses, icon: BookOpen, color: 'text-primary' },
          { label: 'Lab Sessions', value: labSessions, icon: FlaskConical, color: 'text-warning' },
          { label: 'Theory', value: theorySessions, icon: Users, color: 'text-success' },
          { label: 'Working Days', value: days.length, icon: Calendar, color: 'text-accent' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-2 md:p-3 lg:p-4 shadow-card"
          >
            <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
              <div className={cn("w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-md md:rounded-lg lg:rounded-xl bg-secondary flex items-center justify-center flex-shrink-0", stat.color)}>
                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base md:text-lg lg:text-2xl font-bold">{stat.value}</p>
                <p className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View Toggle & Day Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 shadow-card"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-3 md:mb-4">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="text-xs md:text-sm"
            >
              Week View
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="text-xs md:text-sm"
            >
              Day View
            </Button>
          </div>
          
          {viewMode === 'day' && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
              <div className="flex gap-1 overflow-x-auto">
                {days.map((day) => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDay(day)}
                    className="min-w-[60px] md:min-w-[80px] text-xs md:text-sm"
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto -mx-3 px-3 md:-mx-4 md:px-4 lg:mx-0 lg:px-0">
            <table className="w-full min-w-[600px] md:min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 md:py-2 lg:py-3 px-1.5 md:px-2 lg:px-3 text-left text-[10px] md:text-xs lg:text-sm font-medium text-muted-foreground w-12 md:w-16 lg:w-24">
                    <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 inline mr-0.5 md:mr-1" />
                    <span className="hidden md:inline">Time</span>
                  </th>
                  {days.map((day) => (
                    <th key={day} className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-2 text-center text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">
                      <span className="md:hidden">{day.slice(0, 3)}</span>
                      <span className="hidden md:inline">{day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, timeIndex) => (
                  <tr key={time} className="border-b border-border/50">
                    <td className="py-1.5 md:py-2 px-1.5 md:px-2 lg:px-3 text-[9px] md:text-[10px] lg:text-xs text-muted-foreground font-medium whitespace-nowrap">
                      <span className="hidden sm:inline">{time}</span>
                      <span className="sm:hidden">{time.split(' - ')[0]}</span>
                    </td>
                    {days.map((day) => {
                      const period = weeklySchedule[day]?.[timeIndex];
                      if (!period) {
                        return (
                          <td key={day} className="py-1.5 md:py-2 px-0.5 md:px-1">
                            <div className="h-12 md:h-14 lg:h-16 rounded-md md:rounded-lg bg-secondary/30 border border-dashed border-border/50" />
                          </td>
                        );
                      }
                      const Icon = getSubjectIcon(period.subject);
                      const colorClass = subjectColors[period.subject.split(' ')[0]] || subjectColors.Computer;
                      
                      return (
                        <td key={day} className="py-1.5 md:py-2 px-0.5 md:px-1">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={cn(
                              "h-12 md:h-14 lg:h-16 rounded-md md:rounded-lg border p-1 md:p-1.5 lg:p-2 bg-gradient-to-br cursor-pointer transition-all",
                              colorClass
                            )}
                          >
                            <div className="flex items-start gap-0.5 md:gap-1 lg:gap-1.5 h-full">
                              <Icon className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] md:text-[10px] lg:text-xs font-semibold truncate leading-tight">{period.subject}</p>
                                <p className="text-[8px] md:text-[9px] lg:text-[10px] opacity-70 truncate leading-tight">{period.room}</p>
                                <p className="text-[8px] md:text-[9px] lg:text-[10px] opacity-60 truncate leading-tight hidden md:block">{period.teacher}</p>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="space-y-2 md:space-y-3">
            <h3 className="text-sm md:text-base lg:text-lg font-semibold">{selectedDay}'s Schedule</h3>
            {weeklySchedule[selectedDay]?.filter((p) => p !== null).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No classes scheduled for {selectedDay}
              </div>
            ) : (
              weeklySchedule[selectedDay]?.map((period, index) => {
                if (!period) return null;
                const Icon = getSubjectIcon(period.subject);
                const colorClass = subjectColors[period.subject.split(' ')[0]] || subjectColors.Computer;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-2 md:gap-3 lg:gap-4 p-2.5 md:p-3 lg:p-4 rounded-lg md:rounded-xl border bg-gradient-to-r',
                      colorClass
                    )}
                  >
                    <div className="text-center min-w-[60px] md:min-w-[70px] lg:min-w-[80px]">
                      <p className="text-[9px] md:text-[10px] lg:text-xs opacity-70">Period {index + 1}</p>
                      <p className="text-[10px] md:text-xs lg:text-sm font-semibold leading-tight">{timeSlots[index]}</p>
                    </div>
                    <div className="w-px h-8 md:h-10 lg:h-12 bg-current opacity-20" />
                    <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-md md:rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm lg:text-base font-semibold truncate">{period.subject}</p>
                      <p className="text-[10px] md:text-xs lg:text-sm opacity-70 truncate">
                        {period.code} • {period.room} • {period.teacher}
                      </p>
                    </div>
                    {period.subject.toLowerCase().includes('lab') && (
                      <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[9px] md:text-[10px] lg:text-xs font-medium bg-warning/20 text-warning rounded-full flex-shrink-0">
                        Lab
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-2.5 md:p-3 lg:p-4 shadow-card"
      >
        <h4 className="text-xs md:text-sm lg:text-base font-semibold mb-2 md:mb-3">Subject Legend</h4>
        <div className="flex flex-wrap gap-1.5 md:gap-2 lg:gap-3">
          {Object.entries(subjectColors).filter(([k]) => k !== 'Break').map(([subject, colorClass]) => (
            <div key={subject} className={cn("flex items-center gap-1 md:gap-1.5 lg:gap-2 px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 lg:py-1.5 rounded-md lg:rounded-lg border bg-gradient-to-r", colorClass)}>
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 lg:w-2 lg:h-2 rounded-full bg-current" />
              <span className="text-[9px] md:text-[10px] lg:text-xs font-medium">{subject}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
