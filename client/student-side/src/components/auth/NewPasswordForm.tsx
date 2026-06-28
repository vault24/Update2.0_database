import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  email: string;
  otp: string;
  onSubmit: (password: string, confirmPassword: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error?: string;
}

/* ── simple math challenge generator ── */
function generateMath() {
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  if (op === '+') { a = Math.floor(Math.random() * 20) + 1; b = Math.floor(Math.random() * 20) + 1; answer = a + b; }
  else if (op === '-') { a = Math.floor(Math.random() * 20) + 10; b = Math.floor(Math.random() * 10) + 1; answer = a - b; }
  else { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; answer = a * b; }
  return { question: `${a} ${op} ${b} = ?`, answer };
}

/* ── math confirmation popup ── */
function MathPopup({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [{ question, answer }] = useState(generateMath);
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  const handleCheck = () => {
    if (parseInt(input, 10) === answer) {
      onConfirm();
    } else {
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
      toast.error('Wrong answer, try again!');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(10,22,60,0.45)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-xs bg-white rounded-3xl p-7 shadow-2xl relative">

        {/* Close */}
        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)' }}>
            <span className="text-2xl">🔐</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Confirm Reset</h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          Solve this to verify you're human
        </p>

        {/* Math question */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl py-4 px-6 text-center mb-5">
          <span className="text-2xl font-bold text-blue-700">{question}</span>
        </div>

        {/* Answer input */}
        <motion.div animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}>
          <Input
            type="number"
            placeholder="Your answer"
            className={cn(
              'h-12 rounded-2xl border-2 text-center text-lg font-bold text-gray-900 placeholder:text-gray-400',
              'bg-gray-50 focus:bg-white transition-colors',
              shake ? 'border-red-400' : 'border-gray-200 focus:border-blue-400'
            )}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
            autoFocus
          />
        </motion.div>

        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel}
            className="flex-1 h-11 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleCheck}
            className="flex-1 h-11 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-md"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)', boxShadow: '0 4px 16px rgba(59,108,247,0.35)' }}>
            <CheckCircle className="w-4 h-4" /> Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── password strength helper ── */
function getStrength(pw: string) {
  let score = 0;
  const missing: string[] = [];
  if (pw.length >= 8) score++; else missing.push('8+ characters');
  if (/[A-Z]/.test(pw)) score++; else missing.push('uppercase letter');
  if (/[a-z]/.test(pw)) score++; else missing.push('lowercase letter');
  if (/\d/.test(pw)) score++; else missing.push('number');
  if (/[^A-Za-z0-9]/.test(pw)) score++; else missing.push('special character');
  return { score, missing };
}

/* ── main form ── */
export function NewPasswordForm({ onSubmit, onBack, loading, error }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const { score, missing } = getStrength(password);
  const matches = password === confirm && confirm.length > 0;

  const strengthLabel = score >= 4 ? 'Strong' : score >= 3 ? 'Medium' : score >= 1 ? 'Weak' : '';
  const strengthColor = score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Strong password is no longer required on the student portal — any
    // non-empty password is allowed as long as both fields match.
    if (!password) { toast.error('Please enter a new password'); return; }
    if (!matches) { toast.error('Passwords do not match'); return; }
    setShowPopup(true);
  };

  const handleConfirmed = async () => {
    setShowPopup(false);
    try {
      await onSubmit(password, confirm);
    } catch { /* error via prop */ }
  };

  return (
    <>
      <AnimatePresence>
        {showPopup && <MathPopup onConfirm={handleConfirmed} onCancel={() => setShowPopup(false)} />}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)' }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Password</h2>
            <p className="text-sm text-gray-500 mt-1">Make it strong and memorable</p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type={showPw ? 'text' : 'password'} placeholder="Enter new password"
                className="pl-11 pr-11 h-12 rounded-2xl border-2 border-gray-200 bg-gray-50/60 focus:bg-white focus:border-blue-400 transition-colors text-gray-900 placeholder:text-gray-400"
                value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      animate={{ width: `${(score / 5) * 100}%`, backgroundColor: strengthColor }}
                      transition={{ duration: 0.3 }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
                {missing.length > 0 && (
                  <p className="text-xs text-gray-400">Needs: {missing.join(', ')}</p>
                )}
              </motion.div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type={showCf ? 'text' : 'password'} placeholder="Confirm your password"
                className={cn(
                  'pl-11 pr-11 h-12 rounded-2xl border-2 bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400',
                  confirm.length > 0
                    ? matches ? 'border-green-400 focus:border-green-400' : 'border-red-400 focus:border-red-400'
                    : 'border-gray-200 focus:border-blue-400'
                )}
                value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={loading} />
              <button type="button" onClick={() => setShowCf(!showCf)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {confirm.length > 0 && matches && (
                <CheckCircle className="absolute right-11 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {/* Submit */}
          <motion.button type="submit" disabled={loading || !password || !matches} whileTap={{ scale: 0.97 }}
            className="w-full h-12 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)', boxShadow: '0 6px 20px rgba(59,108,247,0.3)' }}>
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              : <><Lock className="w-4 h-4" /> Reset Password</>}
          </motion.button>

          {/* Back */}
          <button type="button" onClick={onBack}
            className="w-full h-11 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </form>
      </div>
    </>
  );
}
