import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
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
    step: 'email',
    email: '',
    otp: '',
    loading: false,
    error: null,
  });

  const updateState = (updates: Partial<PasswordResetState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleEmailSubmit = async (email: string) => {
    updateState({ loading: true, error: null });
    
    try {
      await passwordResetService.requestPasswordReset({ email });
      updateState({ 
        step: 'otp', 
        email, 
        loading: false 
      });
    } catch (error: any) {
      updateState({ 
        loading: false, 
        error: error.message 
      });
      throw error;
    }
  };

  const handleOTPSubmit = async (otp: string) => {
    updateState({ loading: true, error: null });
    
    try {
      const response = await passwordResetService.verifyOTP({ 
        email: state.email, 
        otp 
      });
      
      if (response.verified) {
        updateState({ 
          step: 'password', 
          otp, 
          loading: false 
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      updateState({ 
        loading: false, 
        error: error.message 
      });
      throw error;
    }
  };

  const handlePasswordSubmit = async (password: string, confirmPassword: string) => {
    updateState({ loading: true, error: null });
    
    try {
      await passwordResetService.confirmPasswordReset({
        email: state.email,
        otp: state.otp,
        new_password: password,
        confirm_password: confirmPassword,
      });
      
      updateState({ 
        step: 'success', 
        loading: false 
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error: any) {
      updateState({ 
        loading: false, 
        error: error.message 
      });
      throw error;
    }
  };

  const handleResendOTP = async () => {
    try {
      await passwordResetService.requestPasswordReset({ email: state.email });
    } catch (error: any) {
      throw error;
    }
  };

  const handleBack = () => {
    if (state.step === 'email') {
      navigate('/auth');
    } else if (state.step === 'otp') {
      updateState({ step: 'email', error: null });
    } else if (state.step === 'password') {
      updateState({ step: 'otp', error: null });
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 'email':
        return (
          <ForgotPasswordForm
            onSubmit={handleEmailSubmit}
            onBack={handleBack}
            loading={state.loading}
            error={state.error || undefined}
          />
        );
      
      case 'otp':
        return (
          <OTPVerificationForm
            email={state.email}
            onSubmit={handleOTPSubmit}
            onBack={handleBack}
            onResend={handleResendOTP}
            loading={state.loading}
            error={state.error || undefined}
          />
        );
      
      case 'password':
        return (
          <NewPasswordForm
            email={state.email}
            otp={state.otp}
            onSubmit={handlePasswordSubmit}
            onBack={handleBack}
            loading={state.loading}
            error={state.error || undefined}
          />
        );
      
      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-10 h-10 text-success"
              >
                ✓
              </motion.div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
              <p className="text-muted-foreground mb-4">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login page in a few seconds...
              </p>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Branding (Hidden on mobile, shown on lg+) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden"
      >
        {/* Animated mesh background */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/3 -left-1/3 w-2/3 h-2/3 bg-white/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [180, 0, 180],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/3 -right-1/3 w-3/4 h-3/4 bg-white/8 rounded-full blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-lg"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-xl flex items-center justify-center overflow-hidden p-2.5 shadow-lg">
                <img 
                  src="/spi-logo.png" 
                  alt="SPI Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold">Sirajganj Polytechnic</h2>
                <p className="text-sm text-white/70">Institute</p>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-display font-bold mb-6 leading-tight">
              Reset Your<br />
              <span className="text-white/90">Password Securely</span>
            </h1>

            <p className="text-lg text-white/80 mb-10 leading-relaxed">
              Follow the simple steps to reset your password and regain access to your academic portal.
            </p>

            {/* Security features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <span className="text-sm">🔒</span>
                </div>
                <span className="text-white/90">Secure OTP verification</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <span className="text-sm">⏱️</span>
                </div>
                <span className="text-white/90">Time-limited access codes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <span className="text-sm">🛡️</span>
                </div>
                <span className="text-white/90">Protected by encryption</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Password Reset Forms */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-auto">
        {/* Mobile Header */}
        <div className="lg:hidden px-4 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Password Reset</h2>
              <p className="text-xs text-muted-foreground">Secure Recovery</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Desktop Theme Toggle */}
        <div className="hidden lg:block absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 md:p-8 lg:p-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden px-4 py-3 border-t border-border bg-card/50 backdrop-blur-sm safe-area-inset">
          <p className="text-center text-xs text-muted-foreground">
            © 2024 Sirajganj Polytechnic Institute
          </p>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetPage;