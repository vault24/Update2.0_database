import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { settingsService, type CaptainRequestStatus } from '@/services/settingsService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

/**
 * "Request a Class Captain account" card for the student Settings page.
 *
 * The request is routed to the Department Head responsible for the student's
 * department AND shift — the same routing used when a Captain account is
 * created at signup. On approval the existing student account is upgraded in
 * place, so no data is lost.
 */
export function CaptainAccountRequestCard() {
  const [state, setState] = useState<CaptainRequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setState(await settingsService.getCaptainRequestStatus());
    } catch {
      // Non-student accounts have no captain request — hide the card.
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    try {
      setSubmitting(true);
      const res = await settingsService.requestCaptainAccount();
      toast.success('Request sent', { description: res.message });
      await load();
    } catch (err) {
      toast.error('Could not send request', { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (loading || !state) return null;

  const request = state.request;
  const pending = request?.status === 'pending';
  const rejected = request?.status === 'rejected';

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Class Captain Account</h3>
          <p className="text-sm text-muted-foreground">
            Ask your Department Head to upgrade this account to a Class Captain account
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      {state.isCaptain ? (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">You are a Class Captain</p>
            <p className="text-sm text-muted-foreground">
              Captain features are already available on your account.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{state.departmentName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shift</p>
              <p className="font-medium">{state.shift || 'Not set'}</p>
            </div>
          </div>

          {request && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-3">
              {pending ? (
                <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              ) : rejected ? (
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">Last request</p>
                  <Badge variant={pending ? 'outline' : rejected ? 'destructive' : 'success'} className="capitalize">
                    {request.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sent {new Date(request.created_at).toLocaleDateString()}
                  {request.department_name ? ` • ${request.department_name}` : ''}
                  {request.shift ? ` • ${request.shift} shift` : ''}
                </p>
                {rejected && request.rejection_reason && (
                  <p className="text-xs text-muted-foreground">Reason: {request.rejection_reason}</p>
                )}
              </div>
            </div>
          )}

          {state.canRequest ? (
            <Button onClick={() => setConfirmOpen(true)} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              {rejected ? 'Request Again' : 'Request Captain Account'}
            </Button>
          ) : (
            state.blockedReason && (
              <p className="text-sm text-muted-foreground">{state.blockedReason}</p>
            )
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request a Class Captain account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your request goes to the Department Head for{' '}
              <span className="font-medium">{state.departmentName || 'your department'}</span>
              {state.shift ? ` (${state.shift} shift)` : ''}. If approved, this same account
              becomes a Class Captain account — your profile, results, attendance and documents
              stay exactly as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submit();
              }}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Send Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

export default CaptainAccountRequestCard;
