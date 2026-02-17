import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle2, XCircle, Filter,
  ChevronLeft, ChevronRight, Loader2, BookOpen,
  BarChart3, Clock, Eye, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { attendanceService, type AttendanceRecord } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CalendarDay {
  date: number;
  status: 'present' | 'absent' | 'late' | 'holiday' | null;
  count?: number;
}

interface SubjectAttendance {
  subject_code: string;
  subject_name: string;
  total: number;
  present: number;
  percentage: number;
}

interface DayAttendance {
  date: string;
  day: string;
  records: AttendanceRecord[];
}

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [subjectSummary, setSubjectSummary] = useState<SubjectAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    if (!authLoading && user?.relatedProfileId) {
      fetchAttendance();
    }
  }, [authLoading, user?.relatedProfileId, selectedMonth, selectedYear]);

  const fetchAttendance = async () => {
    if (!user?.relatedProfileId) {
      setError('User not authenticated or student profile not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const studentDataPromise = studentService.getStudent(user.relatedProfileId).catch(() => null);

      // Fetch all paginated attendance pages so totals do not freeze at page-size limit.
      const allAttendance: AttendanceRecord[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const attendanceResponse = await attendanceService.getMyAttendance({
          student: user.relatedProfileId,
          page_size: 200,
          page,
          ordering: '-date',
        }).catch(() => ({ results: [], next: null }));

        allAttendance.push(...(attendanceResponse.results || []));
        hasMore = !!attendanceResponse.next;
        page += 1;
      }

      const studentData = await studentDataPromise;
      
      // Use live records for counting. Include pending so captain submissions
      // are reflected immediately; exclude rejected/draft.
      const liveCountableRecords = (allAttendance || []).filter(
        (record) => record.status !== 'rejected' && record.status !== 'draft'
      );
      setAttendanceRecords(liveCountableRecords);
      
      const summaryMap = new Map<string, { total: number; present: number; name: string }>();
      
      liveCountableRecords.forEach(record => {
        const key = record.subjectCode;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, { total: 0, present: 0, name: record.subjectName });
        }
        const summary = summaryMap.get(key)!;
        summary.total++;
        if (record.isPresent) {
          summary.present++;
        }
      });
      
      // Fallback to profile semesterAttendance only when live records are unavailable.
      if (summaryMap.size === 0 && studentData?.semesterAttendance && studentData.semesterAttendance.length > 0) {
        const currentSemester = studentData.semester || 1;
        const relevantSemester = studentData.semesterAttendance
          .filter((sem: any) => sem.semester <= currentSemester)
          .sort((a: any, b: any) => b.semester - a.semester)[0];
        
        if (relevantSemester?.subjects) {
          relevantSemester.subjects.forEach((subject: any) => {
            const key = subject.code;
            summaryMap.set(key, {
              total: subject.total || 0,
              present: subject.present || 0,
              name: subject.name || key
            });
          });
        }
      }
      
      const summaryArray: SubjectAttendance[] = Array.from(summaryMap.entries()).map(([code, data]) => ({
        subject_code: code,
        subject_name: data.name,
        total: data.total,
        present: data.present,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
      }));
      
      setSubjectSummary(summaryArray);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load attendance', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const generateMonthCalendar = (): CalendarDay[] => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
    // Adjust for Saturday start (shift so Sat=0)
    const startOffset = (firstDayOfMonth + 1) % 7;
    const calendar: CalendarDay[] = [];
    
    // Add empty slots for offset
    for (let i = 0; i < startOffset; i++) {
      calendar.push({ date: 0, status: null });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth, i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 5) {
        calendar.push({ date: i, status: 'holiday' });
        continue;
      }
      
      const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
      
      if (dayRecords.length === 0) {
        calendar.push({ date: i, status: null });
      } else {
        const hasPresent = dayRecords.some(r => r.isPresent);
        const allAbsent = dayRecords.every(r => !r.isPresent);
        calendar.push({ 
          date: i, 
          status: hasPresent ? 'present' : allAbsent ? 'absent' : null,
          count: dayRecords.length
        });
      }
    }
    
    return calendar;
  };

  const monthData = generateMonthCalendar();
  
  const totalFromSummary = subjectSummary.reduce((sum, sub) => sum + sub.total, 0);
  const presentFromSummary = subjectSummary.reduce((sum, sub) => sum + sub.present, 0);
  const totalPresent = attendanceRecords.filter(r => r.isPresent).length;
  const totalClasses = attendanceRecords.length;
  const totalOverall = totalFromSummary > 0 ? totalFromSummary : totalClasses;
  const presentOverall = presentFromSummary > 0 ? presentFromSummary : totalPresent;
  const absentOverall = totalOverall - presentOverall;
  const overallPercentage = totalOverall > 0 ? Math.round((presentOverall / totalOverall) * 100) : 0;

  const getRecentAttendance = (): DayAttendance[] => {
    const grouped = new Map<string, AttendanceRecord[]>();
    attendanceRecords.slice(0, 30).forEach(record => {
      if (!grouped.has(record.date)) grouped.set(record.date, []);
      grouped.get(record.date)!.push(record);
    });
    
    return Array.from(grouped.entries())
      .slice(0, 7)
      .map(([date, records]) => {
        const dateObj = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return { date, day: days[dateObj.getDay()], records };
      });
  };

  const recentAttendance = getRecentAttendance();

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'absent': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'late': return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'holiday': return 'bg-muted/60 text-muted-foreground border-muted';
      default: return 'bg-secondary/40 text-muted-foreground border-transparent';
    }
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 max-w-full overflow-x-hidden pb-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your class attendance</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start" onClick={fetchAttendance}>
          <Filter className="w-4 h-4" />
          Refresh
        </Button>
      </motion.div>

      {/* Overall Progress Ring + Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-card"
      >
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
          {/* Circular Progress */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke={overallPercentage >= 90 ? '#10b981' : overallPercentage >= 75 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - overallPercentage / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl sm:text-3xl font-bold", getPercentageColor(overallPercentage))}>
                {overallPercentage}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Overall</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5 flex-1 w-full">
            <div className="text-center sm:text-left p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-muted-foreground hidden sm:inline">Present</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{presentOverall}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">Present</p>
            </div>
            <div className="text-center sm:text-left p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs text-muted-foreground hidden sm:inline">Absent</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{absentOverall}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">Absent</p>
            </div>
            <div className="text-center sm:text-left p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground hidden sm:inline">Total</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-primary">{totalOverall}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">Total</p>
            </div>
          </div>
        </div>

        {/* Low attendance warning inline */}
        {overallPercentage > 0 && overallPercentage < 75 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Low Attendance Warning</p>
              <p className="text-xs text-muted-foreground">Below 75% minimum. Attend more classes to avoid issues.</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 gap-1.5">
            <PieChart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Subjects</span>
            <span className="sm:hidden">Subjects</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs sm:text-sm py-2 gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm py-2 gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Subject-wise Tab */}
        <TabsContent value="overview" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {subjectSummary.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No attendance data yet</p>
                <p className="text-sm mt-1">Your subject-wise attendance will appear here.</p>
              </div>
            ) : (
              subjectSummary.map((subject, i) => (
                <motion.div
                  key={subject.subject_code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          getProgressColor(subject.percentage)
                        )} />
                        <p className="font-semibold text-sm sm:text-base truncate">{subject.subject_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-4 mt-0.5">{subject.subject_code}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className={cn("text-lg sm:text-xl font-bold", getPercentageColor(subject.percentage))}>
                        {subject.percentage}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.percentage}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                      className={cn("absolute inset-y-0 left-0 rounded-full", getProgressColor(subject.percentage))}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {subject.present} attended
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      {subject.total - subject.present} missed
                    </span>
                    <span>Total: {subject.total}</span>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-card"
          >
            {/* Month Navigator */}
            <div className="flex items-center justify-between mb-5">
              <Button 
                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                onClick={() => {
                  if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
                  else setSelectedMonth(selectedMonth - 1);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <span className="font-semibold text-base sm:text-lg">
                  {isMobile ? shortMonths[selectedMonth] : months[selectedMonth]} {selectedYear}
                </span>
              </div>
              <Button 
                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                onClick={() => {
                  if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
                  else setSelectedMonth(selectedMonth + 1);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
              {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1.5">
                  {isMobile ? day.charAt(0) : day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthData.map((record, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.008 }}
                  onClick={() => record.date > 0 && record.status && setSelectedDay(record)}
                  className={cn(
                    "aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-xs sm:text-sm font-medium transition-all border",
                    record.date === 0 ? 'invisible' : '',
                    record.date > 0 && record.status ? 'cursor-pointer hover:scale-105 hover:shadow-md' : '',
                    record.date > 0 ? getStatusColor(record.status) : ''
                  )}
                >
                  {record.date > 0 && (
                    <>
                      <span>{record.date}</span>
                      {record.count && record.count > 0 && (
                        <span className="text-[8px] sm:text-[10px] opacity-70">{record.count} cls</span>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-5 pt-4 border-t border-border">
              {[
                { label: 'Present', color: 'bg-emerald-500' },
                { label: 'Absent', color: 'bg-red-500' },
                { label: 'Late', color: 'bg-amber-500' },
                { label: 'Holiday', color: 'bg-muted-foreground/40' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {recentAttendance.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No recent attendance</p>
                <p className="text-sm mt-1">Your daily attendance history will show here.</p>
              </div>
            ) : (
              recentAttendance.map((day, i) => {
                const presentCount = day.records.filter(r => r.isPresent).length;
                const totalCount = day.records.length;
                const dateObj = new Date(day.date);
                const formattedDate = `${dateObj.getDate()} ${shortMonths[dateObj.getMonth()]}`;
                
                return (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
                  >
                    {/* Date Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-primary leading-none">{dateObj.getDate()}</span>
                          <span className="text-[9px] text-muted-foreground leading-none mt-0.5">{day.day}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{day.day}, {formattedDate}</p>
                          <p className="text-xs text-muted-foreground">{totalCount} class{totalCount > 1 ? 'es' : ''}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                        presentCount === totalCount 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : presentCount === 0 
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      )}>
                        {presentCount}/{totalCount}
                      </div>
                    </div>
                    
                    {/* Class Records */}
                    <div className="divide-y divide-border/50">
                      {day.records.map((record, j) => (
                        <div key={j} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-1.5 h-6 rounded-full flex-shrink-0",
                              record.isPresent ? 'bg-emerald-500' : 'bg-red-500'
                            )} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{record.subjectName}</p>
                              <p className="text-xs text-muted-foreground">{record.subjectCode}</p>
                            </div>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0",
                            record.isPresent 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          )}>
                            {record.isPresent ? (
                              <><CheckCircle2 className="w-3 h-3" /> Present</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> Absent</>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
