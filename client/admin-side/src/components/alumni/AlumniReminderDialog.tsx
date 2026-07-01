import { useState } from 'react';
import {
  Mail, Loader2, Send, Users, AlertTriangle, CheckCircle2, Search, Percent,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import {
  alumniService, CompletionReport, SendRemindersResult,
} from '@/services/alumniService';

interface AlumniReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THRESHOLD_PRESETS = [30, 45, 50, 75, 100];
const SOURCE_OPTIONS = [
  { value: 'all', label: 'All alumni' },
  { value: 'pipeline', label: 'Promoted from student' },
  { value: 'admin_manual', label: 'Manually added' },
  { value: 'self_registration', label: 'Self registered' },
];

/**
 * Admin tool: preview and send profile-completion reminder emails to alumni
 * whose profile is below a chosen threshold. Admins control the threshold and
 * an optional registration-source filter, preview exactly who qualifies, then
 * send.
 */
export function AlumniReminderDialog({ open, onOpenChange }: AlumniReminderDialogProps) {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState(50);
  const [source, setSource] = useState('all');
  const [report, setReport] = useState<CompletionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState<SendRemindersResult | null>(null);

  const clampThreshold = (v: number) => Math.max(0, Math.min(100, Math.round(v || 0)));

  const runPreview = async () => {
    setLoading(true);
    setResult(null);
    setConfirmSend(false);
    try {
      const data = await alumniService.getCompletionReport({
        threshold,
        registrationSource: source === 'all' ? undefined : source,
      });
      setReport(data);
    } catch (err) {
      toast({ title: 'Could not load report', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const res = await alumniService.sendCompletionReminders({
        threshold,
        registrationSource: source === 'all' ? undefined : source,
        dryRun: false,
      });
      setResult(res);
      setConfirmSend(false);
      toast({
        title: 'Reminders sent',
        description: `${res.sent} email(s) sent${res.failed ? `, ${res.failed} failed` : ''}${res.skippedNoEmail ? `, ${res.skippedNoEmail} skipped (no email)` : ''}.`,
      });
    } catch (err) {
      toast({ title: 'Failed to send', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const eligible = report?.eligibleForEmail ?? 0;
  const below = report?.belowThreshold ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Profile Completion Reminders
          </DialogTitle>
          <DialogDescription>
            Email alumni whose profile is below a chosen completion level, asking them to finish it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Controls */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Completion threshold</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(clampThreshold(Number(e.target.value)))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">% or below</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {THRESHOLD_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setThreshold(p)}
                    className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                      threshold === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    &lt;{p}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only approved alumni are considered.</p>
            </div>
          </div>

          <Button onClick={runPreview} disabled={loading} variant="outline" className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Preview recipients
          </Button>

          {/* Report summary */}
          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border p-3 text-center">
                  <p className="text-2xl font-bold">{report.total}</p>
                  <p className="text-xs text-muted-foreground">Total alumni</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{below}</p>
                  <p className="text-xs text-muted-foreground">Below {report.threshold}%</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{eligible}</p>
                  <p className="text-xs text-muted-foreground">Will be emailed</p>
                </div>
              </div>

              {below > eligible && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {below - eligible} alumnus/alumni below threshold have no email on file and will be skipped.
                </p>
              )}

              {/* Recipient list */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {report.results.filter((r) => r.belowThreshold).length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No alumni are below this threshold. 🎉</p>
                ) : (
                  report.results.filter((r) => r.belowThreshold).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.hasEmail ? r.email : 'No email on file'} · {r.department}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.percentage}%</Badge>
                        {!r.hasEmail && <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/40">skipped</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Result after send */}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {result.sent} reminder email(s) sent
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {result.failed > 0 && `${result.failed} failed. `}
                {result.skippedNoEmail > 0 && `${result.skippedNoEmail} skipped (no email).`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {report && eligible > 0 && !confirmSend && (
            <Button onClick={() => setConfirmSend(true)} className="gap-2">
              <Send className="w-4 h-4" /> Send to {eligible} alumni
            </Button>
          )}
          {confirmSend && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Send {eligible} email(s)?</span>
              <Button variant="outline" size="sm" onClick={() => setConfirmSend(false)} disabled={sending}>Cancel</Button>
              <Button size="sm" onClick={send} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Confirm send
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
