import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function WelcomeCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl gradient-hero p-6 md:p-8 text-primary-foreground"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">{getGreeting()}</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-3xl font-display font-bold mb-2"
            >
              Welcome back, {user?.name?.split(' ')[0]}!
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-primary-foreground/80 max-w-md"
            >
              Track your academic progress, manage your profile, and stay updated with the latest notices.
            </motion.p>
          </div>

          {user?.admissionStatus === 'pending' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/dashboard/admission')}
                className="group"
              >
                Complete Admission
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Student ID Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 inline-flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-xl rounded-full px-4 py-2"
        >
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <p className="text-xs opacity-80">Student ID</p>
            <p className="text-sm font-semibold">{user?.studentId}</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
