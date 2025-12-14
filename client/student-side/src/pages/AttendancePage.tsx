import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardCheck, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle2, XCircle, Filter,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { attendanceService, type AttendanceRecord } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarDay {
  date: number;
  status: 'present' | 'absent' | 'late' | 'holiday' | null;
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [subjectSummary, setSubjectSummary] = useState<SubjectAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      // Fetch from both sources in parallel
      const [attendanceResponse, studentData] = await Promise.all([
        attendanceService.getMyAttendance({
          student: user.relatedProfileId,
          page_size: 1000,
          ordering: '-date'
        }).catch(() => ({ results: [] })), // Fallback to empty if fails
        studentService.getStudent(user.relatedProfileId).catch(() => null) // Fallback to null if fails
      ]);
      
      setAttendanceRecords(attendanceResponse.results);
      
      // Calculate subject-wise summary from AttendanceRecord
      const summaryMap = new Map<string, { total: number; present: number; name: string }>();
      
      attendanceResponse.results.forEach(record => {
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
      
      // Also merge data from Student.semesterAttendance
      // This is summary data that admin updates, so it should take precedence if available
      if (studentData?.semesterAttendance && studentData.semesterAttendance.length > 0) {
        // Get current semester from student data or calculate from current date
        const currentSemester = studentData.semester || 1;
        
        // Find attendance data for current or most recent semester
        const relevantSemester = studentData.semesterAttendance
          .filter((sem: any) => sem.semester <= currentSemester)
          .sort((a: any, b: any) => b.semester - a.semester)[0];
        
        if (relevantSemester?.subjects) {
          relevantSemester.subjects.forEach((subject: any) => {
            const key = subject.code;
            // Use semesterAttendance data if it exists, or merge with existing data
            if (summaryMap.has(key)) {
              // If we have both sources, prefer semesterAttendance (admin-updated summary)
              const existing = summaryMap.get(key)!;
              // Update with semesterAttendance data if it has more complete info
              if (subject.total > 0) {
                existing.total = subject.total;
                existing.present = subject.present;
              }
              if (subject.name) {
                existing.name = subject.name;
              }
            } else {
              // Add new entry from semesterAttendance
              summaryMap.set(key, {
                total: subject.total || 0,
                present: subject.present || 0,
                name: subject.name || key
              });
            }
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
      toast.error('Failed to load attendance', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar data for the selected month
  const generateMonthCalendar = (): CalendarDay[] => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const calendar: CalendarDay[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth, i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      // Check if it's Friday (holiday)
      if (dayOfWeek === 5) {
        calendar.push({ date: i, status: 'holiday' });
        continue;
      }
      
      // Check attendance records for this date
      const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
      
      if (dayRecords.length === 0) {
        calendar.push({ date: i, status: null });
      } else {
        // If any class was attended, mark as present; if all absent, mark as absent
        const hasPresent = dayRecords.some(r => r.isPresent);
        const allAbsent = dayRecords.every(r => !r.isPresent);
        
        calendar.push({ 
          date: i, 
          status: hasPresent ? 'present' : allAbsent ? 'absent' : null 
        });
      }
    }
    
    return calendar;
  };

  const monthData = generateMonthCalendar();
  
  // Calculate stats from both sources
  // Use subjectSummary (merged data) for overall stats
  const totalFromSummary = subjectSummary.reduce((sum, sub) => sum + sub.total, 0);
  const presentFromSummary = subjectSummary.reduce((sum, sub) => sum + sub.present, 0);
  
  // Also calculate from attendanceRecords for day-by-day data
  const totalPresent = attendanceRecords.filter(r => r.isPresent).length;
  const totalAbsent = attendanceRecords.filter(r => !r.isPresent).length;
  const totalClasses = attendanceRecords.length;
  
  // Use summary data if available (admin-updated), otherwise use records
  const totalOverall = totalFromSummary > 0 ? totalFromSummary : totalClasses;
  const presentOverall = presentFromSummary > 0 ? presentFromSummary : totalPresent;
  const absentOverall = totalOverall - presentOverall;
  const overallPercentage = totalOverall > 0 ? Math.round((presentOverall / totalOverall) * 100) : 0;

  // Get recent attendance grouped by date
  const getRecentAttendance = (): DayAttendance[] => {
    const grouped = new Map<string, AttendanceRecord[]>();
    
    attendanceRecords.slice(0, 15).forEach(record => {
      if (!grouped.has(record.date)) {
        grouped.set(record.date, []);
      }
      grouped.get(record.date)!.push(record);
    });
    
    return Array.from(grouped.entries())
      .slice(0, 3)
      .map(([date, records]) => {
        const dateObj = new Date(date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return {
          date,
          day: days[dateObj.getDay()],
          records
        };
      });
  };

  const recentAttendance = getRecentAttendance();

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return 'bg-success text-success-foreground';
      case 'absent': return 'bg-destructive text-destructive-foreground';
      case 'late': return 'bg-warning text-warning-foreground';
      case 'holiday': return 'bg-muted text-muted-foreground';
      default: return 'bg-transparent';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'absent': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'late': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return null;
    }
  };

  // Loading state
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
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-1">Track your class attendance and stay on top</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchAttendance}>
            <Filter className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall</p>
              <p className="text-3xl font-bold text-primary mt-1">{overallPercentage}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallPercentage}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-3xl font-bold text-success mt-1">{presentOverall}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Classes attended</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-3xl font-bold text-destructive mt-1">{absentOverall}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Classes missed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold mt-1">{totalOverall}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Total classes</p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Monthly Calendar
            </h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear(selectedYear - 1);
                  } else {
                    setSelectedMonth(selectedMonth - 1);
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center">{months[selectedMonth]} {selectedYear}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear(selectedYear + 1);
                  } else {
                    setSelectedMonth(selectedMonth + 1);
                  }
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthData.map((record, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-pointer hover:ring-2 hover:ring-primary/50",
                  record.status ? getStatusColor(record.status) : 'bg-secondary/30'
                )}
              >
                {record.date}
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
            {[
              { label: 'Present', color: 'bg-success' },
              { label: 'Absent', color: 'bg-destructive' },
              { label: 'Late', color: 'bg-warning' },
              { label: 'Holiday', color: 'bg-muted' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Attendance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-card"
        >
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Recent Classes
          </h3>
          <div className="space-y-4">
            {recentAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent attendance records
              </div>
            ) : (
              recentAttendance.map((day, i) => (
                <div key={day.date} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{day.day}</span>
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                  <div className="space-y-1.5">
                    {day.records.map((record, j) => (
                      <div key={j} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                        <span className="text-sm">{record.subjectName}</span>
                        {getStatusIcon(record.isPresent ? 'present' : 'absent')}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Subject-wise Attendance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl border border-border p-6 shadow-card"
      >
        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Subject-wise Attendance
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {subjectSummary.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No attendance data available
            </div>
          ) : (
            subjectSummary.map((subject, i) => (
              <motion.div
                key={subject.subject_code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-secondary/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{subject.subject_name}</p>
                    <p className="text-xs text-muted-foreground">{subject.subject_code}</p>
                  </div>
                  <span className={cn(
                    "text-lg font-bold",
                    subject.percentage >= 90 ? 'text-success' : subject.percentage >= 75 ? 'text-warning' : 'text-destructive'
                  )}>
                    {subject.percentage}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${subject.percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                    className={cn(
                      "h-full rounded-full",
                      subject.percentage >= 90 ? 'bg-success' : subject.percentage >= 75 ? 'bg-warning' : 'bg-destructive'
                    )}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Attended: {subject.present}</span>
                  <span>Total: {subject.total}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Warning Card */}
      {overallPercentage < 75 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Low Attendance Warning</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your attendance is below 75%. You need to attend more classes to meet the minimum requirement.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
