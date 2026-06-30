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
  Eye, EyeOff, Lock, CheckCircle2, ShieldAlert,
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

export function StudentAccountSection({
  studentId, studentEmail,
}: {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
}) {
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ActionMode | null>(null);

  const load = async () => {
    setLoading(true);
    try { setAccount(await studentAccountService.get(studentId)); }
    catch { setAccount({ has_account: false }); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (studentId) load(); /* eslint-disable-next-line */ }, [studentId]);

  const hasAccount = !!account?.has_account;
  const isActive = !!account?.is_active;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Student Portal Account
          </div>
          {!loading && hasAccount && (
            <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-success/15 text-success border-0' : ''}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking account…
          </div>
        ) : !hasAccount ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <UserPlus className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium text-foreground">No portal account yet</p>
                <p className="text-muted-foreground">
                  This student was added manually and cannot sign in to the Student Portal.
                  Create an account to give them access.
                </p>
              </div>
            </div>
            <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setMode('create')}>
              <UserPlus className="h-4 w-4" /> Create Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl bg-muted/30 p-3 text-sm">
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
    </Card>
  );
}

export default StudentAccountSection;
