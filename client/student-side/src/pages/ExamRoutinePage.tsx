/**
 * Exam Routine — the student's personalized BTEB exam schedule.
 *
 * Two tabs: Final and Mid. Only Final is implemented; Mid is a stub whose
 * shell is ready so it can light up when a mid routine is imported.
 *
 * The routine is generated server-side (personalized to the student's
 * semester/technology + referred subjects), so this page just renders the
 * exams as beautiful cards — never a raw PDF. Mobile-first.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  Clock,
  Download,
  Hourglass,
  Loader2,
  BookMarked,
  CheckCircle2,
  Info,
  Printer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdmissionGuard } from '@/components/auth/AdmissionGuard';
import examRoutineService, {
  MyExamRoutineResponse,
  RoutineExam,
} from '@/services/examRoutineService';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** One exam card. `highlight` marks the next upcoming exam. */
function ExamCard({ exam, highlight }: { exam: RoutineExam; highlight: boolean }) {
  const remaining = daysUntil(exam.date);
  const isPast = remaining < 0;
  const isToday = remaining === 0;

  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${
        highlight
          ? 'ring-2 ring-emerald-400 dark:ring-emerald-600'
          : ''
      } ${exam.isReferred ? 'border-red-200 dark:border-red-900/50' : ''} ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <CardContent className="flex gap-3 p-0">
        {/* Date rail */}
        <div
          className={`flex w-20 shrink-0 flex-col items-center justify-center py-4 text-center ${
            exam.isReferred
              ? 'bg-red-50 dark:bg-red-950/30'
              : 'bg-emerald-50 dark:bg-emerald-950/30'
          }`}
        >
          <span className="text-2xl font-extrabold leading-none">
            {exam.date.slice(8, 10)}
          </span>
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {new Date(`${exam.date}T00:00:00`).toLocaleDateString('en-GB', { month: 'short' })}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">{exam.weekday.slice(0, 3)}</span>
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1 py-3 pr-3">
          <div className="flex flex-wrap items-start justify-between gap-1.5">
            <p className="font-semibold leading-snug">{exam.subjectName}</p>
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
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {exam.subjectCode}
            {exam.credit != null && ` · ${exam.credit} credit${exam.credit === 1 ? '' : 's'}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {to12h(exam.startTime)} – {to12h(exam.endTime)}
            </span>
            <span className="flex items-center gap-1">
              <Hourglass className="h-3.5 w-3.5" aria-hidden />
              {Math.round(exam.durationMinutes / 60)}h
            </span>
            <Badge variant="outline" className="text-[10px]">
              {exam.examKind}
            </Badge>
          </div>
          {(isToday || (highlight && !isPast)) && (
            <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
              isToday ? 'text-red-600' : 'text-emerald-600'
            }`}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              {isToday ? 'Today' : remaining === 1 ? 'Tomorrow' : `In ${remaining} days`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FinalRoutineTab() {
  const [data, setData] = useState<MyExamRoutineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    examRoutineService
      .getMyRoutine('final')
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError('Could not load your exam routine. Please try again later.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const exams = data?.exams ?? [];
  const upcomingIndex = useMemo(
    () => exams.findIndex((e) => daysUntil(e.date) >= 0),
    [exams],
  );
  const remaining = exams.filter((e) => daysUntil(e.date) >= 0).length;

  const exportSheet = async (mode: 'download' | 'print') => {
    if (!data?.student) return;
    // jsPDF is heavy — load it only when the student actually exports.
    const { downloadRoutinePdf, printRoutinePdf } = await import('@/lib/examRoutinePdf');
    const info = {
      roll: data.student.roll,
      studentName: data.student.name,
      department: data.student.department,
      semesterLabel: data.student.semester
        ? `${ORDINALS[data.student.semester - 1]} Semester`
        : undefined,
      regulationYear: data.routine?.regulationYear,
      examSession: data.routine?.examSession,
      examType: data.examType,
      source: 'enrolled',
    };
    (mode === 'download' ? downloadRoutinePdf : printRoutinePdf)(info, exams);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Building your routine…
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }
  if (!data?.available) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
          No exam routine has been published yet. Your personalized routine
          will appear here automatically once the institute imports it.
        </CardContent>
      </Card>
    );
  }
  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Info className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
          {data.technologyResolved === false
            ? "We couldn't match your department to the curriculum. Please contact your institute."
            : 'No exams from the published routine match your subjects yet.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <Card className="border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="flex items-center gap-1.5 font-semibold">
              <BookMarked className="h-4 w-4 text-emerald-600" aria-hidden />
              {data.routine?.examType === 'final' ? 'Semester Final' : 'Exam'} Routine
              {data.routine?.regulationYear && (
                <span className="text-sm font-normal text-muted-foreground">
                  · {data.routine.regulationYear} Regulation
                </span>
              )}
            </p>
            {data.routine?.examStartDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(data.routine.examStartDate)}
                {data.routine.examEndDate && ` – ${formatDate(data.routine.examEndDate)}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> {remaining} remaining
            </Badge>
            {(data.referredCount ?? 0) > 0 && (
              <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                {data.referredCount} referred
              </Badge>
            )}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 sm:flex-none"
              onClick={() => exportSheet('download')}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => exportSheet('print')}
            >
              <Printer className="mr-1.5 h-4 w-4" aria-hidden /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {exams.map((exam, index) => (
        <ExamCard
          key={`${exam.subjectCode}-${exam.date}`}
          exam={exam}
          highlight={index === upcomingIndex}
        />
      ))}

      <p className="text-center text-xs text-muted-foreground">
        System-generated routine — always double-check dates &amp; times against
        the official BTEB notice.
      </p>
    </div>
  );
}

function MidRoutineTab() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
        The Mid exam routine will appear here once it is published.
      </CardContent>
    </Card>
  );
}

export default function ExamRoutinePage() {
  return (
    <AdmissionGuard>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <CalendarClock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Exam Routine</h1>
          <p className="text-sm text-muted-foreground">
            Your personalized BTEB exam schedule
          </p>
        </div>
      </div>

      <Tabs defaultValue="final">
        <TabsList>
          <TabsTrigger value="final">Final Exam</TabsTrigger>
          <TabsTrigger value="mid">Mid Exam</TabsTrigger>
        </TabsList>
        <TabsContent value="final" className="mt-4">
          <FinalRoutineTab />
        </TabsContent>
        <TabsContent value="mid" className="mt-4">
          <MidRoutineTab />
        </TabsContent>
      </Tabs>
    </div>
    </AdmissionGuard>
  );
}
