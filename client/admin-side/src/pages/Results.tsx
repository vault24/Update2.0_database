/**
 * Board Results — BTEB result management (admin).
 *
 * Four tabs:
 *   Roll Search — look up any roll; full imported history.
 *   Analytics   — per-semester institute/department insight (semester picker
 *                 sits on the right of the tab header). Aggregates across all
 *                 regulation years, over students who have an account here.
 *   Download    — one box per semester; opens a dialog to pick department /
 *                 shift / format and download the official result sheet.
 *   Imports     — multi-file upload; history grouped into one box per day.
 *
 * Shared building blocks (result cards, stat cards, the download dialog) live
 * at the top so each tab stays small and readable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import resultService, {
  AnalyticsSummary,
  DownloadFormat,
  ParserIssue,
  ResultImport,
  RollSearchResponse,
  SemesterOption,
  StudentResult,
} from '@/services/resultService';
import departmentService, { Department } from '@/services/departmentService';

const SHIFTS = ['Morning', 'Day', 'Evening'];

const RESULT_TYPE_META: Record<string, { label: string; className: string }> = {
  passed: { label: 'Passed', className: 'bg-emerald-100 text-emerald-700' },
  referred: { label: 'Referred', className: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  expelled: { label: 'Expelled', className: 'bg-red-200 text-red-800' },
  continuous_fail: {
    label: 'Continuous Assessment Failed',
    className: 'bg-orange-100 text-orange-700',
  },
};

const SEVERITY_ICON = {
  error: <XCircle className="h-4 w-4 text-red-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  info: <Info className="h-4 w-4 text-sky-600" />,
} as const;

function formatSubject(subject: StudentResult['subjects'][number]): string {
  const parts = [
    subject.hasTheory ? 'T' : null,
    subject.hasPractical ? 'P' : null,
  ].filter(Boolean);
  return parts.length ? `${subject.subjectCode}(${parts.join(',')})` : subject.subjectCode;
}

function ResultTypeBadge({ type }: { type: string }) {
  const meta = RESULT_TYPE_META[type] ?? { label: type, className: 'bg-slate-100 text-slate-700' };
  return <Badge className={`${meta.className} hover:${meta.className}`}>{meta.label}</Badge>;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/** Shared department loader (used by the download dialog). */
function useDepartments(): Department[] {
  const [departments, setDepartments] = useState<Department[]>([]);
  useEffect(() => {
    departmentService
      .getDepartments({ page_size: 100 })
      .then((res) => setDepartments(res.results ?? []))
      .catch(() => setDepartments([]));
  }, []);
  return departments;
}

