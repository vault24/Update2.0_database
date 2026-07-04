import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, Shield,
  ShieldCheck, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import signupRequestService from '@/services/signupRequestService';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { API_BASE_URL } from '@/config/api';

interface DepartmentOption {
  id: string;
  name: string;
  code?: string;
}

/* ─── Full-screen institute/campus background slider (admin vibe) ─── */
const bgImages = ['/cover-image.jpg', '/cover-image1.jpg'];

function BackgroundSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bgImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.img
          key={current}
          src={bgImages[current]}
          alt="Institute campus"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Teal/slate admin tint — professional, lets the campus photo show through */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(8,74,89,0.38) 0%, rgba(6,95,107,0.22) 45%, rgba(4,28,40,0.45) 100%)',
        }}
      />

      {/* Slide indicator dots — bottom center */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {bgImages.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
            className={cn(
              'rounded-full transition-all duration-300',
              i === current ? 'h-2.5 w-6 bg-white' : 'h-2.5 w-2.5 bg-white/40 hover:bg-white/60',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Shared page chrome: campus background + brand + admin badge ─── */
function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <BackgroundSlider />

      {/* Faint floating decorations */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute left-[10%] top-[12%] h-2 w-2 rounded-full bg-white/40" />
        <div className="absolute right-[14%] top-[22%] h-2.5 w-2.5 rounded-full bg-amber-300/60" />
        <div className="absolute bottom-[20%] left-[12%] h-2 w-2 rounded-full bg-white/30" />
        <div className="absolute right-[16%] top-1/2 h-6 w-6 rounded-full border border-white/25" />
      </div>

      {/* Top-left brand wordmark */}
      <div className="absolute left-5 top-5 z-20 flex items-center gap-3 sm:left-6 sm:top-6">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white p-1.5 shadow-lg">
          <img src="/spi-logo.png" alt="SPI Logo" className="h-full w-full object-contain" />
        </div>
        <div className="text-white">
          <p className="text-sm font-bold leading-tight drop-shadow">Sirajganj Polytechnic</p>
          <p className="text-xs text-white/80">Admin Panel</p>
        </div>
      </div>

      {/* Top-right "secure admin access" badge */}
      <div className="absolute right-5 top-5 z-20 hidden items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 backdrop-blur-md sm:flex sm:right-6 sm:top-6">
        <Shield className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-xs font-medium text-white">Secure Admin Access</span>
      </div>

      {children}

      {/* Bottom-left note (admin vibe) */}
      <p className="absolute bottom-5 left-6 z-10 hidden max-w-xs text-xs text-white/70 lg:block">
        Restricted area · Authorized institute administrators only.
      </p>
    </div>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, verify2FA, isAuthenticated } = useAuth();

  // Two-factor login challenge state
  const [twoFactor, setTwoFactor] = useState<{ required: boolean; email: string }>({ required: false, email: '' });
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    requestedRole: '',
    department: '',
    shift: '' as '' | '1st_shift' | '2nd_shift',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [signupRequestSubmitted, setSignupRequestSubmitted] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Live username availability ('idle' | 'checking' | 'available' | 'taken')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  // Two-step sign-up: step 1 fills the info, step 2 verifies the emailed OTP.
  const [signupOtpStep, setSignupOtpStep] = useState(false);
  const [signupOtpError, setSignupOtpError] = useState<string | undefined>();
  const [submittingSignup, setSubmittingSignup] = useState(false);

  // Debounced username availability check while signing up.
  useEffect(() => {
    if (isLogin) return;
    const name = formData.username.trim();
    if (!name) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await signupRequestService.checkAvailability({ username: name });
        setUsernameStatus(res.username_available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [formData.username, isLogin]);

  // Build the createSignupRequest payload from the current form (shared by
  // the OTP verify + resend handlers).
  const buildSignupPayload = (verificationCode?: string) => ({
    username: formData.username,
    email: formData.email,
    first_name: formData.firstName,
    last_name: formData.lastName,
    mobile_number: formData.mobileNumber,
    requested_role: formData.requestedRole,
    department: formData.requestedRole === 'department_head' ? formData.department : undefined,
    shift: formData.requestedRole === 'department_head' ? (formData.shift || undefined) : undefined,
    password: formData.password,
    password_confirm: formData.confirmPassword,
    ...(verificationCode ? { verification_code: verificationCode } : {}),
  });

  // Step 2 of sign-up: verify the emailed OTP and submit the signup request.
  const handleVerifySignupOtp = async (otp: string) => {
    setSubmittingSignup(true);
    setSignupOtpError(undefined);
    try {
      await signupRequestService.createSignupRequest(buildSignupPayload(otp));
      setSignupOtpStep(false);
      setSignupRequestSubmitted(true);
      toast({
        title: 'Signup Request Submitted!',
        description: 'Your request is pending approval from an administrator.',
      });
    } catch (err: any) {
      const msg = err?.details?.verification_code?.[0] || err?.message || 'The code is incorrect or has expired.';
      setSignupOtpError(msg);
      throw err;
    } finally {
      setSubmittingSignup(false);
    }
  };

  // Resend the sign-up verification code (used from the OTP step).
  const handleResendSignupCode = async () => {
    await signupRequestService.sendSignupCode(formData.email, formData.firstName);
  };

  // Load departments (needed for Department Head signup requests)
  useEffect(() => {
    fetch(`${API_BASE_URL}/departments/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const list = data?.results || data || [];
        setDepartments(Array.isArray(list) ? list : []);
      })
      .catch(() => setDepartments([]));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!formData.email || !formData.password) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!isLogin) {
        if (!formData.username || !formData.firstName || !formData.lastName || !formData.requestedRole) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (formData.requestedRole === 'department_head' && !formData.department) {
          toast({
            title: "Error",
            description: "Please select the department you will manage.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (formData.requestedRole === 'department_head' && !formData.shift) {
          toast({
            title: "Error",
            description: "Please select your shift (1st Shift or 2nd Shift).",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (usernameStatus === 'taken') {
          toast({ title: "Error", description: "That username is already taken.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        // Step 1 complete — email a verification code, then move to the OTP step.
        await signupRequestService.sendSignupCode(formData.email, formData.firstName);
        setSignupOtpError(undefined);
        setSignupOtpStep(true);
        toast({
          title: "Verify your email",
          description: `We've sent a 6-digit code to ${formData.email}.`,
        });
        setIsLoading(false);
        return;
      } else {
        // Login logic
        try {
          const result = await login(formData.email, formData.password, rememberMe);

          // If 2FA is enabled, switch to the verification step instead of logging in
          if (result?.twoFactorRequired) {
            setTwoFactor({ required: true, email: result.email || formData.email });
            setOtpCode('');
            toast({
              title: "Verification Required",
              description: "We've emailed you a 6-digit code to finish signing in.",
            });
            setIsLoading(false);
            return;
          }

          toast({
            title: "Welcome back!",
            description: "You have been logged in successfully.",
          });
        } catch (err: any) {
          // Check if there's a pending signup request (only if login failed due to invalid credentials)
          const errorMessage = err.message || err.toString() || "Invalid email or password";
          const isInvalidCredentials = errorMessage.toLowerCase().includes('invalid') ||
                                      errorMessage.toLowerCase().includes('password') ||
                                      errorMessage.toLowerCase().includes('username');

          if (isInvalidCredentials) {
            try {
              const statusResponse = await signupRequestService.checkSignupRequestStatus(formData.email);

              if (statusResponse.status === 'pending') {
                toast({
                  title: "Account Pending Approval",
                  description: "Your signup request is awaiting approval from an administrator. Please check back later.",
                  variant: "destructive",
                });
                setIsLoading(false);
                return;
              } else if (statusResponse.status === 'rejected') {
                toast({
                  title: "Signup Request Rejected",
                  description: statusResponse.rejection_reason || "Your signup request was rejected. Please contact an administrator for more information.",
                  variant: "destructive",
                });
                setIsLoading(false);
                return;
              }
            } catch (statusErr: any) {
              // If status check fails, log it but continue to show login error
              console.error('Failed to check signup request status:', statusErr);
              // Don't show status check errors to user, continue with login error
            }
          }

          // Show login error with actual error message from backend
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = "An error occurred. Please try again.";

      // Field-level validation errors (e.g. { email: ["This email is already
      // registered."] }) may arrive either nested under `details` or as the
      // thrown object itself (DRF serializer errors). Surface them plainly.
      const fieldErrorSource =
        error?.details && typeof error.details === 'object' && !Array.isArray(error.details)
          ? (error.details as Record<string, unknown>)
          : error && typeof error === 'object' && !error.error && !error.message && !error.detail
            ? (error as Record<string, unknown>)
            : null;
      const fieldErrors = fieldErrorSource
        ? Object.values(fieldErrorSource)
            .flat()
            .filter((v): v is string => typeof v === 'string')
        : [];

      // Handle different error formats
      if (fieldErrors.length > 0) {
        errorMessage = fieldErrors.join(' ');
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        // ApiError format from apiClient
        errorMessage = typeof error.details === 'string' ? error.details : error.error;
      } else if (error.response?.data) {
        const data = error.response.data;
        errorMessage = data.message || data.detail || data.error || data.details || JSON.stringify(data);
      } else if (error.response) {
        errorMessage = `Request failed with status ${error.response.status}`;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code from your email.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      await verify2FA(twoFactor.email, otpCode.trim(), rememberMe);
      toast({ title: "Welcome back!", description: "You have been logged in successfully." });
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err?.message || "The code is incorrect or has expired.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Two-factor verification screen
  if (twoFactor.required) {
    return (
      <PageChrome>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-card/90 p-8 shadow-2xl"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Two-Factor Verification</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the 6-digit code we sent to{' '}
              <span className="font-medium text-foreground">{twoFactor.email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-14 text-center text-2xl font-semibold tracking-[0.5em]"
                autoFocus
              />
            </div>
            <Button type="submit" className="h-11 w-full gradient-primary text-primary-foreground" disabled={verifying}>
              {verifying ? 'Verifying...' : 'Verify & Sign In'}
              {!verifying && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            <button
              type="button"
              onClick={() => { setTwoFactor({ required: false, email: '' }); setOtpCode(''); }}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Back to login
            </button>
          </form>
        </motion.div>
      </PageChrome>
    );
  }

  // Sign-up step 2 — email OTP verification (info was filled in step 1).
  if (signupOtpStep) {
    return (
      <PageChrome>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-card/90 p-6 shadow-2xl sm:p-8"
        >
          <OTPVerificationForm
            email={formData.email}
            onSubmit={handleVerifySignupOtp}
            onBack={() => { setSignupOtpStep(false); setSignupOtpError(undefined); }}
            onResend={handleResendSignupCode}
            loading={submittingSignup}
            error={signupOtpError}
          />
        </motion.div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-card/90 p-6 shadow-2xl sm:p-8"
      >
        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {isLogin ? 'Welcome back' : 'Request admin access'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin
              ? 'Sign in to the administration panel.'
              : 'Submit a request — an administrator will review it.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              isLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              !isLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        {signupRequestSubmitted ? (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <ShieldCheck className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Request Submitted Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Your signup request is pending approval from an administrator.
              You will receive an email notification once your account has been reviewed.
            </p>
            <Button
              onClick={() => {
                setSignupRequestSubmitted(false);
                setIsLogin(true);
                setSignupOtpStep(false);
                setSignupOtpError(undefined);
                setUsernameStatus('idle');
                setFormData({
                  username: '',
                  firstName: '',
                  lastName: '',
                  email: '',
                  mobileNumber: '',
                  password: '',
                  confirmPassword: '',
                  requestedRole: '',
                  department: '',
                  shift: '',
                });
              }}
              variant="outline"
              className="mt-2"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <>
                  <motion.div
                    key="username"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder="Enter your username"
                          value={formData.username}
                          onChange={handleChange}
                          className="pl-10"
                        />
                      </div>
                      {formData.username.trim() && (
                        <p className={`text-xs ${
                          usernameStatus === 'available' ? 'text-green-600'
                          : usernameStatus === 'taken' ? 'text-destructive'
                          : 'text-muted-foreground'
                        }`}>
                          {usernameStatus === 'checking' && 'Checking availability…'}
                          {usernameStatus === 'available' && '✓ Username is available'}
                          {usernameStatus === 'taken' && '✗ Username is already taken'}
                        </p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    key="names"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          placeholder="First name"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          placeholder="Last name"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    key="mobileNumber"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobile Number (Optional)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="mobileNumber"
                          name="mobileNumber"
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={formData.mobileNumber}
                          onChange={handleChange}
                          className="pl-10"
                          maxLength={11}
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    key="requestedRole"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="requestedRole">Requested Role</Label>
                      <Select
                        value={formData.requestedRole}
                        onValueChange={(value) => setFormData({ ...formData, requestedRole: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registrar">Registrar</SelectItem>
                          <SelectItem value="department_head">Department Head</SelectItem>
                          <SelectItem value="institute_head">Principal (Institute Head)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.requestedRole === 'department_head' && (
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select
                          value={formData.department}
                          onValueChange={(value) => setFormData({ ...formData, department: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select the department you will manage" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}{dept.code ? ` (${dept.code})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.requestedRole === 'department_head' && (
                      <div className="space-y-2">
                        <Label htmlFor="shift">Shift</Label>
                        <Select
                          value={formData.shift}
                          onValueChange={(value) => setFormData({ ...formData, shift: value as '1st_shift' | '2nd_shift' })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select the shift you will manage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st_shift">1st Shift</SelectItem>
                            <SelectItem value="2nd_shift">2nd Shift</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email">{isLogin ? 'Username or Email' : 'Email'}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type={isLogin ? 'text' : 'email'}
                  placeholder={isLogin ? 'admin' : 'admin@example.com'}
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="confirmPassword"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="cursor-pointer text-sm text-muted-foreground">
                    Remember me for 1 week
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/password-reset')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full gradient-primary text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  {isLogin ? 'Signing in...' : 'Submitting request...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isLogin ? 'Sign In' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </PageChrome>
  );
}
