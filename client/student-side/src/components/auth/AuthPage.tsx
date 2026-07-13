import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap,
  BookOpen, BarChart3, Building2, Briefcase, Award,
  MapPin, ChevronLeft, Globe, ChevronDown, Lightbulb, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { departmentService, type Department } from '@/services/departmentService';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { requestGoogleAccessToken, isGoogleSignInEnabled, GoogleSignInCancelled } from '@/services/googleAuth';

// Sentinel value for the "No department" option in the teacher signup form.
// (Radix Select cannot use an empty-string value.)
const NO_DEPARTMENT = 'none';

/** Pull a readable message out of a DRF validation error object. */
function firstValidationError(err: any): string {
  if (err && typeof err === 'object') {
    // DRF field errors: { field: ["msg"], ... } or { error, detail }
    for (const key of Object.keys(err)) {
      if (key === 'status_code') continue;
      const val = (err as any)[key];
      if (Array.isArray(val) && val.length) return String(val[0]);
      if (typeof val === 'string' && val) return val;
    }
  }
  return getErrorMessage(err);
}

type AuthMode = 'login' | 'signup';
type MobileView = 'splash' | 'form';

// Only two top-level account types are picked directly. A Student can then
// additionally mark themselves as a Class Captain or an Alumnus via the
// mutually-exclusive checkboxes shown under the selector.
const roleOptions: { value: UserRole; label: string; icon: React.ElementType }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'teacher', label: 'Teacher', icon: BookOpen },
];

// A student-family role is anything selected while the "Student" tile is active.
const isStudentFamily = (role: UserRole) => role === 'student' || role === 'captain' || role === 'alumni';

const splideSlides = [
  {
    title: 'Everything at Your Fingertips',
    desc: 'Stay updated with class schedules, assignments, announcements, and important notificationsâ€”all in one place.',
    image: '/student-illustration.png',
    bg: '#ffffff',
  },
  {
    title: 'Learn. Practice. Succeed.',
    desc: 'Access study materials, track your academic progress, and improve your performance every day.',
    image: '/student-illustration2.png',
    bg: '#ffffff',
  },
  {
    title: 'Your Journey Starts Here',
    desc: 'Build your skills, achieve your goals, and move confidently toward a successful academic future.',
    image: '/student-illustration3.png',
    bg: '#f7fdfa',
  },
];

/** Background images for the desktop login page slider */
const bgImages = ['/cover-image.jpg', '/cover-image1.jpg'];

