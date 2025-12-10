import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Award, GraduationCap, Inbox, Loader2, AlertCircle } from 'lucide-react';
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

export default function Dashboard() {
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
                <p className="text-muted-foreground mb-4">{error || 'Failed to load dashboard data'}</p>
              </div>
              <Button onClick={fetchDashboardStats} className="gradient-primary text-primary-foreground">
                Try Again
              </Button>
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Welcome back, <span className="gradient-text">Admin</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening at Sirajganj Polytechnic Institute today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi, index) => (
          <KPICard
            key={kpi.title}
            {...kpi}
            delay={index * 0.1}
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
