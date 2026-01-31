import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OTPVerificationFormProps {
  email: string;
  onSubmit: (otp: string) => Promise<void>;
  onBack: () => void;
  onResend: () => Promise<void>;
  loading: boolean;
  error?: string;
}

export function OTPVerificationForm({ 
  email, 
  onSubmit, 
  onBack, 
  onResend, 
  loading, 
  error 
}: OTPVerificationFormProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the complete 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSubmit(otpString);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;
    
    setResendLoading(true);
    try {
      await onResend();
      setTimeRemaining(600);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      toast({
        title: "OTP Sent",
        description: "New OTP sent to your email",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Enter OTP Code</h2>
        <p className="text-sm text-muted-foreground">
          We've sent a 6-digit code to{' '}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-center block">
            Enter 6-digit OTP
          </Label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={cn(
                  "w-12 h-12 text-center text-lg font-semibold",
                  "focus:ring-2 focus:ring-primary focus:border-primary"
                )}
                disabled={loading}
              />
            ))}
          </div>
        </div>

        <div className="text-center space-y-2">
          {timeRemaining > 0 ? (
            <p className="text-sm text-muted-foreground">
              Code expires in{' '}
              <span className="font-medium text-foreground">
                {formatTime(timeRemaining)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-destructive">
              OTP has expired. Please request a new one.
            </p>
          )}
          
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm text-muted-foreground">Didn't receive the code?</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="p-0 h-auto font-medium"
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Resend
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 gradient-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-300 group"
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
            ) : (
              <span className="flex items-center gap-2">
                Verify OTP
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </form>
    </motion.div>
  );
}