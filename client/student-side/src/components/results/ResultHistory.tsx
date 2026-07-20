/**
 * Board-result history renderer — shared by the student "Board Results"
 * dashboard page (own results + friends) and the public roll-search page.
 *
 * Cards are interactive: the newest exam is expanded, older ones collapse to
 * a summary row. GPA tiles show a progress bar (out of 4.00), a trend arrow
 * vs the previous semester, and a star on the best semester.
 */
import { useState } from 'react';
import { ChevronDown, Minus, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { RollSearchResponse, SemesterGpa, StudentResult } from '@/services/resultService';

const RESULT_TYPE_META: Record<string, { label: string; className: string }> = {
  passed: {
    label: 'Passed',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  referred: {
    label: 'Referred',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  expelled: {
    label: 'Expelled',
    className: 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  },
  continuous_fail: {
    label: 'CA Failed',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
};

function formatSubject(subject: StudentResult['subjects'][number]): string {
  const parts = [
    subject.hasTheory ? 'T' : null,
    subject.hasPractical ? 'P' : null,
  ].filter(Boolean);
  return parts.length ? `${subject.subjectCode}(${parts.join(',')})` : subject.subjectCode;
}

/** One semester tile: GPA, progress bar to 4.00, trend arrow, best star. */
function GpaTile({
  gpa,
  previous,
  isBest,
}: {
  gpa: SemesterGpa;
  previous: SemesterGpa | undefined;
  isBest: boolean;
}) {
  const value = gpa.gpa !== null ? parseFloat(gpa.gpa) : null;
  const previousValue =
    previous && previous.gpa !== null ? parseFloat(previous.gpa) : null;
  const trend =
    value !== null && previousValue !== null
      ? value > previousValue
        ? 'up'
        : value < previousValue
          ? 'down'
          : 'flat'
      : null;

  return (
    <div
      className={`relative rounded-xl border px-2 py-2 text-center transition-colors ${
        gpa.isReferred
          ? 'border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30'
          : isBest
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
            : 'border-border bg-muted/40'
      }`}
      title={
        gpa.isReferred
          ? `Semester ${gpa.semester}: referred`
          : `Semester ${gpa.semester}: GPA ${gpa.gpa}`
      }
    >
      {isBest && (
        <Star className="absolute -right-1.5 -top-1.5 h-4 w-4 fill-amber-400 text-amber-500" />
      )}
      <div className="text-[11px] uppercase text-muted-foreground">Sem {gpa.semester}</div>
      <div className="flex items-center justify-center gap-0.5">
        <span
          className={`text-sm font-semibold ${
            gpa.isReferred ? 'text-red-600 dark:text-red-400' : ''
          }`}
        >
          {gpa.isReferred ? 'ref' : gpa.gpa}
        </span>
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-600" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
        {trend === 'flat' && <Minus className="h-3 w-3 text-muted-foreground" />}
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${
            gpa.isReferred ? 'bg-red-400' : 'bg-emerald-500'
          }`}
          style={{ width: value !== null ? `${(value / 4) * 100}%` : '100%' }}
        />
      </div>
    </div>
  );
}

export function ResultCard({
  result,
  defaultOpen = true,
}: {
  result: StudentResult;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = RESULT_TYPE_META[result.resultType] ?? {
    label: result.resultType,
    className: 'bg-muted text-muted-foreground',
  };

  const gpas = [...result.gpas].sort((a, b) => a.semester - b.semester);
  const numeric = gpas.filter((g) => g.gpa !== null);
  const best = numeric.length
    ? Math.max(...numeric.map((g) => parseFloat(g.gpa as string)))
    : null;
  const average = numeric.length
    ? (
        numeric.reduce((sum, g) => sum + parseFloat(g.gpa as string), 0) / numeric.length
      ).toFixed(2)
    : null;
  const ownGpa = gpas.find((g) => g.semester === result.exam.semester);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-semibold">
            Semester {result.exam.semester}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {result.exam.regulationYear} Regulation
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {result.exam.program}
            {result.exam.publicationDate && ` · published ${result.exam.publicationDate}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!open && ownGpa && !ownGpa.isReferred && (
            <span className="text-sm font-semibold">{ownGpa.gpa}</span>
          )}
          {result.cgpa && (
            <Badge
              variant="outline"
              className="border-emerald-300 text-emerald-700 dark:text-emerald-300"
            >
              CGPA {result.cgpa}
            </Badge>
          )}
          <Badge className={`${meta.className} hover:${meta.className}`}>{meta.label}</Badge>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <CardContent className="space-y-3 border-t pt-4">
          {gpas.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {gpas.map((gpa, index) => (
                  <GpaTile
                    key={gpa.semester}
                    gpa={gpa}
                    previous={index > 0 ? gpas[index - 1] : undefined}
                    isBest={
                      best !== null &&
                      gpa.gpa !== null &&
                      parseFloat(gpa.gpa) === best
                    }
                  />
                ))}
              </div>
              {average && (
                <p className="text-xs text-muted-foreground">
                  Average GPA <span className="font-semibold">{average}</span>
                  {best !== null && (
                    <>
                      {' '}· best semester{' '}
                      <span className="font-semibold">{best.toFixed(2)}</span>
                    </>
                  )}
                </p>
              )}
            </>
          )}
          {result.expelledRule && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Expelled under: {result.expelledRule}
            </p>
          )}
          {result.subjects.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Subjects to clear ({result.subjects.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.subjects.map((subject, index) => (
                  <Badge
                    key={`${subject.subjectCode}-${index}`}
                    variant="outline"
                    className={
                      subject.role === 'referred'
                        ? 'border-red-300 bg-red-50/60 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                        : 'border-red-400 bg-red-100/60 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                    }
                  >
                    {formatSubject(subject)}
                    {subject.role !== 'referred' &&
                      ` · ${RESULT_TYPE_META[subject.role]?.label ?? subject.role}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function ResultHistory({
  data,
  showHeader = true,
}: {
  data: RollSearchResponse;
  /** Hide the roll/CGPA header when the page renders its own hero. */
  showHeader?: boolean;
}) {
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
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Roll {data.roll}</h2>
          {data.finalCgpa && (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              Final CGPA {data.finalCgpa}
            </Badge>
          )}
        </div>
      )}
      {data.institute && (
        <p className="text-sm text-muted-foreground">
          {data.institute.code} — {data.institute.name}
        </p>
      )}
      {data.results.map((result, index) => (
        <ResultCard key={result.id} result={result} defaultOpen={index === 0} />
      ))}
    </div>
  );
}
