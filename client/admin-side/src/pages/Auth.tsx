import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, Shield, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import signupRequestService from '@/services/signupRequestService';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loginAsDemo, isAuthenticated } = useAuth();

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
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [signupRequestSubmitted, setSignupRequestSubmitted] = useState(false);

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

        // Submit signup request
        await signupRequestService.createSignupRequest({
          username: formData.username,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          mobile_number: formData.mobileNumber,
          requested_role: formData.requestedRole,
          password: formData.password,
          password_confirm: formData.confirmPassword,
        });

        setSignupRequestSubmitted(true);
        toast({
          title: "Signup Request Submitted!",
          description: "Your request is pending approval from an administrator.",
        });
      } else {
        // Login logic
        try {
          await login(formData.email, formData.password, rememberMe);
          
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
      
      // Handle different error formats
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        // ApiError format from apiClient
        errorMessage = error.details || error.error;
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
            <p className="text-sm text-muted-foreground">Admin Panel</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-muted/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isLogin 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isLogin 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          {signupRequestSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
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
                  setFormData({
                    username: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    mobileNumber: '',
                    password: '',
                    confirmPassword: '',
                    requestedRole: '',
                  });
                }}
                variant="outline"
                className="mt-4"
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
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                      </div>
                    </motion.div>

                    <motion.div
                      key="firstName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder="Enter your first name"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      key="lastName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder="Enter your last name"
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
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                            <SelectItem value="institute_head">Institute Head</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email">{isLogin ? 'Username or Email' : 'Email'}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type={isLogin ? "text" : "email"}
                    placeholder={isLogin ? "admin" : "admin@example.com"}
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me for 1 week
                  </Label>
                </div>
                <button type="button" className="text-sm text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isLogin ? 'Signing in...' : 'Submitting request...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? 'Sign In' : 'Submit Signup Request'}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>

              {/* Demo Login Button */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-2 hover:bg-accent/50"
                onClick={() => {
                  loginAsDemo();
                  toast({
                    title: "Demo Mode Activated",
                    description: "You're now logged in as a demo admin. Explore freely!",
                  });
                }}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Try Demo (No Password Required)
                </div>
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
