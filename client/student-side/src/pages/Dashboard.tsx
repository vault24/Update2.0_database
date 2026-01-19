import { useState, useEffect } from 'react';
import { PremiumWelcomeCard } from '@/components/dashboard/PremiumWelcomeCard';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { PremiumQuickActions } from '@/components/dashboard/PremiumQuickActions';
import { EnhancedNoticeBoard } from '@/components/dashboard/EnhancedNoticeBoard';
import { ClassStatusBox } from '@/components/dashboard/ClassStatusBox';
import { PomodoroTimer } from '@/components/widgets/PomodoroTimer';
import { QuickNotes } from '@/components/widgets/QuickNotes';
import { StudyStreak } from '@/components/widgets/StudyStreak';
import { PremiumStatsGrid } from '@/components/dashboard/PremiumStatsGrid';
import { UpcomingEventsWidget } from '@/components/dashboard/UpcomingEventsWidget';
import { AcademicProgressWidget } from '@/components/dashboard/AcademicProgressWidget';
// Teacher-specific components
import { TeacherWelcomeCard } from '@/components/dashboard/TeacherWelcomeCard';
import { TeacherQuickActions } from '@/components/dashboard/TeacherQuickActions';
import { TeacherScheduleWidget } from '@/components/dashboard/TeacherScheduleWidget';
import { TeacherStatsGrid } from '@/components/dashboard/TeacherStatsGrid';
import { TeacherActivityFeed } from '@/components/dashboard/TeacherActivityFeed';
import { motion } from 'framer-motion';
import { BarChart3, Users, BookOpen, Award, Loader2, AlertCircle, GraduationCap, TrendingUp } from 'lucide-react';
import { dashboardService, type StudentDashboardData, type TeacherDashboardData } from '@/services/dashboardService';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Class routine state
  const [routine, setRoutine] = useState<ClassRoutine[]>([]);
  const [schedule, setSchedule] = useState<Record<DayOfWeek, (DisplayClassPeriod | null)[]>>({
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileDepartment, setProfileDepartment] = useState<string | undefined>(undefined);
  const [profileSemester, setProfileSemester] = useState<number | undefined>(undefined);
  const [profileShift, setProfileShift] = useState<string | undefined>(undefined);

  // Helper function to convert time to minutes
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
    
    if (!currentDay || !schedule[currentDay]) return null;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    
    // Find the class that is currently running
    for (const period of schedule[currentDay]) {
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
    
    if (!currentDay || !schedule[currentDay]) return null;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    
    // Find the next class after current time
    let nextClass: DisplayClassPeriod | null = null;
    let minTimeDiff = Infinity;
    
    for (const period of schedule[currentDay]) {
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
    
    if (!currentDay || !schedule[currentDay]) return false;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    const runningClass = getCurrentRunningClass();
    
    // If no running class, check if we're between classes
    if (!runningClass) {
      const todayClasses = schedule[currentDay].filter(c => c !== null);
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
    
    if (!currentDay || !schedule[currentDay]) return false;
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    const todayClasses = schedule[currentDay].filter(c => c !== null);
    
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

  // Check if user needs to complete admission
  useEffect(() => {
    if (!authLoading && user) {
      // Redirect to admission if user is student/captain and hasn't completed admission
      if (
        (user.role === 'student' || user.role === 'captain') &&
        (user.admissionStatus === 'not_started' || user.admissionStatus === 'pending')
      ) {
        navigate('admission'); // Relative path within /dashboard
        return;
      }
    }
  }, [authLoading, user, navigate]);

  // Build schedule from routine data
  const buildSchedule = (routines: ClassRoutine[]) => {
    // Validate and normalize routine data
    const normalized: DisplayClassPeriod[] = routines
      .filter(routineItem => {
        return routineItem && 
               routineItem.id && 
               routineItem.day_of_week && 
               routineItem.start_time && 
               routineItem.end_time &&
               routineItem.subject_name;
      })
      .map((routineItem) => ({
        id: routineItem.id,
        day: routineItem.day_of_week,
        startTime: routineItem.start_time.slice(0, 5),
        endTime: routineItem.end_time.slice(0, 5),
        subject: routineItem.subject_name || 'Unknown Subject',
        code: routineItem.subject_code || '',
        room: routineItem.room_number || 'TBA',
        teacher: routineItem.teacher?.fullNameEnglish || 'TBA',
      }));

    // Initialize empty schedule
    const initialSchedule: Record<DayOfWeek, (DisplayClassPeriod | null)[]> = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
    };

    // Group periods by day
    normalized.forEach((period) => {
      if (initialSchedule[period.day]) {
        initialSchedule[period.day].push(period);
      }
    });

    // Sort periods by start time for each day
    Object.keys(initialSchedule).forEach((day) => {
      initialSchedule[day as DayOfWeek].sort((a, b) => {
        if (!a || !b) return 0;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });
    });

    return initialSchedule;
  };

  // Fetch routine data for students
  const fetchRoutineData = async () => {
    if (user?.role === 'teacher' || !profileLoaded) return;

    const departmentId = profileDepartment || user?.department;
    const semesterValue = profileSemester || user?.semester;
    const shiftValue = profileShift || (user as any)?.shift || 'Day';

    if (!departmentId || !semesterValue) return;

    try {
      const queryParams: any = {
        department: departmentId,
        semester: semesterValue,
        shift: shiftValue,
      };

      const data = await routineService.getMyRoutine(queryParams);
      setRoutine(data.routines);
      const scheduleData = buildSchedule(data.routines);
      setSchedule(scheduleData);
    } catch (err) {
      console.error('Error fetching routine data for dashboard:', err);
      // Don't show error toast for routine data on dashboard
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.relatedProfileId) {
      // For teachers, relatedProfileId might not be set immediately after approval
      if (user?.role === 'teacher') {
        setError('Teacher profile not found. Please contact administrator.');
      } else {
        setError('User not authenticated or student profile not found');
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch appropriate dashboard data based on user role
      if (user.role === 'teacher') {
        const data = await dashboardService.getTeacherStats(user.relatedProfileId);
        setDashboardData(data);
      } else {
        const data = await dashboardService.getStudentStats(user.relatedProfileId);
        setDashboardData(data);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error('Dashboard fetch error:', err);
      setError(errorMsg);

      // Don't show toast on initial load, only on retry
      if (dashboardData) {
        toast.error('Failed to load dashboard', {
          description: errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load profile data for students
  useEffect(() => {
    if (!authLoading && user) {
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
          console.error('Error loading student profile for dashboard:', err);
          // Try to fall back to existing user fields if available
          if (user?.department && user?.semester) {
            setProfileDepartment(user.department);
            setProfileSemester(user.semester);
            setProfileShift((user as any).shift as string | undefined);
          }
        } finally {
          setProfileLoaded(true);
        }
      };

      ensureProfile();
    }
  }, [authLoading, user]);

  // Fetch routine data when profile is loaded
  useEffect(() => {
    if (profileLoaded && user?.role !== 'teacher') {
      fetchRoutineData();
    }
  }, [profileLoaded, user?.role, profileDepartment, profileSemester, profileShift]);

  useEffect(() => {
    if (!authLoading && user?.relatedProfileId) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setError('User not authenticated');
      setLoading(false);
    } else if (!authLoading && user && !user.relatedProfileId) {
      if (user.role === 'teacher') {
        setError('Teacher profile not found. Please contact administrator.');
      } else {
        setError('Student profile not found. Please complete your admission.');
      }
      setLoading(false);
    }
  }, [authLoading, user?.relatedProfileId, user?.role]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Dashboard</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No dashboard data available</p>
        </div>
      </div>
    );
  }

  // Generate stats based on user role
  const stats = user?.role === 'teacher' && 'teacher' in (dashboardData || {})
    ? [
        {
          icon: BookOpen,
          label: 'Assigned Classes',
          value: (dashboardData as TeacherDashboardData).assignedClasses?.total?.toString() || '0',
          color: 'from-violet-500 to-purple-600',
        },
        {
          icon: Users,
          label: 'Students',
          value: (dashboardData as TeacherDashboardData).students?.total?.toString() || '0',
          color: 'from-emerald-500 to-teal-600',
        },
        {
          icon: Award,
          label: 'Departments',
          value: (dashboardData as TeacherDashboardData).assignedClasses?.departments?.length?.toString() || '0',
          color: 'from-orange-500 to-amber-600',
        },
        {
          icon: BarChart3,
          label: 'Semesters',
          value: (dashboardData as TeacherDashboardData).assignedClasses?.semesters?.length?.toString() || '0',
          color: 'from-pink-500 to-rose-600',
        },
      ]
    : [
        {
          icon: BookOpen,
          label: 'Classes',
          value: (dashboardData as StudentDashboardData)?.routine?.totalClasses?.toString() || '0',
          color: 'from-violet-500 to-purple-600',
        },
        {
          icon: BarChart3,
          label: 'Attendance',
          value: `${(dashboardData as StudentDashboardData)?.attendance?.percentage || 0}%`,
          color: 'from-emerald-500 to-teal-600',
        },
        {
          icon: Award,
          label: 'Applications',
          value: (dashboardData as StudentDashboardData)?.applications?.pending?.toString() || '0',
          color: 'from-orange-500 to-amber-600',
        },
        {
          icon: Users,
          label: 'Semester',
          value: (dashboardData as StudentDashboardData)?.student?.semester?.toString() || '0',
          color: 'from-pink-500 to-rose-600',
        },
      ];

  // Calculate class status for students
  const runningClass = user?.role !== 'teacher' ? getCurrentRunningClass() : null;
  const upcomingClass = user?.role !== 'teacher' ? getUpcomingClass() : null;
  const isInBreak = user?.role !== 'teacher' ? isBreakTime() : false;
  const classesCompleted = user?.role !== 'teacher' ? areClassesCompleted() : false;
  
  // Get current day's classes count
  const now = currentTime;
  const dayIndex = now.getDay();
  const currentDay = (dayIndex >= 0 && dayIndex < days.length) ? days[dayIndex] : days[0];
  const todayClasses = user?.role !== 'teacher' ? (schedule[currentDay]?.filter((c) => c) || []) : [];
  const totalClasses = todayClasses.length;

  // Teacher Dashboard Layout
  if (user?.role === 'teacher') {
    const teacherData = dashboardData as TeacherDashboardData;
    const teacherStats = {
      assignedClasses: teacherData.assignedClasses?.total || 0,
      totalStudents: teacherData.students?.total || 0,
      departments: teacherData.assignedClasses?.departments?.length || 0,
      semesters: teacherData.assignedClasses?.semesters?.length || 0,
    };

    return (
      <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        {/* Teacher Welcome Card with embedded stats */}
        <TeacherWelcomeCard stats={teacherStats} />

        {/* Enhanced Stats Grid */}
        <TeacherStatsGrid stats={teacherStats} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Quick Actions for Teachers */}
            <TeacherQuickActions />
            
            {/* Widgets Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <PomodoroTimer />
              <QuickNotes />
            </div>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            {/* Today's Schedule */}
            <TeacherScheduleWidget />
            
            {/* Recent Activity Feed */}
            <TeacherActivityFeed />
            
            {/* Notice Board */}
            <EnhancedNoticeBoard />
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard Layout - Premium Design
  const studentData = dashboardData as StudentDashboardData;
  const attendancePercentage = studentData?.attendance?.percentage || 0;
  const semester = studentData?.student?.semester || 1;
  const department = studentData?.student?.department || 'Department';

  return (
    <div className="space-y-5 md:space-y-6 max-w-full overflow-x-hidden pb-8">
      {/* Premium Welcome Card */}
      <PremiumWelcomeCard 
        attendancePercentage={attendancePercentage}
        semester={semester}
        department={department}
      />

      {/* Class Status Box - for students/captains */}
      <ClassStatusBox
        runningClass={runningClass}
        upcomingClass={upcomingClass}
        isInBreak={isInBreak}
        classesCompleted={classesCompleted}
        totalClasses={totalClasses}
        currentTime={currentTime}
      />

      {/* Premium Stats Grid */}
      <PremiumStatsGrid stats={stats} />

      {/* Two Column Layout - Study Streak & Academic Progress */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <StudyStreak />
        <AcademicProgressWidget 
          currentSemester={semester}
        />
      </div>

      {/* Quick Actions */}
      <PremiumQuickActions />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Upcoming Events */}
          <UpcomingEventsWidget />
          
          {/* Widgets Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <PomodoroTimer />
            <QuickNotes />
          </div>
          
          {/* Status Card */}
          <StatusCard />
        </div>
        
        <div className="space-y-4 md:space-y-6">
          {/* Enhanced Notice Board */}
          <EnhancedNoticeBoard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
