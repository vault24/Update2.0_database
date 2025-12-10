import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function StatusCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Don't show status card for teachers
  if (user?.role === 'teacher') {
    return null;
  }

  const statusConfig: Record<string, {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    progress: number;
  }> = {
    pending: {
      icon: Clock,
      title: 'Admission Pending',
      description: 'Complete your admission form to continue',
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      progress: 0,
    },
    submitted: {
      icon: AlertCircle,
      title: 'Under Review',
      description: 'Your application is being reviewed',
      color: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/30',
      progress: 50,
    },
    approved: {
      icon: CheckCircle,
      title: 'Admission Approved',
      description: 'Congratulations! Your admission is confirmed',
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/30',
      progress: 100,
    },
    rejected: {
      icon: XCircle,
      title: 'Application Rejected',
      description: 'Please contact the office for more details',
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      progress: 0,
    },
    not_started: {
      icon: Clock,
      title: 'Admission Not Started',
      description: 'Complete your admission form to continue',
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      progress: 0,
    },
  };

  const admissionStatus = user?.admissionStatus || 'pending';
  const status = statusConfig[admissionStatus] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`bg-card rounded-2xl border ${status.border} p-6 shadow-card`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${status.bg}`}>
          <StatusIcon className={`w-6 h-6 ${status.color}`} />
        </div>
        {user?.admissionStatus === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/admission')}
            className="group"
          >
            Complete Now
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-1">{status.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{status.description}</p>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{status.progress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${status.progress}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className={`h-full rounded-full ${
              status.progress === 100 ? 'bg-success' : 'gradient-primary'
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}
