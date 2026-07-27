/**
 * TeacherResultAnalysis — subject-wise historical performance for the subjects
 * a teacher has taught. Reuses the marks + attendance data already recorded;
 * mobile-first card layout. Rendered inside a dialog from Manage Marks.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, AlertCircle, GraduationCap, Users, CheckCircle2, XCircle, CalendarCheck2, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { marksService, type TeacherSubjectResult } from '@/services/marksService';
import { getErrorMessage } from '@/lib/api';

const pctColor = (pct: number) =>
  pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive';
const barColor = (pct: number) =>
  pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-destructive';

export function TeacherResultAnalysis() {
  const [subjects, setSubjects] = useState<TeacherSubjectResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await marksService.getTeacherResultAnalysis();
      setSubjects(res.subjects || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button size="sm" onClick={load}>Try Again</Button>
      </div>
    );
  }
  if (subjects.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground px-4">
        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No result data yet</p>
        <p className="text-sm mt-1">Enter marks for your subjects and their analysis will appear here.</p>
      </div>
    );
  }

  // Overall roll-up across subjects.
  const totals = subjects.reduce(
    (acc, s) => {
      acc.passed += s.passed;
      acc.failed += s.failed;
      acc.evaluated += s.evaluated;
      return acc;
    },
    { passed: 0, failed: 0, evaluated: 0 },
  );
  const overallPass = totals.evaluated ? Math.round((totals.passed / totals.evaluated) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Overall roll-up */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: GraduationCap, label: 'Subjects', value: subjects.length, color: 'text-primary bg-primary/10' },
          { icon: CheckCircle2, label: 'Passed', value: totals.passed, color: 'text-success bg-success/10' },
          { icon: XCircle, label: 'Failed', value: totals.failed, color: 'text-destructive bg-destructive/10' },
          { icon: TrendingUp, label: 'Pass Rate', value: `${overallPass}%`, color: 'text-primary bg-primary/10' },
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

      {/* Per-subject cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {subjects.map((s, i) => (
          <motion.div
            key={`${s.subject_code}-${s.semester}-${i}`}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
          >
            <div className="p-3.5 border-b border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{s.subject_name || s.subject_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.subject_code}{s.semester ? ` · Semester ${s.semester}` : ''}
                  </p>
                </div>
                <span className={cn('text-lg font-bold tabular-nums shrink-0', pctColor(s.pass_percentage))}>
                  {s.pass_percentage}%
                </span>
              </div>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Pass / fail bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />{s.passed} passed
                  </span>
                  <span className="text-destructive font-medium flex items-center gap-1">
                    {s.failed} failed<XCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="h-2.5 bg-destructive/20 rounded-full overflow-hidden flex">
                  <div className="bg-success h-full" style={{ width: `${s.pass_percentage}%` }} />
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                    <Users className="w-3 h-3" />Students
                  </div>
                  <p className="text-sm font-bold mt-0.5">{s.total_students}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                    <TrendingUp className="w-3 h-3" />Avg Mark
                  </div>
                  <p className={cn('text-sm font-bold mt-0.5', pctColor(s.average_percentage))}>{s.average_percentage}%</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                    <CalendarCheck2 className="w-3 h-3" />Attend.
                  </div>
                  <p className={cn('text-sm font-bold mt-0.5', pctColor(s.attendance_percentage))}>
                    {s.attendance_total ? `${s.attendance_percentage}%` : '—'}
                  </p>
                </div>
              </div>

              {s.evaluated < s.total_students && (
                <p className="text-[11px] text-muted-foreground">
                  {s.total_students - s.evaluated} student(s) not yet graded — excluded from pass/fail.
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default TeacherResultAnalysis;
