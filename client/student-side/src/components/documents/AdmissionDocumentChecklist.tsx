import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, CircleAlert, ClipboardList, Loader2, RefreshCw, Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  documentService,
  type AdmissionChecklist,
  type AdmissionChecklistItem,
} from '@/services/documentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp';

interface Props {
  /** Called after a successful upload so the parent can refresh its lists. */
  onUploaded?: () => void;
}

/**
 * Admission-document checklist.
 *
 * Students who did not submit every document during admission use this to see
 * exactly what is missing and upload the remainder later. Each field is a
 * single slot — re-uploading replaces the file rather than adding a duplicate
 * (enforced server-side).
 */
export function AdmissionDocumentChecklist({ onUploaded }: Props) {
  const [checklist, setChecklist] = useState<AdmissionChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await documentService.getAdmissionChecklist();
      setChecklist(data);
    } catch {
      // A non-student account (or no admission record) simply has no
      // checklist — stay silent instead of shouting an error at the page.
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (item: AdmissionChecklistItem, file?: File | null) => {
    if (!file) return;
    try {
      setUploadingField(item.field);
      await documentService.uploadAdmissionDocument(item.field, file);
      toast.success(`${item.label} uploaded`, {
        description: item.submitted
          ? 'Your previous file for this document was replaced.'
          : 'This document is no longer missing.',
      });
      await load();
      onUploaded?.();
    } catch (err) {
      toast.error(`Could not upload ${item.label}`, { description: getErrorMessage(err) });
    } finally {
      setUploadingField(null);
      const input = inputRefs.current[item.field];
      if (input) input.value = '';
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-6 shadow-card flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Checking your admission documents…</span>
      </div>
    );
  }

  if (!checklist) return null;

  const { documents, summary } = checklist;
  const missing = documents.filter((d) => !d.submitted);
  const missingRequired = missing.filter((d) => d.required);
  const visible = showAll ? documents : missing;
  const progress = summary.total ? Math.round((summary.submitted / summary.total) * 100) : 0;

  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border shadow-card overflow-hidden"
    >
      <header className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-display font-bold">Admission Documents</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {missingRequired.length > 0
                  ? `${missingRequired.length} required document${missingRequired.length > 1 ? 's are' : ' is'} still missing.`
                  : missing.length > 0
                    ? 'All required documents are in. You can still add the optional ones.'
                    : 'Every admission document has been submitted.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {documents.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show missing only' : 'Show all'}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={load} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{summary.submitted} of {summary.total} submitted</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span>Nothing is missing — all your admission documents are on file.</span>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((item) => {
            const busy = uploadingField === item.field;
            return (
              <li
                key={item.field}
                className="p-4 md:px-6 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.submitted ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  ) : (
                    <CircleAlert
                      className={`w-5 h-5 shrink-0 ${item.required ? 'text-destructive' : 'text-muted-foreground'}`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm md:text-base truncate">{item.label}</p>
                      {item.required ? (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Required</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">Optional</Badge>
                      )}
                      {item.submitted && (
                        <Badge variant="success" className="text-[10px] uppercase tracking-wide">Submitted</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.submitted
                        ? item.documents.map((d) => d.fileName).join(', ')
                        : 'Not submitted yet'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <input
                    ref={(el) => { inputRefs.current[item.field] = el; }}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={(e) => handleFile(item, e.target.files?.[0])}
                  />
                  <Button
                    size="sm"
                    variant={item.submitted ? 'outline' : 'default'}
                    disabled={busy}
                    onClick={() => inputRefs.current[item.field]?.click()}
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    {item.submitted ? 'Replace' : 'Upload'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}

export default AdmissionDocumentChecklist;
