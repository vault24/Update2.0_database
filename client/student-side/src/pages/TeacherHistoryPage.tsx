/**
 * Teacher History — previous semesters, subject-wise, READ-ONLY.
 *
 * After an admin runs "Update Semester", the previous semester's routines,
 * attendance and marks are archived (never deleted). This page reads that
 * archived data back: per subject it shows the class identity (session /
 * semester / shift / department), the attendance analysis and the result
 * (pass/fail) analysis, with a PDF export.
 *
 * Mobile-first: card layout, no horizontal scrolling.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, Loader2, AlertCircle, BookOpen, Users, CalendarCheck2, CheckCircle2,
  XCircle, TrendingUp, FileText, Archive, Lock, ChevronRight, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherResultAnalysis } from '@/components/marks/TeacherResultAnalysis';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  routineService, type SemesterArchive, type HistorySubject,
} from '@/services/routineService';
import { getErrorMessage } from '@/lib/api';

const pctColor = (pct: number) =>
  pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive';

const shiftLabel = (shift: string) =>
  shift === 'Morning' ? '1st Shift' : shift === 'Day' ? '2nd Shift' : shift || '—';

export default function TeacherHistoryPage() {
  const { user } = useAuth();
  const [archives, setArchives] = useState<SemesterArchive[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<string>('');
  const [archive, setArchive] = useState<SemesterArchive | null>(null);
  const [subjects, setSubjects] = useState<HistorySubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<HistorySubject | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState('semesters');

  // Load the list of archives once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await routineService.getSemesterArchives();
        if (cancelled) return;
        setArchives(res.archives || []);
        if (res.archives?.length) setSelectedArchive(res.archives[0].id);
        else setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadHistory = useCallback(async (archiveId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await routineService.getTeacherHistory(archiveId || undefined);
      setArchive(res.archive);
      setSubjects(res.subjects || []);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedArchive) loadHistory(selectedArchive);
  }, [selectedArchive, loadHistory]);

  const totals = useMemo(() => {
    return subjects.reduce(
      (acc, s) => {
        acc.passed += s.results.passed;
        acc.failed += s.results.failed;
        acc.evaluated += s.results.evaluated;
        acc.present += s.attendance.present;
        acc.records += s.attendance.total_records;
        return acc;
      },
      { passed: 0, failed: 0, evaluated: 0, present: 0, records: 0 },
    );
  }, [subjects]);

  const handleExport = async () => {
    if (subjects.length === 0) return;
    try {
      setExporting(true);
      // jsPDF is heavy — loaded only when the teacher actually exports.
      const { exportAttendancePdf } = await import('@/lib/attendanceExport');
      exportAttendancePdf(
        {
          title: `Semester History — ${archive?.label || 'Previous semester'}`,
          subtitle: user?.name ? `Teacher: ${user.name}` : undefined,
          filters: archive?.session ? [{ label: 'Session', value: archive.session }] : undefined,
        },
        [
          { header: 'Subject', key: 'subject' },
          { header: 'Code', key: 'code' },
          { header: 'Dept', key: 'dept' },
          { header: 'Sem', key: 'sem' },
          { header: 'Shift', key: 'shift' },
          { header: 'Students', key: 'students' },
          { header: 'Attend %', key: 'attendance' },
          { header: 'Passed', key: 'passed' },
          { header: 'Failed', key: 'failed' },
          { header: 'Pass %', key: 'pass' },
        ],
        subjects.map(s => ({
          subject: s.subject_name,
          code: s.subject_code,
          dept: s.department,
          sem: s.semester,
          shift: shiftLabel(s.shift),
          students: s.attendance.students,
          attendance: `${s.attendance.percentage}%`,
          passed: s.results.passed,
          failed: s.results.failed,
          pass: `${s.results.pass_percentage}%`,
        })),
        [
          `Subjects: ${subjects.length}`,
          `Overall pass rate: ${totals.evaluated ? Math.round((totals.passed / totals.evaluated) * 100) : 0}%`,
        ],
      );
      toast.success('History exported as PDF');
    } catch (err) {
      toast.error('Export failed', { description: getErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-full overflow-x-clip">
      {/* Header */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <History className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">History</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Previous semesters — subjects, attendance and results
          </p>
        </div>
        {/* Export covers the archived semester, so it only belongs to that tab. */}
        {tab === 'semesters' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || subjects.length === 0}
            className="gap-1.5 shrink-0"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        )}
      </motion.div>

      {/* Two views: the archived semesters, and the cross-semester Result
          Analysis (moved here from Manage Marks, which now only handles the
          CURRENT semester). */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 rounded-xl">
          <TabsTrigger value="semesters" className="gap-1.5 text-xs sm:text-sm py-2 rounded-lg">
            <Archive className="w-4 h-4 shrink-0" />
            <span className="truncate">Semester Archive</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm py-2 rounded-lg">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span className="truncate">Result Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-card">
            <p className="text-xs text-muted-foreground">
              Subject-wise pass/fail and attendance across every class you have taught.
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-card">
            <TeacherResultAnalysis />
          </div>
        </TabsContent>

        <TabsContent value="semesters" className="mt-4 space-y-4">
      {/* Read-only notice + archive selector */}
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-card space-y-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>These records are archived and read-only. Nothing here can be edited or deleted.</p>
        </div>

        {archives.length > 0 && (
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Semester</label>
            <Select value={selectedArchive} onValueChange={setSelectedArchive}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select a semester" /></SelectTrigger>
              <SelectContent>
                {archives.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-14 gap-3 text-center px-4 bg-card border border-border rounded-2xl">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button size="sm" onClick={() => loadHistory(selectedArchive)}>Try Again</Button>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground px-4 bg-card border border-border rounded-2xl">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No previous semester data</p>
          <p className="text-sm mt-1">
            History appears here once an administrator runs a semester update.
          </p>
        </div>
      ) : (
        <>
          {/* Semester roll-up */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: BookOpen, label: 'Subjects', value: subjects.length, color: 'text-primary bg-primary/10' },
              {
                icon: CalendarCheck2,
                label: 'Attendance',
                value: `${totals.records ? Math.round((totals.present / totals.records) * 100) : 0}%`,
                color: 'text-primary bg-primary/10',
              },
              { icon: CheckCircle2, label: 'Passed', value: totals.passed, color: 'text-success bg-success/10' },
              { icon: XCircle, label: 'Failed', value: totals.failed, color: 'text-destructive bg-destructive/10' },
            ].map(t => (
              <div key={t.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <div className={cn('w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-1.5', t.color)}>
                  <t.icon className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold leading-none">{t.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          {/* Subject cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {subjects.map((s, i) => (
              <motion.button
                key={`${s.subject_code}-${s.semester}-${s.shift}-${i}`}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                onClick={() => setDetail(s)}
                className="text-left rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:border-primary/40 active:scale-[.99] transition"
              >
                <div className="p-3.5 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{s.subject_name || s.subject_code}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.subject_code} · {s.department}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <Badge variant="secondary" className="text-[10px]">Sem {s.semester}</Badge>
                    <Badge variant="outline" className="text-[10px]">{shiftLabel(s.shift)}</Badge>
                    {s.session && <Badge variant="outline" className="text-[10px]">{s.session}</Badge>}
                  </div>
                </div>

                <div className="p-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                      <Users className="w-3 h-3" />Students
                    </div>
                    <p className="text-sm font-bold mt-0.5">{s.attendance.students}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                      <CalendarCheck2 className="w-3 h-3" />Attend.
                    </div>
                    <p className={cn('text-sm font-bold mt-0.5', pctColor(s.attendance.percentage))}>
                      {s.attendance.total_records ? `${s.attendance.percentage}%` : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                      <TrendingUp className="w-3 h-3" />Pass
                    </div>
                    <p className={cn('text-sm font-bold mt-0.5', pctColor(s.results.pass_percentage))}>
                      {s.results.evaluated ? `${s.results.pass_percentage}%` : '—'}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}
        </TabsContent>
      </Tabs>

      {/* Subject detail (read-only) */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base sm:text-lg">
              {detail?.subject_name || detail?.subject_code}
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">{detail.subject_code}</Badge>
                <Badge variant="outline" className="text-[10px]">{detail.department}</Badge>
                <Badge variant="outline" className="text-[10px]">Sem {detail.semester}</Badge>
                <Badge variant="outline" className="text-[10px]">{shiftLabel(detail.shift)}</Badge>
                {detail.session && <Badge variant="outline" className="text-[10px]">{detail.session}</Badge>}
              </div>

              {/* Attendance analysis */}
              <div className="rounded-xl border border-border p-3">
                <p className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <CalendarCheck2 className="w-4 h-4 text-primary" />Attendance
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Row label="Class days" value={detail.attendance.class_days} />
                  <Row label="Students" value={detail.attendance.students} />
                  <Row label="Present" value={detail.attendance.present} valueClass="text-success" />
                  <Row label="Absent" value={detail.attendance.absent} valueClass="text-destructive" />
                </div>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Attendance rate</span>
                    <span className={cn('font-bold', pctColor(detail.attendance.percentage))}>
                      {detail.attendance.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: `${Math.min(detail.attendance.percentage, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Result analysis */}
              <div className="rounded-xl border border-border p-3">
                <p className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />Result analysis
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Row label="Total students" value={detail.results.total_students} />
                  <Row label="Evaluated" value={detail.results.evaluated} />
                  <Row label="Passed" value={detail.results.passed} valueClass="text-success" />
                  <Row label="Failed" value={detail.results.failed} valueClass="text-destructive" />
                  <Row label="Pass rate" value={`${detail.results.pass_percentage}%`} />
                  <Row label="Average mark" value={`${detail.results.average_percentage}%`} />
                </div>
                {detail.results.evaluated > 0 && (
                  <div className="mt-2.5 h-2 bg-destructive/20 rounded-full overflow-hidden flex">
                    <div className="h-full bg-success" style={{ width: `${detail.results.pass_percentage}%` }} />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                Archived record — read-only.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('font-semibold text-sm', valueClass)}>{value}</span>
    </div>
  );
}
