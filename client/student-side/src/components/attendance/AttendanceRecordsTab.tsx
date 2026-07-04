import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, AlertCircle, FileSpreadsheet, FileText, ChevronLeft, ChevronRight,
  CheckCircle2, X, Timer, Plane, Eye, Trash2, Filter, CalendarRange, RefreshCw, Users,
  BookOpen, ChevronDown, Grid3X3, ListChecks, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { routineService, type ClassRoutine } from '@/services/routineService';
import {
  attendanceService, type AttendanceRecord, type AttendanceRegister, type TeacherRecordsFilters,
} from '@/services/attendanceService';
import { getErrorMessage } from '@/lib/api';
import { exportRegisterPdf, exportRegisterExcel } from '@/lib/attendanceExport';
import { StudentAttendanceProfileDialog } from './StudentAttendanceProfileDialog';

const PAGE_SIZE = 25;
const NONE = '';

type SubjectSummary = {
  subject_code: string;
  subject_name: string;
  department: string;
  department_id?: string;
  semester: number;
  shift: string;
  session: string;
  total_classes: number;
  students: Array<{
    student_id: string;
    student_name: string;
    student_roll: string;
    present: number;
    absent: number;
    late?: number;
    leave?: number;
    total: number;
    percentage: number;
  }>;
};

const pctColor = (pct: number) =>
  pct >= 75 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive';

const CELL_STYLES: Record<string, { label: string; cls: string }> = {
  present: { label: 'P', cls: 'bg-success/15 text-success' },
  absent: { label: 'A', cls: 'bg-destructive/15 text-destructive' },
  late: { label: 'L', cls: 'bg-warning/15 text-warning' },
  leave: { label: 'Lv', cls: 'bg-blue-500/15 text-blue-500' },
};

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const typeBadge = (record: AttendanceRecord) => {
  const type = record.attendance_type || (record.isPresent ? 'present' : 'absent');
  switch (type) {
    case 'present':
      return <Badge className="bg-success/10 text-success border-success/20 gap-1" variant="outline"><CheckCircle2 className="w-3 h-3" />Present</Badge>;
    case 'late':
      return <Badge className="bg-warning/10 text-warning border-warning/20 gap-1" variant="outline"><Timer className="w-3 h-3" />Late</Badge>;
    case 'leave':
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1" variant="outline"><Plane className="w-3 h-3" />Leave</Badge>;
    default:
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1" variant="outline"><X className="w-3 h-3" />Absent</Badge>;
  }
};

