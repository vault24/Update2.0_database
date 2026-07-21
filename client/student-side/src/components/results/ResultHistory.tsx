/**
 * Board-result renderer — the per-semester view used by the public portal,
 * the student dashboard and the friends tab.
 *
 * Layout (modelled on the institute's approved design):
 *   - "# <roll>" header with program / regulation / institute meta and an
 *     action row (CGPA card · Save · Copy · Download · Share)
 *   - one card per SEMESTER (newest first): GPA banner with a letter grade
 *     for passed semesters; for pending semesters, "N subjects yet to pass"
 *     with every publication attempt listed — each subject shows its code,
 *     catalog name, credit and Theory/Practical chip, expandable to the full
 *     marks distribution (continuous / final / total / grand total)
 *
 * Subjects are grouped into their own semester using the imported subject
 * catalog (subject.info.semester); codes missing from the catalog fall back
 * to the exam's semester.
 */
import { ReactNode, useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  GraduationCap,
  Heart,
  Loader2,
  Calculator,
  Share2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  ResultSubject,
  RollSearchResponse,
  StudentResult,
} from '@/services/resultService';

/* ----------------------------- helpers ---------------------------------- */

const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
const ordinal = (n: number) => `${ORDINALS[n] ?? `${n}th`}`;

/** BTEB letter grade for a GPA. */
export function letterGrade(gpa: number): string {
  if (gpa >= 4.0) return 'A+';
  if (gpa >= 3.75) return 'A';
  if (gpa >= 3.5) return 'A-';
  if (gpa >= 3.25) return 'B+';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.75) return 'B-';
  if (gpa >= 2.5) return 'C+';
  if (gpa >= 2.25) return 'C';
  if (gpa >= 2.0) return 'D';
  return 'F';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function relativeAge(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 30) return days <= 1 ? 'today' : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/* ------------------------ semester derivation ---------------------------- */

interface Attempt {
  publicationDate: string | null;
  subjects: ResultSubject[];
}

interface SemesterView {
  semester: number;
  status: 'passed' | 'pending' | 'expelled' | 'continuous_fail';
  gpa: string | null;
  publicationDate: string | null;
  pendingCount: number;
  attempts: Attempt[];
  expelledRule: string;
}

/** Fold the per-exam API results into one card per semester. */
function deriveSemesters(results: StudentResult[]): SemesterView[] {
  // Newest exam mentioning a semester wins for its GPA state.
  const gpaState = new Map<number, { gpa: string | null; isReferred: boolean }>();
  for (const result of results) {
    for (const grade of result.gpas) {
      if (!gpaState.has(grade.semester)) {
        gpaState.set(grade.semester, { gpa: grade.gpa, isReferred: grade.isReferred });
      }
    }
  }

  // Publication date: the newest exam OF that semester, else the newest
  // exam that mentioned it.
  const pubDate = new Map<number, string | null>();
  for (const result of results) {
    if (!pubDate.has(result.exam.semester)) {
      pubDate.set(result.exam.semester, result.exam.publicationDate);
    }
  }
  for (const result of results) {
    for (const grade of result.gpas) {
      if (!pubDate.has(grade.semester)) {
        pubDate.set(grade.semester, result.exam.publicationDate);
      }
    }
  }

  // Pending-subject attempts, grouped into the subject's own semester via
  // the catalog (fallback: the exam's semester).
  const attempts = new Map<number, Attempt[]>();
  for (const result of results) {
    const bySemester = new Map<number, ResultSubject[]>();
    for (const subject of result.subjects) {
      const semester = subject.info?.semester ?? result.exam.semester;
      const bucket = bySemester.get(semester) ?? [];
      bucket.push(subject);
      bySemester.set(semester, bucket);
    }
    for (const [semester, subjects] of bySemester) {
      const list = attempts.get(semester) ?? [];
      list.push({ publicationDate: result.exam.publicationDate, subjects });
      attempts.set(semester, list);
    }
    if (!gpaState.has(result.exam.semester)) {
      // failed/expelled exams publish no GPA history row for themselves
      gpaState.set(result.exam.semester, { gpa: null, isReferred: true });
    }
  }

  // Status override for expelled / continuous-assessment exams.
  const special = new Map<number, { type: string; rule: string }>();
  for (const result of results) {
    if (
      (result.resultType === 'expelled' || result.resultType === 'continuous_fail')
      && !special.has(result.exam.semester)
    ) {
      special.set(result.exam.semester, {
        type: result.resultType, rule: result.expelledRule,
      });
    }
  }

  const semesters = [...gpaState.keys()].sort((a, b) => b - a);
  return semesters.map((semester) => {
    const state = gpaState.get(semester)!;
    const semesterAttempts = attempts.get(semester) ?? [];
    const override = special.get(semester);
    const passed = state.gpa !== null;
    const status: SemesterView['status'] = passed
      ? 'passed'
      : override
        ? (override.type as SemesterView['status'])
        : 'pending';
    return {
      semester,
      status,
      gpa: state.gpa,
      publicationDate: pubDate.get(semester) ?? null,
      pendingCount: semesterAttempts[0]
        ? new Set(semesterAttempts[0].subjects.map((s) => s.subjectCode)).size
        : 0,
      attempts: passed ? [] : semesterAttempts,
      expelledRule: override?.rule ?? '',
    };
  });
}

