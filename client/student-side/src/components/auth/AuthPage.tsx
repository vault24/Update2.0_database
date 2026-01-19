import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Sparkles, Users, BookOpen, Briefcase, Building2, Award, MapPin, Zap, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';
import { departmentService, type Department } from '@/services/departmentService';

type AuthMode = 'login' | 'signup';

const roleOptions: { value: UserRole; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap, description: 'Regular student access' },
  { value: 'captain', label: 'Captain', icon: Users, description: 'Class captain with extra features' },
  { value: 'teacher', label: 'Teacher', icon: BookOpen, description: 'Teacher dashboard access' },
];

const demoCredentials = [
  { role: 'student' as UserRole, label: 'Student Demo', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
  { role: 'captain' as UserRole, label: 'Captain Demo', icon: Shield, color: 'from-amber-500 to-orange-500' },
  { role: 'teacher' as UserRole, label: 'Teacher Demo', icon: BookOpen, color: 'from-emerald-500 to-teal-500' },
];

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, signup, demoLogin } = useAuth();
  const navigate = useNavigate();

  // Fetch departments when teacher role is selected
  useEffect(() => {
    if (selectedRole === 'teacher' && mode === 'signup') {
      const fetchDepartments = async () => {
        try {
          const depts = await departmentService.getAll();
          setDepartments(depts);
        } catch (error) {
          console.error('Failed to fetch departments:', error);
        }
      };
      fetchDepartments();
    }
  }, [selectedRole, mode]);

  const [formData, setFormData] = useState({
    studentId: '',
    email: '',
    password: '',
    fullName: '',
    mobile: '',
    fullNameBangla: '',
    designation: '',
    department: '',
    qualifications: [] as string[],
    specializations: [] as string[],
    officeLocation: '',
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [qualificationInput, setQualificationInput] = useState('');
  const [specializationInput, setSpecializationInput] = useState('');

  const handleDemoLogin = (role: UserRole) => {
    demoLogin(role);
    toast.success(`Welcome! Logged in as ${role}`, {
      description: 'This is a demo account with sample data',
    });
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email || formData.studentId, formData.password, rememberMe);
        toast.success('Welcome back!');
      } else {
        const signupData: any = {
          fullName: formData.fullName,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
          role: selectedRole,
        };

        if (selectedRole === 'teacher') {
          signupData.fullNameBangla = formData.fullNameBangla;
          signupData.designation = formData.designation;
          signupData.department = formData.department;
          signupData.qualifications = formData.qualifications;
          signupData.specializations = formData.specializations;
          signupData.officeLocation = formData.officeLocation;
        }

        await signup(signupData);
        
        if (selectedRole === 'teacher') {
          toast.success('Registration submitted! Please wait for admin approval.');
        } else {
          toast.success('Account created successfully!');
        }
      }
      
      navigate('/dashboard');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
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
          <motion.div
            animate={{ 
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-white/5 rounded-full blur-2xl"
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
              Your Academic<br />
              <span className="text-white/90">Journey Starts Here</span>
            </h1>

            <p className="text-lg text-white/80 mb-10 leading-relaxed">
              Access class routines, track attendance, view marks, and stay connected with your academic community.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 mb-10">
              {[
                { icon: Zap, text: 'Real-time class updates & notifications' },
                { icon: BookOpen, text: 'Complete academic management' },
                { icon: Users, text: 'Connect with teachers & classmates' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="text-white/90">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {['R', 'F', 'K', 'A'].map((letter, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-sm font-semibold backdrop-blur-sm"
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>
              <p className="text-sm text-white/80">
                <span className="font-semibold text-white">2,500+</span> Students enrolled
              </p>
            </div>
          </motion.div>

          {/* Floating notification card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-12 right-12 xl:right-16"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="glass-card p-4 rounded-2xl backdrop-blur-xl border border-white/20 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-sm">New Session 2024</p>
                  <p className="text-xs text-white/70">Admissions Open</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-auto">
        {/* Mobile Header */}
        <div className="lg:hidden px-4 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Sirajganj Polytechnic</h2>
              <p className="text-xs text-muted-foreground">Student Portal</p>
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
              {/* Demo Login Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div className="text-center mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Quick Demo Access</h3>
                  <p className="text-xs text-muted-foreground/70">Try the portal without registration</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {demoCredentials.map((demo) => {
                    const Icon = demo.icon;
                    return (
                      <motion.button
                        key={demo.role}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDemoLogin(demo.role)}
                        className={cn(
                          "relative p-3 rounded-xl border border-border bg-card shadow-card overflow-hidden group",
                          "hover:shadow-elevated transition-all duration-300"
                        )}
                      >
                        <div className={cn(
                          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br",
                          demo.color
                        )} />
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-gradient-to-br",
                            demo.color,
                            "text-white"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium group-hover:text-white transition-colors">{demo.label}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-muted rounded-xl p-1 mb-6">
                {(['login', 'signup'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMode(tab)}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 relative touch-button",
                      mode === tab
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {mode === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 gradient-primary rounded-lg shadow-md"
                        transition={{ type: "spring", duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">
                      {tab === 'login' ? 'Sign In' : 'Create Account'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {mode === 'signup' && (
                    <>
                      {/* Role Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Your Role</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {roleOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedRole === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectedRole(option.value)}
                                className={cn(
                                  "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300 touch-button",
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-card hover:border-primary/50"
                                )}
                              >
                                <div className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className={cn(
                                  "text-xs font-medium transition-colors",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Enter your full name"
                            className="pl-10 h-11"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {mode === 'login' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="studentId" className="text-sm font-medium">ID or Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="studentId"
                          type="text"
                          placeholder="SPI-2024-XXXX or email"
                          className="pl-10 h-11"
                          value={formData.studentId}
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="mobile"
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            className="pl-10 h-11"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="your.email@example.com"
                            className="pl-10 h-11"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {/* Teacher-specific fields */}
                      {selectedRole === 'teacher' && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="fullNameBangla" className="text-sm font-medium">
                              Full Name (Bangla) <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="fullNameBangla"
                                type="text"
                                placeholder="আপনার পূর্ণ নাম"
                                className="pl-10 h-11"
                                value={formData.fullNameBangla}
                                onChange={(e) => setFormData({ ...formData, fullNameBangla: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="designation" className="text-sm font-medium">
                              Designation <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="designation"
                                type="text"
                                placeholder="e.g., Assistant Professor"
                                className="pl-10 h-11"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="department" className="text-sm font-medium">
                              Department <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                              <Select
                                value={formData.department}
                                onValueChange={(value) => setFormData({ ...formData, department: value })}
                              >
                                <SelectTrigger className="pl-10 h-11">
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="qualifications" className="text-sm font-medium">Qualifications</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  id="qualifications"
                                  type="text"
                                  placeholder="e.g., M.Sc. in CS"
                                  className="pl-10 h-11"
                                  value={qualificationInput}
                                  onChange={(e) => setQualificationInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && qualificationInput.trim()) {
                                      e.preventDefault();
                                      setFormData({
                                        ...formData,
                                        qualifications: [...formData.qualifications, qualificationInput.trim()],
                                      });
                                      setQualificationInput('');
                                    }
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 px-4"
                                onClick={() => {
                                  if (qualificationInput.trim()) {
                                    setFormData({
                                      ...formData,
                                      qualifications: [...formData.qualifications, qualificationInput.trim()],
                                    });
                                    setQualificationInput('');
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                            {formData.qualifications.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {formData.qualifications.map((qual, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                                  >
                                    {qual}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          qualifications: formData.qualifications.filter((_, i) => i !== index),
                                        });
                                      }}
                                      className="hover:text-destructive"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="officeLocation" className="text-sm font-medium">Office Location</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="officeLocation"
                                type="text"
                                placeholder="e.g., Room 201, Building A"
                                className="pl-10 h-11"
                                value={formData.officeLocation}
                                onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-11"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'login' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember-me" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">
                          Remember me
                        </Label>
                      </div>
                      <button type="button" className="text-xs text-primary hover:underline font-medium">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 gradient-primary text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 touch-button group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    {mode === 'login' ? (
                      <>
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('signup')}
                          className="text-primary font-medium hover:underline"
                        >
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="text-primary font-medium hover:underline"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </motion.form>
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