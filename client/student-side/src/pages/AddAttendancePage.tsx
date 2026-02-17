import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Check, X, Search, Loader2, AlertCircle, Send, BookOpen, Clock, Users, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { studentService, type Student } from '@/services/studentService';
import { attendanceService, type AttendanceCreateData } from '@/services/attendanceService';
import { routineService, type ClassRoutine } from '@/services/routineService';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Today's day name
const getDayName = (): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

// Format time
const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

interface StudentWithAttendance extends Student {
  present: boolean;
}

export default function AddAttendancePage() {
  const { user } = useAuth();
  const [today] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const dayName = getDayName();

  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [todayRoutines, setTodayRoutines] = useState<ClassRoutine[]>([]);
  const [completedRoutineIds, setCompletedRoutineIds] = useState<Set<string>>(new Set());
  const [selectedRoutine, setSelectedRoutine] = useState<ClassRoutine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // API state
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch students and today's routine on mount
  useEffect(() => {
    if (!user?.relatedProfileId) return;
    fetchStudents();
    fetchTodayRoutines();
  }, [user?.relatedProfileId]);

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);

      if (!user?.relatedProfileId) {
        setError('No captain profile found');
        setStudents([]);
        return;
      }

      // Captain should only see students from own class cohort.
      const studentProfile = await studentService.getMe(user.relatedProfileId);
      const departmentId = typeof studentProfile.department === 'string'
        ? studentProfile.department
        : studentProfile.department.id;

      // Fetch all pages to avoid missing students from large cohorts.
      const baseFilters = {
        status: 'active',
        department: departmentId,
        semester: studentProfile.semester,
        shift: studentProfile.shift,
        page_size: 200,
        ordering: 'currentRollNumber',
      } as const;

      let page = 1;
      let hasMore = true;
      const allStudents: Student[] = [];

      while (hasMore) {
        const response = await studentService.getStudents({
          ...baseFilters,
          page,
        });
        allStudents.push(...response.results);
        hasMore = !!response.next && allStudents.length < response.count;
        page += 1;
      }

      setError(null);
      setStudents(allStudents.map(s => ({ ...s, present: true })));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchTodayRoutines = async () => {
    try {
      setLoadingRoutines(true);
      routineService.cache.invalidate('getMyRoutine');
      
      // Get student profile to fetch department, semester, shift
      if (!user?.relatedProfileId) {
        console.error('No student profile found');
        setTodayRoutines([]);
        return;
      }
      
      const studentProfile = await studentService.getMe(user.relatedProfileId);
      
      // Extract department ID
      const departmentId = typeof studentProfile.department === 'string' 
        ? studentProfile.department 
        : studentProfile.department.id;
      
      // Fetch routines with proper filters
      const response = await routineService.getMyRoutine({
        department: departmentId,
        semester: studentProfile.semester,
        shift: studentProfile.shift as any, // Cast to Shift type
        _t: Date.now(),
      });
      
      // Filter to today's classes
      const todayClasses = response.routines.filter(
        r => r.day_of_week === dayName && r.is_active
      );
      
      // Check which routines have attendance for today
      const routinesWithAttendance = await Promise.all(
        todayClasses.map(async (routine) => {
          try {
            // Check if attendance exists for this routine and date
            const attendanceCheck = await attendanceService.getByRoutine(
              routine.id,
              today,
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
      // Non-blocking — captain can still proceed
      setSelectedRoutine(null);
    } finally {
      setLoadingRoutines(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, present: !s.present } : s))
    );
  };

  const markAllPresent = () => setStudents(prev => prev.map(s => ({ ...s, present: true })));
  const markAllAbsent = () => setStudents(prev => prev.map(s => ({ ...s, present: false })));

  const handleSubmit = async () => {
    if (!selectedRoutine) {
      toast.error('Please select a subject from today\'s routine');
      return;
    }

    // Prevent submission if routine is already completed
    if (completedRoutineIds.has(selectedRoutine.id)) {
      toast.error('Attendance already submitted for this period');
      return;
    }

    routineService.cache.invalidate('getRoutineById');
    const freshRoutine = await routineService.getRoutineById(selectedRoutine.id).catch(() => null);
    if (!freshRoutine) {
      setSelectedRoutine(null);
      await fetchTodayRoutines();
      toast.error('Selected class is no longer available. Please select again.');
      return;
    }

    try {
      setSaving(true);
      const records: AttendanceCreateData[] = students.map(student => ({
        student: student.id,
        subjectCode: freshRoutine.subject_code,
        subjectName: freshRoutine.subject_name,
        semester: freshRoutine.semester,
        date: today,
        isPresent: student.present,
        status: 'pending', // Captain submission goes to pending for teacher approval
        classRoutineId: freshRoutine.id,
      }));

      const response = await attendanceService.bulkMarkAttendance({
        records,
        classRoutineId: freshRoutine.id,
      });

      const totalRecords = records.length;
      const savedRecords = response?.created ?? 0;
      const failedRecords = response?.errors?.length ?? 0;
      if (savedRecords < totalRecords || failedRecords > 0) {
        const firstError = response?.errors?.[0]?.error;
        toast.error('Attendance submission incomplete', {
          description: `Saved ${savedRecords}/${totalRecords}. ${firstError ? `First error: ${firstError}` : 'Please retry.'}`,
        });
        await fetchTodayRoutines();
        return;
      }

      const presentCount = students.filter(s => s.present).length;
      toast.success('Attendance submitted for approval!', {
        description: `${presentCount}/${students.length} present for ${freshRoutine.subject_name}. Sent to ${freshRoutine.teacher?.fullNameEnglish || 'teacher'} for approval.`,
      });

      // Reset and refresh routine list to remove completed routine
      setSelectedRoutine(null);
      markAllPresent();
      await fetchTodayRoutines();
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.includes('Class routine not found')) {
        setSelectedRoutine(null);
        await fetchTodayRoutines();
        toast.error('Routine was updated. Please select the class again.', { description: message });
      } else {
        toast.error('Failed to submit', { description: message });
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(
    () =>
      students.filter(
        s =>
          s.fullNameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.currentRollNumber.includes(searchQuery)
      ),
    [students, searchQuery]
  );

  const presentCount = students.filter(s => s.present).length;
  const absentCount = students.length - presentCount;
  const loading = loadingStudents || loadingRoutines;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading class data...</p>
        </div>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center space-y-4 shadow-card">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Error Loading Data</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => { fetchStudents(); fetchTodayRoutines(); }} variant="default">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              Take Attendance (Captain)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dayName}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <Button
            variant="default"
            size="lg"
            onClick={handleSubmit}
            disabled={
              saving || 
              !selectedRoutine || 
              students.length === 0 || 
              (selectedRoutine && completedRoutineIds.has(selectedRoutine.id))
            }
            className="w-full sm:w-auto gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : selectedRoutine && completedRoutineIds.has(selectedRoutine.id) ? (
              <><CheckCircle2 className="w-4 h-4" /> Already Submitted</>
            ) : (
              <><Send className="w-4 h-4" /> Submit for Approval</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-primary/5 border border-primary/20 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Captain Mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your attendance submission will be sent to the teacher for approval. The teacher can approve or reject it.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Step 1: Select Subject from Today's Routine */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-card"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Step 1 — Select Today's Class
        </h2>

        {todayRoutines.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No classes scheduled for {dayName}</p>
            <p className="text-sm mt-1">Check back on a class day</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayRoutines.map((routine) => {
              const isSelected = selectedRoutine?.id === routine.id;
              const isCompleted = completedRoutineIds.has(routine.id);
              return (
                <motion.button
                  key={routine.id}
                  whileTap={{ scale: isCompleted ? 1 : 0.97 }}
                  onClick={() => !isCompleted && setSelectedRoutine(isSelected ? null : routine)}
                  disabled={isCompleted}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isCompleted
                      ? 'border-success/30 bg-success/5 opacity-75 cursor-not-allowed'
                      : isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                  }`}
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
                  <p className={`font-semibold text-sm leading-tight ${isCompleted ? 'pr-24' : 'pr-6'}`}>
                    {routine.subject_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{routine.subject_code}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(routine.start_time)} – {formatTime(routine.end_time)}
                    </span>
                    {routine.class_type && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        routine.class_type === 'Lab' ? 'bg-accent/10 text-accent-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {routine.class_type}
                      </span>
                    )}
                  </div>
                  {routine.teacher && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      → {routine.teacher.fullNameEnglish}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Step 2: Mark Attendance */}
      <AnimatePresence>
        {selectedRoutine && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{students.length}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
                <Check className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-green-500">{presentCount}</p>
                <p className="text-[11px] text-muted-foreground">Present</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
                <X className="w-5 h-5 mx-auto text-destructive mb-1" />
                <p className="text-xl font-bold text-destructive">{absentCount}</p>
                <p className="text-[11px] text-muted-foreground">Absent</p>
              </div>
            </div>

            {/* Search & Bulk Actions */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Step 2 — Mark Attendance
              </h2>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={markAllPresent} className="flex-1 sm:flex-none gap-1">
                    <Check className="w-3.5 h-3.5" /> All Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={markAllAbsent} className="flex-1 sm:flex-none gap-1">
                    <X className="w-3.5 h-3.5" /> All Absent
                  </Button>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <div className="divide-y divide-border">
                {filteredStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    onClick={() => toggleAttendance(student.id)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors active:bg-secondary/70 ${
                      student.present ? 'hover:bg-green-500/5' : 'hover:bg-destructive/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        student.present
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {student.currentRollNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{student.fullNameEnglish}</p>
                        <p className="text-xs text-muted-foreground">Roll: {student.currentRollNumber}</p>
                      </div>
                    </div>

                    <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      student.present
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {student.present ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{student.present ? 'Present' : 'Absent'}</span>
                    </div>
                  </motion.div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No students found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
