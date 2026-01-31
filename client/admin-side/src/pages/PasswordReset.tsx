import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { passwordResetService } from '@/services/passwordResetService';
import { useToast } from '@/hooks/use-toast';

type PasswordResetStep = 'email' | 'otp' | 'password' | 'success';

interface PasswordResetState {
  step: PasswordResetStep;
  email: string;
  otp: string;
  loading: boolean;
  error: string | null;
}

export default function PasswordReset() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-10 h-10 text-green-600"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border/50">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Sirajganj Polytechnic</h1>
            <p className="text-sm text-muted-foreground">Admin Panel - Password Reset</p>
          </div>

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
        </div>
      </motion.div>
    </div>
  );
}