/**
 * Personalized exam-routine popup — shown from the public result page.
 *
 * Fetches the routine for a roll (public endpoint) and renders the exams as
 * compact cards. Referred subjects are clearly marked. For rolls that aren't
 * enrolled students the routine is best-effort (inferred) and caveated.
 */
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Clock,
  Download,
  Info,
  Loader2,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import examRoutineService, {
  MyExamRoutineResponse,
  RoutineExam,
} from '@/services/examRoutineService';
import type { RoutineSheetInfo } from '@/lib/examRoutinePdf';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

function ExamRow({ exam }: { exam: RoutineExam }) {
  const remaining = daysUntil(exam.date);
  const isPast = remaining < 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-2.5 ${
        exam.isReferred
          ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20'
          : 'border-border'
      } ${isPast ? 'opacity-60' : ''}`}
    >
      <div
        className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 ${
          exam.isReferred
            ? 'bg-red-100 dark:bg-red-950/40'
            : 'bg-emerald-100 dark:bg-emerald-950/40'
        }`}
      >
        <span className="text-lg font-extrabold leading-none">{exam.date.slice(8, 10)}</span>
        <span className="text-[10px] uppercase text-muted-foreground">
          {new Date(`${exam.date}T00:00:00`).toLocaleDateString('en-GB', { month: 'short' })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{exam.subjectName}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{exam.subjectCode}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <CalendarDays className="h-3 w-3" aria-hidden /> {exam.weekday.slice(0, 3)}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" aria-hidden /> {to12h(exam.startTime)}–{to12h(exam.endTime)}
          </span>
        </div>
      </div>
      {exam.isReferred ? (
        <Badge className="shrink-0 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300">
          Referred
        </Badge>
      ) : (
        <Badge className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
          Regular
        </Badge>
      )}
    </div>
  );
}

export function RoutineDialog({
  roll,
  open,
  onOpenChange,
}: {
  roll: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<MyExamRoutineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technologies, setTechnologies] = useState<{ techCode: string; name: string }[]>([]);
  const [tech, setTech] = useState('');
  const [semester, setSemester] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = (opts: { tech?: string; semester?: number } = {}) => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    examRoutineService
      .getPublicRoutine(roll, opts)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError('Could not load the exam routine. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  };

  // Initial load + technology list for the picker.
  useEffect(() => {
    if (!open || !roll) return;
    const cleanup = load();
    examRoutineService.getTechnologies().then((r) => setTechnologies(r.technologies)).catch(() => {});
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roll]);

  const applyPicker = () => {
    if (!tech || !semester) return;
    setPickerOpen(false);
    load({ tech, semester: Number(semester) });
  };

  const exams = data?.exams ?? [];
  const remaining = exams.filter((e) => daysUntil(e.date) >= 0).length;
  const notExact = data?.available && data.source !== 'enrolled' && data.source !== 'selected';
  const showPicker = pickerOpen || (!loading && (notExact || (data?.available && exams.length === 0)));

  const sheetInfo = (): RoutineSheetInfo => {
    const selSem = data?.selectedSemester ?? data?.semesterNumber ?? data?.inferredSemester;
    return {
      roll,
      studentName: data?.studentName,
      department:
        data?.department ||
        technologies.find((t) => t.techCode === (data?.selectedTech ?? tech))?.name,
      semesterLabel: selSem ? `${ORDINALS[selSem - 1]} Semester` : undefined,
      regulationYear: data?.routine?.regulationYear,
      examSession: data?.routine?.examSession,
      examType: data?.examType,
      source: data?.source,
    };
  };

  const exportSheet = async (mode: 'download' | 'print') => {
    // jsPDF is heavy — load it only when someone actually exports.
    const { downloadRoutinePdf, printRoutinePdf } = await import('@/lib/examRoutinePdf');
    (mode === 'download' ? downloadRoutinePdf : printRoutinePdf)(sheetInfo(), exams);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-1.25rem)] max-w-lg gap-3 overflow-y-auto rounded-2xl p-4 sm:gap-4 sm:p-6">
        <DialogTitle className="flex items-center gap-2 pr-8 text-base sm:text-lg">
          <CalendarClock className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          Exam Routine — Roll {roll}
        </DialogTitle>

        {/* Technology + Semester picker (exact routine for any roll). */}
        {(showPicker || pickerOpen) && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Choose your department &amp; semester for an exact routine
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Select value={tech} onValueChange={setTech}>
                <SelectTrigger className="w-full sm:min-w-[190px] sm:flex-1">
                  <SelectValue placeholder="Department / Technology" />
                </SelectTrigger>
                <SelectContent>
                  {technologies.map((t) => (
                    <SelectItem key={t.techCode} value={t.techCode}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="flex-1 sm:w-[130px] sm:flex-none">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDINALS.map((label, i) => (
                      <SelectItem key={label} value={String(i + 1)}>
                        {label} Semester
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={applyPicker} disabled={!tech || !semester} className="bg-emerald-600 hover:bg-emerald-700">
                  Show
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
            Building the routine…
          </div>
        )}

        {!loading && error && (
          <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        )}

        {!loading && !error && data && !data.available && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {data.reason === 'no-routine'
              ? 'No exam routine has been published yet.'
              : 'Pick your department and semester above to see the routine.'}
          </p>
        )}

        {!loading && !error && data?.available && (
          <div className="min-w-0 space-y-3">
            {notExact && exams.length > 0 && (
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Estimated from published results — pick your department &amp;
                semester above for the exact routine. Referred subjects are exact.
              </p>
            )}
            {exams.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {data.routine?.regulationYear && (
                  <Badge variant="outline">{data.routine.regulationYear} Regulation</Badge>
                )}
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                  {remaining} upcoming
                </Badge>
                {(data.referredCount ?? 0) > 0 && (
                  <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                    {data.referredCount} referred
                  </Badge>
                )}
                {(data.source === 'enrolled' || data.source === 'selected') && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="text-emerald-600 underline-offset-2 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {exams.length === 0 ? (
              <p className="flex items-center justify-center gap-1.5 py-6 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                No matching exams — choose your department &amp; semester above.
              </p>
            ) : (
              exams.map((exam) => (
                <ExamRow key={`${exam.subjectCode}-${exam.date}`} exam={exam} />
              ))
            )}

            {exams.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => exportSheet('download')}
                  >
                    <Download className="mr-1.5 h-4 w-4" aria-hidden /> Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportSheet('print')}
                  >
                    <Printer className="mr-1.5 h-4 w-4" aria-hidden /> Print
                  </Button>
                </div>
                <p className="text-center text-[11px] leading-snug text-muted-foreground">
                  System-generated routine — always double-check dates &amp; times
                  against the official BTEB notice.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
