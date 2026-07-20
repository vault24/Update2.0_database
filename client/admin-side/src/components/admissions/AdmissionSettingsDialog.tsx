import { useEffect, useState } from 'react';
import { Loader2, Settings2, FileText, ToggleRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { admissionService, AdmissionSettings } from '@/services/admissionService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: AdmissionSettings) => void;
}

// Human-readable labels for each admission document field (order matters).
const DOCUMENT_LABELS: { key: string; label: string }[] = [
  { key: 'photo', label: 'Passport-size Photo' },
  { key: 'sscMarksheet', label: 'SSC Marksheet' },
  { key: 'sscCertificate', label: 'SSC Certificate' },
  { key: 'birthCertificateDoc', label: 'Birth Certificate' },
  { key: 'studentNIDCopy', label: 'Student NID Copy' },
  { key: 'fatherNIDFront', label: "Father's NID (Front)" },
  { key: 'fatherNIDBack', label: "Father's NID (Back)" },
  { key: 'motherNIDFront', label: "Mother's NID (Front)" },
  { key: 'motherNIDBack', label: "Mother's NID (Back)" },
  { key: 'testimonial', label: 'Testimonial' },
  { key: 'medicalCertificate', label: 'Medical Certificate' },
  { key: 'quotaDocument', label: 'Quota Document' },
  { key: 'extraCertificates', label: 'Extra Certificates' },
];

export function AdmissionSettingsDialog({ open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [docs, setDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    admissionService
      .getSettings()
      .then((s) => {
        if (!active) return;
        setEnabled(s.is_admission_enabled !== false);
        setDocs(s.document_requirements || {});
      })
      .catch(() => {
        toast({ title: 'Failed to load settings', description: 'Please try again.', variant: 'destructive' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, toast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await admissionService.updateSettings({
        is_admission_enabled: enabled,
        document_requirements: docs,
      });
      toast({ title: 'Settings saved', description: 'Admission settings have been updated.' });
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Failed to save settings',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Admission Settings
          </DialogTitle>
          <DialogDescription>
            Control whether students can apply, and which documents are mandatory.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-5 pr-1">
            {/* Enable / disable admission */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ToggleRight className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <Label className="text-sm font-semibold">Admission Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    When off, the Admission menu is hidden from all students and new
                    applications are refused.
                  </p>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Document requirement toggles */}
            <div className="rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Document Requirements</p>
                  <p className="text-xs text-muted-foreground">
                    On = Mandatory (shown with *). Off = Optional.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {DOCUMENT_LABELS.map((doc) => (
                  <div key={doc.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">{doc.label}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          docs[doc.key]
                            ? 'text-xs font-medium text-success'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        {docs[doc.key] ? 'Mandatory' : 'Optional'}
                      </span>
                      <Switch
                        checked={!!docs[doc.key]}
                        onCheckedChange={(v) => setDocs((prev) => ({ ...prev, [doc.key]: v }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving} className="gradient-primary text-primary-foreground">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdmissionSettingsDialog;
