import { useMemo, useRef } from 'react';
import { Upload, CheckCircle, X, FileText, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AlumniDocCategory } from '@/services/alumniService';

/** A queued document (predefined or custom) awaiting submission. */
export interface AlumniDoc {
  id: string;
  file: File;
  category: string;      // alumni category key
  customName: string;    // used when category === 'custom'
  categoryDisplay: string;
}

interface Props {
  docCategories: AlumniDocCategory[];
  maxDocuments: number;
  documents: AlumniDoc[];
  onChange: (docs: AlumniDoc[]) => void;
}

// Predefined document slots shown as cards (matching the admission form).
// Each maps to one alumni category key; the first few common ones are surfaced.
const PREDEFINED: Array<{ key: string; label: string; helper?: string; photo?: boolean }> = [
  { key: 'photo', label: 'Profile Photo', helper: 'Passport-size photo', photo: true },
  { key: 'nid', label: 'National ID', helper: 'NID card' },
  { key: 'birth_certificate', label: 'Birth Certificate' },
  { key: 'ssc_certificate', label: 'SSC Certificate' },
  { key: 'ssc_marksheet', label: 'SSC Marksheet' },
  { key: 'diploma_certificate', label: 'Diploma / Final Certificate' },
  { key: 'transcript', label: 'Academic Transcript' },
  { key: 'experience_certificate', label: 'Experience Certificate' },
];

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
const MAX_SIZE = 10 * 1024 * 1024;

const validate = (file: File): string | null => {
  if (file.size > MAX_SIZE) return 'File must be under 10MB';
  return null;
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function AlumniDocumentUpload({ docCategories, maxDocuments, documents, onChange }: Props) {
  const customNameRef = useRef<HTMLInputElement>(null);
  const customFileRef = useRef<HTMLInputElement>(null);

  const displayFor = useMemo(() => {
    const map: Record<string, string> = {};
    docCategories.forEach((c) => { map[c.key] = c.display; });
    return map;
  }, [docCategories]);

  const customDocs = documents.filter((d) => d.category === 'custom');
  const predefinedByKey = useMemo(() => {
    const map: Record<string, AlumniDoc> = {};
    documents.forEach((d) => { if (d.category !== 'custom') map[d.category] = d; });
    return map;
  }, [documents]);

  const totalCount = documents.length;

  const setPredefined = (key: string, label: string, file: File | null) => {
    if (!file) {
      onChange(documents.filter((d) => d.category !== key));
      return;
    }
    const err = validate(file);
    if (err) { toast.error(err); return; }
    if (!predefinedByKey[key] && totalCount >= maxDocuments) {
      toast.error(`You can upload up to ${maxDocuments} documents.`);
      return;
    }
    const next = documents.filter((d) => d.category !== key);
    next.push({ id: uid(), file, category: key, customName: '', categoryDisplay: displayFor[key] || label });
    onChange(next);
    toast.success(`${label} added`);
  };

  const addCustom = () => {
    const name = customNameRef.current?.value?.trim() || '';
    const file = customFileRef.current?.files?.[0] || null;
    if (!name) { toast.error('Enter a name for the custom document.'); return; }
    if (!file) { toast.error('Choose a file for the custom document.'); return; }
    const err = validate(file);
    if (err) { toast.error(err); return; }
    if (totalCount >= maxDocuments) { toast.error(`You can upload up to ${maxDocuments} documents.`); return; }
    onChange([...documents, { id: uid(), file, category: 'custom', customName: name, categoryDisplay: name }]);
    if (customNameRef.current) customNameRef.current.value = '';
    if (customFileRef.current) customFileRef.current.value = '';
    toast.success('Custom document added');
  };

  const removeById = (id: string) => onChange(documents.filter((d) => d.id !== id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Upload your documents below. Add any additional files under <strong>Custom Documents</strong>.
        </p>
        <span className={cn('text-xs font-semibold', totalCount >= maxDocuments ? 'text-destructive' : 'text-muted-foreground')}>
          {totalCount}/{maxDocuments}
        </span>
      </div>

      {/* Predefined document cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PREDEFINED.map((slot) => {
          const doc = predefinedByKey[slot.key];
          const hasFile = !!doc;
          const inputId = `alumni-doc-${slot.key}`;
          return (
            <div key={slot.key} className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                {slot.photo ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3.5 h-3.5 text-blue-500" />}
                {slot.label}
              </Label>
              <div
                className={cn(
                  'rounded-2xl border-2 border-dashed p-5 text-center transition-colors',
                  hasFile
                    ? 'border-success/50 bg-success/5'
                    : 'border-border hover:border-blue-400 hover:bg-muted/40',
                )}
              >
                <input
                  type="file"
                  id={inputId}
                  className="hidden"
                  accept={slot.photo ? 'image/*' : ACCEPT}
                  onChange={(e) => setPredefined(slot.key, slot.label, e.target.files?.[0] || null)}
                />
                {hasFile ? (
                  <div className="space-y-3">
                    <CheckCircle className="mx-auto h-7 w-7 text-success" />
                    <div>
                      <p className="truncate text-sm font-medium text-foreground">{doc!.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(doc!.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(inputId)?.click()}>
                        Replace
                      </Button>
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => setPredefined(slot.key, slot.label, null)} aria-label="Remove">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor={inputId} className="block cursor-pointer">
                    <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Click to upload</p>
                    {slot.helper && <p className="text-xs text-muted-foreground">{slot.helper}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG • Max 10MB</p>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom documents */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Custom Documents</p>
            <p className="text-xs text-muted-foreground">Name your own document and upload it. You can add several.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-3 sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Document Name</Label>
            <Input ref={customNameRef} placeholder="e.g. Award Letter" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">File</Label>
            <Input ref={customFileRef} type="file" accept={ACCEPT} />
          </div>
          <Button type="button" onClick={addCustom} disabled={totalCount >= maxDocuments} className="bg-blue-500 hover:bg-blue-600 h-10">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {customDocs.length > 0 && (
          <div className="space-y-2 pt-1">
            {customDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-500/15 shrink-0">
                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{doc.categoryDisplay}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.file.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeById(doc.id)} aria-label="Remove">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
