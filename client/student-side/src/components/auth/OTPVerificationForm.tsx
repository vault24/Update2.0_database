import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  email: string;
  onSubmit: (otp: string) => Promise<void>;
  onBack: () => void;
  onResend: () => Promise<void>;
  loading: boolean;
  error?: string;
}

export function OTPVerificationForm({ email, onSubmit, onBack, onResend, loading, error }: Props) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setOtp(next);
    const focus = next.findIndex(d => !d);
    inputRefs.current[focus === -1 ? 5 : focus]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Please enter the complete 6-digit OTP'); return; }
    try { await onSubmit(code); } catch { /* error via prop */ }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;
    setResendLoading(true);
    try {
      await onResend();
      setTimeRemaining(600); setCanResend(false); setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.success('New OTP sent to your email');
    } catch { toast.error('Failed to resend OTP. Please try again.'); }
    finally { setResendLoading(false); }
  };

  const filled = otp.join('').length === 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)' }}>
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Enter OTP Code</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            We sent a 6-digit code to<br />
            <span className="font-semibold text-gray-700">{email}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP boxes */}
        <div className="flex gap-2 justify-center">
          {otp.map((digit, i) => (
            <input key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading}
              className={cn(
                'w-11 h-12 text-center text-lg font-bold rounded-xl border-2 transition-all duration-200 text-gray-900',
                'focus:outline-none bg-gray-50',
                digit
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 focus:border-blue-400 focus:bg-white'
              )}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center">
          {timeRemaining > 0 ? (
            <p className="text-sm text-gray-500">
              Code expires in{' '}
              <span className="font-semibold text-blue-600">{formatTime(timeRemaining)}</span>
            </p>
          ) : (
            <p className="text-sm text-red-500 font-medium">OTP expired. Please request a new one.</p>
          )}
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-xs text-gray-400">Didn't receive it?</span>
            <button type="button" onClick={handleResend}
              disabled={!canResend || resendLoading}
              className={cn('text-xs font-semibold ml-1 flex items-center gap-1',
                canResend ? 'text-blue-600 hover:underline' : 'text-gray-300 cursor-not-allowed')}>
              {resendLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
              Resend
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Verify button */}
        <motion.button type="submit" disabled={loading || !filled} whileTap={{ scale: 0.97 }}
          className="w-full h-12 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)', boxShadow: '0 6px 20px rgba(59,108,247,0.3)' }}>
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            : 'Verify OTP'}
        </motion.button>

        {/* Back */}
        <button type="button" onClick={onBack}
          className="w-full h-11 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </form>
    </div>
  );
}
