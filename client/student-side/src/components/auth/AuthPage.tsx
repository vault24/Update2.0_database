import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Sparkles, Users, BookOpen, Briefcase, Building2, Award, MapPin } from 'lucide-react';
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

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, signup } = useAuth();
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
          toast.error('Failed to load departments');
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
    // Teacher-specific fields
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

        // Add teacher-specific fields if role is teacher
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
      
      // Check if user needs to complete admission
      // The auth context will have updated user state by now
      // We'll check in a useEffect instead to ensure state is updated
      navigate('/dashboard');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden"
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary-foreground/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 bg-accent/10 rounded-full blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 backdrop-blur-xl flex items-center justify-center overflow-hidden p-2">
                <img 
                  src="/spi-logo.png" 
                  alt="SPI Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold">Sirajganj Polytechnic</h2>
                <p className="text-sm opacity-80">Institute</p>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight">
              Welcome to the<br />
              <span className="text-primary-foreground/90">Student Portal</span>
            </h1>

            <p className="text-lg opacity-90 mb-8 max-w-md">
              Access your academic journey, manage admissions, track progress, and stay connected with your institution.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-primary-foreground/30 border-2 border-primary-foreground/50 flex items-center justify-center text-xs font-semibold"
                  >
                    {String.fromCharCode(65 + i - 1)}
                  </div>
                ))}
              </div>
              <p className="text-sm opacity-80">
                <span className="font-semibold">2,500+</span> Students enrolled
              </p>
            </div>
          </motion.div>

          {/* Floating cards */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-12 glass-card p-4 rounded-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium">New Academic Session 2024</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Forms */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background"
      >
        <div className="w-full max-w-md">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden p-1">
              <img 
                src="/spi-logo.png" 
                alt="SPI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sirajganj Polytechnic</h2>
              <p className="text-xs text-muted-foreground">Institute</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-secondary rounded-xl p-1 mb-8">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMode(tab)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 relative ${
                  mode === tab
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 gradient-primary rounded-lg"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 capitalize">
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
              className="space-y-5"
            >
              {mode === 'signup' && (
                <>
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select Your Role
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {roleOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = selectedRole === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSelectedRole(option.value)}
                            className={cn(
                              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card hover:border-primary/50 hover:bg-secondary"
                            )}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="roleIndicator"
                                className="absolute inset-0 border-2 border-primary rounded-xl"
                                transition={{ type: "spring", duration: 0.4 }}
                              />
                            )}
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={cn(
                              "text-sm font-medium transition-colors",
                              isSelected ? "text-primary" : "text-foreground"
                            )}>
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {roleOptions.find(r => r.value === selectedRole)?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        className="pl-11"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {mode === 'login' && (
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-sm font-medium">
                    ID or Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="SPI-2024-XXXX or email"
                      className="pl-11"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-sm font-medium">
                      Mobile Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        className="pl-11"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        className="pl-11"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Teacher-specific fields */}
                  {selectedRole === 'teacher' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fullNameBangla" className="text-sm font-medium">
                          Full Name (Bangla) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="fullNameBangla"
                            type="text"
                            placeholder="আপনার পূর্ণ নাম"
                            className="pl-11"
                            value={formData.fullNameBangla}
                            onChange={(e) => setFormData({ ...formData, fullNameBangla: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="designation" className="text-sm font-medium">
                          Designation <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="designation"
                            type="text"
                            placeholder="e.g., Assistant Professor, Lecturer"
                            className="pl-11"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department" className="text-sm font-medium">
                          Department <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                          <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ ...formData, department: value })}
                            required
                          >
                            <SelectTrigger className="pl-11">
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

                      <div className="space-y-2">
                        <Label htmlFor="qualifications" className="text-sm font-medium">
                          Qualifications
                        </Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                              <Input
                                id="qualifications"
                                type="text"
                                placeholder="e.g., M.Sc. in Computer Science"
                                className="pl-11"
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
                            <div className="flex flex-wrap gap-2">
                              {formData.qualifications.map((qual, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
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
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specializations" className="text-sm font-medium">
                          Specializations
                        </Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="specializations"
                              type="text"
                              placeholder="e.g., Machine Learning, Database Systems"
                              value={specializationInput}
                              onChange={(e) => setSpecializationInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && specializationInput.trim()) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    specializations: [...formData.specializations, specializationInput.trim()],
                                  });
                                  setSpecializationInput('');
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (specializationInput.trim()) {
                                  setFormData({
                                    ...formData,
                                    specializations: [...formData.specializations, specializationInput.trim()],
                                  });
                                  setSpecializationInput('');
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          {formData.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {formData.specializations.map((spec, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
                                >
                                  {spec}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        specializations: formData.specializations.filter((_, i) => i !== index),
                                      });
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="officeLocation" className="text-sm font-medium">
                          Office Location
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="officeLocation"
                            type="text"
                            placeholder="e.g., Room 201, Building A"
                            className="pl-11"
                            value={formData.officeLocation}
                            onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-11 pr-11"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me for 1 week
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
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
        </div>
      </motion.div>
    </div>
  );
}
