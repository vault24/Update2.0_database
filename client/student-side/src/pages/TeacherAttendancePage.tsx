import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  ClipboardCheck, Calendar, Users, Check, X, Clock, Search, ChevronRight, History,
  CheckCircle2, AlertCircle, RotateCcw, Save, ChevronLeft, UserCheck, UserX, Timer,
  TrendingUp, Filter, Sparkles, BarChart3, Eye, Undo2, Loader2, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, type Student } from '@/services/studentService';
import { attendanceService, type AttendanceRecord, type AttendanceCreateData } from '@/services/attendanceService';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';
import { getErrorMessage } from '@/lib/api';

type AttendanceStatusType = 'present' | 'absent' | 'late' | 'unmarked';

interface StudentAttendance extends Student {
  attendanceStatus: AttendanceStatusType;
}

type Step = 'setup' | 'marking' | 'review';

// Swipeable Student Card Component
function SwipeableStudentCard({
  student,
  onMarkAttendance,
  index
}: {
  student: StudentAttendance;
  onMarkAttendance: (id: string, status: AttendanceStatusType) => void;
  index: number;
}) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0, 100], ['rgb(239, 68, 68)', 'rgb(255, 255, 255)', 'rgb(34, 197, 94)']);
  const leftIconOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightIconOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 80) onMarkAttendance(student.id, 'present');
    else if (info.offset.x < -80) onMarkAttendance(student.id, 'absent');
  };

  const getStatusStyles = (status: AttendanceStatusType) => {
    switch (status) {
      case 'present': return 'border-success bg-success/5';
      case 'absent': return 'border-destructive bg-destructive/5';
      case 'late': return 'border-warning bg-warning/5';
      default: return 'border-border';
    }
  };

  const getStatusIcon = (status: AttendanceStatusType) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'absent': return <X className="w-5 h-5 text-destructive" />;
      case 'late': return <Clock className="w-5 h-5 text-warning" />;
      default: return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="relative overflow-hidden rounded-xl">
      <motion.div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none" style={{ background }}>
        <motion.div style={{ opacity: leftIconOpacity }}><X className="w-8 h-8 text-white" /></motion.div>
        <motion.div style={{ opacity: rightIconOpacity }}><Check className="w-8 h-8 text-white" /></motion.div>
      </motion.div>
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={handleDragEnd} style={{ x }}
        className={cn("relative bg-card rounded-xl border-2 p-3 cursor-grab active:cursor-grabbing transition-colors", getStatusStyles(student.attendanceStatus))}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {student.fullNameEnglish.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            {student.attendanceStatus !== 'unmarked' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-card flex items-center justify-center">
                {getStatusIcon(student.attendanceStatus)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{student.fullNameEnglish}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2">Roll: {student.currentRollNumber}</Badge>
            </div>
          </div>
          <div className="flex gap-1.5">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => onMarkAttendance(student.id, 'present')}
              className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-all touch-button",
                student.attendanceStatus === 'present' ? "bg-success text-success-foreground shadow-lg shadow-success/30" : "bg-success/10 text-success hover:bg-success/20 active:bg-success/30")}>
              <UserCheck className="w-5 h-5" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => onMarkAttendance(student.id, 'absent')}
              className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-all touch-button",
                student.attendanceStatus === 'absent' ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30" : "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30")}>
              <UserX className="w-5 h-5" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => onMarkAttendance(student.id, 'late')}
              className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-all touch-button",
                student.attendanceStatus === 'late' ? "bg-warning text-warning-foreground shadow-lg shadow-warning/30" : "bg-warning/10 text-warning hover:bg-warning/20 active:bg-warning/30")}>
              <Timer className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'take' | 'history' | 'pending'>('take');
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  
  // Setup state
  const [selectedRoutine, setSelectedRoutine] = useState<ClassRoutine | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [todayRoutines, setTodayRoutines] = useState<ClassRoutine[]>([]);
  const [completedRoutineIds, setCompletedRoutineIds] = useState<Set<string>>(new Set());
  
  // Marking state
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnmarkedOnly, setShowUnmarkedOnly] = useState(false);
  const [lastAction, setLastAction] = useState<{ studentId: string; prevStatus: AttendanceStatusType } | null>(null);
  
  // History & Pending
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [subjectSummary, setSubjectSummary] = useState<any[]>([]);
  const [pendingRecords, setPendingRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSubmissionKeys, setSelectedSubmissionKeys] = useState<Set<string>>(new Set());
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState<string | null>(null);
  
  // Loading states
  const [loadingRoutines, setLoadingRoutines] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingRecordId, setProcessingRecordId] = useState<string | null>(null);

  const getDayName = (dateString?: string): DayOfWeek => {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const selected = dateString ? new Date(dateString) : new Date();
    const day = selected.getDay();
    // If Friday (5) or Saturday (6), default to Sunday
    if (day === 5 || day === 6) return 'Sunday';
    return days[day];
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  useEffect(() => {
    fetchTodayRoutines();
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'pending') {
      fetchPending();
    }
  }, [activeTab]);

  const fetchTodayRoutines = async () => {
    try {
      setLoadingRoutines(true);
      const dayName = getDayName(selectedDate);
      routineService.cache.invalidate('getRoutine');
      
      // For teachers, fetch all routines for today
      // If user has a teacher profile, filter by teacher ID
      const filters: any = {
        day_of_week: dayName,
        is_active: true,
        page_size: 100,
      };
      
      // If logged in as teacher, filter by teacher ID
      if (user?.relatedProfileId && user?.role === 'teacher') {
        filters.teacher = user.relatedProfileId;
      }
      
      const response = await routineService.getRoutine(filters);
      
      // Check which routines have attendance for today
      const routinesWithAttendance = await Promise.all(
        response.results.map(async (routine) => {
          try {
            // Check if attendance exists for this routine and date
            const attendanceCheck = await attendanceService.getByRoutine(
              routine.id,
              selectedDate,
              ['pending', 'approved', 'direct']
            );
            return {
              routine,
              hasAttendance: attendanceCheck.length > 0
            };
          } catch {
            return {
              routine,
              hasAttendance: false
            };
          }
        })
      );
      
      // Show ALL routines (don't filter out completed ones)
      const allRoutines = routinesWithAttendance.map(item => item.routine);
      allRoutines.sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      // Track which routines are completed
      const completedIds = new Set(
        routinesWithAttendance
          .filter(item => item.hasAttendance)
          .map(item => item.routine.id)
      );
      
      setTodayRoutines(allRoutines);
      setCompletedRoutineIds(completedIds);
      setSelectedRoutine(prev => (prev && allRoutines.some(r => r.id === prev.id) ? prev : null));
    } catch (err) {
      console.error('Failed to load routines:', err);
      toast.error('Failed to load routines', { description: getErrorMessage(err) });
      setSelectedRoutine(null);
    } finally {
      setLoadingRoutines(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      console.log('Fetching teacher subject summary...');
      const response = await attendanceService.getTeacherSubjectSummary();
      console.log('Teacher subject summary response:', response);
      console.log('Subjects detail:', response.subjects?.map(s => ({
        code: s.subject_code,
        name: s.subject_name,
        total_classes: s.total_classes,
        students_count: s.students?.length
      })));
      setSubjectSummary(response.subjects || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      toast.error('Failed to load history', { description: getErrorMessage(err) });
      setSubjectSummary([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPending = async () => {
    try {
      setLoadingPending(true);
      console.log('Fetching pending approvals...');
      const response = await attendanceService.getPendingApprovals({});
      console.log('Pending approvals response:', response);
      setPendingRecords(response.records || []);
      setSelectedSubmissionKeys(new Set()); // Clear selection when refreshing
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
      toast.error('Failed to load pending approvals', { description: getErrorMessage(err) });
      setPendingRecords([]);
    } finally {
      setLoadingPending(false);
    }
  };

  // Group pending records by submission (date + subject + submitter)
  const groupedPendingSubmissions = useMemo(() => {
    const groups: { [key: string]: any } = {};
    
    pendingRecords.forEach(record => {
      const routineId = record.class_routine || record.classRoutine || 'unknown';
      const date = record.date;
      const recordedBy = record.recorded_by || record.recordedBy || 'unknown';
      const key = `${routineId}_${date}_${recordedBy}`;
      
      if (!groups[key]) {
        groups[key] = {
          key,
          routineId,
          date,
          recordedBy,
          recordedByName: record.recorded_by_name || record.recordedByName || 'Unknown',
          subjectName: record.subject_name || record.subjectName || 'Unknown Subject',
          subjectCode: record.subject_code || record.subjectCode || '',
          students: [],
          recordIds: [],
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
        };
      }
      
      groups[key].students.push({
        id: record.id,
        studentId: record.student,
        studentName: record.student_name || record.studentName || 'Unknown Student',
        studentRoll: record.student_roll || record.studentRoll || 'N/A',
        isPresent: record.is_present || record.isPresent,
        notes: record.notes,
      });
      
      groups[key].recordIds.push(record.id);
      groups[key].totalStudents++;
      if (record.is_present || record.isPresent) {
        groups[key].presentCount++;
      } else {
        groups[key].absentCount++;
      }
    });
    
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [pendingRecords]);

  const loadStudents = async () => {
    if (!selectedRoutine) return;
    
    try {
      setLoadingStudents(true);
      const response = await studentService.getStudents({
        status: 'active',
        department: selectedRoutine.department.id,
        semester: selectedRoutine.semester,
        page_size: 200,
        ordering: 'currentRollNumber',
      });
      
      setStudents(response.results.map(s => ({ ...s, attendanceStatus: 'unmarked' })));
      setCurrentStep('marking');
    } catch (err) {
      toast.error('Failed to load students', { description: getErrorMessage(err) });
    } finally {
      setLoadingStudents(false);
    }
  };

  const markAttendance = useCallback((studentId: string, status: AttendanceStatusType) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (student) setLastAction({ studentId, prevStatus: student.attendanceStatus });
      return prev.map(s => s.id === studentId ? { ...s, attendanceStatus: status } : s);
    });
  }, []);

  const undoLastAction = () => {
    if (lastAction) {
      setStudents(prev => prev.map(s => s.id === lastAction.studentId ? { ...s, attendanceStatus: lastAction.prevStatus } : s));
      setLastAction(null);
      toast.success('Action undone');
    }
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, attendanceStatus: 'present' })));
    toast.success('All marked present');
  };

  const clearAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, attendanceStatus: 'unmarked' })));
    toast.success('All cleared');
  };

  const counts = useMemo(() => {
    const present = students.filter(s => s.attendanceStatus === 'present').length;
    const absent = students.filter(s => s.attendanceStatus === 'absent').length;
    const late = students.filter(s => s.attendanceStatus === 'late').length;
    const unmarked = students.filter(s => s.attendanceStatus === 'unmarked').length;
    const total = students.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, unmarked, total, percentage };
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchQuery) {
      result = result.filter(s => s.fullNameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) || s.currentRollNumber.includes(searchQuery));
    }
    if (showUnmarkedOnly) result = result.filter(s => s.attendanceStatus === 'unmarked');
    return result;
  }, [students, searchQuery, showUnmarkedOnly]);

  const handleSubmit = async () => {
    if (counts.unmarked > 0) {
      toast.error('Please mark all students before submitting');
      return;
    }
    if (!selectedRoutine) return;

    routineService.cache.invalidate('getRoutineById');
    const freshRoutine = await routineService.getRoutineById(selectedRoutine.id).catch(() => null);
    if (!freshRoutine) {
      setSelectedRoutine(null);
      await fetchTodayRoutines();
      toast.error('Selected class is no longer available. Please select again.');
      return;
    }

    try {
      setSubmitting(true);
      const records: AttendanceCreateData[] = students.map(student => ({
        student: student.id,
        subjectCode: freshRoutine.subject_code,
        subjectName: freshRoutine.subject_name,
        semester: freshRoutine.semester,
        date: selectedDate,
        isPresent: student.attendanceStatus === 'present' || student.attendanceStatus === 'late',
        status: 'direct',
        classRoutineId: freshRoutine.id,
        recordedBy: user?.id,
      }));

      console.log('Submitting attendance:', { records, classRoutineId: freshRoutine.id });
      console.log('User ID:', user?.id);
      console.log('First record sample:', records[0]);

      const response = await attendanceService.bulkMarkAttendance({ records, classRoutineId: freshRoutine.id });
      console.log('Attendance submission response:', response);

      const totalRecords = records.length;
      const savedRecords = response?.created ?? 0;
      const failedRecords = response?.errors?.length ?? 0;

      if (savedRecords < totalRecords || failedRecords > 0) {
        const firstError = response?.errors?.[0]?.error;
        toast.error('Attendance submission incomplete', {
          description: `Saved ${savedRecords}/${totalRecords}. ${firstError ? `First error: ${firstError}` : 'Please retry.'}`
        });
        await fetchTodayRoutines();
        return;
      }
      
      toast.success('Attendance submitted successfully!', {
        description: `${counts.present} present, ${counts.absent} absent, ${counts.late} late`
      });
      
      // Mark the current routine as completed immediately
      setCompletedRoutineIds(prev => new Set([...prev, freshRoutine.id]));
      
      setCurrentStep('setup');
      setStudents([]);
      setSelectedRoutine(null);
      
      // Refresh history data first (this is the most important)
      await fetchHistory();

      // Refresh completed status from server
      await fetchTodayRoutines();
    } catch (err) {
      console.error('Attendance submission error:', err);
      const message = getErrorMessage(err);
      if (message.includes('Class routine not found')) {
        setSelectedRoutine(null);
        await fetchTodayRoutines();
        toast.error('Routine was updated. Please select the class again.', { description: message });
      } else {
        toast.error('Failed to submit attendance', { description: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (recordIds: string[]) => {
    try {
      setProcessingRecordId(recordIds[0]);
      console.log('Approving records:', recordIds);
      await attendanceService.approveAttendance({ action: 'approve', attendanceIds: recordIds });
      toast.success(`${recordIds.length} attendance record(s) approved successfully`);
      fetchPending();
    } catch (err) {
      console.error('Failed to approve:', err);
      toast.error('Failed to approve', { description: getErrorMessage(err) });
    } finally {
      setProcessingRecordId(null);
    }
  };

  const handleReject = async (recordIds: string[], reason: string) => {
    try {
      setProcessingRecordId(recordIds[0]);
      console.log('Rejecting records:', recordIds, 'Reason:', reason);
      await attendanceService.approveAttendance({ action: 'reject', attendanceIds: recordIds, rejectionReason: reason });
      toast.success(`${recordIds.length} attendance record(s) rejected successfully`);
      fetchPending();
    } catch (err) {
      console.error('Failed to reject:', err);
      toast.error('Failed to reject', { description: getErrorMessage(err) });
    } finally {
      setProcessingRecordId(null);
    }
  };

  const toggleSubmissionSelection = (submissionKey: string) => {
    setSelectedSubmissionKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(submissionKey)) {
        newSet.delete(submissionKey);
      } else {
        newSet.add(submissionKey);
      }
      return newSet;
    });
  };

  const selectAllSubmissions = () => {
    setSelectedSubmissionKeys(new Set(groupedPendingSubmissions.map(s => s.key)));
  };

  const clearSubmissionSelection = () => {
    setSelectedSubmissionKeys(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedSubmissionKeys.size === 0) {
      toast.error('Please select at least one submission');
      return;
    }
    const allRecordIds = groupedPendingSubmissions
      .filter(sub => selectedSubmissionKeys.has(sub.key))
      .flatMap(sub => sub.recordIds);
    await handleApprove(allRecordIds);
  };

  const handleBulkReject = async () => {
    if (selectedSubmissionKeys.size === 0) {
      toast.error('Please select at least one submission');
      return;
    }
    const allRecordIds = groupedPendingSubmissions
      .filter(sub => selectedSubmissionKeys.has(sub.key))
      .flatMap(sub => sub.recordIds);
    await handleReject(allRecordIds, 'Bulk rejected by teacher');
  };

  const toggleStudentStatus = async (recordId: string, currentStatus: boolean) => {
    try {
      setEditingStudentId(recordId);
      await attendanceService.updateAttendance(recordId, { isPresent: !currentStatus });
      toast.success('Status updated successfully');
      // Refresh pending records
      fetchPending();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status', { description: getErrorMessage(err) });
    } finally {
      setEditingStudentId(null);
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-full overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Take Attendance (Teacher)</h1>
          <p className="text-sm text-muted-foreground">Direct entry or approve captain submissions</p>
        </div>
        {currentStep === 'marking' && (
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{counts.percentage}%</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="take" className="gap-2 h-10"><ClipboardCheck className="w-4 h-4" />Take</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2 h-10">
            <AlertCircle className="w-4 h-4" />Pending
            {groupedPendingSubmissions.length > 0 && <Badge variant="destructive" className="ml-1">{groupedPendingSubmissions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 h-10"><History className="w-4 h-4" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="take" className="mt-4">
          <AnimatePresence mode="wait">
            {currentStep === 'setup' && (
              <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-card">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Select Today's Class
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date</Label>
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-12 rounded-xl border-2 font-medium" />
                  </div>

                  {loadingRoutines ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : todayRoutines.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">No classes scheduled for {getDayName()}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {todayRoutines.map((routine) => {
                        const isSelected = selectedRoutine?.id === routine.id;
                        const isCompleted = completedRoutineIds.has(routine.id);
                        return (
                          <motion.button 
                            key={routine.id} 
                            whileTap={{ scale: isCompleted ? 1 : 0.97 }} 
                            onClick={() => !isCompleted && setSelectedRoutine(isSelected ? null : routine)}
                            disabled={isCompleted}
                            className={cn(
                              "relative text-left p-4 rounded-xl border-2 transition-all duration-200",
                              isCompleted 
                                ? "border-success/30 bg-success/5 opacity-75 cursor-not-allowed" 
                                : isSelected 
                                  ? "border-primary bg-primary/5 shadow-md" 
                                  : "border-border hover:border-primary/40 hover:bg-secondary/50"
                            )}
                          >
                            {isCompleted && (
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-success text-success-foreground text-xs font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Complete
                              </div>
                            )}
                            {isSelected && !isCompleted && (
                              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                            <p className={cn("font-semibold text-sm leading-tight", isCompleted ? "pr-24" : "pr-6")}>
                              {routine.subject_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{routine.subject_code}</p>
                            <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(routine.start_time)} – {formatTime(routine.end_time)}
                              </span>
                            </div>
                            {routine.teacher && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">→ {routine.teacher.fullNameEnglish}</p>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={loadStudents} 
                    disabled={!selectedRoutine || loadingStudents || (selectedRoutine && completedRoutineIds.has(selectedRoutine.id))} 
                    className="w-full h-14 text-base rounded-xl gap-2" 
                    size="lg"
                  >
                    {loadingStudents ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                    {selectedRoutine && completedRoutineIds.has(selectedRoutine.id) 
                      ? 'Attendance Already Taken' 
                      : 'Load Students'}
                    {!(selectedRoutine && completedRoutineIds.has(selectedRoutine.id)) && <ChevronRight className="w-5 h-5" />}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 'marking' && (
              <motion.div key="marking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">Live Count</span>
                    </div>
                    <Badge variant={counts.unmarked > 0 ? "secondary" : "default"} className="gap-1">
                      {counts.unmarked > 0 ? <><AlertCircle className="w-3 h-3" /> {counts.unmarked} left</> : <><Sparkles className="w-3 h-3" /> Complete</>}
                    </Badge>
                  </div>
                  
                  <div className="h-3 bg-secondary rounded-full overflow-hidden flex mb-3">
                    <motion.div className="bg-success h-full" initial={{ width: 0 }} animate={{ width: `${(counts.present / counts.total) * 100}%` }} transition={{ duration: 0.3 }} />
                    <motion.div className="bg-warning h-full" initial={{ width: 0 }} animate={{ width: `${(counts.late / counts.total) * 100}%` }} transition={{ duration: 0.3 }} />
                    <motion.div className="bg-destructive h-full" initial={{ width: 0 }} animate={{ width: `${(counts.absent / counts.total) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-xl bg-secondary/50">
                      <p className="text-lg font-bold">{counts.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-success/10">
                      <p className="text-lg font-bold text-success">{counts.present}</p>
                      <p className="text-xs text-success">Present</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-destructive/10">
                      <p className="text-lg font-bold text-destructive">{counts.absent}</p>
                      <p className="text-xs text-destructive">Absent</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-warning/10">
                      <p className="text-lg font-bold text-warning">{counts.late}</p>
                      <p className="text-xs text-warning">Late</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep('setup')} className="gap-1">
                    <ChevronLeft className="w-4 h-4" />Back
                  </Button>
                  <div className="flex-1" />
                  {lastAction && (
                    <Button variant="outline" size="sm" onClick={undoLastAction} className="gap-1">
                      <Undo2 className="w-4 h-4" />Undo
                    </Button>
                  )}
                  <Button variant={showUnmarkedOnly ? "default" : "outline"} size="sm" onClick={() => setShowUnmarkedOnly(!showUnmarkedOnly)} className="gap-1">
                    <Filter className="w-4 h-4" />Unmarked
                  </Button>
                  <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-1 text-success hover:text-success">
                    <CheckCircle2 className="w-4 h-4" />All P
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAll} className="gap-1">
                    <RotateCcw className="w-4 h-4" />Clear
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Search by name or roll number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 rounded-xl border-2 text-base" />
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-1">
                  <span className="flex items-center gap-1"><ChevronLeft className="w-4 h-4 text-destructive" />Swipe left = Absent</span>
                  <span className="flex items-center gap-1">Swipe right = Present<ChevronRight className="w-4 h-4 text-success" /></span>
                </div>

                <div className="space-y-2">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">{showUnmarkedOnly ? 'All students marked!' : 'No students found'}</p>
                    </div>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <SwipeableStudentCard key={student.id} student={student} onMarkAttendance={markAttendance} index={index} />
                    ))
                  )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-40">
                  <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedRoutine?.subject_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedDate}</p>
                    </div>
                    <Button onClick={() => setCurrentStep('review')} disabled={counts.unmarked > 0} className="h-12 px-6 rounded-xl gap-2">
                      Review<ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-primary/20 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Review Summary</h3>
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep('marking')} className="gap-1">
                      <ChevronLeft className="w-4 h-4" />Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-background/60 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                      <p className="font-semibold">{selectedDate}</p>
                    </div>
                    <div className="bg-background/60 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
                      <p className="font-semibold text-sm truncate">{selectedRoutine?.subject_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-success/10 rounded-xl p-4 text-center border border-success/20">
                      <p className="text-4xl font-bold text-success">{counts.present}</p>
                      <p className="text-sm text-success font-medium">Present</p>
                    </div>
                    <div className="bg-destructive/10 rounded-xl p-4 text-center border border-destructive/20">
                      <p className="text-4xl font-bold text-destructive">{counts.absent}</p>
                      <p className="text-sm text-destructive font-medium">Absent</p>
                    </div>
                    <div className="bg-warning/10 rounded-xl p-4 text-center border border-warning/20">
                      <p className="text-4xl font-bold text-warning">{counts.late}</p>
                      <p className="text-sm text-warning font-medium">Late</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={counts.percentage} className="flex-1 h-3" />
                    <span className="font-bold text-primary">{counts.percentage}%</span>
                  </div>
                </div>

                {counts.absent > 0 && (
                  <div className="bg-destructive/5 rounded-2xl border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserX className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-destructive">Absent ({counts.absent})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {students.filter(s => s.attendanceStatus === 'absent').map(s => (
                        <Badge key={s.id} variant="outline" className="bg-destructive/10 border-destructive/30 text-destructive">
                          {s.currentRollNumber} - {s.fullNameEnglish}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full h-14 text-lg rounded-xl gap-2" size="lg">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Submit Attendance
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {loadingPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : groupedPendingSubmissions.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold mb-1">No Pending Approvals</p>
              <p className="text-sm text-muted-foreground">All captain submissions have been reviewed</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions Bar */}
              {selectedSubmissionKeys.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {selectedSubmissionKeys.size} submission(s) selected
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={clearSubmissionSelection} className="h-7 text-xs">
                      Clear
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleBulkApprove}
                      disabled={!!processingRecordId}
                      className="gap-1"
                    >
                      {processingRecordId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBulkReject}
                      disabled={!!processingRecordId}
                      className="gap-1"
                    >
                      {processingRecordId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject All
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Select All Button */}
              {groupedPendingSubmissions.length > 1 && selectedSubmissionKeys.size === 0 && (
                <div className="mb-3 flex justify-end">
                  <Button variant="outline" size="sm" onClick={selectAllSubmissions} className="gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Select All ({groupedPendingSubmissions.length})
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {groupedPendingSubmissions.map((submission, index) => {
                  const isProcessing = processingRecordId === submission.recordIds[0];
                  const isSelected = selectedSubmissionKeys.has(submission.key);
                  
                  return (
                    <motion.div
                      key={submission.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "bg-card rounded-2xl border-2 overflow-hidden shadow-card transition-all",
                        isSelected ? "border-primary" : "border-border"
                      )}
                    >
                      {/* Submission Header */}
                      <div className="bg-gradient-to-r from-warning/10 to-warning/5 p-4 border-b border-border">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Checkbox */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleSubmissionSelection(submission.key)}
                              className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5",
                                isSelected 
                                  ? "bg-primary border-primary" 
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </motion.button>

                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{submission.subjectName}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  {submission.subjectCode}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {submission.date}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Submitted by: {submission.recordedByName}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-warning">{submission.totalStudents}</div>
                            <div className="text-xs text-muted-foreground">Students</div>
                          </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="flex gap-3 mt-3">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-semibold">{submission.presentCount}</span>
                            <span className="text-xs">Present</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive">
                            <X className="w-4 h-4" />
                            <span className="font-semibold">{submission.absentCount}</span>
                            <span className="text-xs">Absent</span>
                          </div>
                          <Badge variant="secondary" className="gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            Pending Approval
                          </Badge>
                        </div>
                      </div>

                      {/* Student Attendance Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-secondary/50">
                            <tr>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Roll
                              </th>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Student Name
                              </th>
                              <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Status
                              </th>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {submission.students.map((student: any, idx: number) => {
                              const isEditing = editingStudentId === student.id;
                              return (
                                <motion.tr
                                  key={student.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: idx * 0.01 }}
                                  className="hover:bg-secondary/30 transition-colors"
                                >
                                  <td className="p-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                      {student.studentRoll}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <p className="font-medium">{student.studentName}</p>
                                  </td>
                                  <td className="p-3 text-center">
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => toggleStudentStatus(student.id, student.isPresent)}
                                      disabled={isEditing}
                                      className={cn(
                                        "inline-flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                                        student.isPresent 
                                          ? "bg-success/10 text-success hover:bg-success/20" 
                                          : "bg-destructive/10 text-destructive hover:bg-destructive/20",
                                        isEditing && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      {isEditing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : student.isPresent ? (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      ) : (
                                        <X className="w-3.5 h-3.5" />
                                      )}
                                      {student.isPresent ? 'Present' : 'Absent'}
                                    </motion.button>
                                    <p className="text-xs text-muted-foreground mt-1">Click to toggle</p>
                                  </td>
                                  <td className="p-3">
                                    {student.notes ? (
                                      <p className="text-sm text-muted-foreground">{student.notes}</p>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No notes</span>
                                    )}
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Action Footer */}
                      <div className="bg-secondary/30 p-3 border-t border-border flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Total: <span className="font-semibold text-foreground">{submission.totalStudents} students</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleApprove(submission.recordIds)} 
                            disabled={isProcessing}
                            className="gap-1"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Approve Submission
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleReject(submission.recordIds, 'Rejected by teacher')} 
                            disabled={isProcessing}
                            className="gap-1"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            Reject Submission
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : subjectSummary.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold mb-1">No History</p>
              <p className="text-sm text-muted-foreground">Your attendance history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjectSummary.map((subject, index) => (
                <motion.div
                  key={`${subject.subject_code}-${subject.department}-${subject.semester}-${subject.shift}-${subject.session || ''}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden shadow-card"
                >
                  {/* Subject Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{subject.subject_name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {subject.subject_code}
                          </span>
                          <span>•</span>
                          <span>{subject.department}</span>
                          <span>•</span>
                          <span>Semester {subject.semester}</span>
                          <span>•</span>
                          <span>{subject.shift}</span>
                          {subject.session && (
                            <>
                              <span>-</span>
                              <span>{subject.session}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{subject.total_classes}</div>
                        <div className="text-xs text-muted-foreground">Total Classes</div>
                      </div>
                    </div>
                  </div>

                  {/* Student Attendance Table */}
                  {(subject.students || []).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p>No attendance records yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Roll
                            </th>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Student Name
                            </th>
                            <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Present
                            </th>
                            <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Absent
                            </th>
                            <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Total
                            </th>
                            <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(subject.students || []).map((student: any, idx: number) => {
                            const percentageColor = 
                              student.percentage >= 75 ? 'text-success' :
                              student.percentage >= 60 ? 'text-warning' :
                              'text-destructive';
                            
                            return (
                              <motion.tr
                                key={student.student_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.01 }}
                                className="hover:bg-secondary/30 transition-colors"
                              >
                                <td className="p-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    {student.student_roll}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <p className="font-medium">{student.student_name}</p>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 text-success font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {student.present}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive font-semibold">
                                    <X className="w-3.5 h-3.5" />
                                    {student.absent}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="font-semibold">{student.total}</span>
                                  <span className="text-muted-foreground text-sm"> / {subject.total_classes}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className={cn("h-full transition-all", 
                                          student.percentage >= 75 ? 'bg-success' :
                                          student.percentage >= 60 ? 'bg-warning' :
                                          'bg-destructive'
                                        )}
                                        style={{ width: `${student.percentage}%` }}
                                      />
                                    </div>
                                    <span className={cn("font-bold text-sm", percentageColor)}>
                                      {student.percentage}%
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary Footer */}
                  {subject.students.length > 0 && (
                    <div className="bg-secondary/30 p-3 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Students: <span className="font-semibold text-foreground">{subject.students.length}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Average Attendance: <span className="font-semibold text-foreground">
                            {subject.students.length > 0
                              ? Math.round(
                                  subject.students.reduce((sum: number, s: any) => sum + s.percentage, 0) /
                                  subject.students.length
                                )
                              : 0}%
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
