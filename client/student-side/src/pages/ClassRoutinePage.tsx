import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Download,
  BookOpen,
  FlaskConical,
  Coffee,
  Monitor,
  Users,
  Loader2,
  AlertCircle,
  PlayCircle,
  Timer,
  RefreshCw,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { SwipeableDays } from '@/components/routine/SwipeableDays';
import { CurrentClassStatus } from '@/components/routine/CurrentClassStatus';

const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayAbbreviations: Record<DayOfWeek, string> = {
  'Sunday': 'Sun',
  'Monday': 'Mon', 
  'Tuesday': 'Tue',
  'Wednesday': 'Wed',
  'Thursday': 'Thu'
};

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
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
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileDepartment, setProfileDepartment] = useState<string | undefined>(undefined);
  const [profileSemester, setProfileSemester] = useState<number | undefined>(undefined);
  const [profileShift, setProfileShift] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const formatTime = (time: string) => time?.slice(0, 5) || '';

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Get current running class
  const getCurrentRunningClass = (): DisplayClassPeriod | null => {
    const now = currentTime;
    const dayIndex = now.getDay();
    const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : null;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (!currentDay || !weeklySchedule[currentDay]) return null;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    
    for (const period of weeklySchedule[currentDay]) {
      if (!period) continue;
      const startMinutes = timeToMinutes(period.startTime);
      const endMinutes = timeToMinutes(period.endTime);
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return period;
      }
    }
    return null;
  };

  // Get next upcoming class
  const getUpcomingClass = (): DisplayClassPeriod | null => {
    const now = currentTime;
    const dayIndex = now.getDay();
    const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : null;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (!currentDay || !weeklySchedule[currentDay]) return null;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    let nextClass: DisplayClassPeriod | null = null;
    let minTimeDiff = Infinity;
    
    for (const period of weeklySchedule[currentDay]) {
      if (!period) continue;
      const startMinutes = timeToMinutes(period.startTime);
      if (startMinutes > currentMinutes) {
        const timeDiff = startMinutes - currentMinutes;
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nextClass = period;
        }
      }
    }
    return nextClass;
  };

  // Check if currently in break time
  const isBreakTime = (): boolean => {
    const now = currentTime;
    const dayIndex = now.getDay();
    const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : null;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (!currentDay || !weeklySchedule[currentDay]) return false;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    const runningClass = getCurrentRunningClass();
    
    if (!runningClass) {
      const todayClasses = weeklySchedule[currentDay].filter(c => c !== null);
      if (todayClasses.length === 0) return false;
      
      for (let i = 0; i < todayClasses.length - 1; i++) {
        const currentClassEnd = timeToMinutes(todayClasses[i]!.endTime);
        const nextClassStart = timeToMinutes(todayClasses[i + 1]!.startTime);
        if (currentMinutes > currentClassEnd && currentMinutes < nextClassStart) {
          return true;
        }
      }
    }
    return false;
  };

  // Check if all classes are completed
  const areClassesCompleted = (): boolean => {
    const now = currentTime;
    const dayIndex = now.getDay();
    const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : null;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (!currentDay || !weeklySchedule[currentDay]) return false;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    const todayClasses = weeklySchedule[currentDay].filter(c => c !== null);
    
    if (todayClasses.length === 0) return false;
    
    const lastClass = todayClasses[todayClasses.length - 1];
    if (lastClass) {
      const lastClassEnd = timeToMinutes(lastClass.endTime);
      return currentMinutes > lastClassEnd;
    }
    return false;
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!user || user.role === 'teacher' || !profileLoaded) return;
    const refreshInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      if (timeSinceLastRefresh >= 2 * 60 * 1000) {
        routineService.cache.invalidateByFilters({
          department: profileDepartment || user?.department,
          semester: profileSemester || user?.semester,
          shift: profileShift || (user as any)?.shift
        });
        fetchRoutine(false);
        setLastRefresh(Date.now());
      }
    }, 30000);
    return () => clearInterval(refreshInterval);
  }, [user, profileLoaded, profileDepartment, profileSemester, profileShift, lastRefresh]);

  const timeSlotUtils = {
    timeToMinutes: (time: string): number => {
      if (!time || typeof time !== 'string') return 0;
      const parts = time.split(':');
      if (parts.length < 2) return 0;
      const [h, m] = parts.map(Number);
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    },
    formatTime: (time: string): string => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length < 2) return time;
      const [h, m] = parts;
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    },
    generateTimeSlots: (routines: ClassRoutine[]): string[] => {
      const timePeriods = new Set<string>();
      routines.forEach(routine => {
        if (routine.start_time && routine.end_time) {
          if (timeSlotUtils.validateTimeSlot(routine.start_time, routine.end_time)) {
            const startTime = timeSlotUtils.formatTime(routine.start_time);
            const endTime = timeSlotUtils.formatTime(routine.end_time);
            timePeriods.add(`${startTime}-${endTime}`);
          }
        }
      });
      return Array.from(timePeriods)
        .filter(slot => slot && slot.includes('-'))
        .sort((a, b) => {
          const [aStart] = a.split('-');
          const [bStart] = b.split('-');
          return timeSlotUtils.timeToMinutes(aStart) - timeSlotUtils.timeToMinutes(bStart);
        });
    },
    generateFallbackTimeSlots: (shift: string): string[] => {
      const fallbackSlots: Record<string, string[]> = {
        Morning: ['08:00-08:45', '08:45-09:30', '09:30-10:15', '10:15-11:00', '11:00-11:45', '11:45-12:30', '12:30-13:15'],
        Day: ['13:30-14:15', '14:15-15:00', '15:00-15:45', '15:45-16:30', '16:30-17:15', '17:15-18:00', '18:00-18:45'],
        Evening: ['18:30-19:15', '19:15-20:00', '20:00-20:45', '20:45-21:30'],
      };
      return fallbackSlots[shift] || fallbackSlots.Day;
    },
    validateTimeSlot: (startTime: string, endTime: string): boolean => {
      if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') return false;
      if (!startTime.includes(':') || !endTime.includes(':')) return false;
      const start = timeSlotUtils.timeToMinutes(startTime);
      const end = timeSlotUtils.timeToMinutes(endTime);
      return start < end && start >= 0 && end <= 24 * 60 && start !== 0 && end !== 0;
    }
  };

  const buildSchedule = (routines: ClassRoutine[]) => {
    const normalized: DisplayClassPeriod[] = routines
      .filter(routineItem => routineItem && routineItem.id && routineItem.day_of_week && 
        routineItem.start_time && routineItem.end_time && routineItem.subject_name &&
        timeSlotUtils.validateTimeSlot(routineItem.start_time, routineItem.end_time))
      .map((routineItem) => ({
        id: routineItem.id,
        day: routineItem.day_of_week,
        startTime: timeSlotUtils.formatTime(routineItem.start_time),
        endTime: timeSlotUtils.formatTime(routineItem.end_time),
        subject: routineItem.subject_name || 'Unknown Subject',
        code: routineItem.subject_code || '',
        room: routineItem.room_number || 'TBA',
        teacher: routineItem.teacher?.fullNameEnglish || 'TBA',
      }));

    let slotKeys = timeSlotUtils.generateTimeSlots(routines);
    if (slotKeys.length === 0) {
      const shift = routines.length > 0 ? routines[0].shift : 'Day';
      slotKeys = timeSlotUtils.generateFallbackTimeSlots(shift);
      if (slotKeys.length === 0) {
        return { timeSlots: [], schedule: { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [] } };
      }
    }

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
      if (index >= 0 && initialSchedule[period.day]) {
        initialSchedule[period.day][index] = period;
      }
    });

    return { timeSlots: slotKeys.map((slot) => slot.replace('-', ' - ')), schedule: initialSchedule };
  };

  useEffect(() => {
    if (!authLoading && user) {
      const ensureProfile = async () => {
        try {
          if (user.role === 'teacher') {
            setProfileLoaded(true);
            return;
          }
          if (user.department && user.semester) {
            setProfileDepartment(user.department);
            setProfileSemester(user.semester);
            setProfileShift((user as any).shift as string | undefined);
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
          const errorMsg = getErrorMessage(err);
          if (user?.department && user?.semester) {
            setProfileDepartment(user.department);
            setProfileSemester(user.semester);
            setProfileShift((user as any).shift as string | undefined);
            toast.warning('Profile data partially loaded');
          } else {
            setError(`Profile loading failed: ${errorMsg}`);
          }
        } finally {
          setProfileLoaded(true);
        }
      };
      ensureProfile();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (profileLoaded && user) {
      if (user.role === 'teacher') {
        setLoading(false);
        setError('Class routine is not available for teachers.');
        return;
      }
      fetchRoutine();
    }
  }, [profileLoaded, user]);

  const fetchRoutine = async (isRetry: boolean = false) => {
    if (user?.role === 'teacher') {
      setLoading(false);
      setError('Class routine is not available for teachers.');
      return;
    }

    const departmentId = profileDepartment || user?.department;
    const semesterValue = profileSemester || user?.semester;
    const shiftValue = profileShift || (user as any)?.shift || 'Day';

    if (!departmentId || !semesterValue) {
      if (profileLoaded) {
        setError('User profile incomplete.');
        setLoading(false);
      }
      return;
    }

    try {
      if (isRetry) setIsRetrying(true);
      else { setLoading(true); setRetryCount(0); }
      setError(null);
      
      const queryParams: any = { department: departmentId, semester: semesterValue, shift: shiftValue };
      if (isRetry || Date.now() - lastRefresh > 60000) queryParams._t = Date.now();
      
      const data = await routineService.getMyRoutine(queryParams);
      setRoutine(data.routines);
      const { timeSlots, schedule } = buildSchedule(data.routines);
      setTimeSlots(timeSlots);
      setSchedule(schedule);
      setRetryCount(0);
      setLastRefresh(Date.now());
      
      if (isRetry) toast.success('Routine loaded successfully');
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      
      const isNetworkError = errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('timeout');
      if (isNetworkError && retryCount < 3 && !isRetry) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchRoutine(true), 2000 * (retryCount + 1));
        toast.warning('Connection issue detected', { description: `Retrying (${retryCount + 1}/3)...` });
        return;
      }
      toast.error('Failed to load routine', { description: errorMsg });
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const hasData = useMemo(() => routine.length > 0 && timeSlots.length > 0, [routine.length, timeSlots.length]);
  const weeklySchedule = schedule;

  const now = currentTime;
  const dayIndex = now.getDay();
  const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : days[0];
  const todayClasses = weeklySchedule[currentDay]?.filter((c) => c) || [];
  const totalClasses = todayClasses.length;
  const labSessions = todayClasses.filter((c) => c?.subject?.toLowerCase().includes('lab')).length;
  const theorySessions = totalClasses - labSessions;
  
  const runningClass = getCurrentRunningClass();
  const upcomingClass = getUpcomingClass();
  const isInBreak = isBreakTime();
  const classesCompleted = areClassesCompleted();

  // Loading
  if (loading || isRetrying) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{isRetrying ? 'Retrying...' : 'Loading routine...'}</p>
            {retryCount > 0 && <p className="text-xs text-muted-foreground mt-1">Attempt {retryCount + 1}/4</p>}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error && routine.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-card rounded-2xl border border-border p-6 max-w-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Unable to Load</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => fetchRoutine(false)} disabled={loading} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No data
  if (!loading && !error && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-card rounded-2xl border border-border p-6 max-w-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Calendar className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">No Routine Available</h3>
            <p className="text-sm text-muted-foreground">No class schedule found for your semester.</p>
          </div>
          <Button onClick={() => fetchRoutine(false)} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold">Class Routine</h1>
          <p className="text-xs text-muted-foreground">Your weekly schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => { routineService.cache.clear(); fetchRoutine(false); }}
            disabled={loading || isRetrying}
          >
            <RefreshCw className={cn("w-4 h-4", (loading || isRetrying) && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Current Status Card */}
      <CurrentClassStatus
        runningClass={runningClass}
        upcomingClass={upcomingClass}
        isBreak={isInBreak}
        classesCompleted={classesCompleted}
        totalClasses={totalClasses}
        currentTime={currentTime}
      />

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2"
      >
        {[
          { label: 'Today', value: totalClasses, icon: BookOpen, color: 'text-primary bg-primary/10' },
          { label: 'Labs', value: labSessions, icon: FlaskConical, color: 'text-warning bg-warning/10' },
          { label: 'Theory', value: theorySessions, icon: Users, color: 'text-success bg-success/10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <div className={cn("w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1.5", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit"
      >
        <button
          onClick={() => setViewMode('cards')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            viewMode === 'cards' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          Cards
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            viewMode === 'table' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Table
        </button>
      </motion.div>

      {/* Swipeable Cards View */}
      {viewMode === 'cards' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SwipeableDays
            days={days}
            schedule={weeklySchedule}
            timeSlots={timeSlots}
            currentDay={currentDay}
            runningClassId={runningClass?.id}
            upcomingClassId={upcomingClass?.id}
          />
        </motion.div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden"
        >
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[320px] sm:min-w-[500px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-2 sm:py-3 px-1.5 sm:px-3 text-left text-[10px] sm:text-xs font-medium text-muted-foreground">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1" />
                    <span className="hidden sm:inline">Time</span>
                  </th>
                  {days.map((day) => (
                    <th key={day} className={cn(
                      "py-2 sm:py-3 px-0.5 sm:px-2 text-center text-[9px] sm:text-xs font-medium",
                      day === currentDay ? "text-primary" : "text-muted-foreground"
                    )}>
                      {day.slice(0, 2)}
                      <span className="hidden sm:inline">{day.slice(2, 3)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, timeIndex) => (
                  <tr key={time} className="border-b border-border/50">
                    <td className="py-1.5 sm:py-2 px-1 sm:px-3 text-[9px] sm:text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                      {time.split(' - ')[0]}
                    </td>
                    {days.map((day) => {
                      const period = weeklySchedule[day]?.[timeIndex];
                      if (!period) {
                        return (
                          <td key={day} className="py-1 sm:py-2 px-0.5 sm:px-1">
                            <div className="h-8 sm:h-12 rounded sm:rounded-lg bg-muted/30 border border-dashed border-border/50" />
                          </td>
                        );
                      }
                      const Icon = getSubjectIcon(period.subject);
                      const colorClass = subjectColors[period.subject.split(' ')[0]] || subjectColors.Computer;
                      const isRunning = runningClass?.id === period.id;
                      
                      return (
                        <td key={day} className="py-1 sm:py-2 px-0.5 sm:px-1">
                          <div
                            className={cn(
                              "h-8 sm:h-12 rounded sm:rounded-lg border p-1 sm:p-1.5 bg-gradient-to-br relative",
                              colorClass,
                              isRunning && "ring-1 sm:ring-2 ring-primary ring-offset-1"
                            )}
                          >
                            {isRunning && (
                              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full animate-pulse flex items-center justify-center">
                                <PlayCircle className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-primary-foreground" />
                              </div>
                            )}
                            <div className="flex items-start gap-0.5 sm:gap-1 h-full">
                              <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5 flex-shrink-0 opacity-70 hidden sm:block" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[7px] sm:text-[9px] font-semibold truncate leading-tight">{period.subject}</p>
                                <p className="text-[6px] sm:text-[8px] opacity-70 truncate hidden sm:block">{period.room}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card rounded-lg sm:rounded-xl border border-border p-2 sm:p-3"
      >
        <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2">Legend</h4>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {Object.entries(subjectColors).filter(([k]) => k !== 'Break').map(([subject, colorClass]) => (
            <div key={subject} className={cn("flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg border bg-gradient-to-r text-[8px] sm:text-[10px] font-medium", colorClass)}>
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current" />
              {subject}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
