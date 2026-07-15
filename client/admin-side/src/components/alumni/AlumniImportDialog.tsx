import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, FileSpreadsheet, Link2, Loader2, CheckCircle2, AlertTriangle,
  XCircle, ArrowRight, ArrowLeft, Copy, Check, BookOpen, Search, X, FileUp,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import {
  alumniService, type ImportPreview, type ImportResult, type ImportSchema,
  type ImportSource,
} from '@/services/alumniService';

type Step = 'source' | 'preview' | 'result';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful import so the caller can refresh its list. */
  onImported?: (result: ImportResult) => void;
}

const ACCEPT = '.xlsx,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Row-wise error list, shared by the preview and result screens. */
function ErrorList({ errors, title }: { errors: { rowNumber: number; errors: string[] }[]; title: string }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5">
      <p className="border-b border-destructive/20 px-3 py-2 text-xs font-semibold text-destructive">
        {title}
      </p>
      <ScrollArea className="max-h-40">
        <ul className="divide-y divide-destructive/10">
          {errors.map((e) => (
            <li key={e.rowNumber} className="px-3 py-2 text-xs">
              <span className="font-mono font-semibold text-destructive">Row {e.rowNumber}</span>
              <ul className="ml-4 list-disc text-muted-foreground">
                {e.errors.map((message, i) => <li key={i}>{message}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

/** Summary tile used on the result screen. */
function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn('rounded-xl border p-3 text-center', tone)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Column Reference — rendered entirely from the server's import schema, so the
 * documentation always matches what the importer actually accepts.
 */
function ColumnReference({ schema }: { schema: ImportSchema | null }) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const groups = useMemo(() => {
    if (!schema) return [];
    const term = query.trim().toLowerCase();
    const match = (f: ImportSchema['fields'][number]) =>
      !term ||
      f.label.toLowerCase().includes(term) ||
      f.recommended.toLowerCase().includes(term) ||
      f.key.toLowerCase().includes(term) ||
      f.aliases.some((a) => a.toLowerCase().includes(term));

    const byGroup = new Map<string, ImportSchema['fields']>();
    schema.fields.filter(match).forEach((f) => {
      const list = byGroup.get(f.group) || [];
      list.push(f);
      byGroup.set(f.group, list);
    });
    return [...byGroup.entries()];
  }, [schema, query]);

  const copyTemplate = async () => {
    if (!schema) return;
    // Tab-separated so it pastes straight across Excel's header row.
    const header = schema.columnTemplate.join('\t');
    try {
      await navigator.clipboard.writeText(header);
      setCopied(true);
      toast.success('Column template copied', {
        description: 'Paste into row 1 of your spreadsheet.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not access the clipboard');
    }
  };

  if (!schema) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Only <strong className="text-foreground">Name</strong> and{' '}
          <strong className="text-foreground">Department</strong> are required. Every other column
          is optional — include only what you have. Column names are matched
          case-insensitively against the aliases below.
        </p>
        <Button variant="outline" size="sm" onClick={copyTemplate} className="shrink-0 gap-2">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          Copy Column Template
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search fields or aliases…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="max-h-[42vh] rounded-xl border border-border">
        <div className="divide-y divide-border">
          {groups.map(([group, fields]) => (
            <div key={group}>
              <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              {fields.map((f) => (
                <div key={f.key} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{f.label}</span>
                    {f.required ? (
                      <Badge className="border-destructive/30 bg-destructive/10 text-destructive" variant="outline">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Optional</Badge>
                    )}
                  </div>
                  <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-[7rem_1fr]">
                    <dt className="text-muted-foreground">Recommended</dt>
                    <dd className="font-mono font-medium text-primary">{f.recommended}</dd>

                    {f.aliases.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">Aliases</dt>
                        <dd className="text-muted-foreground">{f.aliases.join(', ')}</dd>
                      </>
                    )}

                    <dt className="text-muted-foreground">Database field</dt>
                    <dd className="font-mono text-muted-foreground">
                      {f.target}.{f.key}
                    </dd>

                    {f.example && (
                      <>
                        <dt className="text-muted-foreground">Example</dt>
                        <dd className="text-foreground">{f.example}</dd>
                      </>
                    )}

                    {f.choices.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">Allowed</dt>
                        <dd className="text-muted-foreground">{f.choices.join(', ')}</dd>
                      </>
                    )}

                    {f.helpText && (
                      <>
                        <dt className="text-muted-foreground">Note</dt>
                        <dd className="text-muted-foreground">{f.helpText}</dd>
                      </>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No fields match “{query}”.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function AlumniImportDialog({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>('source');
  const [schema, setSchema] = useState<ImportSchema | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The schema drives the docs panel; fetch once per opening.
  useEffect(() => {
    if (!open || schema) return;
    let active = true;
    alumniService.getImportSchema()
      .then((s) => { if (active) setSchema(s); })
      .catch(() => { /* docs are non-critical — the importer still works */ });
    return () => { active = false; };
  }, [open, schema]);

  const reset = useCallback(() => {
    setStep('source');
    setFile(null);
    setSheetUrl('');
    setPreview(null);
    setResult(null);
    setBusy(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const source: ImportSource = useMemo(
    () => (file ? { file } : { sheetUrl: sheetUrl.trim() }),
    [file, sheetUrl],
  );
  const hasSource = !!file || sheetUrl.trim().length > 0;

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    setFile(picked);
    setSheetUrl('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] || null);
  };

  const runPreview = async () => {
    if (!hasSource) return;
    try {
      setBusy(true);
      const data = await alumniService.previewImport(source);
      setPreview(data);
      setStep('preview');
    } catch (err) {
      toast.error('Could not read that source', { description: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!hasSource) return;
    try {
      setBusy(true);
      const data = await alumniService.runImport(source);
      setResult(data);
      setStep('result');
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} alumni`);
        onImported?.(data);
      } else {
        toast.warning('No records were imported', {
          description: 'Check the row errors for details.',
        });
      }
    } catch (err) {
      toast.error('Import failed — nothing was saved', { description: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Alumni
          </DialogTitle>
          <DialogDescription>
            Bring alumni in from Excel, CSV or a Google Sheet. Columns are matched
            automatically — a partial sheet is fine.
          </DialogDescription>
        </DialogHeader>

        {/* Full how-to (Bangla): column names, accepted values, examples. */}
        <a
          href="/alumni-requests/import-guide"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
        >
          <span className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">ইম্পোর্ট গাইড (বাংলা)</strong>
              <span className="ml-1.5 text-muted-foreground">
                — কোন কলামের নাম কী, কোন মান গ্রহণযোগ্য, উদাহরণসহ
              </span>
            </span>
          </span>
          <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
        </a>

        {/* ---------------- Step 1: choose a source ---------------- */}
        {step === 'source' && (
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" className="gap-1.5">
                <FileUp className="h-4 w-4" /> File
              </TabsTrigger>
              <TabsTrigger value="sheet" className="gap-1.5">
                <Link2 className="h-4 w-4" /> Google Sheet
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> Column Reference
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Choose another
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop your file here, or</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                      Browse files
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">Excel (.xlsx) or CSV • up to 5,000 rows</p>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sheet" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sheetUrl">Google Sheets link</Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  value={sheetUrl}
                  onChange={(e) => { setSheetUrl(e.target.value); setFile(null); }}
                />
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <span>
                  Set the sheet's sharing to <strong>“Anyone with the link can view”</strong>, then
                  paste the normal edit link — we read the first tab as CSV.
                </span>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="mt-4">
              <ColumnReference schema={schema} />
            </TabsContent>
          </Tabs>
        )}

        {/* ---------------- Step 2: preview ---------------- */}
        {step === 'preview' && preview && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Rows found" value={preview.totalRows} tone="border-border bg-muted/40" />
              <StatTile label="Ready to import" value={preview.validRows} tone="border-success/30 bg-success/5" />
              <StatTile label="With errors" value={preview.invalidRows} tone="border-destructive/30 bg-destructive/5" />
            </div>

            {!preview.canImport && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Required column missing</p>
                  <p className="text-xs text-muted-foreground">
                    Add a column named{' '}
                    {preview.missingRequired.map((m) => (
                      <code key={m.key} className="mx-0.5 rounded bg-muted px-1 font-mono">{m.recommended}</code>
                    ))}
                    and try again.
                  </p>
                </div>
              </div>
            )}

            {preview.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{w}</span>
              </div>
            ))}

            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                Detected columns ({preview.columns.length})
              </p>
              <ScrollArea className="max-h-40 rounded-xl border border-border">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border">
                    {preview.columns.map((c) => (
                      <tr key={c.index}>
                        <td className="px-3 py-1.5 font-mono">{c.header || <em className="text-muted-foreground">(blank)</em>}</td>
                        <td className="px-3 py-1.5">
                          {c.mappedTo ? (
                            <span className="inline-flex items-center gap-1.5 text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {c.label}
                              <span className="text-muted-foreground">→ {c.target}</span>
                              {c.duplicate && <Badge variant="outline" className="text-warning">duplicate</Badge>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">ignored</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            <ErrorList errors={preview.errors} title={`Rows that will be skipped (${preview.invalidRows})`} />
          </div>
        )}

        {/* ---------------- Step 3: result ---------------- */}
        {step === 'result' && result && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <StatTile label="Processed" value={result.processed} tone="border-border bg-muted/40" />
              <StatTile label="Imported" value={result.imported} tone="border-success/30 bg-success/5" />
              <StatTile label="Skipped" value={result.skipped} tone="border-warning/30 bg-warning/5" />
              <StatTile label="Failed" value={result.failed} tone="border-destructive/30 bg-destructive/5" />
            </div>
            {result.imported > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{result.imported} alumni record(s) created.</span>
              </div>
            )}
            <ErrorList errors={result.errors} title={`Rows not imported (${result.skipped + result.failed})`} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step === 'preview' && (
              <Button variant="ghost" onClick={() => setStep('source')} disabled={busy} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              {step === 'result' ? 'Close' : 'Cancel'}
            </Button>

            {step === 'source' && (
              <Button onClick={runPreview} disabled={!hasSource || busy} className="gap-1.5 gradient-primary text-primary-foreground">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading…</> : <>Preview <ArrowRight className="h-4 w-4" /></>}
              </Button>
            )}

            {step === 'preview' && (
              <Button
                onClick={runImport}
                disabled={busy || !preview?.canImport || preview.validRows === 0}
                className="gap-1.5 gradient-primary text-primary-foreground"
              >
                {busy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                  : <>Import {preview?.validRows ?? 0} record(s)</>}
              </Button>
            )}

            {step === 'result' && (
              <Button variant="outline" onClick={reset} className="gap-1.5">
                <Upload className="h-4 w-4" /> Import another
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AlumniImportDialog;
