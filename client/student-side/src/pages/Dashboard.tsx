import { useState, useEffect } from 'react';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { NoticeBoard } from '@/components/dashboard/NoticeBoard';
import { motion } from 'framer-motion';
import { BarChart3, Users, BookOpen, Award, Loader2, AlertCircle } from 'lucide-react';
import { dashboardService, type StudentDashboardData, type TeacherDashboardData } from '@/services/dashboardService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user needs to complete admission
  useEffect(() => {
    if (!authLoading && user) {
      // Redirect to admission if user is student/captain and hasn't completed admission
      if (
        (user.role === 'student' || user.role === 'captain') &&
        (user.admissionStatus === 'not_started' || user.admissionStatus === 'pending')
      ) {
        navigate('admission'); // Relative path within /dashboard
        return;
      }
    }
  }, [authLoading, user, navigate]);

  const fetchDashboardData = async () => {
    if (!user?.relatedProfileId) {
      // For teachers, relatedProfileId might not be set immediately after approval
      if (user?.role === 'teacher') {
        setError('Teacher profile not found. Please contact administrator.');
      } else {
        setError('User not authenticated or student profile not found');
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch appropriate dashboard data based on user role
      if (user.role === 'teacher') {
        const data = await dashboardService.getTeacherStats(user.relatedProfileId);
        setDashboardData(data);
      } else {
        const data = await dashboardService.getStudentStats(user.relatedProfileId);
        setDashboardData(data);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error('Dashboard fetch error:', err);
      setError(errorMsg);

      // Don't show toast on initial load, only on retry
      if (dashboardData) {
        toast.error('Failed to load dashboard', {
          description: errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.relatedProfileId) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setError('User not authenticated');
      setLoading(false);
    } else if (!authLoading && user && !user.relatedProfileId) {
      if (user.role === 'teacher') {
        setError('Teacher profile not found. Please contact administrator.');
      } else {
        setError('Student profile not found. Please complete your admission.');
      }
      setLoading(false);
    }
  }, [authLoading, user?.relatedProfileId, user?.role]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Dashboard</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No dashboard data available</p>
        </div>
      </div>
    );
  }

  // Generate stats based on user role
  const stats = user?.role === 'teacher' && 'teacher' in (dashboardData || {})
    ? [
        {
          icon: BookOpen,
          label: 'Assigned Classes',
          value: (dashboardData as TeacherDashboardData).assignedClasses?.total?.toString() || '0',
          color: 'from-violet-500 to-purple-600',
        },
        {
          icon: Users,
          label: 'Students',
          value: (dashboardData as TeacherDashboardData).students?.total?.toString() || '0',
          color: 'from-emerald-500 to-teal-600',
        },
        {
          icon: Award,
          label: 'Departments',
          value: (dashboardData as TeacherDashboardData).assignedClasses?.departments?.length?.toString() || '0',
          color: 'from-orange-500 to-amber-600',
        },
        {
          icon: BarChart3,
          label: 'Semesters',
          value: (dashboardData as TeacherDashboardData).assignedClasses?.semesters?.length?.toString() || '0',
          color: 'from-pink-500 to-rose-600',
        },
      ]
    : [
        {
          icon: BookOpen,
          label: 'Classes',
          value: (dashboardData as StudentDashboardData)?.routine?.totalClasses?.toString() || '0',
          color: 'from-violet-500 to-purple-600',
        },
        {
          icon: BarChart3,
          label: 'Attendance',
          value: `${(dashboardData as StudentDashboardData)?.attendance?.percentage || 0}%`,
          color: 'from-emerald-500 to-teal-600',
        },
        {
          icon: Award,
          label: 'Applications',
          value: (dashboardData as StudentDashboardData)?.applications?.pending?.toString() || '0',
          color: 'from-orange-500 to-amber-600',
        },
        {
          icon: Users,
          label: 'Semester',
          value: (dashboardData as StudentDashboardData)?.student?.semester?.toString() || '0',
          color: 'from-pink-500 to-rose-600',
        },
      ];

  return (
    <div className="space-y-4 md:space-y-6">
      <WelcomeCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-2 md:p-3 lg:p-4 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
              <div
                className={`w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-md md:rounded-lg lg:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}
              >
                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-base md:text-lg lg:text-2xl font-bold truncate">
                  {stat.value}
                </p>
                <p className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <QuickActions />
          <StatusCard />
        </div>
        <div>
          <NoticeBoard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
