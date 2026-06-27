import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen flex flex-col" style={{ background: '#eaf0fb' }}>

      {/* ── decorative blobs ── */}
      <div className="fixed top-0 right-0 w-72 h-72 rounded-full pointer-events-none -z-0"
        style={{ background: 'radial-gradient(circle,#c7d9f8 0%,transparent 70%)', opacity: 0.5 }} />
      <div className="fixed bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none -z-0"
        style={{ background: 'radial-gradient(circle,#bcd3f7 0%,transparent 70%)', opacity: 0.4 }} />

      {/* ── content ── */}
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

        {/* Progress bar — hidden on success */}
        {state.step !== 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full max-w-sm mb-6">
            <div className="flex justify-between mb-2">
              {stepLabels.map((label, i) => (
                <span key={label}
                  className={`text-xs font-semibold transition-colors ${i <= stepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              ))}
            </div>
            <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${((stepIndex) / 2) * 100}%` }}
                transition={{ duration: 0.4 }} />
            </div>
          </motion.div>
        )}

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={state.step}
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}
              className="p-7">
              {state.step === 'email' && (
                <ForgotPasswordForm onSubmit={handleEmailSubmit} onBack={handleBack}
                  loading={state.loading} error={state.error || undefined} />
              )}
              {state.step === 'otp' && (
                <OTPVerificationForm email={state.email} onSubmit={handleOTPSubmit}
                  onBack={handleBack} onResend={handleResendOTP}
                  loading={state.loading} error={state.error || undefined} />
              )}
              {state.step === 'password' && (
                <NewPasswordForm email={state.email} otp={state.otp}
                  onSubmit={handlePasswordSubmit} onBack={handleBack}
                  loading={state.loading} error={state.error || undefined} />
              )}
              {state.step === 'success' && <SuccessView />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="mt-6 text-xs text-gray-400">© 2024 Student Portal. All rights reserved.</p>
      </div>
    </div>
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
          Your password has been updated successfully.<br />Redirecting to login…
        </p>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#3b6cf7,#22c55e)' }}
          initial={{ width: '0%' }} animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }} />
      </div>
    </motion.div>
  );
}

export default PasswordResetPage;
