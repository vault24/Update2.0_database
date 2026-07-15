import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Lock, X, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error?: string;
}

/* ── math question generator (simple subtraction / addition) ── */
function generateMath() {
  const useSubtract = Math.random() > 0.5;
  if (useSubtract) {
    const a = Math.floor(Math.random() * 30) + 15; // 15-44
    const b = Math.floor(Math.random() * 14) + 2;  // 2-15
    return { question: `${a} − ${b} = ?`, answer: a - b };
  } else {
    const a = Math.floor(Math.random() * 20) + 5;  // 5-24
    const b = Math.floor(Math.random() * 20) + 5;  // 5-24
    return { question: `${a} + ${b} = ?`, answer: a + b };
  }
}

/* ── mini math popup ── */
function MathPopup({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [{ question, answer }] = useState(generateMath);
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleCheck = () => {
    if (parseInt(input, 10) === answer) {
      onConfirm();
    } else {
      setShake(true);
      setInput('');
      setAttempts(a => a + 1);
      setTimeout(() => setShake(false), 500);
      toast.error(attempts >= 1 ? `Hint: the answer is ${answer > 20 ? 'between 10 and 50' : 'less than 20'}` : 'Wrong answer, try again!');
    }
  };

  return (
    /* backdrop */
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(10,22,60,0.5)', backdropFilter: 'blur(6px)' }}
    >
      {/* card */}
      <motion.div
        initial={false}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-[280px] bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* blue top bar */}
        <div className="px-6 pt-6 pb-5 text-center relative"
          style={{ background: 'linear-gradient(135deg,#eef4ff,#f5f8ff)' }}>
          <button onClick={onCancel}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>

          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)' }}>
            🤖
          </div>
          <h3 className="text-base font-bold text-gray-900">Quick Check</h3>
          <p className="text-xs text-gray-500 mt-0.5">Solve to verify you're human</p>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          {/* Math question box */}
          <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 py-3 px-4 text-center">
            <span className="text-2xl font-bold text-emerald-700 tracking-wide">{question}</span>
          </div>

          {/* Answer input */}
          <motion.div
            animate={shake ? { x: [-7, 7, -5, 5, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Input
              type="number"
              placeholder="Your answer…"
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
              className={cn(
                'h-11 rounded-2xl border-2 text-center text-lg font-bold text-gray-900',
                'placeholder:text-gray-300 bg-gray-50 focus:bg-white transition-colors',
                shake ? 'border-red-400' : 'border-gray-200 focus:border-emerald-400'
              )}
            />
          </motion.div>

          {/* Confirm button */}
          <button onClick={handleCheck}
            className="w-full h-11 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)', boxShadow: '0 4px 16px rgba(59,108,247,0.35)' }}>
            <CheckCircle className="w-4 h-4" /> Confirm & Send OTP
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── main form ── */
export function ForgotPasswordForm({ onSubmit, onBack, loading, error }: Props) {
  const [email, setEmail] = useState('');
  const [showMath, setShowMath] = useState(false);

  /* intercept submit — show math first */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email address'); return; }
    setShowMath(true);
  };

  /* called only after math is solved */
  const handleConfirmed = async () => {
    setShowMath(false);
    try {
      await onSubmit(email);
    } catch {
      /* error shown via prop */
    }
  };

  return (
    <>
      <AnimatePresence>
        {showMath && (
          <MathPopup
            onConfirm={handleConfirmed}
            onCancel={() => setShowMath(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)' }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Forgot Password?</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Enter your registered email and we'll send you a verification code.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email address"
                className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* API error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Send OTP */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#3b6cf7,#2152e3)', boxShadow: '0 6px 20px rgba(59,108,247,0.3)' }}
          >
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              : 'Send OTP'}
          </motion.button>

          {/* Back */}
          <button
            type="button"
            onClick={onBack}
            className="w-full h-11 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </form>
      </div>
    </>
  );
}