export function AttendanceRecordsTab() {
  const { user } = useAuth();

  // Teacher's routines drive the cascading filter options.
  const [routines, setRoutines] = useState<ClassRoutine[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(true);

  // Summary (default view)
  const [summary, setSummary] = useState<SubjectSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Filters — department/semester/shift/subject are required for the register.
  const [showFilters, setShowFilters] = useState(false);
  const [department, setDepartment] = useState(NONE);
  const [semester, setSemester] = useState(NONE);
  const [shift, setShift] = useState(NONE);
  const [subject, setSubject] = useState(NONE);
  const [session, setSession] = useState(NONE);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtersComplete = !!(department && semester && shift && subject);

  // Register (matrix) data
  const [register, setRegister] = useState<AttendanceRegister | null>(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Sub-view when a class is selected: matrix register or editable daily records
  const [subView, setSubView] = useState<'register' | 'records'>('register');

  // Daily records (editable list)
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsCount, setRecordsCount] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState('');
  const [recordsSearchInput, setRecordsSearchInput] = useState('');

  // Row actions
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ------------------------------------------------------------------ loads

  useEffect(() => {
    const loadRoutines = async () => {
      if (!user?.relatedProfileId) { setLoadingRoutines(false); return; }
      try {
        setLoadingRoutines(true);
        const response = await routineService.getRoutine({
          teacher: user.relatedProfileId,
          is_active: true,
          page_size: 200,
        });
        setRoutines(response.results);
      } catch (err) {
        toast.error('Failed to load class filters', { description: getErrorMessage(err) });
      } finally {
        setLoadingRoutines(false);
      }
    };
    loadRoutines();
  }, [user?.relatedProfileId]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoadingSummary(true);
        const response = await attendanceService.getTeacherSubjectSummary();
        setSummary((response.subjects || []) as SubjectSummary[]);
      } catch (err) {
        toast.error('Failed to load attendance summary', { description: getErrorMessage(err) });
        setSummary([]);
      } finally {
        setLoadingSummary(false);
      }
    };
    loadSummary();
  }, []);

  // Cascading options from the teacher's own routines.
  const options = useMemo(() => {
    const departments = new Map<string, string>();
    routines.forEach(r => r.department && departments.set(r.department.id, r.department.name));

    const semesters = new Set<number>();
    routines
      .filter(r => !department || r.department?.id === department)
      .forEach(r => semesters.add(r.semester));

    const shifts = new Set<string>();
    routines
      .filter(r => (!department || r.department?.id === department) && (!semester || String(r.semester) === semester))
      .forEach(r => shifts.add(r.shift));

    const matches = routines.filter(r =>
      (!department || r.department?.id === department) &&
      (!semester || String(r.semester) === semester) &&
      (!shift || r.shift === shift)
    );
    const subjects = new Map<string, string>();
    matches.forEach(r => subjects.set(r.subject_code, r.subject_name));
    const sessions = new Set<string>();
    matches
      .filter(r => !subject || r.subject_code === subject)
      .forEach(r => { if (r.session) sessions.add(r.session); });

    return {
      departments: Array.from(departments, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      semesters: Array.from(semesters).sort((a, b) => a - b),
      shifts: Array.from(shifts).sort(),
      subjects: Array.from(subjects, ([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code)),
      sessions: Array.from(sessions).sort(),
    };
  }, [routines, department, semester, shift, subject]);

  const fetchRegister = useCallback(async () => {
    if (!filtersComplete) { setRegister(null); return; }
    try {
      setLoadingRegister(true);
      setRegisterError(null);
      const data = await attendanceService.getAttendanceRegister({
        department,
        semester,
        shift,
        subject_code: subject,
        ...(session ? { session } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      });
      setRegister(data);
    } catch (err) {
      setRegisterError(getErrorMessage(err));
      setRegister(null);
    } finally {
      setLoadingRegister(false);
    }
  }, [filtersComplete, department, semester, shift, subject, session, dateFrom, dateTo]);

  useEffect(() => { fetchRegister(); }, [fetchRegister]);

  // Daily records (editable) for the same class filters.
  const fetchRecords = useCallback(async (pageNum: number) => {
    if (!filtersComplete) return;
    try {
      setLoadingRecords(true);
      const filters: TeacherRecordsFilters = {
        page: pageNum,
        page_size: PAGE_SIZE,
        ordering: '-date',
        department,
        semester,
        shift,
        subject_code: subject,
      };
      if (session) filters.session = session;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (recordsSearch) filters.search = recordsSearch;
      const response = await attendanceService.getTeacherRecords(filters);
      setRecords(response.results);
      setRecordsCount(response.count);
      setRecordsPage(pageNum);
    } catch (err) {
      toast.error('Failed to load records', { description: getErrorMessage(err) });
    } finally {
      setLoadingRecords(false);
    }
  }, [filtersComplete, department, semester, shift, subject, session, dateFrom, dateTo, recordsSearch]);

  useEffect(() => {
    if (subView === 'records') fetchRecords(1);
  }, [subView, fetchRecords]);

  useEffect(() => {
    const t = setTimeout(() => setRecordsSearch(recordsSearchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [recordsSearchInput]);

  // ---------------------------------------------------------------- actions

  const openClassFromSummary = (item: SubjectSummary) => {
    // Resolve the department id from routines when the summary lacks it.
    const routine = routines.find(r =>
      r.subject_code === item.subject_code &&
      r.semester === item.semester &&
      r.shift === item.shift &&
      (r.department?.name === item.department || r.department?.id === item.department_id)
    );
    const deptId = item.department_id || routine?.department?.id;
    if (!deptId) {
      toast.error('Could not resolve this class — use the filters instead');
      return;
    }
    setDepartment(deptId);
    setSemester(String(item.semester));
    setShift(item.shift);
    setSubject(item.subject_code);
    setSession(item.session || NONE);
    setSubView('register');
    setShowFilters(true);
  };

  const resetFilters = () => {
    setDepartment(NONE); setSemester(NONE); setShift(NONE); setSubject(NONE); setSession(NONE);
    setDateFrom(''); setDateTo('');
    setRegister(null);
    setRegisterError(null);
  };

  const cycleType = async (record: AttendanceRecord) => {
    const order: Array<'present' | 'late' | 'leave' | 'absent'> = ['present', 'late', 'leave', 'absent'];
    const current = (record.attendance_type || (record.isPresent ? 'present' : 'absent')) as typeof order[number];
    const next = order[(order.indexOf(current) + 1) % order.length];
    try {
      setProcessingId(record.id);
      await attendanceService.updateAttendance(record.id, { attendanceType: next, isPresent: next === 'present' || next === 'late' });
      setRecords(prev => prev.map(r => r.id === record.id
        ? { ...r, attendance_type: next, isPresent: next === 'present' || next === 'late' }
        : r));
      toast.success(`Marked ${next}`);
      fetchRegister();
    } catch (err) {
      toast.error('Failed to update record', { description: getErrorMessage(err) });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setProcessingId(deleteTarget.id);
      await attendanceService.deleteAttendance(deleteTarget.id);
      toast.success('Attendance record deleted');
      setDeleteTarget(null);
      fetchRecords(records.length === 1 && recordsPage > 1 ? recordsPage - 1 : recordsPage);
      fetchRegister();
    } catch (err) {
      toast.error('Failed to delete record', { description: getErrorMessage(err) });
    } finally {
      setProcessingId(null);
    }
  };

  const doExport = async (format: 'pdf' | 'excel') => {
    if (!register || register.students.length === 0) {
      toast.info('Select a subject with attendance data to export');
      return;
    }
    try {
      setExporting(true);
      if (format === 'pdf') exportRegisterPdf(register, user?.name);
      else exportRegisterExcel(register, user?.name);
      toast.success(`Register exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed', { description: getErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  // ---------------------------------------------------------------- render

  if (loadingRoutines) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(recordsCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Header actions: Filter toggle + Export */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(v => !v)}
          className="gap-1.5"
        >
          <Filter className="w-4 h-4" />
          Filter
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
        </Button>

        <div className="flex items-center gap-2">
          {filtersComplete && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 h-8 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />Reset
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting || !filtersComplete || !register || register.students.length === 0}
                title={!filtersComplete ? 'Select department, semester, shift and subject first' : undefined}
                className="gap-1.5 h-8"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => doExport('pdf')}>
                <FileText className="w-4 h-4 mr-2" />Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Collapsible filter panel */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl border border-border p-4 shadow-card space-y-3">
              <p className="text-xs text-muted-foreground">
                Select <span className="font-semibold text-foreground">Department → Semester → Shift → Subject</span> to
                view the attendance register. Session and date range are optional.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Department *</Label>
                  <Select value={department} onValueChange={v => { setDepartment(v); setSemester(NONE); setShift(NONE); setSubject(NONE); setSession(NONE); }}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {options.departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Semester *</Label>
                  <Select value={semester} onValueChange={v => { setSemester(v); setShift(NONE); setSubject(NONE); setSession(NONE); }} disabled={!department}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      {options.semesters.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Shift *</Label>
                  <Select value={shift} onValueChange={v => { setShift(v); setSubject(NONE); setSession(NONE); }} disabled={!semester}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      {options.shifts.map(s => (
                        <SelectItem key={s} value={s}>
                          {s === 'Morning' ? '1st Shift (Morning)' : s === 'Day' ? '2nd Shift (Day)' : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Subject *</Label>
                  <Select value={subject} onValueChange={v => { setSubject(v); setSession(NONE); }} disabled={!shift}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {options.subjects.map(s => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Session (optional)</Label>
                  <Select value={session || 'any'} onValueChange={v => setSession(v === 'any' ? NONE : v)} disabled={!subject}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Session</SelectItem>
                      {options.sessions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><CalendarRange className="w-3 h-3" />From (optional)</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><CalendarRange className="w-3 h-3" />To (optional)</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= DEFAULT VIEW: summary ================= */}
      {!filtersComplete && (
        loadingSummary ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : summary.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <History className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="font-semibold mb-1">No attendance summary yet</p>
            <p className="text-sm text-muted-foreground">Take attendance first — your class summaries will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.map((item, index) => (
              <motion.div
                key={`${item.subject_code}-${item.department}-${item.semester}-${item.shift}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-card"
              >
                {/* Class header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base md:text-lg truncate">{item.subject_name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{item.subject_code}</span>
                        <span>·</span>
                        <span>{item.department}</span>
                        <span>·</span>
                        <span>Sem {item.semester}</span>
                        <span>·</span>
                        <span>{item.shift}</span>
                        {item.session && <><span>·</span><span>{item.session}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xl md:text-2xl font-bold text-primary">{item.total_classes}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Classes</div>
                      </div>
                      <Button size="sm" onClick={() => openClassFromSummary(item)} className="gap-1.5">
                        <Grid3X3 className="w-4 h-4" />
                        <span className="hidden sm:inline">View Register</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Student summary table */}
                {(item.students || []).length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No attendance records yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                          <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present</th>
                          <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent</th>
                          <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Total</th>
                          <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {item.students.map(student => (
                          <tr
                            key={student.student_id}
                            className="hover:bg-secondary/30 transition-colors cursor-pointer"
                            onClick={() => { setProfileStudentId(student.student_id); setProfileOpen(true); }}
                          >
                            <td className="p-3">
                              <span className="inline-flex items-center justify-center min-w-[2.75rem] px-1.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs tabular-nums">
                                {student.student_roll}
                              </span>
                            </td>
                            <td className="p-3 font-medium">{student.student_name}</td>
                            <td className="p-3 text-center text-success font-semibold">{student.present}</td>
                            <td className="p-3 text-center text-destructive font-semibold">{student.absent}</td>
                            <td className="p-3 text-center hidden sm:table-cell">
                              {student.total}<span className="text-muted-foreground text-xs"> / {item.total_classes}</span>
                            </td>
                            <td className={cn('p-3 text-center font-bold', pctColor(student.percentage))}>
                              {student.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* ================= CLASS VIEW: register / daily records ================= */}
      {filtersComplete && (
        <div className="space-y-3">
          {/* Sub-view switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setSubView('register')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                subView === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />Register
            </button>
            <button
              onClick={() => setSubView('records')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                subView === 'records' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              <ListChecks className="w-3.5 h-3.5" />Edit Records
            </button>
          </div>

          {/* ---- Register (matrix) ---- */}
          {subView === 'register' && (
            loadingRegister ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : registerError ? (
              <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-muted-foreground">{registerError}</p>
                <Button size="sm" onClick={fetchRegister}>Try Again</Button>
              </div>
            ) : !register || register.students.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-semibold mb-1">No attendance taken yet</p>
                <p className="text-sm text-muted-foreground">The register fills in as attendance is recorded for this subject</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
              >
                {/* Register header */}
                <div className="p-3.5 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {register.subject.subject_name}
                      <span className="text-muted-foreground font-normal"> · {register.subject.subject_code}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {register.subject.department} · Sem {register.subject.semester} · {register.subject.shift}
                      {register.subject.session ? ` · ${register.subject.session}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs">
                    {Object.entries(CELL_STYLES).map(([key, s]) => (
                      <span key={key} className="flex items-center gap-1 text-muted-foreground">
                        <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded font-bold', s.cls)}>{s.label}</span>
                        <span className="capitalize hidden sm:inline">{key}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Matrix — first column sticky for mobile horizontal scrolling */}
                <div className="overflow-x-auto">
                  <table className="text-xs md:text-sm border-collapse min-w-full">
                    <thead>
                      <tr className="bg-secondary/60">
                        <th className="sticky left-0 z-10 bg-secondary text-left p-2.5 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[150px] md:min-w-[200px] border-r border-border">
                          Student
                        </th>
                        {register.dates.map(d => (
                          <th key={d} className="p-1.5 md:p-2 text-[9px] md:text-[10px] font-semibold text-muted-foreground whitespace-nowrap text-center min-w-[38px]">
                            {shortDate(d)}
                          </th>
                        ))}
                        <th className="p-2 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase text-center min-w-[52px] bg-primary/5">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {register.students.map(student => (
                        <tr key={student.student_id} className="hover:bg-secondary/20 transition-colors">
                          <td
                            className="sticky left-0 z-10 bg-card p-2 md:p-2.5 border-r border-border cursor-pointer"
                            onClick={() => { setProfileStudentId(student.student_id); setProfileOpen(true); }}
                            title="View attendance profile"
                          >
                            <p className="font-medium truncate max-w-[130px] md:max-w-[180px] leading-tight">{student.name}</p>
                            <p className="text-[10px] text-muted-foreground">Roll: {student.roll}</p>
                          </td>
                          {register.dates.map(d => {
                            const cell = student.cells[d];
                            const style = cell ? CELL_STYLES[cell] : null;
                            return (
                              <td key={d} className="p-1 text-center">
                                {style ? (
                                  <span className={cn('inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded font-bold text-[10px] md:text-xs', style.cls)}>
                                    {style.label}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className={cn('p-2 text-center font-bold bg-primary/5', pctColor(student.percentage))}>
                            {student.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-border">
                      <tr className="bg-success/5">
                        <td className="sticky left-0 z-10 bg-success/10 p-2 md:p-2.5 border-r border-border text-[10px] md:text-xs font-bold text-success uppercase tracking-wide">
                          Total Present
                        </td>
                        {register.dates.map(d => (
                          <td key={d} className="p-1.5 text-center font-bold text-success">
                            {register.totalsByDate[d]?.present ?? 0}
                          </td>
                        ))}
                        <td className="bg-primary/5" />
                      </tr>
                      <tr className="bg-destructive/5">
                        <td className="sticky left-0 z-10 bg-destructive/10 p-2 md:p-2.5 border-r border-border text-[10px] md:text-xs font-bold text-destructive uppercase tracking-wide">
                          Total Absent
                        </td>
                        {register.dates.map(d => (
                          <td key={d} className="p-1.5 text-center font-bold text-destructive">
                            {register.totalsByDate[d]?.absent ?? 0}
                          </td>
                        ))}
                        <td className="bg-primary/5" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
                  <span>{register.students.length} students · {register.dates.length} class days</span>
                  <span className="hidden sm:inline">Tip: swipe the table sideways on mobile · tap a student for their full profile</span>
                </div>
              </motion.div>
            )
          )}

          {/* ---- Editable daily records ---- */}
          {subView === 'records' && (
            <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-border gap-2 flex-wrap">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {loadingRecords ? 'Loading…' : `${recordsCount.toLocaleString()} record${recordsCount === 1 ? '' : 's'}`}
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name or roll…"
                    value={recordsSearchInput}
                    onChange={e => setRecordsSearchInput(e.target.value)}
                    className="h-8 pl-8 text-xs w-48"
                  />
                </div>
              </div>

              {loadingRecords ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground px-4">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {records.map(record => (
                        <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-3 whitespace-nowrap text-xs md:text-sm">{record.date}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="inline-flex items-center justify-center min-w-[2.75rem] px-1.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs tabular-nums flex-shrink-0">
                                {record.studentRoll || '—'}
                              </span>
                              <p className="font-medium truncate max-w-[140px] md:max-w-[240px]">{record.studentName}</p>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => cycleType(record)}
                              disabled={processingId === record.id}
                              title="Click to change status"
                              className="disabled:opacity-50"
                            >
                              {processingId === record.id
                                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                : typeBadge(record)}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon-sm" title="View student profile"
                                onClick={() => { setProfileStudentId(record.student); setProfileOpen(true); }}
                                className="h-8 w-8"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon-sm" title="Delete record"
                                onClick={() => setDeleteTarget(record)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loadingRecords && recordsCount > PAGE_SIZE && (
                <div className="flex items-center justify-between p-3.5 border-t border-border">
                  <Button variant="outline" size="sm" disabled={recordsPage <= 1} onClick={() => fetchRecords(recordsPage - 1)} className="gap-1">
                    <ChevronLeft className="w-4 h-4" />Prev
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {(recordsPage - 1) * PAGE_SIZE + 1}–{Math.min(recordsPage * PAGE_SIZE, recordsCount)} of {recordsCount.toLocaleString()}
                  </span>
                  <Button variant="outline" size="sm" disabled={recordsPage >= totalPages} onClick={() => fetchRecords(recordsPage + 1)} className="gap-1">
                    Next<ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student profile dialog */}
      <StudentAttendanceProfileDialog
        studentId={profileStudentId}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attendance record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>This will permanently remove the record for <strong>{deleteTarget.studentName}</strong> ({deleteTarget.subjectCode}, {deleteTarget.date}). This action is logged and cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingId ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
