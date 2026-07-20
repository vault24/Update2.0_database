/**
 * Board Results — BTEB result import + roll search (admin).
 *
 * Two tabs:
 *   Roll Search — look up any roll from any institute; shows the complete
 *                 imported result history (all semesters, CGPA, referred
 *                 subjects).
 *   Imports     — upload the official BTEB PDF, watch it parse (the row
 *                 polls while processing), review statistics and parser
 *                 issues, delete an import.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileUp,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
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
  AnalyticsExam,
  AnalyticsSummary,
  ParserIssue,
  ResultImport,
  RollSearchResponse,
  StudentResult,
} from '@/services/resultService';

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

/** One exam's result: header, GPA grid, subject chips. */
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
                <div
                  key={gpa.semester}
                  className="rounded-md border bg-slate-50 px-2 py-1.5 text-center"
                >
                  <div className="text-[11px] uppercase text-muted-foreground">
                    Sem {gpa.semester}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      gpa.isReferred ? 'text-amber-600' : 'text-slate-800'
                    }`}
                  >
                    {gpa.isReferred ? 'ref' : gpa.gpa}
                  </div>
                </div>
              ))}
          </div>
        )}
        {result.expelledRule && (
          <p className="text-sm text-red-700">
            Expelled under: {result.expelledRule}
          </p>
        )}
        {result.subjects.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Subjects
            </p>
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
                  {subject.role !== 'referred' && ` · ${RESULT_TYPE_META[subject.role]?.label ?? subject.role}`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
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

const SEVERITY_ICON = {
  error: <XCircle className="h-4 w-4 text-red-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  info: <Info className="h-4 w-4 text-sky-600" />,
} as const;

function ImportsTab() {
  const [imports, setImports] = useState<ResultImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

  // Poll while any import is still processing.
  const hasProcessing = imports.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [hasProcessing, refresh]);

  const upload = async (file: File) => {
    try {
      setUploading(true);
      await resultService.uploadPdf(file);
      toast.success('Import started — parsing the PDF in the background');
      await refresh();
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : '';
      toast.error(detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium">Upload official BTEB result PDF</p>
            <p className="text-sm text-muted-foreground">
              Every institute in the PDF is imported; matching student profiles
              sync automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              <span className="ml-1.5">Upload PDF</span>
            </Button>
            <Button variant="outline" size="icon" onClick={refresh} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Import history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : imports.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No imports yet. Upload the first BTEB result PDF above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Institutes</TableHead>
                  <TableHead className="text-right">Synced</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((item) => {
                  const issuesTotal = Object.values(item.stats.issuesBySeverity ?? {}).reduce(
                    (sum, count) => sum + count,
                    0,
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate font-medium">{item.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                          {item.uploadedByName && ` · ${item.uploadedByName}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.exam
                          ? `Sem ${item.exam.semester} (${item.exam.regulationYear})`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {item.status === 'processing' && (
                          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {item.status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Completed
                          </Badge>
                        )}
                        {item.status === 'failed' && (
                          <Badge
                            className="bg-red-100 text-red-700 hover:bg-red-100"
                            title={item.errorMessage}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.stats.recordCount?.toLocaleString() ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.stats.instituteCount ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.stats.sync?.updatedStudents ?? '—'}
                      </TableCell>
                      <TableCell>
                        {issuesTotal > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showIssues(item)}
                          >
                            {issuesTotal} issue{issuesTotal === 1 ? '' : 's'}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">none</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(item)}
                          title="Delete import"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              from it ({deleteTarget?.stats.recordCount?.toLocaleString() ?? 0}{' '}
              records). Student profiles keep their already-synced data.
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

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
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

function AnalyticsTab() {
  const [exams, setExams] = useState<AnalyticsExam[]>([]);
  const [examId, setExamId] = useState<string>('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadDept, setDownloadDept] = useState<string>('all');
  const [downloadShift, setDownloadShift] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await resultService.getAnalyticsExams();
        setExams(list);
        if (list.length > 0) setExamId(String(list[0].id));
      } catch {
        toast.error('Could not load exams');
      }
    })();
  }, []);

  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        setLoading(true);
        setSummary(await resultService.getAnalyticsSummary(Number(examId)));
      } catch {
        toast.error('Could not load the summary');
      } finally {
        setLoading(false);
      }
    })();
  }, [examId]);

  const download = async () => {
    if (!examId) return;
    try {
      setDownloading(true);
      await resultService.downloadCsv(Number(examId), {
        departmentId: downloadDept === 'all' ? undefined : downloadDept,
        shift: downloadShift === 'all' ? undefined : downloadShift,
      });
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const chartData = (summary?.departments ?? []).map((dept) => ({
    name: dept.code || dept.name,
    Passed: dept.passed,
    Referred: dept.referred,
    Failed: dept.failed + dept.expelled + dept.continuousFail,
    'Pass %': dept.passRate ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Select an exam" />
          </SelectTrigger>
          <SelectContent>
            {exams.map((exam) => (
              <SelectItem key={exam.id} value={String(exam.id)}>
                Semester {exam.semester} — {exam.regulationYear} Regulation (
                {exam.resultCount.toLocaleString()} records)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {exams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No imported exams yet — upload a BTEB result PDF first.
          </CardContent>
        </Card>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Appeared (our students)" value={summary.institute.appeared} />
            <StatCard
              label="Passed"
              value={summary.institute.passed}
              sub={summary.institute.passRate !== null ? `${summary.institute.passRate}% pass rate` : undefined}
            />
            <StatCard label="Referred" value={summary.institute.referred} />
            <StatCard
              label="Failed / Expelled / CA"
              value={
                summary.institute.failed +
                summary.institute.expelled +
                summary.institute.continuousFail
              }
            />
            <StatCard
              label="Average GPA"
              value={summary.institute.avgGpa ?? '—'}
              sub={
                summary.institute.avgCgpa !== null
                  ? `Avg CGPA ${summary.institute.avgCgpa}`
                  : undefined
              }
            />
          </div>

          <p className="text-xs text-muted-foreground">
            National context: {summary.national.records.toLocaleString()} records
            across {summary.national.institutes} institutes
            {summary.national.passRate !== null &&
              ` · national pass rate ${summary.national.passRate}%`}
          </p>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Department comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  No enrolled students matched this exam's rolls.
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
                            .map(([shift, s]) =>
                              `${shift}: ${s.passed}/${s.appeared}` +
                              (s.passRate !== null ? ` (${s.passRate}%)` : ''))
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
                <CardTitle className="text-base">Top performers</CardTitle>
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
                  <p className="py-4 text-center text-muted-foreground">
                    No referred subjects. 🎉
                  </p>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Download result sheet (CSV)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Roll, name, department, shift, status, GPA history and subjects
                to clear — filtered by department and shift.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Select value={downloadDept} onValueChange={setDownloadDept}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {summary.departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={downloadShift} onValueChange={setDownloadShift}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shifts</SelectItem>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={download} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span className="ml-1.5">Download CSV</span>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Results() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Board Results</h1>
        <p className="text-muted-foreground">
          Import official BTEB result PDFs and search any roll number.
        </p>
      </div>
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Roll Search</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="mt-4">
          <RollSearchTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="imports" className="mt-4">
          <ImportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
