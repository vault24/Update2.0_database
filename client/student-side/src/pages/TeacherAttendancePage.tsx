import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  Check, 
  X, 
  Clock, 
  Search,
  ChevronRight,
  History,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  ChevronLeft,
  UserCheck,
  UserX,
  Timer,
  TrendingUp,
  Zap,
  Filter,
  ArrowUpDown,
  Sparkles,
  BarChart3,
  Download,
  Eye,
  Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  mockDepartments,
  mockShifts,
  mockSubjects,
  mockPeriods,
  mockStudentsForAttendance,
  mockAttendanceHistory,
  type StudentForAttendance,
} from '@/data/mockTeacherAttendance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AttendanceStatusType = 'present' | 'absent' | 'late' | 'unmarked';

interface StudentAttendance extends StudentForAttendance {
  status: AttendanceStatusType;
}

type Step = 'setup' | 'marking' | 'review';
type QuickMode = 'normal' | 'present-first' | 'absent-first';

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
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['hsl(0 84% 60%)', 'hsl(var(--card))', 'hsl(160 84% 39%)']
  );
  const leftIconOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightIconOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 80) {
      onMarkAttendance(student.id, 'present');
    } else if (info.offset.x < -80) {
      onMarkAttendance(student.id, 'absent');
    }
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Swipe indicators */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none"
        style={{ background }}
      >
        <motion.div style={{ opacity: leftIconOpacity }}>
          <X className="w-8 h-8 text-white" />
        </motion.div>
        <motion.div style={{ opacity: rightIconOpacity }}>
          <Check className="w-8 h-8 text-white" />
        </motion.div>
      </motion.div>

      {/* Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative bg-card rounded-xl border-2 p-3 cursor-grab active:cursor-grabbing transition-colors",
          getStatusStyles(student.status)
        )}
      >
        <div className="flex items-center gap-3">
          {/* Avatar with status indicator */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            {student.status !== 'unmarked' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-card flex items-center justify-center">
                {getStatusIcon(student.status)}
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{student.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2">
                Roll: {student.rollNumber}
              </Badge>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onMarkAttendance(student.id, 'present')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all touch-button",
                student.status === 'present' 
                  ? "bg-success text-success-foreground shadow-lg shadow-success/30" 
                  : "bg-success/10 text-success hover:bg-success/20 active:bg-success/30"
              )}
            >
              <UserCheck className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onMarkAttendance(student.id, 'absent')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all touch-button",
                student.status === 'absent'
                  ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30"
              )}
            >
              <UserX className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onMarkAttendance(student.id, 'late')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all touch-button",
                student.status === 'late'
                  ? "bg-warning text-warning-foreground shadow-lg shadow-warning/30"
                  : "bg-warning/10 text-warning hover:bg-warning/20 active:bg-warning/30"
              )}
            >
              <Timer className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TeacherAttendancePage() {
  const [activeTab, setActiveTab] = useState<'take' | 'history'>('take');
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  
  // Setup state
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Marking state
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickMode, setQuickMode] = useState<QuickMode>('normal');
  const [showUnmarkedOnly, setShowUnmarkedOnly] = useState(false);
  const [lastAction, setLastAction] = useState<{ studentId: string; prevStatus: AttendanceStatusType } | null>(null);
  
  // History filters
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historySubjectFilter, setHistorySubjectFilter] = useState('');
  const [showHistoryDetail, setShowHistoryDetail] = useState<string | null>(null);

  // Get filtered subjects based on department and semester
  const filteredSubjects = useMemo(() => {
    return mockSubjects.filter(
      s => s.departmentId === selectedDepartment && s.semester === selectedSemester
    );
  }, [selectedDepartment, selectedSemester]);

  const availableSections = ['A', 'B'];
  const availableSemesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Load students when setup is complete
  const loadStudents = () => {
    const filtered = mockStudentsForAttendance.filter(
      s => s.departmentId === selectedDepartment && 
           s.semester === selectedSemester && 
           s.section === selectedSection
    );
    
    // Apply quick mode
    let initialStatus: AttendanceStatusType = 'unmarked';
    if (quickMode === 'present-first') initialStatus = 'present';
    if (quickMode === 'absent-first') initialStatus = 'absent';
    
    setStudents(filtered.map(s => ({ ...s, status: initialStatus })));
    setCurrentStep('marking');
    
    if (quickMode !== 'normal') {
      toast.success(`All students marked as ${initialStatus}`, {
        description: 'Tap to change individual status'
      });
    }
  };

  const canProceedToMarking = selectedDepartment && selectedShift && selectedSemester && 
                              selectedSection && selectedSubject && selectedPeriod && selectedDate;

  // Attendance marking functions
  const markAttendance = useCallback((studentId: string, status: AttendanceStatusType) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (student) {
        setLastAction({ studentId, prevStatus: student.status });
      }
      return prev.map(s => s.id === studentId ? { ...s, status } : s);
    });
  }, []);

  const undoLastAction = () => {
    if (lastAction) {
      setStudents(prev => 
        prev.map(s => s.id === lastAction.studentId ? { ...s, status: lastAction.prevStatus } : s)
      );
      setLastAction(null);
      toast.success('Action undone');
    }
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
    toast.success('All marked present');
  };

  const clearAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'unmarked' })));
    toast.success('All cleared');
  };

  // Counts
  const counts = useMemo(() => {
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const late = students.filter(s => s.status === 'late').length;
    const unmarked = students.filter(s => s.status === 'unmarked').length;
    const total = students.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, unmarked, total, percentage };
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = students;
    
    if (searchQuery) {
      result = result.filter(
        s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             s.rollNumber.includes(searchQuery)
      );
    }
    
    if (showUnmarkedOnly) {
      result = result.filter(s => s.status === 'unmarked');
    }
    
    return result;
  }, [students, searchQuery, showUnmarkedOnly]);

  // Submit attendance
  const handleSubmit = () => {
    if (counts.unmarked > 0) {
      toast.error('Please mark all students before submitting');
      return;
    }
    
    toast.success('Attendance submitted successfully!', {
      description: `${counts.present} present, ${counts.absent} absent, ${counts.late} late`
    });
    
    setCurrentStep('setup');
    setStudents([]);
    setQuickMode('normal');
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    return mockAttendanceHistory.filter(record => {
      if (historyDateFilter && record.date !== historyDateFilter) return false;
      if (historySubjectFilter && record.subjectId !== historySubjectFilter) return false;
      return true;
    });
  }, [historyDateFilter, historySubjectFilter]);

  const getSubjectName = (subjectId: string) => {
    return mockSubjects.find(s => s.id === subjectId)?.name || subjectId;
  };

  const getPeriodName = (periodId: string) => {
    return mockPeriods.find(p => p.id === periodId)?.name || periodId;
  };

  const getDepartmentName = (deptId: string) => {
    return mockDepartments.find(d => d.id === deptId)?.code || deptId;
  };

  return (
    <div className="space-y-4 pb-28 max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <ClipboardCheck className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Take Attendance</h1>
          <p className="text-sm text-muted-foreground">Quick and easy attendance marking</p>
        </div>
        {currentStep === 'marking' && (
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{counts.percentage}%</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'take' | 'history')}>
        <TabsList className="w-full grid grid-cols-2 h-12">
          <TabsTrigger value="take" className="gap-2 h-10">
            <ClipboardCheck className="w-4 h-4" />
            <span>Take Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 h-10">
            <History className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* Take Attendance Tab */}
        <TabsContent value="take" className="mt-4">
          <AnimatePresence mode="wait">
            {/* Setup Step */}
            {currentStep === 'setup' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Quick Mode Selection */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Quick Mode</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'normal', label: 'Normal', desc: 'Mark one by one' },
                      { id: 'present-first', label: 'All Present', desc: 'Mark absents only' },
                      { id: 'absent-first', label: 'All Absent', desc: 'Mark presents only' },
                    ].map((mode) => (
                      <motion.button
                        key={mode.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setQuickMode(mode.id as QuickMode)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all text-left",
                          quickMode === mode.id 
                            ? "border-primary bg-primary/10" 
                            : "border-border bg-card hover:border-primary/50"
                        )}
                      >
                        <p className="font-medium text-sm">{mode.label}</p>
                        <p className="text-xs text-muted-foreground">{mode.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Class Setup Form */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-card">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Class Details
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Department */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Department</Label>
                      <select
                        value={selectedDepartment}
                        onChange={(e) => {
                          setSelectedDepartment(e.target.value);
                          setSelectedSubject('');
                        }}
                        className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">Select Department</option>
                        {mockDepartments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Shift */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Shift</Label>
                      <select
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">Select</option>
                        {mockShifts.map(shift => (
                          <option key={shift.id} value={shift.id}>{shift.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-12 rounded-xl border-2 font-medium"
                      />
                    </div>

                    {/* Semester */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Semester</Label>
                      <select
                        value={selectedSemester || ''}
                        onChange={(e) => {
                          setSelectedSemester(Number(e.target.value));
                          setSelectedSubject('');
                        }}
                        className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">Select</option>
                        {availableSemesters.map(sem => (
                          <option key={sem} value={sem}>Sem {sem}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Section</Label>
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">Select</option>
                        {availableSections.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subject</Label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={!selectedDepartment || !selectedSemester}
                        className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                      >
                        <option value="">Select Subject</option>
                        {filteredSubjects.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Period */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Period</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {mockPeriods.slice(0, 7).map(period => (
                          <motion.button
                            key={period.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedPeriod(period.id)}
                            className={cn(
                              "p-3 rounded-xl border-2 transition-all text-center",
                              selectedPeriod === period.id 
                                ? "border-primary bg-primary/10" 
                                : "border-border bg-background hover:border-primary/50"
                            )}
                          >
                            <p className="font-bold text-sm">{period.id}</p>
                            <p className="text-xs text-muted-foreground">{period.startTime}</p>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Load Students Button */}
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={loadStudents}
                    disabled={!canProceedToMarking}
                    className="w-full h-14 text-base rounded-xl gap-2"
                    size="lg"
                  >
                    <Users className="w-5 h-5" />
                    Load {selectedSection ? `Section ${selectedSection}` : ''} Students
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Marking Step */}
            {currentStep === 'marking' && (
              <motion.div
                key="marking"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Live Stats Bar */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">Live Count</span>
                    </div>
                    <Badge variant={counts.unmarked > 0 ? "secondary" : "default"} className="gap-1">
                      {counts.unmarked > 0 ? (
                        <><AlertCircle className="w-3 h-3" /> {counts.unmarked} left</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> Complete</>
                      )}
                    </Badge>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-3 bg-secondary rounded-full overflow-hidden flex mb-3">
                    <motion.div 
                      className="bg-success h-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(counts.present / counts.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.div 
                      className="bg-warning h-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(counts.late / counts.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.div 
                      className="bg-destructive h-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(counts.absent / counts.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Stats Grid */}
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

                {/* Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep('setup')} className="gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <div className="flex-1" />
                  {lastAction && (
                    <Button variant="outline" size="sm" onClick={undoLastAction} className="gap-1">
                      <Undo2 className="w-4 h-4" />
                      Undo
                    </Button>
                  )}
                  <Button 
                    variant={showUnmarkedOnly ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setShowUnmarkedOnly(!showUnmarkedOnly)}
                    className="gap-1"
                  >
                    <Filter className="w-4 h-4" />
                    Unmarked
                  </Button>
                  <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-1 text-success hover:text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    All P
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAll} className="gap-1">
                    <RotateCcw className="w-4 h-4" />
                    Clear
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 text-base"
                  />
                </div>

                {/* Swipe Hint */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-1">
                  <span className="flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4 text-destructive" />
                    Swipe left = Absent
                  </span>
                  <span className="flex items-center gap-1">
                    Swipe right = Present
                    <ChevronRight className="w-4 h-4 text-success" />
                  </span>
                </div>

                {/* Student List */}
                <div className="space-y-2">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {showUnmarkedOnly ? 'All students marked!' : 'No students found'}
                      </p>
                    </div>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <SwipeableStudentCard
                        key={student.id}
                        student={student}
                        onMarkAttendance={markAttendance}
                        index={index}
                      />
                    ))
                  )}
                </div>

                {/* Sticky Submit Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-40 safe-area-inset">
                  <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getSubjectName(selectedSubject)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedDate} • {getPeriodName(selectedPeriod)}
                      </p>
                    </div>
                    <Button
                      onClick={() => setCurrentStep('review')}
                      disabled={counts.unmarked > 0}
                      className="h-12 px-6 rounded-xl gap-2"
                    >
                      Review
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Review Step */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-primary/20 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Review Summary</h3>
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep('marking')} className="gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>

                  {/* Class Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-background/60 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                      <p className="font-semibold">{selectedDate}</p>
                    </div>
                    <div className="bg-background/60 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Period</p>
                      <p className="font-semibold">{getPeriodName(selectedPeriod)}</p>
                    </div>
                    <div className="bg-background/60 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
                      <p className="font-semibold text-sm truncate">{getSubjectName(selectedSubject)}</p>
                    </div>
                    <div className="bg-background/60 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Class</p>
                      <p className="font-semibold">{getDepartmentName(selectedDepartment)} - {selectedSemester}{selectedSection}</p>
                    </div>
                  </div>

                  {/* Big Stats */}
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

                  {/* Percentage */}
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={counts.percentage} className="flex-1 h-3" />
                    <span className="font-bold text-primary">{counts.percentage}%</span>
                  </div>
                </div>

                {/* Absent Students */}
                {counts.absent > 0 && (
                  <div className="bg-destructive/5 rounded-2xl border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserX className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-destructive">Absent ({counts.absent})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {students.filter(s => s.status === 'absent').map(s => (
                        <Badge key={s.id} variant="outline" className="bg-destructive/10 border-destructive/30 text-destructive">
                          {s.rollNumber} - {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Late Students */}
                {counts.late > 0 && (
                  <div className="bg-warning/5 rounded-2xl border border-warning/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-5 h-5 text-warning" />
                      <span className="font-semibold text-warning">Late ({counts.late})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {students.filter(s => s.status === 'late').map(s => (
                        <Badge key={s.id} variant="outline" className="bg-warning/10 border-warning/30 text-warning">
                          {s.rollNumber} - {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleSubmit} className="w-full h-14 text-lg rounded-xl gap-2" size="lg">
                    <Save className="w-5 h-5" />
                    Submit Attendance
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Filters</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subject</Label>
                  <select
                    value={historySubjectFilter}
                    onChange={(e) => setHistorySubjectFilter(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Subjects</option>
                    {mockSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-2xl p-4 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredHistory.length}</p>
                  <p className="text-sm text-muted-foreground">Records found</p>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold mb-1">No Records Found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                filteredHistory.map((record, index) => {
                  const presentCount = record.records.filter(r => r.status === 'present').length;
                  const absentCount = record.records.filter(r => r.status === 'absent').length;
                  const lateCount = record.records.filter(r => r.status === 'late').length;
                  const total = record.records.length;
                  const percentage = Math.round((presentCount / total) * 100);

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-2xl border border-border p-4 shadow-card"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{getSubjectName(record.subjectId)}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {record.date} • {getPeriodName(record.periodId)}
                          </p>
                        </div>
                        <Badge 
                          variant={percentage >= 75 ? "default" : "secondary"}
                          className={cn(
                            "ml-2",
                            percentage >= 75 ? "bg-success hover:bg-success" : "bg-warning/20 text-warning"
                          )}
                        >
                          {percentage}%
                        </Badge>
                      </div>

                      {/* Mini stats */}
                      <div className="flex gap-4 text-sm mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-success" />
                          <span className="font-medium">{presentCount}</span>
                          <span className="text-muted-foreground">P</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                          <span className="font-medium">{absentCount}</span>
                          <span className="text-muted-foreground">A</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                          <span className="font-medium">{lateCount}</span>
                          <span className="text-muted-foreground">L</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                        <div 
                          className="bg-success h-full transition-all" 
                          style={{ width: `${(presentCount / total) * 100}%` }} 
                        />
                        <div 
                          className="bg-warning h-full transition-all" 
                          style={{ width: `${(lateCount / total) * 100}%` }} 
                        />
                        <div 
                          className="bg-destructive h-full transition-all" 
                          style={{ width: `${(absentCount / total) * 100}%` }} 
                        />
                      </div>

                      {/* View Details Button */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-3 gap-2"
                        onClick={() => setShowHistoryDetail(record.id)}
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* History Detail Dialog */}
      <Dialog open={!!showHistoryDetail} onOpenChange={() => setShowHistoryDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
          </DialogHeader>
          {showHistoryDetail && (() => {
            const record = mockAttendanceHistory.find(r => r.id === showHistoryDetail);
            if (!record) return null;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-secondary/50 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Subject</p>
                    <p className="font-medium">{getSubjectName(record.subjectId)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{record.date}</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {record.records.map(r => {
                    const student = mockStudentsForAttendance.find(s => s.id === r.studentId);
                    return (
                      <div key={r.studentId} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                        <span className="text-sm">{student?.rollNumber} - {student?.name}</span>
                        <Badge 
                          variant="outline"
                          className={cn(
                            r.status === 'present' && "bg-success/10 text-success border-success/30",
                            r.status === 'absent' && "bg-destructive/10 text-destructive border-destructive/30",
                            r.status === 'late' && "bg-warning/10 text-warning border-warning/30"
                          )}
                        >
                          {r.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
