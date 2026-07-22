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
  Info,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import examRoutineService, {
  MyExamRoutineResponse,
  RoutineExam,
} from '@/services/examRoutineService';

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

  useEffect(() => {
    if (!open || !roll) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    examRoutineService
      .getPublicRoutine(roll)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError('Could not load the exam routine. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, roll]);

  const exams = data?.exams ?? [];
  const remaining = exams.filter((e) => daysUntil(e.date) >= 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-emerald-600" aria-hidden />
          Exam Routine — Roll {roll}
        </DialogTitle>

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
          <p className="py-10 text-center text-sm text-muted-foreground">
            {data.reason === 'no-routine'
              ? 'No exam routine has been published yet.'
              : 'Not enough data to build a routine for this roll.'}
          </p>
        )}

        {!loading && !error && data?.available && (
          <div className="space-y-3">
            {data.source === 'inferred' && (
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                This roll isn't a registered student here, so the routine is
                estimated from published results. Referred subjects are exact.
              </p>
            )}
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
            </div>

            {exams.length === 0 ? (
              <p className="flex items-center gap-1.5 py-8 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                No exams from the published routine match this roll's subjects.
              </p>
            ) : (
              exams.map((exam) => (
                <ExamRow key={`${exam.subjectCode}-${exam.date}`} exam={exam} />
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
