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
  PlayCircle,
  ArrowRight,
  Timer,
  CheckCircle,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassStatusBox } from '@/components/dashboard/ClassStatusBox';
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
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileDepartment, setProfileDepartment] = useState<string | undefined>(undefined);
  const [profileSemester, setProfileSemester] = useState<number | undefined>(undefined);
  const [profileShift, setProfileShift] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const formatTime = (time: string) => time?.slice(0, 5) || '';

  // Helper function to convert time to minutes (used by status functions)
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
    
    // Find the class that is currently running
    for (const period of weeklySchedule[currentDay]) {
      if (!period) continue;
      
      const startMinutes = timeToMinutes(period.startTime);
      const endMinutes = timeToMinutes(period.endTime);
      
      // Check if current time is between start and end time
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
    
    // Find the next class after current time
    let nextClass: DisplayClassPeriod | null = null;
    let minTimeDiff = Infinity;
    
    for (const period of weeklySchedule[currentDay]) {
      if (!period) continue;
      
      const startMinutes = timeToMinutes(period.startTime);
      
      // Check if class starts after current time
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
    
    // If no running class, check if we're between classes
    if (!runningClass) {
      const todayClasses = weeklySchedule[currentDay].filter(c => c !== null);
      if (todayClasses.length === 0) return false;
      
      // Check if current time is between any two classes
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

  // Check if all classes are completed for the day
  const areClassesCompleted = (): boolean => {
    const now = currentTime;
    const dayIndex = now.getDay();
    const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : null;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (!currentDay || !weeklySchedule[currentDay]) return false;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    const todayClasses = weeklySchedule[currentDay].filter(c => c !== null);
    
    if (todayClasses.length === 0) return false;
    
    // Check if current time is after the last class
    const lastClass = todayClasses[todayClasses.length - 1];
    if (lastClass) {
      const lastClassEnd = timeToMinutes(lastClass.endTime);
      return currentMinutes > lastClassEnd;
    }
    
    return false;
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh routine data periodically to catch updates from admin
  useEffect(() => {
    if (!user || user.role === 'teacher' || !profileLoaded) return;

    const refreshInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

      if (timeSinceLastRefresh >= REFRESH_INTERVAL) {
        console.log('Auto-refreshing routine data to check for updates');
        
        // Clear cache to force fresh data
        routineService.cache.invalidateByFilters({
          department: profileDepartment || user?.department,
          semester: profileSemester || user?.semester,
          shift: profileShift || (user as any)?.shift
        });
        
        // Fetch fresh data
        fetchRoutine(false);
        setLastRefresh(Date.now());
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [user, profileLoaded, profileDepartment, profileSemester, profileShift, lastRefresh]);

  // Enhanced time slot generation utilities
  const timeSlotUtils = {
    // Convert time to minutes for sorting and comparison
    timeToMinutes: (time: string): number => {
      if (!time || typeof time !== 'string') return 0;
      const parts = time.split(':');
      if (parts.length < 2) return 0;
      const [h, m] = parts.map(Number);
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    },

    // Format time consistently (remove seconds, ensure HH:MM format)
    formatTime: (time: string): string => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length < 2) return time;
      const [h, m] = parts;
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    },

    // Generate comprehensive time slots based on actual routine data
    generateTimeSlots: (routines: ClassRoutine[]): string[] => {
      // Extract all unique time periods from routines
      const timePeriods = new Set<string>();
      
      routines.forEach(routine => {
        if (routine.start_time && routine.end_time) {
          // Validate time slot before adding
          if (timeSlotUtils.validateTimeSlot(routine.start_time, routine.end_time)) {
            const startTime = timeSlotUtils.formatTime(routine.start_time);
            const endTime = timeSlotUtils.formatTime(routine.end_time);
            timePeriods.add(`${startTime}-${endTime}`);
          } else {
            console.warn('Invalid time slot filtered out:', {
              start: routine.start_time,
              end: routine.end_time,
              subject: routine.subject_name
            });
          }
        }
      });

      // Convert to array and sort by start time
      const sortedSlots = Array.from(timePeriods)
        .filter(slot => slot && slot.includes('-'))
        .sort((a, b) => {
          const [aStart] = a.split('-');
          const [bStart] = b.split('-');
          return timeSlotUtils.timeToMinutes(aStart) - timeSlotUtils.timeToMinutes(bStart);
        });

      console.log('Generated time slots from routine data:', sortedSlots);
      return sortedSlots;
    },

    // Generate fallback time slots based on shift (for consistency with admin interface)
    generateFallbackTimeSlots: (shift: string): string[] => {
      const fallbackSlots: Record<string, string[]> = {
        Morning: [
          '08:00-08:45',
          '08:45-09:30',
          '09:30-10:15',
          '10:15-11:00',
          '11:00-11:45',
          '11:45-12:30',
          '12:30-13:15',
        ],
        Day: [
          '13:30-14:15',
          '14:15-15:00',
          '15:00-15:45',
          '15:45-16:30',
          '16:30-17:15',
          '17:15-18:00',
          '18:00-18:45',
        ],
        Evening: [
          '18:30-19:15',
          '19:15-20:00',
          '20:00-20:45',
          '20:45-21:30',
        ],
      };
      
      return fallbackSlots[shift] || fallbackSlots.Day;
    },

    // Validate time slot consistency
    validateTimeSlot: (startTime: string, endTime: string): boolean => {
      // Check for empty or invalid strings
      if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') {
        return false;
      }
      
      // Check if strings contain valid time format
      if (!startTime.includes(':') || !endTime.includes(':')) {
        return false;
      }
      
      const start = timeSlotUtils.timeToMinutes(startTime);
      const end = timeSlotUtils.timeToMinutes(endTime);
      
      // Validate that start is before end and both are within valid 24-hour range
      return start < end && start >= 0 && end <= 24 * 60 && start !== 0 && end !== 0;
    }
  };

  const buildSchedule = (routines: ClassRoutine[]) => {
    console.log('Building schedule from routines:', routines);
    
    // Validate and normalize routine data
    const normalized: DisplayClassPeriod[] = routines
      .filter(routineItem => {
        // Enhanced validation
        const isValid = routineItem && 
               routineItem.id && 
               routineItem.day_of_week && 
               routineItem.start_time && 
               routineItem.end_time &&
               routineItem.subject_name &&
               timeSlotUtils.validateTimeSlot(routineItem.start_time, routineItem.end_time);
        
        if (!isValid) {
          console.warn('Invalid routine item filtered out:', routineItem);
        }
        return isValid;
      })
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

    console.log('Normalized periods:', normalized);

    // Generate time slots based on actual routine data
    let slotKeys = timeSlotUtils.generateTimeSlots(routines);

    // If no time slots found from routine data, use fallback based on shift
    if (slotKeys.length === 0) {
      console.warn('No valid time slots found in routine data, using fallback slots');
      const shift = routines.length > 0 ? routines[0].shift : 'Day';
      slotKeys = timeSlotUtils.generateFallbackTimeSlots(shift);
      
      // If still no slots available, return empty structure
      if (slotKeys.length === 0) {
        console.error('No fallback time slots available');
        return {
          timeSlots: [],
          schedule: {
            Sunday: [],
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
          }
        };
      }
    }

    // Initialize empty schedule with proper structure
    const initialSchedule: Record<DayOfWeek, (DisplayClassPeriod | null)[]> = {
      Sunday: slotKeys.map(() => null),
      Monday: slotKeys.map(() => null),
      Tuesday: slotKeys.map(() => null),
      Wednesday: slotKeys.map(() => null),
      Thursday: slotKeys.map(() => null),
    };

    // Populate schedule with periods
    normalized.forEach((period) => {
      const key = `${period.startTime}-${period.endTime}`;
      const index = slotKeys.indexOf(key);
      if (index >= 0 && initialSchedule[period.day]) {
        initialSchedule[period.day][index] = period;
        console.log(`Placed ${period.subject} on ${period.day} at slot ${index} (${key})`);
      } else {
        console.warn(`Could not place period ${period.subject} - slot ${key} not found in generated slots`);
      }
    });

    const result = {
      timeSlots: slotKeys.map((slot) => slot.replace('-', ' - ')),
      schedule: initialSchedule,
    };

    console.log('Final schedule result:', result);
    return result;
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
          // Enhanced profile error handling
          const errorMsg = getErrorMessage(err);
          console.error('Error loading student profile:', err);
          
          // Try to fall back to existing user fields if available
          if (user?.department && user?.semester) {
            setProfileDepartment(user.department);
            setProfileSemester(user.semester);
            setProfileShift((user as any).shift as string | undefined);
            
            toast.warning('Profile data partially loaded', {
              description: 'Using cached profile information. Some data may be outdated.',
            });
          } else {
            setError(`Profile loading failed: ${errorMsg}`);
            toast.error('Failed to load profile', {
              description: 'Unable to load your academic information. Please try refreshing the page.',
            });
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

  const fetchRoutine = async (isRetry: boolean = false) => {
    // Don't fetch routine for teachers
    if (user?.role === 'teacher') {
      setLoading(false);
      setError('Class routine is not available for teachers. Please use the teacher dashboard.');
      return;
    }

    const departmentId = profileDepartment || user?.department;
    const semesterValue = profileSemester || user?.semester;
    const shiftValue = profileShift || (user as any)?.shift || 'Day';

    // Validate filter values
    if (!departmentId || !semesterValue) {
      // Await profile resolution before showing error
      if (profileLoaded) {
        setError('User profile incomplete. Please ensure your department and semester information is set.');
        setLoading(false);
      }
      return;
    }

    // Validate semester range
    if (semesterValue < 1 || semesterValue > 8) {
      setError(`Invalid semester value: ${semesterValue}. Please contact support to update your profile.`);
      setLoading(false);
      return;
    }

    // Validate shift value
    if (!['Morning', 'Day', 'Evening'].includes(shiftValue)) {
      console.warn('Invalid shift value, defaulting to Day:', shiftValue);
      // Don't error out, just use default
    }

    try {
      if (isRetry) {
        setIsRetrying(true);
      } else {
        setLoading(true);
        setRetryCount(0);
      }
      setError(null);
      
      console.log('Fetching student routine with params:', {
        department: departmentId,
        semester: semesterValue,
        shift: shiftValue,
        retry: isRetry,
        retryCount: retryCount
      });
      
      // Prepare query parameters with validation
      const queryParams: any = {};

      // Add department (required)
      if (departmentId && typeof departmentId === 'string' && departmentId.trim()) {
        queryParams.department = departmentId.trim();
      } else {
        throw new Error('Invalid department ID');
      }

      // Add semester (required, must be 1-8)
      if (semesterValue && semesterValue >= 1 && semesterValue <= 8) {
        queryParams.semester = semesterValue;
      } else {
        throw new Error(`Invalid semester: ${semesterValue}`);
      }

      // Add shift (optional, default to Day if invalid)
      const validShift = ['Morning', 'Day', 'Evening'].includes(shiftValue) ? shiftValue : 'Day';
      queryParams.shift = validShift;

      // Add cache busting parameter for fresh data
      if (isRetry || Date.now() - lastRefresh > 60000) { // Only add if retry or stale
        queryParams._t = Date.now();
      }

      console.log('Fetching routine with validated parameters:', queryParams);
      
      const data = await routineService.getMyRoutine(queryParams);
      
      console.log('Received routine data:', data);
      
      setRoutine(data.routines);
      const { timeSlots, schedule } = buildSchedule(data.routines);
      setTimeSlots(timeSlots);
      setSchedule(schedule);
      
      console.log('Built schedule:', { timeSlots, schedule });
      
      // Reset retry count on successful fetch
      setRetryCount(0);
      setLastRefresh(Date.now());
      
      // Validate that we have proper time slots
      if (timeSlots.length === 0 && data.routines.length > 0) {
        console.warn('Routine data exists but no valid time slots generated');
        toast.warning('Schedule data incomplete', {
          description: 'Some routine data may not display correctly due to invalid time formats.',
        });
      } else if (timeSlots.length > 0) {
        console.log(`Successfully generated ${timeSlots.length} time slots for ${data.routines.length} routine entries`);
        
        // Show success message on retry or auto-refresh
        if (isRetry) {
          toast.success('Routine loaded successfully', {
            description: 'Your class schedule has been updated.',
          });
        }
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      console.error('Error fetching student routine:', err);

      // Enhanced error handling with specific error types
      let userFriendlyMessage = errorMsg;
      let errorType = 'general';
      
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        userFriendlyMessage = 'Network error: Please check your internet connection and try again.';
        errorType = 'network';
      } else if (errorMsg.includes('404')) {
        userFriendlyMessage = 'No routine found for your department and semester.';
        errorType = 'not_found';
      } else if (errorMsg.includes('403')) {
        userFriendlyMessage = 'Access denied: Please ensure you are logged in as a student.';
        errorType = 'access_denied';
      } else if (errorMsg.includes('500')) {
        userFriendlyMessage = 'Server error: The system is temporarily unavailable. Please try again later.';
        errorType = 'server_error';
      } else if (errorMsg.includes('timeout')) {
        userFriendlyMessage = 'Request timeout: The server is taking too long to respond. Please try again.';
        errorType = 'timeout';
      }

      // Auto-retry for network errors (up to 3 times)
      const isNetworkError = errorType === 'network' || errorType === 'timeout';
      if (isNetworkError && retryCount < 3 && !isRetry) {
        console.log(`Auto-retrying request (attempt ${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        
        // Retry after a delay
        setTimeout(() => {
          fetchRoutine(true);
        }, 2000 * (retryCount + 1)); // Exponential backoff
        
        toast.warning('Connection issue detected', {
          description: `Retrying automatically (${retryCount + 1}/3)...`,
        });
        return;
      }

      toast.error('Failed to load routine', {
        description: userFriendlyMessage,
      });
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const hasData = useMemo(() => routine.length > 0 && timeSlots.length > 0, [routine.length, timeSlots.length]);
  const weeklySchedule = schedule;

  // Get current day's classes
  const now = currentTime;
  const dayIndex = now.getDay();
  const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : days[0];
  const todayClasses = weeklySchedule[currentDay]?.filter((c) => c) || [];
  const totalClasses = todayClasses.length;
  const labSessions = todayClasses.filter((c) => c?.subject?.toLowerCase().includes('lab')).length;
  const theorySessions = totalClasses - labSessions;
  
  // Get class status
  const runningClass = getCurrentRunningClass();
  const upcomingClass = getUpcomingClass();
  const isInBreak = isBreakTime();
  const classesCompleted = areClassesCompleted();

  // Loading state
  if (loading || isRetrying) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <p className="text-muted-foreground">
              {isRetrying ? 'Retrying connection...' : 'Loading routine...'}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Attempt {retryCount + 1}/4
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && routine.length === 0) {
    const isNetworkError = error.includes('Failed to fetch') || 
                          error.includes('NetworkError') || 
                          error.includes('timeout');
    const isNotFound = error.includes('404');
    const isAccessDenied = error.includes('403');
    const isServerError = error.includes('500');
    
    // Determine error icon and color
    const ErrorIcon = AlertCircle;
    let errorColor = 'text-destructive';
    
    if (isNetworkError) {
      errorColor = 'text-orange-500';
    } else if (isNotFound) {
      errorColor = 'text-blue-500';
    } else if (isAccessDenied) {
      errorColor = 'text-yellow-500';
    }
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <ErrorIcon className={`w-12 h-12 ${errorColor} mx-auto`} />
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isNetworkError ? 'Connection Problem' :
               isNotFound ? 'No Routine Found' :
               isAccessDenied ? 'Access Denied' :
               isServerError ? 'Server Error' :
               'Error Loading Routine'}
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Retry attempts: {retryCount}/3
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button 
              onClick={() => fetchRoutine(false)} 
              variant="hero" 
              disabled={loading || isRetrying}
            >
              {loading || isRetrying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
            
            {isNetworkError && retryCount < 3 && (
              <Button 
                onClick={() => fetchRoutine(true)} 
                variant="outline" 
                disabled={loading || isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Auto Retry ({3 - retryCount} left)
              </Button>
            )}
            
            {isNotFound && (
              <Button 
                onClick={() => {
                  // Clear error and try to reload profile
                  setError(null);
                  setProfileLoaded(false);
                  window.location.reload();
                }} 
                variant="outline"
                disabled={loading}
              >
                Refresh Profile
              </Button>
            )}
          </div>
          
          {/* Additional help text based on error type */}
          <div className="text-xs text-muted-foreground mt-4 space-y-1">
            {isNetworkError && (
              <p>• Check your internet connection<br/>• Try refreshing the page</p>
            )}
            {isNotFound && (
              <p>• Contact your department for routine availability<br/>• Verify your semester and department information</p>
            )}
            {isAccessDenied && (
              <p>• Ensure you are logged in as a student<br/>• Contact support if the problem persists</p>
            )}
            {isServerError && (
              <p>• The system is temporarily unavailable<br/>• Please try again in a few minutes</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !error && !hasData) {
    const departmentName = user?.department || 'your department';
    const semesterValue = profileSemester || user?.semester || 'your semester';
    const shiftValue = profileShift || (user as any)?.shift || 'Day';
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No routine available</h3>
            <p className="text-muted-foreground mb-4">
              No class schedule found for {semesterValue}{typeof semesterValue === 'number' ? 
                (semesterValue === 1 ? 'st' : semesterValue === 2 ? 'nd' : semesterValue === 3 ? 'rd' : 'th') : ''} semester, {shiftValue} shift.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Current filters:</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p>• Department: {typeof departmentName === 'string' ? departmentName : 'Not specified'}</p>
                <p>• Semester: {semesterValue}</p>
                <p>• Shift: {shiftValue}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button 
              onClick={() => {
                // Clear cache and fetch fresh data
                routineService.cache.clear();
                fetchRoutine(false);
              }} 
              variant="hero" 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Refresh
            </Button>
            <Button 
              onClick={() => {
                // Clear cache and reload profile
                setProfileLoaded(false);
                setRoutine([]);
                setTimeSlots([]);
                setSchedule({
                  Sunday: [],
                  Monday: [],
                  Tuesday: [],
                  Wednesday: [],
                  Thursday: [],
                });
              }} 
              variant="outline"
            >
              Reset Filters
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-4">
            <p>• Contact your department if routine should be available</p>
            <p>• Check if your profile information is correct</p>
            <p>• Routine may not be published yet for this semester</p>
          </div>
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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 md:gap-2 text-xs md:text-sm"
            onClick={() => {
              // Clear cache and fetch fresh data
              routineService.cache.clear();
              fetchRoutine(false);
            }}
            disabled={loading || isRetrying}
          >
            {loading || isRetrying ? (
              <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
            ) : (
              <Timer className="w-3.5 h-3.5 md:w-4 md:h-4" />
            )}
            <span className="hidden sm:inline">
              {isRetrying ? 'Retrying...' : 'Refresh'}
            </span>
          </Button>
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

      {/* Enhanced Class Status Box with Motivational Quotes */}
      <ClassStatusBox
        runningClass={runningClass}
        upcomingClass={upcomingClass}
        isInBreak={isInBreak}
        classesCompleted={classesCompleted}
        totalClasses={totalClasses}
        currentTime={currentTime}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        {[
          { 
            label: 'Classes Today', 
            value: totalClasses, 
            icon: BookOpen, 
            color: runningClass ? 'text-primary' : totalClasses > 0 ? 'text-blue-600' : 'text-muted-foreground',
            bgColor: runningClass ? 'bg-primary/10' : totalClasses > 0 ? 'bg-blue-500/10' : 'bg-muted/10'
          },
          { 
            label: 'Lab Sessions', 
            value: labSessions, 
            icon: FlaskConical, 
            color: runningClass?.subject.toLowerCase().includes('lab') ? 'text-emerald-600' : labSessions > 0 ? 'text-warning' : 'text-muted-foreground',
            bgColor: runningClass?.subject.toLowerCase().includes('lab') ? 'bg-emerald-500/10' : labSessions > 0 ? 'bg-warning/10' : 'bg-muted/10'
          },
          { 
            label: 'Theory Classes', 
            value: theorySessions, 
            icon: Users, 
            color: runningClass && !runningClass.subject.toLowerCase().includes('lab') ? 'text-primary' : theorySessions > 0 ? 'text-success' : 'text-muted-foreground',
            bgColor: runningClass && !runningClass.subject.toLowerCase().includes('lab') ? 'bg-primary/10' : theorySessions > 0 ? 'bg-success/10' : 'bg-muted/10'
          },
          { 
            label: 'Working Days', 
            value: days.length, 
            icon: Calendar, 
            color: 'text-accent',
            bgColor: 'bg-accent/10'
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-2 md:p-3 lg:p-4 shadow-card"
          >
            <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
              <div className={cn("w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-md md:rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0", stat.color, stat.bgColor)}>
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
                      const isRunning = runningClass?.id === period.id;
                      
                      return (
                        <td key={day} className="py-1.5 md:py-2 px-0.5 md:px-1">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={cn(
                              "h-12 md:h-14 lg:h-16 rounded-md md:rounded-lg border p-1 md:p-1.5 lg:p-2 bg-gradient-to-br cursor-pointer transition-all relative",
                              colorClass,
                              isRunning && "ring-2 ring-primary ring-offset-2 shadow-lg"
                            )}
                          >
                            {isRunning && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1">
                                <div className="w-3 h-3 bg-primary rounded-full animate-pulse flex items-center justify-center">
                                  <PlayCircle className="w-2 h-2 text-primary-foreground" />
                                </div>
                              </div>
                            )}
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
                const isRunning = runningClass?.id === period.id;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-2 md:gap-3 lg:gap-4 p-2.5 md:p-3 lg:p-4 rounded-lg md:rounded-xl border bg-gradient-to-r relative',
                      colorClass,
                      isRunning && "ring-2 ring-primary ring-offset-2 shadow-lg"
                    )}
                  >
                    {isRunning && (
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                          <PlayCircle className="w-3 h-3 animate-pulse" />
                          <span className="text-[9px] md:text-[10px] font-semibold">Running</span>
                        </div>
                      </div>
                    )}
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