/* ----------------------------- subrows ----------------------------------- */

function SubjectRow({ subject }: { subject: ResultSubject }) {
  const [open, setOpen] = useState(false);
  const info = subject.info;
  const parts = [
    subject.hasTheory ? 'Theory' : null,
    subject.hasPractical ? 'Practical' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg border border-red-100 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20">
      <button
        type="button"
        onClick={() => info && setOpen((current) => !current)}
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
          {subject.subjectCode}
        </span>
        <span className="text-sm font-medium text-red-700 dark:text-red-300">
          {info?.name ?? 'Unknown subject'}
        </span>
        {parts.map((part) => (
          <Badge key={part} variant="outline" className="border-slate-300 text-[11px] text-muted-foreground">
            {part}
          </Badge>
        ))}
        {info?.credit != null && (
          <Badge variant="outline" className="border-slate-300 text-[11px] text-muted-foreground">
            {info.credit} credit{info.credit === 1 ? '' : 's'}
          </Badge>
        )}
        {info && (
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        )}
      </button>
      {open && info && (
        <div className="border-t border-red-100 px-3 py-2 dark:border-red-900/40">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="font-semibold uppercase text-muted-foreground">Theory</p>
              <p>Continuous: {info.theoryContinuous ?? '—'}</p>
              <p>Final: {info.theoryFinal ?? '—'}</p>
              <p>Total: {info.theoryTotal ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold uppercase text-muted-foreground">Practical</p>
              <p>Continuous: {info.practicalContinuous ?? '—'}</p>
              <p>Final: {info.practicalFinal ?? '—'}</p>
              <p>Total: {info.practicalTotal ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold uppercase text-muted-foreground">Credit</p>
              <p>{info.credit ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold uppercase text-muted-foreground">Grand Total</p>
              <p className="text-sm font-bold">{info.totalMarks ?? '—'}</p>
            </div>
          </div>
          {info.technology && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {info.technology}
              {info.regulationYear && ` · Probidhan ${info.regulationYear}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SemesterCard({ view }: { view: SemesterView }) {
  const gpaValue = view.gpa !== null ? parseFloat(view.gpa) : null;
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden />
            {ordinal(view.semester)} Semester
          </p>
          {view.status === 'passed' && (
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Passed
            </span>
          )}
          {view.status === 'pending' && (
            <span className="flex items-center gap-1 text-sm font-semibold text-red-600">
              <XCircle className="h-4 w-4" aria-hidden />
              {view.pendingCount > 0
                ? `${view.pendingCount} subject${view.pendingCount === 1 ? '' : 's'} yet to pass`
                : 'Referred'}
            </span>
          )}
          {view.status === 'expelled' && (
            <span className="text-sm font-semibold text-red-700">Expelled</span>
          )}
          {view.status === 'continuous_fail' && (
            <span className="text-sm font-semibold text-orange-600">
              Continuous Assessment Failed
            </span>
          )}
        </div>

        {view.status === 'passed' ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Published:{' '}
                <span className="text-sky-600">{formatDate(view.publicationDate)}</span>
              </p>
              {relativeAge(view.publicationDate) && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {relativeAge(view.publicationDate)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
              <span className="text-sm text-muted-foreground">GPA</span>
              <span className="text-2xl font-extrabold text-emerald-600">{view.gpa}</span>
              <span className="text-sm font-semibold">{gpaValue !== null ? letterGrade(gpaValue) : ''}</span>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {view.expelledRule && (
              <p className="text-sm text-red-600">Rule: {view.expelledRule}</p>
            )}
            {view.attempts.map((attempt, index) => (
              <div key={`${attempt.publicationDate}-${index}`} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    Published:{' '}
                    <span className="text-sky-600">{formatDate(attempt.publicationDate)}</span>
                  </p>
                  {relativeAge(attempt.publicationDate) && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {relativeAge(attempt.publicationDate)}
                    </span>
                  )}
                </div>
                {attempt.subjects.map((subject, subjectIndex) => (
                  <SubjectRow key={`${subject.subjectCode}-${subjectIndex}`} subject={subject} />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------- CGPA summary card ---------------------------- */

function CgpaDialog({
  data,
  semesters,
  open,
  onOpenChange,
}: {
  data: RollSearchResponse;
  semesters: SemesterView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white">
        <DialogTitle className="sr-only">CGPA summary</DialogTitle>
        <div className="text-center">
          {data.studentName && (
            <p className="text-xl font-bold text-amber-400">{data.studentName}</p>
          )}
          <p className="mt-1 text-lg font-semibold">Roll: {data.roll}</p>
          {data.institute && (
            <p className="text-sm text-slate-300">{data.institute.name}</p>
          )}
          <p className="mt-3 border-y border-slate-700 py-2 text-2xl font-extrabold text-amber-400">
            {data.finalCgpa ? `CGPA: ${data.finalCgpa}` : 'CGPA pending'}
          </p>
        </div>
        <div className="mt-2 space-y-2">
          {semesters.map((view) => (
            <div
              key={view.semester}
              className="flex items-center justify-between rounded-lg border border-slate-700 px-4 py-2.5"
            >
              <span className="font-semibold">{ordinal(view.semester)} Semester</span>
              {view.status === 'passed' ? (
                <span className="font-bold text-emerald-400">Passed: {view.gpa}</span>
              ) : (
                <span className="font-bold text-red-400">
                  {view.pendingCount > 0
                    ? `${view.pendingCount} subject${view.pendingCount === 1 ? '' : 's'} due`
                    : 'Pending'}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          Generated from{' '}
          <span className="font-semibold text-amber-400">result.spisg.gov.bd</span>
          {' · '}last updated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ main view --------------------------------- */

export interface ResultHistoryActions {
  onDownload?: () => void;
  downloading?: boolean;
  onShare?: () => void;
  shareLabel?: string;
  onSave?: () => void;
  saved?: boolean;
}

export function ResultHistory({
  data,
  showHeader = true,
  actions,
}: {
  data: RollSearchResponse;
  /** Hide the roll header when the page renders its own hero. */
  showHeader?: boolean;
  actions?: ResultHistoryActions;
}) {
  const [cgpaOpen, setCgpaOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const semesters = useMemo(() => deriveSemesters(data.results), [data.results]);
  const latest = data.results[0];

  if (!data.found) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No board result found for roll {data.roll}. Results appear here after
          the institute imports the official BTEB result PDF.
        </CardContent>
      </Card>
    );
  }

  const copySummary = async () => {
    const lines = [
      `BTEB Result — Roll ${data.roll}`,
      data.studentName && `Name: ${data.studentName}`,
      data.institute && `${data.institute.name}`,
      data.finalCgpa && `CGPA: ${data.finalCgpa}`,
      ...semesters.map((view) =>
        view.status === 'passed'
          ? `${ordinal(view.semester)} Semester — Passed: ${view.gpa}`
          : `${ordinal(view.semester)} Semester — ${view.pendingCount} subject(s) yet to pass`,
      ),
      window.location.href,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  const program = latest?.exam.program
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-4">
      {showHeader && latest && (
        <header className="space-y-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight"># {data.roll}</h2>
          {data.studentName && (
            <p className="text-lg font-semibold">{data.studentName}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> {program}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Regulation {latest.exam.regulationYear}
            </span>
            {data.institute && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" aria-hidden /> {data.institute.name}
              </span>
            )}
          </div>
          <div className="portal-no-print flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setCgpaOpen(true)}>
              <Calculator className="mr-1.5 h-4 w-4" aria-hidden /> CGPA
            </Button>
            {actions?.onSave && (
              <Button variant="outline" size="sm" onClick={actions.onSave}>
                <Heart
                  className={`mr-1.5 h-4 w-4 ${actions.saved ? 'fill-red-500 text-red-500' : ''}`}
                  aria-hidden
                />
                {actions.saved ? 'Saved' : 'Save'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copySummary}>
              {copied ? (
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            {actions?.onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={actions.onDownload}
                disabled={actions.downloading}
              >
                {actions.downloading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                )}
                Download
              </Button>
            )}
            {actions?.onShare && (
              <Button variant="outline" size="sm" onClick={actions.onShare}>
                <Share2 className="mr-1.5 h-4 w-4" aria-hidden />
                {actions.shareLabel ?? 'Share'}
              </Button>
            )}
          </div>
        </header>
      )}

      {semesters.map((view) => (
        <SemesterCard key={view.semester} view={view} />
      ))}

      <CgpaDialog
        data={data}
        semesters={semesters}
        open={cgpaOpen}
        onOpenChange={setCgpaOpen}
      />
    </div>
  );
}
