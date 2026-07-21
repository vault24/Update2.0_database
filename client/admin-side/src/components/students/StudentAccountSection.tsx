import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck, KeyRound, Mail, UserPlus, Power, Loader2, AlertCircle,
  Eye, EyeOff, Lock, CheckCircle2, ShieldAlert, Trash2, CalendarClock, RotateCcw,
} from 'lucide-react';
import studentAccountService, { StudentAccount, accountErrorMessage } from '@/services/studentAccountService';

type ActionMode = 'create' | 'email' | 'password' | 'toggle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TITLES: Record<ActionMode, string> = {
  create: 'Create Student Portal Account',
  email: 'Change Login Email',
  password: 'Reset Password',
  toggle: 'Update Account Status',
};

function SecureAccountDialog({
  mode, studentId, account, defaultEmail, onClose, onDone,
}: {
  mode: ActionMode;
  studentId: string;
  account: StudentAccount | null;
  defaultEmail?: string;
  onClose: () => void;
  onDone: (a: StudentAccount) => void;
}) {
  const { toast } = useToast();
  const willDeactivate = !!account?.is_active;
  const [email, setEmail] = useState(mode === 'create' ? (defaultEmail || '') : (account?.email || ''));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validate = (): string | null => {
    if (mode === 'create') {
      if (!email.trim()) return 'Email is required.';
      if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    if (mode === 'email') {
      if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
      if (email.trim().toLowerCase() === (account?.email || '').toLowerCase()) return 'This is already the current email.';
    }
    if (mode === 'password') {
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    if (!adminPassword) return 'Enter your administrator password to confirm.';
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    setError('');
    try {
      let result: StudentAccount;
      if (mode === 'create') {
        result = await studentAccountService.create(studentId, { email: email.trim(), password, admin_password: adminPassword });
        toast({ title: 'Account created', description: 'A welcome email has been sent to the student.' });
      } else if (mode === 'email') {
        result = await studentAccountService.update(studentId, { email: email.trim(), admin_password: adminPassword });
        toast({ title: 'Email updated', description: 'The student can now sign in with the new email.' });
      } else if (mode === 'password') {
        result = await studentAccountService.update(studentId, { password, admin_password: adminPassword });
        toast({ title: 'Password reset', description: 'The student account password has been reset.' });
      } else {
        result = await studentAccountService.update(studentId, { is_active: !willDeactivate, admin_password: adminPassword });
        toast({ title: willDeactivate ? 'Account deactivated' : 'Account activated' });
      }
      onDone(result);
    } catch (e: any) {
      setError(accountErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? <UserPlus className="h-5 w-5 text-primary" />
              : mode === 'email' ? <Mail className="h-5 w-5 text-primary" />
              : mode === 'password' ? <KeyRound className="h-5 w-5 text-primary" />
              : <Power className="h-5 w-5 text-primary" />}
            {mode === 'toggle' ? (willDeactivate ? 'Deactivate Account' : 'Activate Account') : TITLES[mode]}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Create a portal login so this student can access the Student Portal.'}
            {mode === 'email' && 'Change the email address the student uses to sign in.'}
            {mode === 'password' && 'Set a new password for this student account.'}
            {mode === 'toggle' && (willDeactivate
              ? 'The student will no longer be able to sign in until reactivated.'
              : 'Re-enable sign-in for this student account.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(mode === 'create' || mode === 'email') && (
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">Login Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="acc-email" type="email" value={email} placeholder="student@example.com"
                  onChange={(e) => setEmail(e.target.value)} className="pl-9" autoFocus />
              </div>
            </div>
          )}

          {(mode === 'create' || mode === 'password') && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="acc-pw">{mode === 'create' ? 'Initial Password' : 'New Password'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="acc-pw" type={showPw ? 'text' : 'password'} value={password} placeholder="At least 8 characters"
                    onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9" />
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-pw2">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="acc-pw2" type={showPw ? 'text' : 'password'} value={confirm} placeholder="Re-enter password"
                    onChange={(e) => setConfirm(e.target.value)} className="pl-9" />
                </div>
              </div>
            </>
          )}

          {/* ── Security confirmation (required for every sensitive action) ── */}
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4" /> Security confirmation
            </div>
            <Label htmlFor="admin-pw" className="text-xs text-amber-900/80 dark:text-amber-200/80">
              Enter your administrator password to confirm this action.
            </Label>
            <div className="relative mt-1.5">
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="admin-pw" type={showAdminPw ? 'text' : 'password'} value={adminPassword} placeholder="Your admin password"
                onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                className="pl-9 pr-9 bg-background" />
              <button type="button" onClick={() => setShowAdminPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showAdminPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            className={mode === 'toggle' && willDeactivate ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'gradient-primary text-primary-foreground'}
            onClick={submit} disabled={submitting}
          >
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…</>
              : mode === 'create' ? 'Create Account'
              : mode === 'email' ? 'Update Email'
              : mode === 'password' ? 'Reset Password'
              : willDeactivate ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Account Dialog ────────────────────────────────────────────────────
// Staged, high-friction flow: (1) math check → (2) OTP to the ADMIN's own email
// → (3) plain-language warning → (4) confirm. Confirming SCHEDULES a soft-delete
// with a 7-day recovery window; it does NOT purge immediately.
function DeleteAccountDialog({
  studentId, studentName, onClose, onScheduled,
}: {
  studentId: string;
  studentName?: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const { toast } = useToast();

  const generateMath = () => ({
    a: Math.floor(Math.random() * 20) + 1,
    b: Math.floor(Math.random() * 20) + 1,
  });

  const [step, setStep] = useState<'math' | 'otp' | 'warning'>('math');
  const [math, setMath] = useState(generateMath);
  const [mathAnswer, setMathAnswer] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const restart = () => {
    setStep('math'); setMath(generateMath()); setMathAnswer(''); setOtp(''); setError('');
  };

  // Step 1 → sends the OTP to the admin's email, then moves to the OTP step.
  const handleMathSubmit = async () => {
    if (parseInt(mathAnswer) !== math.a + math.b) {
      setError('Incorrect answer. Please try again.');
      setMath(generateMath());
      setMathAnswer('');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await studentAccountService.sendDeleteOtp(studentId, {});
      setAdminEmail(res.email || '');
      toast({ title: 'Verification code sent', description: 'A code has been sent to your email.' });
      setStep('otp');
    } catch (e: any) {
      setError(accountErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 → the code is verified server-side on the final confirm, so here we
  // just make sure something was entered before showing the warning.
  const handleOtpContinue = () => {
    if (!otp.trim()) { setError('Enter the verification code from your email.'); return; }
    setError('');
    setStep('warning');
  };

  // Step 4 → schedule the soft-delete (verifies OTP on the server).
  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await studentAccountService.deleteAccount(studentId, { otp: otp.trim() });
      toast({
        title: 'Scheduled for deletion',
        description: res?.message || 'The account enters a 7-day recovery period.',
      });
      onScheduled();
    } catch (e: any) {
      setError(accountErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            {step === 'math' && 'Solve the security check to send a verification code to your email.'}
            {step === 'otp' && `Enter the code sent to ${adminEmail || 'your email'} to continue.`}
            {step === 'warning' && 'Please review what will happen before confirming.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {(['math', 'otp', 'warning'] as const).map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                  step === s ? 'border-destructive bg-destructive text-destructive-foreground'
                    : (['math', 'otp', 'warning'].indexOf(step) > i ? 'border-success bg-success/15 text-success' : 'border-border')
                }`}>{i + 1}</span>
                {i < 2 && <span className="h-px w-4 bg-border" />}
              </span>
            ))}
            <span className="ml-1">
              {step === 'math' ? 'Security check' : step === 'otp' ? 'Email code' : 'Confirm'}
            </span>
          </div>

          {step === 'math' && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-3">
              <p className="text-2xl font-bold text-foreground tracking-wide">
                {math.a} + {math.b} = ?
              </p>
              <Input
                type="number"
                placeholder="Your answer"
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMathSubmit(); }}
                className="text-center text-lg font-mono"
                autoFocus
              />
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-1.5">
              <Label htmlFor="del-otp">Verification Code</Label>
              <Input
                id="del-otp"
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={otp}
                placeholder="Enter code from your email"
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleOtpContinue(); }}
                autoFocus
                className="text-center tracking-widest text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Didn't receive it?{' '}
                <button
                  type="button"
                  className="underline text-primary hover:text-primary/80 disabled:opacity-50"
                  disabled={submitting}
                  onClick={restart}
                >
                  Start over
                </button>
              </p>
            </div>
          )}

          {step === 'warning' && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <ShieldAlert className="h-4 w-4" /> This action is permanent
              </div>
              <p className="text-muted-foreground">
                This will schedule <span className="font-medium text-foreground">{studentName || 'this student'}</span>'s
                portal account and <span className="font-medium text-foreground">all associated records</span> (student,
                alumni, captain, authentication, sessions and tokens) for permanent deletion.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>The account enters a <span className="font-medium text-foreground">7-day recovery period</span>.</li>
                <li>If the student logs in during this period, the deletion is <span className="font-medium text-foreground">cancelled automatically</span>.</li>
                <li>After 7 days with no login, <span className="font-medium text-foreground">all data is permanently removed</span>.</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          {step === 'math' && (
            <Button variant="destructive" onClick={handleMathSubmit} disabled={submitting || !mathAnswer}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : 'Send Code'}
            </Button>
          )}
          {step === 'otp' && (
            <Button variant="destructive" onClick={handleOtpContinue} disabled={submitting || !otp.trim()}>
              Continue
            </Button>
          )}
          {step === 'warning' && (
            <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling…</> : 'Confirm Delete'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StudentAccountSection({
  studentId, studentName, studentEmail,
}: {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
}) {
  const { toast } = useToast();
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAccount(await studentAccountService.get(studentId)); }
    catch { setAccount({ has_account: false }); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (studentId) load(); /* eslint-disable-next-line */ }, [studentId]);

  const hasAccount = !!account?.has_account;
  const isActive = !!account?.is_active;
  const pending = account?.pending_deletion;
  const isPendingDeletion = !!pending?.scheduled;
  const purgeDate = pending?.purge_at ? new Date(pending.purge_at) : null;

  const handleCancelDeletion = async () => {
    setCancelling(true);
    try {
      await studentAccountService.cancelDelete(studentId);
      toast({ title: 'Deletion cancelled', description: 'The account has been restored.' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not cancel', description: accountErrorMessage(e), variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Student Portal Account
          </div>
          {!loading && hasAccount && !isPendingDeletion && (
            <div className="flex items-center gap-1.5">
              {account?.account_type && (
                <Badge variant="outline" className="font-normal">{account.account_type}</Badge>
              )}
              <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-success/15 text-success border-0' : ''}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          )}
          {!loading && isPendingDeletion && (
            <Badge variant="destructive" className="gap-1"><CalendarClock className="h-3 w-3" /> Pending deletion</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking account…
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Pending-deletion banner (shown for both linked + manual students) ── */}
            {isPendingDeletion && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">Scheduled for permanent deletion</p>
                    <p className="text-muted-foreground">
                      {purgeDate
                        ? <>This student and all related records will be permanently removed on{' '}
                            <span className="font-medium text-foreground">{purgeDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>.</>
                        : 'This student is scheduled for permanent deletion.'}
                      {' '}The student can cancel it themselves simply by logging into their portal.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCancelDeletion}
                  disabled={cancelling}
                >
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Cancel deletion
                </Button>
              </div>
            )}

            {/* ── No portal account (and not pending deletion) ── */}
            {!hasAccount && !isPendingDeletion && (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                  <UserPlus className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">No portal account yet</p>
                    <p className="text-muted-foreground">
                      This student has no Student-Portal login of any type (Student, Alumni or
                      Captain). Create an account to give them access.
                    </p>
                  </div>
                </div>
                <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setMode('create')}>
                  <UserPlus className="h-4 w-4" /> Create Account
                </Button>
              </>
            )}

            {/* ── Account details + management actions ── */}
            {hasAccount && (
              <>
                <div className="space-y-2 rounded-xl bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Account Type</span>
                    <span className="font-medium">{account?.account_type || 'Student'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Login Email</span>
                    <span className="truncate font-medium">{account?.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Student ID</span>
                    <span className="font-mono font-medium">{account?.student_id || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`flex items-center gap-1 font-medium ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
                      {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Last Login</span>
                    <span className="font-medium">
                      {account?.last_login ? new Date(account.last_login).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Management actions (hidden while pending deletion — cancel first) */}
                {!isPendingDeletion && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMode('email')}>
                        <Mail className="h-4 w-4" /> Change Email
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMode('password')}>
                        <KeyRound className="h-4 w-4" /> Reset Password
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className={`gap-1.5 ${isActive ? 'text-destructive hover:text-destructive' : 'text-success hover:text-success'}`}
                        onClick={() => setMode('toggle')}
                      >
                        <Power className="h-4 w-4" /> {isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>

                    {/* ── Single Delete Account action (danger zone) ── */}
                    <div className="mt-2 border-t border-border/50 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Account
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        Removes the portal account and all related records after a 7-day recovery period.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>

      {mode && (
        <SecureAccountDialog
          mode={mode}
          studentId={studentId}
          account={account}
          defaultEmail={studentEmail}
          onClose={() => setMode(null)}
          onDone={(a) => { setAccount(a); setMode(null); }}
        />
      )}

      {showDeleteDialog && (
        <DeleteAccountDialog
          studentId={studentId}
          studentName={studentName}
          onClose={() => setShowDeleteDialog(false)}
          onScheduled={() => { setShowDeleteDialog(false); load(); }}
        />
      )}
    </Card>
  );
}

export default StudentAccountSection;
