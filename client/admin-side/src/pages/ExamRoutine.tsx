/**
 * Exam Routine — BTEB routine import (admin), beside Board Results.
 *
 * Upload a routine PDF → the server parses it (theory schedule), stores the
 * sessions/subjects, and personalizes every student's routine. This screen
 * shows import status, statistics, parser issues, and the imported
 * semesters/subjects.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileUp,
  Info,
  Loader2,
  RefreshCw,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import examRoutineService, {
  RoutineImport,
  RoutineParserIssue,
} from '@/services/examRoutineService';

const SEVERITY_ICON = {
  error: <XCircle className="h-4 w-4 text-red-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  info: <Info className="h-4 w-4 text-sky-600" />,
} as const;

export default function ExamRoutine() {
  const [imports, setImports] = useState<RoutineImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [issuesFor, setIssuesFor] = useState<RoutineImport | null>(null);
  const [issues, setIssues] = useState<RoutineParserIssue[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<RoutineImport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setImports(await examRoutineService.getImports());
    } catch {
      toast.error('Could not load routine imports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasProcessing = imports.some((i) => i.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [hasProcessing, refresh]);

  const upload = async (file: File) => {
    try {
      setUploading(true);
      await examRoutineService.uploadPdf(file);
      toast.success('Routine import started — parsing in the background');
      await refresh();
    } catch (error: unknown) {
      toast.error((error instanceof Error && error.message) || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const showIssues = async (item: RoutineImport) => {
    setIssuesFor(item);
    try {
      setIssues(await examRoutineService.getImportIssues(item.id));
    } catch {
      toast.error('Could not load issues');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await examRoutineService.deleteImport(deleteTarget.id);
      toast.success('Routine import removed');
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exam Routine</h1>
        <p className="text-muted-foreground">
          Import official BTEB exam routine PDFs. Each student's personalized
          routine is generated automatically.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium">Upload exam routine PDF</p>
            <p className="text-sm text-muted-foreground">
              The theory written-exam schedule is parsed; students see only the
              exams matching their semester subjects and referred subjects.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              <span className="ml-1.5">Upload routine</span>
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
              No routine imported yet. Upload the BTEB routine PDF above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Regulation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Subjects</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((item) => {
                  const issuesTotal = Object.values(item.stats.issuesBySeverity ?? {}).reduce(
                    (a, b) => a + b, 0,
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{item.fileName}</span>
                          {item.isActive && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                          {item.uploadedByName && ` · ${item.uploadedByName}`}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{item.examType}</TableCell>
                      <TableCell>{item.regulationYear ?? '—'}</TableCell>
                      <TableCell>
                        {item.status === 'processing' && (
                          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
                          </Badge>
                        )}
                        {item.status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                          </Badge>
                        )}
                        {item.status === 'failed' && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100" title={item.errorMessage}>
                            <XCircle className="mr-1 h-3 w-3" /> Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.stats.sessionCount ?? '—'}</TableCell>
                      <TableCell className="text-right">{item.stats.subjectCount ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.examStartDate ? `${item.examStartDate} → ${item.examEndDate}` : '—'}
                      </TableCell>
                      <TableCell>
                        {issuesTotal > 0 ? (
                          <Button variant="ghost" size="sm" onClick={() => showIssues(item)}>
                            {issuesTotal} issue{issuesTotal === 1 ? '' : 's'}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">none</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} title="Delete">
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
              Everything the routine parser could not fully understand is listed here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div key={issue.id} className="flex gap-2 rounded-md border p-2 text-sm">
                {SEVERITY_ICON[issue.severity]}
                <div className="min-w-0">
                  <p className="font-medium">{issue.code}</p>
                  <p className="text-muted-foreground">{issue.message}</p>
                  {issue.context && (
                    <p className="mt-1 break-all rounded bg-slate-50 p-1 font-mono text-xs">
                      {issue.context}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {issues.length === 0 && <p className="py-4 text-center text-muted-foreground">No issues.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this routine import?</DialogTitle>
            <DialogDescription>
              This removes “{deleteTarget?.fileName}” and its schedule. Students'
              personalized routines will fall back to the next active routine.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
