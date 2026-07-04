import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Footer } from '@/components/layout/Footer';
import { Search, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { noticeService } from '@/services/noticeService';
import { connectNotificationsSocket } from '@/lib/notificationsSocket';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClassNotifications } from '@/hooks/useTeacherClassNotifications';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { MaintenanceNoticeBanner } from '@/components/layout/MaintenanceNoticeBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProfileAvatar from '@/components/ProfileAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Teachers get class-start alerts (5 min before + at start) on every page.
  useTeacherClassNotifications();

  // Real-time badge updates over WebSocket (replaces 30s polling). Refresh once
  // on mount, then whenever the server pushes a notification or the socket
  // (re)connects — so nothing is missed while offline, without constant polling.
  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
    const socket = connectNotificationsSocket({
      onOpen: () => loadUnreadCount(),
      onCreated: () => loadUnreadCount(),
    });
    return () => socket.close();
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await noticeService.getUnreadCount();
      setUnreadCount(response.unread_count);
    } catch (err) {
      const statusCode =
        typeof err === 'object' && err !== null && 'status_code' in err
          ? (err as { status_code?: number }).status_code
          : undefined;
      if (statusCode === 401 || statusCode === 403) {
        setUnreadCount(0);
        return;
      }
      console.error('Error loading unread count:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'captain':
        return { label: 'Captain', color: 'bg-warning/15 text-warning-foreground' };
      case 'teacher':
        return { label: 'Teacher', color: 'bg-success/12 text-success' };
      case 'alumni':
        return { label: 'Alumni', color: 'bg-accent/15 text-accent-foreground' };
      default:
        return { label: 'Student', color: 'bg-primary/10 text-primary' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl md:px-6">
          {/* Search */}
          <div className="flex flex-1 items-center pl-12 lg:pl-0">
            <div className="relative hidden w-full max-w-md md:block">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search anything…"
                className="h-10 border-transparent bg-secondary/70 pl-10 shadow-none focus-visible:bg-background focus-visible:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notifications dropdown */}
            <NotificationBell unreadCount={unreadCount} onCountChange={loadUnreadCount} />

            <ThemeToggle />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-11 gap-2 rounded-xl px-1.5 sm:px-2">
                  <ProfileAvatar size="sm" />
                  <div className="hidden text-left lg:block">
                    <p className="max-w-[9rem] truncate text-sm font-semibold leading-tight">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">{roleBadge.label}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                {/* Profile Header */}
                <div className="mb-1 flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-3">
                  <ProfileAvatar size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user?.name || 'User'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.studentId || user?.email}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${roleBadge.color}`}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                </div>

                <DropdownMenuItem
                  onClick={() => {
                    if (user?.isAlumni) {
                      navigate('/dashboard/alumni-profile');
                    } else {
                      navigate('/dashboard/profile');
                    }
                  }}
                  className="cursor-pointer rounded-lg py-2"
                >
                  <User className="mr-2 h-4 w-4" />
                  {user?.isAlumni ? 'Alumni Profile' : 'View Profile'}
                </DropdownMenuItem>

                {user?.isAlumni && (
                  <DropdownMenuItem
                    onClick={() => navigate('/dashboard/profile')}
                    className="cursor-pointer rounded-lg py-2"
                  >
                    <User className="mr-2 h-4 w-4" />
                    View Main Profile
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer rounded-lg py-2"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Maintenance notice banner (scrolling, under the top bar, all users) */}
        <MaintenanceNoticeBanner />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto min-w-0 max-w-7xl">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