/* â”€â”€â”€ Desktop background slider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BackgroundSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bgImages.length);
    }, 5000); // slide every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.img
          key={current}
          src={bgImages[current]}
          alt="Campus background"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Blue tint overlay â€” reduced opacity so campus photos show through more */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(6,78,59,0.45) 0%, rgba(5,150,105,0.3) 45%, rgba(4,47,36,0.4) 100%)' }}
      />

      {/* Slide indicator dots â€” bottom-center */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {bgImages.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              'transition-all duration-400 rounded-full',
              i === current
                ? 'w-6 h-2.5 bg-white'
                : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60'
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* â”€â”€â”€ Google SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* â”€â”€â”€ Microsoft SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1"  width="10" height="10" fill="#7FBA00"/>
      <rect x="1"  y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

/* â”€â”€â”€ SPI Logo header (mobile login/signup header) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function HexCapLogo() {
  return (
    <div className="flex flex-col items-center mb-4 gap-2">
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 flex items-center justify-center p-1.5">
        <img
          src="/spi-logo.png"
          alt="SPI Logo"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE SPLASH SCREEN
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function MobileSplash({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % splideSlides.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      animate={{ backgroundColor: splideSlides[slide].bg }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >

      {/* â”€â”€ Top illustration area â€” fixed-size stage so it never resizes/jumps between slides â”€â”€ */}
      <div className="flex-[0.7] relative flex flex-col items-center justify-center px-6 pt-6 pb-3 overflow-hidden">
        <div
          className="relative flex items-center justify-center"
          style={{
            width: '100%',
            maxWidth: '320px',
            height: '260px',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center p-5"
            >
              <img
                src={splideSlides[slide].image}
                alt={splideSlides[slide].title}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* â”€â”€ Bottom content area â”€â”€ */}
      <motion.div
        className="px-8 pt-1 pb-8 flex flex-col items-center"
        animate={{ backgroundColor: splideSlides[slide].bg }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >

        {/* Slide text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32 }}
            className="text-center mb-4 w-full"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
              {splideSlides[slide].title}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed px-2">
              {splideSlides[slide].desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex items-center gap-2 mb-5">
          {splideSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                'transition-all duration-300 rounded-full',
                i === slide ? 'w-6 h-2.5 bg-emerald-600' : 'w-2.5 h-2.5 bg-emerald-100'
              )}
            />
          ))}
        </div>

        {/* Get Started button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          onClick={onStart}
          className="w-full rounded-2xl text-white font-semibold text-base mb-4"
          style={{
            background: 'linear-gradient(135deg,#10b981,#059669)',
            height: '52px',
            boxShadow: '0 6px 24px rgba(16,185,129,0.35)',
          }}
        >
          Get Started
        </motion.button>

        {/* Login link */}
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <button
            onClick={onLogin}
            className="text-emerald-600 font-semibold hover:underline"
          >
            Login
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE AUTH FORM  (login + signup)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function MobileAuthForm({
  mode, setMode, onBack,
  formData, setFormData,
  showPassword, setShowPassword,
  rememberMe, setRememberMe,
  isLoading, handleSubmit,
  selectedRole, setSelectedRole,
  departments,
  qualificationInput, setQualificationInput,
  navigate,
  onGoogleSignIn, googleLoading, googleVerified,
}: {
  mode: AuthMode; setMode: (m: AuthMode) => void; onBack: () => void;
  formData: any; setFormData: (d: any) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  rememberMe: boolean; setRememberMe: (v: boolean) => void;
  isLoading: boolean; handleSubmit: (e: React.FormEvent) => void;
  selectedRole: UserRole; setSelectedRole: (r: UserRole) => void;
  departments: Department[];
  qualificationInput: string; setQualificationInput: (v: string) => void;
  navigate: (path: string) => void;
  onGoogleSignIn: () => void; googleLoading: boolean; googleVerified: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f6faf8' }}>

      {/* â”€â”€ Header card: dot-grid texture + logo, gives the screen a "student ID card" identity â”€â”€ */}
      <div className="relative overflow-hidden pt-10 pb-7 px-6"
        style={{ background: 'linear-gradient(160deg,#eafaf2 0%,#f6faf8 100%)' }}>

        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.5]"
          style={{
            backgroundImage: 'radial-gradient(circle, #bfe8d4 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)',
          }} />

        {/* Amber accent blob â€” small, top-right, echoes the splash screen's "Keep Learning" star */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 70%)' }} />

        {/* Back button */}
        <button type="button" onClick={onBack}
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative z-10">
          <HexCapLogo />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8 relative z-10 rounded-t-[28px] -mt-3 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.04)]">

        {/* Tab bar â€” connected pill track */}
        <div className="flex mb-6 bg-gray-100 rounded-2xl p-1 relative">
          {(['login', 'signup'] as const).map((tab) => (
            <button key={tab} onClick={() => setMode(tab)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative z-10',
                mode === tab ? 'text-emerald-600' : 'text-gray-400'
              )}>
              {tab === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
          <motion.div
            className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm"
            style={{ width: 'calc(50% - 4px)' }}
            animate={{ left: mode === 'login' ? '4px' : 'calc(50% + 0px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
            transition={{ duration: 0.3 }}>

            {/* Login header */}
            {mode === 'login' && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back! </h2>
                <p className="text-sm text-gray-400 mt-1">Log in to pick up where you left off</p>
              </div>
            )}

            {/* Signup header */}
            {mode === 'signup' && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="text-sm text-gray-400 mt-1">Join your classmates on the portal</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* â”€â”€ SIGNUP FIELDS â”€â”€ */}
              {mode === 'signup' && (
                <>
                  <Label className="text-xs font-semibold text-gray-500 -mb-1 block">I am a...</Label>
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    {roleOptions.map((opt) => {
                      const Icon = opt.icon;
                      const sel = opt.value === 'student' ? isStudentFamily(selectedRole) : selectedRole === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => setSelectedRole(opt.value)}
                          className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all',
                            sel ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white')}>
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            sel ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400')}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={cn('text-xs font-medium', sel ? 'text-amber-700' : 'text-gray-500')}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Student sub-type: captain / alumni (mutually exclusive) */}
                  {isStudentFamily(selectedRole) && (
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                          checked={selectedRole === 'captain'}
                          onChange={(e) => setSelectedRole(e.target.checked ? 'captain' : 'student')} />
                        <span className="text-sm text-gray-700">I am a <span className="font-semibold">Class Captain</span></span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                          checked={selectedRole === 'alumni'}
                          onChange={(e) => setSelectedRole(e.target.checked ? 'alumni' : 'student')} />
                        <span className="text-sm text-gray-700">I am an <span className="font-semibold">Alumnus</span> <span className="text-gray-400">(already graduated)</span></span>
                      </label>
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Full Name" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                      value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                  </div>

                  {/* Mobile */}
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="tel" placeholder="Mobile Number" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                      value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} required />
                  </div>

                  {/* SSC Roll */}
                  {(selectedRole === 'student' || selectedRole === 'captain') && (
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="SSC Board Roll" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                        value={formData.sscBoardRoll} onChange={(e) => setFormData({ ...formData, sscBoardRoll: e.target.value })} required />
                    </div>
                  )}

                  {/* Captain: department + shift (routes the request to the right Department Head) */}
                  {selectedRole === 'captain' && (
                    <>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                          <SelectTrigger className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400">
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative">
                        <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Select value={formData.shift} onValueChange={(v) => setFormData({ ...formData, shift: v })}>
                          <SelectTrigger className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400">
                            <SelectValue placeholder="Select your shift" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Morning">1st Shift (Morning)</SelectItem>
                            <SelectItem value="Day">2nd Shift (Day)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-gray-400 -mt-1 px-1">
                        Your captain request will be sent to your Department Head for approval.
                      </p>
                    </>
                  )}

                  {/* Email â€” locked & pre-filled when verified via Google */}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="email" placeholder="Email Address"
                      className={cn('pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400',
                        googleVerified && 'pr-11 bg-emerald-50/60 border-emerald-200 text-gray-600')}
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required readOnly={googleVerified} />
                    {googleVerified && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Google</span>
                    )}
                  </div>
                  {googleVerified && (
                    <p className="text-[11px] text-emerald-600 -mt-1.5 px-1">Email verified with Google â€” no code needed. Just finish the rest below.</p>
                  )}

                  {/* Teacher fields */}
                  {selectedRole === 'teacher' && (
                    <>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Full Name (Bangla)" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                          value={formData.fullNameBangla} onChange={(e) => setFormData({ ...formData, fullNameBangla: e.target.value })} required />
                      </div>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Designation" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                          value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} required />
                      </div>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                          <SelectTrigger className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400">
                            <SelectValue placeholder="Select department (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_DEPARTMENT}>No department / General</SelectItem>
                            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input placeholder="Qualification (press Enter)" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                            value={qualificationInput} onChange={(e) => setQualificationInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && qualificationInput.trim()) { e.preventDefault(); setFormData({ ...formData, qualifications: [...formData.qualifications, qualificationInput.trim()] }); setQualificationInput(''); }}} />
                        </div>
                        <Button type="button" variant="outline" className="h-12 px-3 rounded-xl"
                          onClick={() => { if (qualificationInput.trim()) { setFormData({ ...formData, qualifications: [...formData.qualifications, qualificationInput.trim()] }); setQualificationInput(''); }}}>Add</Button>
                      </div>
                      {formData.qualifications.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {formData.qualifications.map((q: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs">
                              {q}<button type="button" onClick={() => setFormData({ ...formData, qualifications: formData.qualifications.filter((_: string, idx: number) => idx !== i) })} className="hover:text-red-500">Ã—</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Office Location" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                          value={formData.officeLocation} onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })} />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* â”€â”€ LOGIN FIELDS â”€â”€ */}
              {mode === 'login' && (
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Email Address" className="pl-11 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                    value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required />
                </div>
              )}

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type={showPassword ? 'text' : 'password'} placeholder="Password"
                  className="pl-11 pr-12 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white focus:border-emerald-400 transition-colors text-gray-900 placeholder:text-gray-400"
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember / Forgot */}
              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox id="mob-remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v as boolean)}
                      className="rounded data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                    <span className="text-xs text-gray-500">Remember me</span>
                  </label>
                  <button type="button" onClick={() => navigate('/password-reset')}
                    className="text-xs font-semibold text-emerald-600">Forgot Password?</button>
                </div>
              )}

              {/* Submit */}
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button type="submit" disabled={isLoading}
                  className="w-full rounded-2xl font-semibold text-base shadow-lg shadow-emerald-500/25 gap-2"
                  style={{ background: 'linear-gradient(135deg,#059669,#047857)', height: '52px' }}>
                  {isLoading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    : <><Lock className="w-4 h-4" />{mode === 'login' ? 'Login' : 'Create Account'}</>}
                </Button>
              </motion.div>

              {/* Social â€” available on both login & signup; hidden once a Google
                  signup is already in progress. */}
              {!googleVerified && (
                <>
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or continue with</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={onGoogleSignIn} disabled={googleLoading}
                      className="h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60">
                      {googleLoading
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full" />
                        : <GoogleIcon />}
                    </button>
                    <button type="button"
                      className="h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                      <MicrosoftIcon />
                    </button>
                  </div>
                </>
              )}

              {/* Switch mode */}
              <p className="text-center text-sm text-gray-500 pt-1">
                {mode === 'login'
                  ? <> Don't have an account?{' '}<button type="button" onClick={() => setMode('signup')} className="text-emerald-600 font-semibold">Sign Up</button></>
                  : <> Already have an account?{' '}<button type="button" onClick={() => setMode('login')} className="text-emerald-600 font-semibold">Login</button></>}
              </p>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN EXPORT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [mobileView, setMobileView] = useState<MobileView>('splash');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [rememberMe, setRememberMe] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [qualificationInput, setQualificationInput] = useState('');
  const { login, requestSignupOtp, signup, googleAuth } = useAuth();
  const navigate = useNavigate();

  // Sign-up email-verification (OTP) step
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<any>(null);
  const [otpError, setOtpError] = useState<string | undefined>();

  // "Continue with Google": once a new Google email is verified we pre-fill the
  // signup form, lock the email, and keep the token so the final /register/ call
  // can skip the OTP step entirely.
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const googleVerified = !!googleToken;

  const [formData, setFormData] = useState({
    studentId: '', email: '', password: '', fullName: '',
    mobile: '', sscBoardRoll: '', fullNameBangla: '',
    designation: '', department: '', shift: '',
    qualifications: [] as string[],
    specializations: [] as string[],
    officeLocation: '',
  });

  useEffect(() => {
    // Teachers and captains both pick a department at signup (captains also
    // pick a shift so the request reaches the right Department Head).
    if ((selectedRole === 'teacher' || selectedRole === 'captain') && mode === 'signup') {
      departmentService.getAll().then(setDepartments).catch(() => {});
    }
  }, [selectedRole, mode]);

  // Assemble the signup payload from the current form state.
  const buildSignupData = () => {
    const signupData: any = {
      fullName: formData.fullName, email: formData.email,
      mobile: formData.mobile, password: formData.password, role: selectedRole,
    };
    if (selectedRole === 'student' || selectedRole === 'captain') signupData.sscBoardRoll = formData.sscBoardRoll;
    if (selectedRole === 'captain') {
      signupData.department = formData.department;
      signupData.shift = formData.shift;
    }
    if (selectedRole === 'teacher') {
      signupData.fullNameBangla = formData.fullNameBangla;
      signupData.designation = formData.designation;
      signupData.department = formData.department; // '' or 'none' => No department
      signupData.qualifications = formData.qualifications;
      signupData.specializations = formData.specializations;
      signupData.officeLocation = formData.officeLocation;
    }
    return signupData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(formData.email || formData.studentId, formData.password, rememberMe);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        // Captains must pick a department + shift so the request can be routed.
        if (selectedRole === 'captain' && (!formData.department || !formData.shift)) {
          toast.error('Please select your department and shift so your captain request reaches the right Department Head.');
          setIsLoading(false);
          return;
        }
        const signupData = buildSignupData();

        // Google-verified signup: the email is already proven by Google, so we
        // skip the OTP step and create the account directly with the token.
        if (googleVerified && googleToken) {
          await signup(signupData, undefined, googleToken);
          afterSignup(signupData);
          return;
        }

        // Step 1 of sign-up: validate + send the email verification code.
        await requestSignupOtp(signupData);
        setPendingSignup(signupData);
        setOtpError(undefined);
        setShowOtpStep(true);
        toast.success('Verification code sent to your email');
      }
    } catch (err) {
      if (mode === 'login') {
        toast.error('Invalid credentials. Please try again.');
      } else {
        toast.error(firstValidationError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Shared post-account-creation handling (used by both the OTP and Google
  // signup paths): show the right message and route the new user.
  const afterSignup = (data: any) => {
    setGoogleToken(null);
    if (data?.role === 'teacher') {
      toast.success('Registration submitted! Please wait for admin approval.');
      setShowOtpStep(false);
      setPendingSignup(null);
      setMode('login');
      setMobileView('form');
    } else if (data?.role === 'captain') {
      toast.success('Account created! Your captain request was sent to your Department Head â€” you can use the portal as a student until it is approved.');
      navigate('/dashboard');
    } else {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    }
  };

  // Step 2 of sign-up: verify the OTP and create the account.
  const handleVerifyOtp = async (otp: string) => {
    setIsLoading(true);
    setOtpError(undefined);
    try {
      await signup(pendingSignup, otp);
      afterSignup(pendingSignup);
    } catch (err) {
      const msg = firstValidationError(err);
      setOtpError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // "Continue with Google": either logs an existing user straight in, or opens
  // the signup form pre-filled with the verified Google email + name.
  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    if (!isGoogleSignInEnabled()) {
      toast.info('Google sign-in is not set up yet. Please use email sign-up for now.');
      return;
    }
    setGoogleLoading(true);
    try {
      const token = await requestGoogleAccessToken();
      const result = await googleAuth(token);

      if (!result.needsSignup) {
        toast.success('Welcome back!');
        navigate('/dashboard');
        return;
      }

      // New email â€” hand off to the signup form. The email is verified by
      // Google, so it is locked and the OTP step is skipped on submit.
      setGoogleToken(token);
      setSelectedRole('student');
      setFormData((prev: any) => ({
        ...prev,
        email: result.email || '',
        studentId: result.email || '',
        fullName: result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim(),
      }));
      setMode('signup');
      setMobileView('form');
      toast.info('Almost there â€” please complete your details to finish signing up.');
    } catch (err: any) {
      if (err instanceof GoogleSignInCancelled) return; // user closed the popup
      toast.error(firstValidationError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingSignup) return;
    await requestSignupOtp(pendingSignup);
  };

  const sharedFormProps = {
    mode, setMode,
    onBack: () => setMobileView('splash'),
    formData, setFormData,
    showPassword, setShowPassword,
    rememberMe, setRememberMe,
    isLoading, handleSubmit,
    selectedRole, setSelectedRole,
    departments,
    qualificationInput, setQualificationInput,
    navigate,
    onGoogleSignIn: handleGoogleSignIn,
    googleLoading,
    googleVerified,
  };

  return (
    <>
      {/* â•â•â•â•â•â•â•â•â•â• SIGN-UP EMAIL VERIFICATION (OTP) â€” overlay â•â•â•â•â•â•â•â•â•â• */}
      <AnimatePresence>
        {showOtpStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl"
            >
              <OTPVerificationForm
                email={pendingSignup?.email || ''}
                onSubmit={handleVerifyOtp}
                onBack={() => { setShowOtpStep(false); setOtpError(undefined); }}
                onResend={handleResendOtp}
                loading={isLoading}
                error={otpError}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â•â•â•â•â•â•â•â•â•â• MOBILE  (< lg) â•â•â•â•â•â•â•â•â•â• */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {mobileView === 'splash' ? (
            <motion.div key="splash"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35 }}>
              <MobileSplash
                onStart={() => { setMode('signup'); setMobileView('form'); }}
                onLogin={() => { setMode('login'); setMobileView('form'); }}
              />
            </motion.div>
          ) : (
            <motion.div key="form"
              initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.35 }}>
              <MobileAuthForm {...sharedFormProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â• DESKTOP (lg+) â•â•â•â•â•â•â•â•â•â• */}
      <div className="hidden lg:flex min-h-screen relative flex-col items-center justify-center overflow-hidden">

        {/* Background slider â€” cycles through campus photos */}
        <BackgroundSlider />

        {/* Floating dot/shape decorations â€” faint, don't compete with the photo */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div className="absolute top-[8%] left-[12%] w-2 h-2 rounded-full bg-white/40" />
          <div className="absolute top-[20%] right-[18%] w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="absolute top-[15%] right-[8%] w-1.5 h-1.5 rounded-full bg-amber-300/60" />
          <div className="absolute bottom-[22%] left-[8%] w-2 h-2 rounded-full bg-white/30" />
          <div className="absolute bottom-[15%] right-[20%] w-2 h-2 rounded-full bg-amber-300/50" />
          <div className="absolute top-1/2 left-[6%] w-7 h-7 rounded-full border border-white/30" />
          <div className="absolute top-[18%] right-1/3 w-5 h-5 rounded-full border border-amber-300/40" />
        </div>

        {/* â”€â”€ Top-left: brand wordmark â”€â”€ */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-lg border border-white/40 flex items-center justify-center p-1.5">
            <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Student Portal</p>
            <p className="text-emerald-100/80 text-xs leading-tight">Learn. Grow. Achieve.</p>
          </div>
        </div>

        {/* â”€â”€ Top-right: language pill (static placeholder until i18n is wired up) â”€â”€ */}
        <button type="button"
          className="absolute top-6 right-6 z-20 flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-white/25 transition-colors">
          <Globe className="w-4 h-4" />
          EN
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

        {/* â”€â”€ Bottom-left: quote badge â”€â”€ */}
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

        {/* â”€â”€ Bottom-right: "Keep Learning" badge â€” echoes splash slide 3 copy â”€â”€ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="absolute bottom-7 right-7 z-20 hidden xl:flex items-center gap-3 bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3.5">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/80 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-snug">Keep Learning,</p>
            <p className="text-white text-sm font-semibold leading-snug">Keep Growing</p>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-300 ml-1" />
        </motion.div>

        {/* â”€â”€ Center: frosted glass auth card â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[480px] mx-6 rounded-[28px] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 24px 70px rgba(6,45,34,0.35)',
          }}
        >
          <div className="max-h-[88vh] overflow-y-auto px-9 pt-9 pb-8">

            {/* Logo + heading â€” login only */}
            {mode === 'login' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 flex items-center justify-center p-1.5">
                    <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Welcome Back! </h2>
                  <p className="text-sm text-gray-500 mt-1.5">Log in to continue your learning journey</p>
                </div>
              </>
            )}

            {/* Heading â€” signup only */}
            {mode === 'signup' && (
              <div className="text-center mb-6 pt-2">
                <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="text-sm text-gray-500 mt-1.5">Join your classmates on the portal</p>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex border-b border-gray-100 mb-6">
              {(['login', 'signup'] as const).map((tab) => (
                <button key={tab} onClick={() => setMode(tab)}
                  className={cn('flex-1 pb-3 text-base font-semibold transition-all duration-300 relative',
                    mode === tab ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600')}>
                  {tab === 'login' ? 'Login' : 'Sign Up'}
                  {mode === tab && (
                    <motion.div layoutId="desktopTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={mode}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* â”€â”€ SIGNUP FIELDS â”€â”€ */}
                  {mode === 'signup' && (
                    <>
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-2 block">Select Your Role</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {roleOptions.map((opt) => {
                            const Icon = opt.icon;
                            const sel = opt.value === 'student' ? isStudentFamily(selectedRole) : selectedRole === opt.value;
                            return (
                              <button key={opt.value} type="button" onClick={() => setSelectedRole(opt.value)}
                                className={cn('flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200',
                                  sel ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-200')}>
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                                  sel ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500')}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className={cn('text-xs font-medium', sel ? 'text-amber-700' : 'text-gray-600')}>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Student sub-type: captain / alumni (mutually exclusive) */}
                        {isStudentFamily(selectedRole) && (
                          <div className="mt-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                                checked={selectedRole === 'captain'}
                                onChange={(e) => setSelectedRole(e.target.checked ? 'captain' : 'student')} />
                              <span className="text-sm text-gray-700">I am a <span className="font-semibold">Class Captain</span></span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                                checked={selectedRole === 'alumni'}
                                onChange={(e) => setSelectedRole(e.target.checked ? 'alumni' : 'student')} />
                              <span className="text-sm text-gray-700">I am an <span className="font-semibold">Alumnus</span> <span className="text-gray-400">(already graduated)</span></span>
                            </label>
                          </div>
                        )}
                      </div>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Full Name</Label>
                        <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input placeholder="Enter your full name" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                            value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required /></div></div>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Mobile Number</Label>
                        <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input type="tel" placeholder="01XXXXXXXXX" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                            value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} required /></div></div>
                      {(selectedRole === 'student' || selectedRole === 'captain') && (
                        <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">SSC Board Roll <span className="text-red-500">*</span></Label>
                          <div className="relative"><GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input placeholder="e.g., 679377" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                              value={formData.sscBoardRoll} onChange={(e) => setFormData({ ...formData, sscBoardRoll: e.target.value })} required /></div>
                          <p className="text-xs text-gray-400 mt-1">Student ID will be: SIPI-{formData.sscBoardRoll || 'XXXXXX'}</p></div>
                      )}
                      {/* Captain: department + shift (routes the request to the right Department Head) */}
                      {selectedRole === 'captain' && (
                        <>
                          <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Department <span className="text-red-500">*</span></Label>
                            <div className="relative"><Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                                <SelectTrigger className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"><SelectValue placeholder="Select your department" /></SelectTrigger>
                                <SelectContent>
                                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                              </Select></div></div>
                          <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Shift <span className="text-red-500">*</span></Label>
                            <div className="relative"><BarChart3 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                              <Select value={formData.shift} onValueChange={(v) => setFormData({ ...formData, shift: v })}>
                                <SelectTrigger className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"><SelectValue placeholder="Select your shift" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Morning">1st Shift (Morning)</SelectItem>
                                  <SelectItem value="Day">2nd Shift (Day)</SelectItem>
                                </SelectContent>
                              </Select></div>
                            <p className="text-xs text-gray-400 mt-1">Your captain request will be sent to your Department Head for approval.</p></div>
                        </>
                      )}
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                          Email Address
                          {googleVerified && <span className="ml-2 text-emerald-600 font-medium">âœ“ Verified with Google</span>}
                        </Label>
                        <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input type="email" placeholder="your.email@example.com"
                            className={cn('pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400',
                              googleVerified && 'bg-emerald-50/60 border-emerald-200 text-gray-600')}
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required readOnly={googleVerified} /></div>
                        {googleVerified && <p className="text-xs text-emerald-600 mt-1">No verification code needed â€” just complete the remaining fields.</p>}
                      </div>
                    </>
                  )}

                  {/* â”€â”€ TEACHER FIELDS (desktop) â”€â”€ */}
                  {mode === 'signup' && selectedRole === 'teacher' && (
                    <>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Full Name (Bangla) <span className="text-red-500">*</span></Label>
                        <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input placeholder="à¦†à¦ªà¦¨à¦¾à¦° à¦ªà§‚à¦°à§à¦£ à¦¨à¦¾à¦®" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                            value={formData.fullNameBangla} onChange={(e) => setFormData({ ...formData, fullNameBangla: e.target.value })} required /></div></div>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Designation <span className="text-red-500">*</span></Label>
                        <div className="relative"><Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input placeholder="e.g., Assistant Professor" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                            value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} required /></div></div>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Department <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <div className="relative"><Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                            <SelectTrigger className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"><SelectValue placeholder="Select department (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_DEPARTMENT}>No department / General</SelectItem>
                              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select></div></div>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Qualifications</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1"><Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input placeholder="e.g., M.Sc. in CS" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                              value={qualificationInput} onChange={(e) => setQualificationInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && qualificationInput.trim()) { e.preventDefault(); setFormData({ ...formData, qualifications: [...formData.qualifications, qualificationInput.trim()] }); setQualificationInput(''); }}} /></div>
                          <Button type="button" variant="outline" className="h-12 px-4 rounded-xl border-gray-200"
                            onClick={() => { if (qualificationInput.trim()) { setFormData({ ...formData, qualifications: [...formData.qualifications, qualificationInput.trim()] }); setQualificationInput(''); }}}>Add</Button>
                        </div>
                        {formData.qualifications.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {formData.qualifications.map((q: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs">
                                {q}<button type="button" onClick={() => setFormData({ ...formData, qualifications: formData.qualifications.filter((_: string, idx: number) => idx !== i) })} className="hover:text-red-500">Ã—</button>
                              </span>))}
                          </div>)}</div>
                      <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Office Location</Label>
                        <div className="relative"><MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input placeholder="e.g., Room 201, Building A" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                            value={formData.officeLocation} onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })} /></div></div>
                    </>
                  )}

                  {/* â”€â”€ LOGIN ID FIELD â”€â”€ */}
                  {mode === 'login' && (
                    <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email or Student ID</Label>
                      <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Enter your email or student ID" className="pl-10 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                          value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required /></div></div>
                  )}

                  {/* Password */}
                  <div><Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                        className="pl-10 pr-11 h-12 border-gray-200 focus:border-emerald-400 rounded-2xl bg-gray-50/60 focus:bg-white transition-colors text-gray-900 placeholder:text-gray-400"
                        value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div></div>

                  {/* Remember / Forgot */}
                  {mode === 'login' && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox id="desktop-remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v as boolean)}
                          className="rounded data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                        <span className="text-xs text-gray-500">Remember me</span>
                      </label>
                      <button type="button" onClick={() => navigate('/password-reset')}
                        className="text-xs font-semibold text-emerald-600 hover:underline">Forgot Password?</button>
                    </div>
                  )}

                  {/* Submit */}
                  <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}>
                    <Button type="submit" disabled={isLoading}
                      className="w-full rounded-2xl text-base font-semibold shadow-lg shadow-emerald-500/30 gap-2"
                      style={{ background: 'linear-gradient(135deg,#059669,#047857)', height: '52px' }}>
                      {isLoading
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        : <><Lock className="w-4 h-4" />{mode === 'login' ? 'Login' : 'Create Account'}</>}
                    </Button>
                  </motion.div>

                  {/* Social â€” available on both login & signup; hidden once a
                      Google signup is already in progress. */}
                  {!googleVerified && (
                    <>
                      <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">or continue with</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button type="button" whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}
                          onClick={handleGoogleSignIn} disabled={googleLoading}
                          className="h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center gap-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-60">
                          {googleLoading
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full" />
                            : <><GoogleIcon />Google</>}
                        </motion.button>
                        <motion.button type="button" whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}
                          className="h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center gap-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                          <MicrosoftIcon />Microsoft
                        </motion.button>
                      </div>
                    </>
                  )}

                  {/* Switch mode */}
                  <p className="text-center text-sm text-gray-500 pt-1">
                    {mode === 'login'
                      ? <> Don't have an account?{' '}<button type="button" onClick={() => setMode('signup')} className="text-emerald-600 font-semibold hover:underline">Sign Up</button></>
                      : <> Already have an account?{' '}<button type="button" onClick={() => setMode('login')} className="text-emerald-600 font-semibold hover:underline">Login</button></>}
                  </p>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        {/* â”€â”€ END center card â”€â”€ */}

        <p className="relative z-10 mt-6 text-xs text-white/70">Â© 2026 Student Portal. All rights reserved.</p>
      </div>
    </>
  );
}
