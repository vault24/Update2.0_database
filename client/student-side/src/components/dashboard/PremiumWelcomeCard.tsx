import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  ArrowRight, 
  GraduationCap, 
  TrendingUp, 
  Clock,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface PremiumWelcomeCardProps {
  attendancePercentage?: number;
  semester?: number;
  department?: string;
}

export function PremiumWelcomeCard({ 
  attendancePercentage = 0, 
  semester = 1,
  department = 'Computer Science'
}: PremiumWelcomeCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMotivationalQuote = () => {
    const quotes = [
      "Every expert was once a beginner.",
      "Success is the sum of small efforts.",
      "Dream big, work hard, stay focused.",
      "Your only limit is your mind.",
      "Make today count!"
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return quotes[dayOfYear % quotes.length];
  };

  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 md:p-6 lg:p-8 text-white shadow-xl"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />

      <div className="relative z-10">
        {/* Top Row - Date and Time */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mb-3 md:mb-4"
        >
          <div className="flex items-center gap-1.5 md:gap-2 text-white/80">
            <CalendarDays className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium">{currentDate}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-white/80">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium">{format(new Date(), 'hh:mm a')}</span>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
          {/* Left Content */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm font-medium opacity-90">{getGreeting()}</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-1 md:mb-2"
            >
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/80 text-sm md:text-base max-w-md italic"
            >
              "{getMotivationalQuote()}"
            </motion.p>

            {/* Quick Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4"
            >
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 md:py-2">
                <GraduationCap className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">Semester {semester}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 md:py-2">
                <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">{attendancePercentage}% Attendance</span>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Profile Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center lg:flex-col gap-3 lg:gap-3"
          >
            {/* Profile Avatar */}
            <div className="relative">
              <div className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-bold shadow-xl ring-2 md:ring-4 ring-white/30">
                {user?.name?.charAt(0)}
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white/50"
              >
                <span className="text-[8px] md:text-[10px]">✓</span>
              </motion.div>
            </div>

            {/* Student ID Badge */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-2.5 text-center">
              <p className="text-[10px] md:text-xs opacity-70">Student ID</p>
              <p className="text-sm md:text-base font-bold tracking-wide">{user?.studentId || 'N/A'}</p>
              <p className="text-[9px] md:text-xs opacity-70">{department}</p>
            </div>

            {user?.admissionStatus === 'pending' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard/admission')}
                className="group bg-white text-indigo-600 hover:bg-white/90 font-semibold shadow-lg text-xs md:text-sm"
              >
                Complete Admission
                <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
