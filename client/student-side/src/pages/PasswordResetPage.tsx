import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, Lightbulb, Globe, ChevronDown } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { passwordResetService } from '@/services/passwordResetService';

type PasswordResetStep = 'email' | 'otp' | 'password' | 'success';

interface PasswordResetState {
  step: PasswordResetStep;
  email: string;
  otp: string;
  loading: boolean;
  error: string | null;
}

function PasswordResetPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<PasswordResetState>({
    step: 'email', email: '', otp: '', loading: false, error: null,
  });

  const update = (updates: Partial<PasswordResetState>) =>
    setState(prev => ({ ...prev, ...updates }));

  const handleEmailSubmit = async (email: string) => {
    update({ loading: true, error: null });
    try {
      await passwordResetService.requestPasswordReset({ email });
      update({ step: 'otp', email, loading: false });
    } catch (error: any) {
      update({ loading: false, error: error.message });
      throw error;
    }
  };

  const handleOTPSubmit = async (otp: string) => {
    update({ loading: true, error: null });
    try {
      const response = await passwordResetService.verifyOTP({ email: state.email, otp });
      if (response.verified) {
        update({ step: 'password', otp, loading: false });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      update({ loading: false, error: error.message });
      throw error;
    }
  };

  const handlePasswordSubmit = async (password: string, confirmPassword: string) => {
    update({ loading: true, error: null });
    try {
      await passwordResetService.confirmPasswordReset({
        email: state.email, otp: state.otp,
        new_password: password, confirm_password: confirmPassword,
      });
      update({ step: 'success', loading: false });
      setTimeout(() => navigate('/'), 3000);
    } catch (error: any) {
      update({ loading: false, error: error.message });
      throw error;
    }
  };

  const handleResendOTP = async () => {
    await passwordResetService.requestPasswordReset({ email: state.email });
  };

  const handleBack = () => {
    if (state.step === 'email') navigate('/');
    else if (state.step === 'otp') update({ step: 'email', error: null });
    else if (state.step === 'password') update({ step: 'otp', error: null });
  };

  /* step label for progress bar */
  const stepIndex = { email: 0, otp: 1, password: 2, success: 3 }[state.step];
  const stepLabels = ['Email', 'Verify OTP', 'New Password'];

  return (
    <>
      {/* â•â•â•â•â•â•â•â•â•â• MOBILE (< lg) â•â•â•â•â•â•â•â•â•â• */}
      <div className="lg:hidden min-h-screen flex flex-col" style={{ background: '#e7f6ef' }}>

        {/* decorative blobs */}
        <div className="fixed top-0 right-0 w-72 h-72 rounded-full pointer-events-none -z-0"
          style={{ background: 'radial-gradient(circle,#bfe8d4 0%,transparent 70%)', opacity: 0.5 }} />
        <div className="fixed bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none -z-0"
          style={{ background: 'radial-gradient(circle,#b2e3cb 0%,transparent 70%)', opacity: 0.4 }} />

        <div className="flex-1 flex flex-col items-center justify-start px-5 pt-10 pb-8 relative z-10">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 flex items-center justify-center p-1.5 mb-3">
              <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
              Sirajganj Polytechnic Institute
            </p>
          </motion.div>

          {/* Progress bar */}
          {state.step !== 'success' && <ProgressBar stepIndex={stepIndex} stepLabels={stepLabels} />}

          {/* Card */}
          <StepCard state={state}
            onEmailSubmit={handleEmailSubmit} onOTPSubmit={handleOTPSubmit}
            onPasswordSubmit={handlePasswordSubmit} onResend={handleResendOTP} onBack={handleBack} />

          <p className="mt-6 text-xs text-gray-400">Â© 2024 Student Portal. All rights reserved.</p>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â• DESKTOP (lg+) â•â•â•â•â•â•â•â•â•â• */}
      <div className="hidden lg:flex min-h-screen relative flex-col items-center justify-center overflow-hidden">

        {/* Same campus photo background as login page */}
        <div className="absolute inset-0 z-0">
          <img src="/cover-image.jpg" alt="Campus"
            className="w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg,rgba(6,78,59,0.55) 0%,rgba(5,150,105,0.4) 45%,rgba(4,47,36,0.6) 100%)' }} />
        </div>

        {/* Dot decorations */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div className="absolute top-[8%] left-[12%] w-2 h-2 rounded-full bg-white/40" />
          <div className="absolute top-[20%] right-[18%] w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="absolute top-[15%] right-[8%] w-1.5 h-1.5 rounded-full bg-amber-300/60" />
          <div className="absolute bottom-[22%] left-[8%] w-2 h-2 rounded-full bg-white/30" />
          <div className="absolute bottom-[15%] right-[20%] w-2 h-2 rounded-full bg-amber-300/50" />
          <div className="absolute top-1/2 left-[6%] w-7 h-7 rounded-full border border-white/30" />
          <div className="absolute top-[18%] right-1/3 w-5 h-5 rounded-full border border-amber-300/40" />
        </div>

        {/* Top-left brand */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-lg border border-white/40 flex items-center justify-center p-1.5">
            <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Student Portal</p>
            <p className="text-emerald-100/80 text-xs leading-tight">Learn. Grow. Achieve.</p>
          </div>
        </div>

        {/* Top-right language pill */}
        <button type="button"
          className="absolute top-6 right-6 z-20 flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-white/25 transition-colors">
          <Globe className="w-4 h-4" />EN<ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

        {/* Bottom-left quote */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="absolute bottom-7 left-7 z-20 hidden xl:flex items-start gap-3 bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3.5 max-w-[270px]">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/80 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-snug">Education is the most powerful weapon.</p>
            <p className="text-emerald-100/70 text-xs mt-1">â€” Nelson Mandela</p>
          </div>
        </motion.div>

        {/* Bottom-right badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="absolute bottom-7 right-7 z-20 hidden xl:flex items-center gap-3 bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3.5">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/80 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Keep Learning,</p>
            <p className="text-white text-sm font-semibold">Keep Growing</p>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-300 ml-1" />
        </motion.div>

        {/* Frosted glass card â€” same style as login */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[440px] mx-6 rounded-[28px] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 24px 70px rgba(6,45,34,0.35)',
          }}>
          <div className="max-h-[85vh] overflow-y-auto p-8">

            {/* Progress bar */}
            {state.step !== 'success' && <ProgressBar stepIndex={stepIndex} stepLabels={stepLabels} />}

            {/* Step content */}
            <StepCard state={state}
              onEmailSubmit={handleEmailSubmit} onOTPSubmit={handleOTPSubmit}
              onPasswordSubmit={handlePasswordSubmit} onResend={handleResendOTP} onBack={handleBack} />
          </div>
        </motion.div>

        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/40 text-xs z-20">
          Â© 2024 Student Portal. All rights reserved.
        </p>
      </div>
    </>
  );
}

function ProgressBar({ stepIndex, stepLabels }: { stepIndex: number; stepLabels: string[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mb-6">
      <div className="flex justify-between mb-2">
        {stepLabels.map((label, i) => (
          <span key={label}
            className={`text-xs font-semibold transition-colors ${i <= stepIndex ? 'text-emerald-600' : 'text-gray-400'}`}>
            {label}
          </span>
        ))}
      </div>
      <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(stepIndex / 2) * 100}%` }}
          transition={{ duration: 0.4 }} />
      </div>
    </motion.div>
  );
}

function StepCard({ state, onEmailSubmit, onOTPSubmit, onPasswordSubmit, onResend, onBack }: {
  state: PasswordResetState;
  onEmailSubmit: (email: string) => Promise<void>;
  onOTPSubmit: (otp: string) => Promise<void>;
  onPasswordSubmit: (pw: string, cpw: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={state.step}
        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
        {state.step === 'email' && (
          <ForgotPasswordForm onSubmit={onEmailSubmit} onBack={onBack}
            loading={state.loading} error={state.error || undefined} />
        )}
        {state.step === 'otp' && (
          <OTPVerificationForm email={state.email} onSubmit={onOTPSubmit}
            onBack={onBack} onResend={onResend}
            loading={state.loading} error={state.error || undefined} />
        )}
        {state.step === 'password' && (
          <NewPasswordForm email={state.email} otp={state.otp}
            onSubmit={onPasswordSubmit} onBack={onBack}
            loading={state.loading} error={state.error || undefined} />
        )}
        {state.step === 'success' && <SuccessView />}
      </motion.div>
    </AnimatePresence>
  );
}

function SuccessView() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }} className="flex flex-col items-center text-center py-4 gap-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Password Reset!</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your password has been updated successfully.<br />Redirecting to loginâ€¦
        </p>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#10b981,#22c55e)' }}
          initial={{ width: '0%' }} animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }} />
      </div>
    </motion.div>
  );
}

export default PasswordResetPage;
