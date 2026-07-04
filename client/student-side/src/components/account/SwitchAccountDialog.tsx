import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRightLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api, { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/contexts/AuthContext';

/**
 * Whether the account may still be switched between Student and Alumni:
 *  - Alumni account: until the alumni application is approved.
 *  - Student/Captain account: until admission is completed.
 */
export function canSwitchAccount(user: {
  role?: string;
  isAlumniAccount?: boolean;
  alumniReviewStatus?: string | null;
  admissionStatus?: string;
} | null): boolean {
  if (!user) return false;
  if (user.role !== 'student' && user.role !== 'captain') return false;
  if (user.isAlumniAccount) return user.alumniReviewStatus !== 'approved';
  return user.admissionStatus !== 'approved';
}

/** Pull a readable message out of a DRF validation error object. */
function firstError(err: any): string {
  if (err && typeof err === 'object') {
    for (const key of Object.keys(err)) {
      if (key === 'status_code') continue;
      const val = err[key];
      if (Array.isArray(val) && val.length) return String(val[0]);
      if (typeof val === 'string' && val) return val;
    }
  }
  return getErrorMessage(err);
}

interface SwitchAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SwitchAccountDialog({ open, onOpenChange }: SwitchAccountDialogProps) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [switching, setSwitching] = useState(false);

  const toStudent = !!user?.isAlumniAccount;
  const targetLabel = toStudent ? 'General Student account' : 'Alumni account';

  const reset = () => {
    setStep('info');
    setOtp('');
    setSending(false);
    setSwitching(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const sendCode = async () => {
    setSending(true);
    try {
      await api.post('/auth/account/send-otp/', { action: 'switch' });
      toast.success('A verification code was sent to your email.');
      setStep('otp');
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setSending(false);
    }
  };

  const confirmSwitch = async () => {
    if (otp.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setSwitching(true);
    try {
      const res = await api.post<any>('/auth/account/switch/', { otp: otp.trim() });
      toast.success(res?.message || `Your account is now a ${targetLabel}.`);
      handleOpenChange(false);
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Switch to a {targetLabel}
          </DialogTitle>
          <DialogDescription>
            {toStudent
              ? 'Your pending alumni application will be withdrawn and your account will become a General Student account, ready for the admission process.'
              : 'Your account will become an Alumni account. Any in-progress admission application will be discarded, and you will submit your alumni information instead.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'info' ? (
          <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              To confirm it's you, we'll email a 6-digit verification code to{' '}
              <span className="font-medium text-foreground">{user?.email}</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="switch-otp">Verification code</Label>
            <Input
              id="switch-otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-[0.4em] font-semibold"
            />
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {sending ? 'Resending…' : "Didn't get the code? Resend"}
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sending || switching}>
            Cancel
          </Button>
          {step === 'info' ? (
            <Button onClick={sendCode} disabled={sending}>
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending code…</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Send verification code</>
              )}
            </Button>
          ) : (
            <Button onClick={confirmSwitch} disabled={switching || otp.trim().length !== 6}>
              {switching ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Switching…</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> Confirm switch</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
