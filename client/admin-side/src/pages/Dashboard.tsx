import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Award, GraduationCap, Inbox, AlertCircle, Plus } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { DepartmentChart } from '@/components/dashboard/DepartmentChart';
import { AdmissionChart } from '@/components/dashboard/AdmissionChart';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { PendingSignupRequests } from '@/components/dashboard/PendingSignupRequests';
import { dashboardService, type DashboardStats } from '@/services/dashboardService';
import { getErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-80 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface p-5 h-[112px] animate-pulse" />
          ))}
        </div>
        <div className="surface p-5 h-28 animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">Couldn't load the dashboard</h3>
                <p className="text-sm text-muted-foreground mb-4">{error || 'Failed to load dashboard data'}</p>
              </div>
              <Button onClick={fetchDashboardStats}>Try again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build KPI data from stats
  const kpiData = [
    {
      title: 'Total Students',
      value: stats.students.total,
      trend: { value: 0, isPositive: true },
      icon: Users,
      gradient: 'primary' as const,
    },
    {
      title: 'Active Students',
      value: stats.students.active,
      trend: { value: 0, isPositive: true },
      icon: UserCheck,
      gradient: 'success' as const,
    },
    {
      title: 'Discontinued Students',
      value: stats.students.discontinued,
      trend: { value: 0, isPositive: false },
      icon: UserX,
      gradient: 'warning' as const,
    },
    {
      title: 'Alumni',
      value: stats.alumni.total,
      trend: { value: 0, isPositive: true },
      icon: Award,
      gradient: 'info' as const,
    },
    {
      title: 'Pending Admissions',
      value: stats.admissions.pending,
      trend: { value: 0, isPositive: true },
      icon: GraduationCap,
      gradient: 'accent' as const,
    },
    {
      title: 'Total Applications',
      value: stats.applications.total,
      trend: { value: 0, isPositive: true },
      icon: Inbox,
      gradient: 'primary' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Welcome back, {user?.last_name || user?.first_name || 'Admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening at Sirajganj Polytechnic Institute today.
          </p>
        </div>
        <Button asChild className="shrink-0 hidden sm:inline-flex">
          <Link to="/add-student">
            <Plus className="w-4 h-4 mr-1.5" />
            Add student
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi, index) => (
          <KPICard
            key={kpi.title}
            {...kpi}
            delay={index * 0.05}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Pending Signup Requests */}
      <PendingSignupRequests />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentChart />
        <AdmissionChart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceChart />
        <PerformanceChart />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