/** Full result card for the Roll Search tab. */
function ResultCard({ result }: { result: StudentResult }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            Semester {result.exam.semester} — {result.exam.regulationYear} Regulation
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {result.exam.program}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {result.cgpa && (
              <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                CGPA {result.cgpa}
              </Badge>
            )}
            <ResultTypeBadge type={result.resultType} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {result.institute.code} — {result.institute.name}
          {result.exam.publicationDate && ` · published ${result.exam.publicationDate}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.gpas.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {[...result.gpas]
              .sort((a, b) => a.semester - b.semester)
              .map((gpa) => (
                <div key={gpa.semester} className="rounded-md border bg-slate-50 px-2 py-1.5 text-center">
                  <div className="text-[11px] uppercase text-muted-foreground">Sem {gpa.semester}</div>
                  <div
                    className={`text-sm font-semibold ${gpa.isReferred ? 'text-amber-600' : 'text-slate-800'}`}
                  >
                    {gpa.isReferred ? 'ref' : gpa.gpa}
                  </div>
                </div>
              ))}
          </div>
        )}
        {result.expelledRule && (
          <p className="text-sm text-red-700">Expelled under: {result.expelledRule}</p>
        )}
        {result.subjects.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {result.subjects.map((subject, index) => (
                <Badge
                  key={`${subject.subjectCode}-${index}`}
                  variant="outline"
                  className={
                    subject.role === 'referred'
                      ? 'border-amber-300 text-amber-700'
                      : 'border-red-300 text-red-700'
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
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Download dialog (shared by Download tab + Analytics "download this semester")
// ---------------------------------------------------------------------------

function DownloadDialog({
  semester,
  semesterLabel,
  departments,
  open,
  onOpenChange,
}: {
  semester: number | null;
  semesterLabel?: string;
  departments: Department[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [department, setDepartment] = useState('all');
  const [shift, setShift] = useState('all');
  const [format, setFormat] = useState<DownloadFormat>('pdf');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      setDepartment('all');
      setShift('all');
      setFormat('pdf');
    }
  }, [open, semester]);

  const download = async () => {
    if (semester === null) return;
    try {
      setDownloading(true);
      await resultService.downloadSheet(semester, {
        departmentId: department === 'all' ? undefined : department,
        shift: shift === 'all' ? undefined : shift,
        format,
      });
      toast.success('Result sheet downloaded');
      onOpenChange(false);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Download result sheet</DialogTitle>
          <DialogDescription>
            {semesterLabel ?? `Semester ${semester}`} — choose department, shift
            and format. The sheet follows the institute's official tabulation
            layout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Department</label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Shift</label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                {SHIFTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  format === 'pdf'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  format === 'excel'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={download} disabled={downloading || semester === null}>
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-1.5">Download</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Roll Search tab
// ---------------------------------------------------------------------------

function RollSearchTab() {
  const [roll, setRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [response, setResponse] = useState<RollSearchResponse | null>(null);

  const search = async () => {
    const trimmed = roll.trim();
    if (!/^\d{4,10}$/.test(trimmed)) {
      toast.error('Enter a valid numeric roll number');
      return;
    }
    try {
      setSearching(true);
      setResponse(await resultService.searchRoll(trimmed));
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={roll}
          onChange={(event) => setRoll(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && search()}
          placeholder="Enter board roll number, e.g. 612120"
          className="max-w-sm"
          inputMode="numeric"
        />
        <Button onClick={search} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-1.5">Search</span>
        </Button>
      </div>

      {response && !response.found && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No result found for roll {response.roll}.
          </CardContent>
        </Card>
      )}

      {response?.found && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Roll {response.roll}</h2>
            {response.finalCgpa && (
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                Final CGPA {response.finalCgpa}
              </Badge>
            )}
            {response.institute && (
              <span className="text-sm text-muted-foreground">
                {response.institute.code} — {response.institute.name}
              </span>
            )}
          </div>
          {response.results.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab (semester-based; picker on the right)
// ---------------------------------------------------------------------------

function AnalyticsTab({ departments }: { departments: Department[] }) {
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [semester, setSemester] = useState<string>('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    resultService
      .getAnalyticsSemesters()
      .then((list) => {
        setSemesters(list);
        if (list.length > 0) setSemester(String(list[0].semester));
      })
      .catch(() => toast.error('Could not load semesters'));
  }, []);

  useEffect(() => {
    if (!semester) return;
    setLoading(true);
    resultService
      .getAnalyticsSummary(Number(semester))
      .then(setSummary)
      .catch(() => toast.error('Could not load the summary'))
      .finally(() => setLoading(false));
  }, [semester]);

  const chartData = (summary?.departments ?? []).map((dept) => ({
    name: dept.code || dept.name,
    Passed: dept.passed,
    Referred: dept.referred,
    Failed: dept.failed + dept.expelled + dept.continuousFail,
  }));

  return (
    <div className="space-y-4">
      {/* Semester picker on the right of the section header. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Analytics cover students who have an account on this site.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Semester</span>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((option) => (
                <SelectItem key={option.semester} value={String(option.semester)}>
                  {option.label} ({option.students})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {semesters.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No imported results yet — upload a BTEB result PDF first.
          </CardContent>
        </Card>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Our students appeared" value={summary.institute.appeared} />
            <StatCard
              label="Passed"
              value={summary.institute.passed}
              sub={summary.institute.passRate !== null ? `${summary.institute.passRate}% pass rate` : undefined}
            />
            <StatCard label="Referred" value={summary.institute.referred} />
            <StatCard
              label="Failed / Expelled / CA"
              value={summary.institute.failed + summary.institute.expelled + summary.institute.continuousFail}
            />
            <StatCard
              label="Average GPA"
              value={summary.institute.avgGpa ?? '—'}
              sub={summary.institute.avgCgpa !== null ? `Avg CGPA ${summary.institute.avgCgpa}` : undefined}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              National context: {summary.national.records.toLocaleString()} records across{' '}
              {summary.national.institutes} institutes
              {summary.national.passRate !== null && ` · national pass rate ${summary.national.passRate}%`}
            </p>
            <Button variant="outline" size="sm" onClick={() => setDownloadOpen(true)}>
              <Download className="h-4 w-4" />
              <span className="ml-1.5">Download {summary.label} sheet</span>
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Department comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  No enrolled students matched this semester.
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <ChartTooltip />
                      <Legend />
                      <Bar dataKey="Passed" fill="#059669" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Referred" fill="#d97706" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Failed" fill="#dc2626" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {summary.departments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Department summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Appeared</TableHead>
                      <TableHead className="text-right">Passed</TableHead>
                      <TableHead className="text-right">Referred</TableHead>
                      <TableHead className="text-right">Failed+</TableHead>
                      <TableHead className="text-right">Pass %</TableHead>
                      <TableHead className="text-right">Avg GPA</TableHead>
                      <TableHead>Shifts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-right">{dept.appeared}</TableCell>
                        <TableCell className="text-right text-emerald-700">{dept.passed}</TableCell>
                        <TableCell className="text-right text-amber-700">{dept.referred}</TableCell>
                        <TableCell className="text-right text-red-700">
                          {dept.failed + dept.expelled + dept.continuousFail}
                        </TableCell>
                        <TableCell className="text-right">
                          {dept.passRate !== null ? `${dept.passRate}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right">{dept.avgGpa ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Object.entries(dept.shifts)
                            .map(
                              ([shift, s]) =>
                                `${shift}: ${s.passed}/${s.appeared}` +
                                (s.passRate !== null ? ` (${s.passRate}%)` : ''),
                            )
                            .join(' · ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-amber-500" /> Top performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.topPerformers.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">No passed students.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">GPA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.topPerformers.map((performer) => (
                        <TableRow key={performer.roll}>
                          <TableCell>{performer.roll}</TableCell>
                          <TableCell className="max-w-[160px] truncate">{performer.name}</TableCell>
                          <TableCell className="text-xs">{performer.department}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {performer.gpa}
                            {performer.cgpa && (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (CGPA {performer.cgpa})
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Most-failed subjects</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Referred / expelled / CA subject codes among our students —
                  where extra teaching support would help most.
                </p>
              </CardHeader>
              <CardContent>
                {summary.topFailedSubjects.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">No referred subjects. 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {summary.topFailedSubjects.map((subject) => {
                      const max = summary.topFailedSubjects[0].students;
                      return (
                        <div key={subject.subjectCode} className="flex items-center gap-2">
                          <span className="w-16 font-mono text-sm">{subject.subjectCode}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                            <div
                              className="h-full rounded bg-amber-500"
                              style={{ width: `${(subject.students / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-20 text-right text-sm text-muted-foreground">
                            {subject.students} student{subject.students === 1 ? '' : 's'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <DownloadDialog
        semester={summary ? summary.semester : null}
        semesterLabel={summary?.label}
        departments={departments}
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Download tab (one box per semester → dialog)
// ---------------------------------------------------------------------------

function DownloadTab({ departments }: { departments: Department[] }) {
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SemesterOption | null>(null);

  useEffect(() => {
    resultService
      .getAnalyticsSemesters()
      .then(setSemesters)
      .catch(() => toast.error('Could not load semesters'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Download result sheet</h2>
        <p className="text-sm text-muted-foreground">
          Pick a semester, then choose department, shift and format (PDF or
          Excel) in the dialog.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : semesters.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No imported results yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {semesters.map((option) => (
            <button
              key={option.semester}
              type="button"
              onClick={() => setSelected(option)}
              className="group flex flex-col items-start gap-2 rounded-xl border bg-gradient-to-br from-indigo-50 to-white p-4 text-left transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Layers className="h-4 w-4" />
                </span>
                <Download className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.students} student{option.students === 1 ? '' : 's'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <DownloadDialog
        semester={selected ? selected.semester : null}
        semesterLabel={selected?.label}
        departments={departments}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Imports tab (multi-file upload + day-grouped history)
// ---------------------------------------------------------------------------

function groupByDay(imports: ResultImport[]): { day: string; items: ResultImport[] }[] {
  const groups = new Map<string, ResultImport[]>();
  for (const item of imports) {
    const day = new Date(item.createdAt).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const list = groups.get(day) ?? [];
    list.push(item);
    groups.set(day, list);
  }
  return Array.from(groups.entries()).map(([day, items]) => ({ day, items }));
}

function ImportStatusBadge({ item }: { item: ResultImport }) {
  if (item.status === 'processing') {
    return (
      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }
  if (item.status === 'completed') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Completed
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100" title={item.errorMessage}>
      <XCircle className="mr-1 h-3 w-3" />
      Failed
    </Badge>
  );
}

function ImportsTab() {
  const [imports, setImports] = useState<ResultImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<{ done: number; total: number } | null>(null);
  const [issuesFor, setIssuesFor] = useState<ResultImport | null>(null);
  const [issues, setIssues] = useState<ParserIssue[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ResultImport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setImports(await resultService.getImports());
    } catch {
      toast.error('Could not load import history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasProcessing = imports.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [hasProcessing, refresh]);

  /** Upload every selected PDF sequentially (BTEB publishes results across
   *  several files — this lets the admin add them all in one go). */
  const uploadFiles = async (files: File[]) => {
    const pdfs = files.filter((file) => file.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      toast.error('Select one or more PDF files');
      return;
    }
    setQueue({ done: 0, total: pdfs.length });
    let succeeded = 0;
    for (let index = 0; index < pdfs.length; index += 1) {
      try {
        await resultService.uploadPdf(pdfs[index]);
        succeeded += 1;
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : '';
        toast.error(`${pdfs[index].name}: ${detail || 'upload failed'}`);
      }
      setQueue({ done: index + 1, total: pdfs.length });
      await refresh();
    }
    setQueue(null);
    if (succeeded > 0) {
      toast.success(
        `${succeeded} file${succeeded === 1 ? '' : 's'} queued — parsing in the background`,
      );
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const showIssues = async (item: ResultImport) => {
    setIssuesFor(item);
    try {
      setIssues(await resultService.getImportIssues(item.id));
    } catch {
      toast.error('Could not load issues');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await resultService.deleteImport(deleteTarget.id);
      toast.success('Import and its results removed');
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  const days = useMemo(() => groupByDay(imports), [imports]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium">Upload official BTEB result PDFs</p>
            <p className="text-sm text-muted-foreground">
              Select multiple files at once — BTEB publishes results across
              several PDFs. Every institute is imported and matching student
              profiles sync automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length) uploadFiles(files);
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={queue !== null}>
              {queue ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-1.5">
                    Uploading {queue.done}/{queue.total}
                  </span>
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  <span className="ml-1.5">Upload PDFs</span>
                </>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={refresh} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : days.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No imports yet. Upload the first BTEB result PDFs above.
          </CardContent>
        </Card>
      ) : (
        days.map(({ day, items }) => (
          <Card key={day}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                {day}
              </CardTitle>
              <Badge variant="outline">
                {items.length} file{items.length === 1 ? '' : 's'}
              </Badge>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((item) => {
                const issuesTotal = Object.values(item.stats.issuesBySeverity ?? {}).reduce(
                  (sum, count) => sum + count,
                  0,
                );
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{item.fileName}</span>
                        <ImportStatusBadge item={item} />
                      </div>
                      <div className="mt-0.5 pl-6 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleTimeString()}
                        {item.exam && ` · Sem ${item.exam.semester} (${item.exam.regulationYear})`}
                        {item.uploadedByName && ` · ${item.uploadedByName}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {item.status === 'completed' && (
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <div>{item.stats.recordCount?.toLocaleString() ?? 0} records</div>
                          <div>
                            {item.stats.instituteCount ?? 0} institutes ·{' '}
                            {item.stats.sync?.updatedStudents ?? 0} synced
                          </div>
                        </div>
                      )}
                      {issuesTotal > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => showIssues(item)}>
                          {issuesTotal} issue{issuesTotal === 1 ? '' : 's'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(item)}
                        title="Delete import"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={issuesFor !== null} onOpenChange={(open) => !open && setIssuesFor(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parser issues — {issuesFor?.fileName}</DialogTitle>
            <DialogDescription>
              Everything the parser could not fully understand is listed here;
              nothing is dropped silently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div key={issue.id} className="flex gap-2 rounded-md border p-2 text-sm">
                {SEVERITY_ICON[issue.severity]}
                <div className="min-w-0">
                  <p className="font-medium">
                    {issue.code}
                    {issue.rollNumber && ` · roll ${issue.rollNumber}`}
                  </p>
                  <p className="text-muted-foreground">{issue.message}</p>
                  {issue.context && (
                    <p className="mt-1 break-all rounded bg-slate-50 p-1 font-mono text-xs">
                      {issue.context}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {issues.length === 0 && (
              <p className="py-4 text-center text-muted-foreground">No issues.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this import?</DialogTitle>
            <DialogDescription>
              This removes “{deleteTarget?.fileName}” and every result imported
              from it ({deleteTarget?.stats.recordCount?.toLocaleString() ?? 0} records).
              Student profiles keep their already-synced data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Results() {
  const departments = useDepartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Board Results</h1>
        <p className="text-muted-foreground">
          Import official BTEB result PDFs, search any roll, analyse by semester
          and download result sheets.
        </p>
      </div>
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Roll Search</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="mt-4">
          <RollSearchTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab departments={departments} />
        </TabsContent>
        <TabsContent value="download" className="mt-4">
          <DownloadTab departments={departments} />
        </TabsContent>
        <TabsContent value="imports" className="mt-4">
          <ImportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
