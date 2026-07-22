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
import { useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  GraduationCap,
  Loader2,
  Minus,
  Printer,
  Share2,
  TrendingDown,
  TrendingUp,
  Trophy,
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

interface SemesterView {
  semester: number;
  status: 'passed' | 'referred' | 'failed' | 'expelled' | 'continuous_fail';
  gpa: string | null;
  publicationDate: string | null;
  /** Subjects to clear — exactly the codes the board published for THIS
   *  semester's result (enriched with catalog names), never regrouped. */
  subjects: ResultSubject[];
  expelledRule: string;
  rank: number | null;
  rankTotal: number | null;
  /** GPA change vs the previous (lower) semester: 'up' | 'down' | 'flat'. */
  trend: 'up' | 'down' | 'flat' | null;
  /** Signed GPA delta vs the previous semester, e.g. +0.08. */
  trendDelta: number | null;
}

const PASSING_TYPES = new Set(['passed']);

/**
 * Fold the per-exam API results into one card per semester, staying FAITHFUL
 * to what the board published — the same data the admin roll search shows.
 *
 * The API already returns one result per semester (newest publication wins),
 * so each result maps to exactly one semester card. Subjects are shown under
 * the semester whose result listed them; they are NOT re-bucketed by any
 * catalog "home" semester, which previously scattered a single semester's
 * referred subjects across several cards and could surface superseded codes.
 *
 * Passed semesters that appear only inside a later result's GPA history
 * (e.g. sems 1–7 carried in the final-semester transcript) still get a card
 * so the full history is visible.
 */
function deriveSemesters(results: StudentResult[]): SemesterView[] {
  const cards = new Map<number, SemesterView>();

  // 1. One faithful card per published result (newest first from the API).
  for (const result of results) {
    const semester = result.exam.semester;
    if (cards.has(semester)) continue;
    const ownGrade = result.gpas.find((g) => g.semester === semester);
    const passed = PASSING_TYPES.has(result.resultType) || (ownGrade?.gpa != null);
    cards.set(semester, {
      semester,
      status: passed ? 'passed' : (result.resultType as SemesterView['status']),
      gpa: ownGrade?.gpa ?? null,
      publicationDate: result.exam.publicationDate,
      subjects: passed ? [] : result.subjects,
      expelledRule: result.expelledRule,
      rank: passed ? result.rank ?? null : null,
      rankTotal: passed ? result.rankTotal ?? null : null,
      trend: null,
      trendDelta: null,
    });
  }

  // 2. Fill in passed semesters known only from a later GPA history.
  for (const result of results) {
    for (const grade of result.gpas) {
      if (cards.has(grade.semester)) continue;
      if (grade.gpa == null) continue; // 'ref' history rows aren't a pass
      cards.set(grade.semester, {
        semester: grade.semester,
        status: 'passed',
        gpa: grade.gpa,
        publicationDate: result.exam.publicationDate,
        subjects: [],
        expelledRule: '',
        rank: null,
        rankTotal: null,
        trend: null,
        trendDelta: null,
      });
    }
  }

  const ordered = [...cards.values()].sort((a, b) => a.semester - b.semester);
  // 3. Semester-over-semester GPA trend (compared to the previous semester
  //    that has a numeric GPA).
  let prevGpa: number | null = null;
  for (const view of ordered) {
    const gpa = view.gpa != null ? parseFloat(view.gpa) : null;
    if (gpa != null && prevGpa != null) {
      const delta = Number((gpa - prevGpa).toFixed(2));
      view.trendDelta = delta;
      view.trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    }
    if (gpa != null) prevGpa = gpa;
  }

  return ordered.reverse();
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

const STATUS_META: Record<string, { label: string; className: string }> = {
  referred: { label: 'Referred', className: 'text-red-600' },
  failed: { label: 'Failed', className: 'text-red-600' },
  expelled: { label: 'Expelled', className: 'text-red-700' },
  continuous_fail: { label: 'Continuous Assessment Failed', className: 'text-orange-600' },
};

/** Small ▲/▼ GPA trend pill vs the previous semester. */
function TrendPill({ view }: { view: SemesterView }) {
  if (!view.trend || view.trendDelta == null) return null;
  if (view.trend === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <TrendingUp className="h-3 w-3" aria-hidden />+{view.trendDelta.toFixed(2)}
      </span>
    );
  }
  if (view.trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
        <TrendingDown className="h-3 w-3" aria-hidden />{view.trendDelta.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" aria-hidden />0.00
    </span>
  );
}

function SemesterCard({ view, dense = false }: { view: SemesterView; dense?: boolean }) {
  const gpaValue = view.gpa !== null ? parseFloat(view.gpa) : null;
  const status = STATUS_META[view.status];
  const clearCount = view.subjects.length;
  return (
    <Card className="result-card overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className={dense ? 'space-y-2 p-3.5' : 'space-y-3 p-4'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden />
            {ordinal(view.semester)} Semester
          </p>
          {view.status === 'passed' ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Passed
            </span>
          ) : (
            <span className={`flex items-center gap-1 text-sm font-semibold ${status?.className ?? 'text-red-600'}`}>
              <XCircle className="h-4 w-4" aria-hidden />
              {status?.label ?? view.status}
              {clearCount > 0 && ` · ${clearCount} to clear`}
            </span>
          )}
        </div>

        {/* Published date — hidden in the minimal (dense) view. */}
        {!dense && (
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
        )}

        {view.status === 'passed' ? (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">GPA</span>
              <TrendPill view={view} />
            </div>
            <span className="text-2xl font-extrabold text-emerald-600">{view.gpa}</span>
            <span className="text-sm font-semibold">
              {gpaValue !== null ? letterGrade(gpaValue) : ''}
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {view.expelledRule && (
              <p className="text-sm text-red-600">Rule: {view.expelledRule}</p>
            )}
            {clearCount > 0 && (
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Subjects to clear
              </p>
            )}
            {view.subjects.map((subject, index) => (
              <SubjectRow key={`${subject.subjectCode}-${index}`} subject={subject} />
            ))}
          </div>
        )}

        {/* Institute merit rank for passed semesters. */}
        {view.status === 'passed' && view.rank != null && view.rankTotal ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden />
            Institute rank{' '}
            <span className="font-semibold text-foreground">
              {view.rank}
              <span className="font-normal text-muted-foreground"> / {view.rankTotal}</span>
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* --------------------------- CGPA summary card ---------------------------- */

/**
 * Full-history summary popup (gradient header + CGPA + every semester's
 * status/GPA). Reused by the portal CGPA button and the Friends tab (tap a
 * friend to see their complete previous + current results). Derives the
 * per-semester view from the roll's results itself.
 */
export function ResultSummaryDialog({
  data,
  open,
  onOpenChange,
}: {
  data: RollSearchResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const semesters = useMemo(() => deriveSemesters(data.results), [data.results]);
  return (
    <CgpaDialog data={data} semesters={semesters} open={open} onOpenChange={onOpenChange} />
  );
}

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
  const passedCount = semesters.filter((view) => view.status === 'passed').length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border border-white/50 bg-white/70 p-0 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/60">
        <DialogTitle className="sr-only">CGPA summary</DialogTitle>

        {/* Gradient header with the headline CGPA */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 py-5 text-center text-white">
          <GraduationCap
            className="pointer-events-none absolute -left-3 -top-3 h-20 w-20 rotate-12 text-white/10"
            aria-hidden
          />
          <Trophy
            className="pointer-events-none absolute -bottom-4 -right-3 h-20 w-20 -rotate-12 text-white/10"
            aria-hidden
          />
          {data.studentName && (
            <p className="text-lg font-bold">{data.studentName}</p>
          )}
          <p className="text-sm text-emerald-50">Roll {data.roll}</p>
          {data.institute && (
            <p className="mt-0.5 text-xs text-emerald-100/90">{data.institute.name}</p>
          )}
          <div className="mt-3 inline-flex items-baseline gap-2 rounded-2xl bg-white/15 px-5 py-2 backdrop-blur-sm ring-1 ring-white/25">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-50">
              CGPA
            </span>
            <span className="text-3xl font-extrabold tracking-tight text-amber-300">
              {data.finalCgpa ?? '—'}
            </span>
          </div>
        </div>

        {/* Frosted semester list */}
        <div className="space-y-2 px-5 py-4">
          {semesters.map((view) => (
            <div
              key={view.semester}
              className="flex items-center justify-between rounded-xl border border-black/5 bg-white/60 px-4 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            >
              <span className="font-semibold">{ordinal(view.semester)} Semester</span>
              {view.status === 'passed' ? (
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {view.gpa}
                </span>
              ) : (
                <span className="font-semibold text-red-500">
                  {view.subjects.length > 0
                    ? `${view.subjects.length} to clear`
                    : STATUS_META[view.status]?.label ?? 'Pending'}
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="px-5 pb-4 text-center text-[11px] text-muted-foreground">
          {passedCount} of {semesters.length} semesters passed · generated from{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            result.spisg.gov.bd
          </span>
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
  onPrint?: () => void;
  onRoutine?: () => void;
}

export function ResultHistory({
  data,
  showHeader = true,
  actions,
  dense = false,
}: {
  data: RollSearchResponse;
  /** Hide the roll header when the page renders its own hero. */
  showHeader?: boolean;
  actions?: ResultHistoryActions;
  /** Minimal cards (no published-date chips) — used by the dashboard. */
  dense?: boolean;
}) {
  const [cgpaOpen, setCgpaOpen] = useState(false);
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

  const program = latest?.exam.program
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-4">
      {showHeader && latest && (
        <header className="space-y-2 text-center">
          {data.studentName ? (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {data.studentName}
              </h2>
              <p className="text-base font-semibold text-muted-foreground">
                Roll : {data.roll}
              </p>
            </>
          ) : (
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Roll : {data.roll}
            </h2>
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
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
              onClick={() => setCgpaOpen(true)}
            >
              <Calculator className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden /> CGPA
            </Button>
            {actions?.onRoutine && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
                onClick={actions.onRoutine}
              >
                <CalendarClock className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden />
                Exam Routine
              </Button>
            )}
            {actions?.onDownload && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
                onClick={actions.onDownload}
                disabled={actions.downloading}
              >
                {actions.downloading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden />
                )}
                Download
              </Button>
            )}
            {actions?.onShare && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
                onClick={actions.onShare}
              >
                <Share2 className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden />
                {actions.shareLabel ?? 'Share'}
              </Button>
            )}
            {actions?.onPrint && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
                onClick={actions.onPrint}
              >
                <Printer className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden /> Print
              </Button>
            )}
          </div>
        </header>
      )}

      {semesters.map((view) => (
        <SemesterCard key={view.semester} view={view} dense={dense} />
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
