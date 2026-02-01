import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Footer } from '@/components/layout/Footer';
import { Bell, Search, User, Settings, LogOut, ChevronDown, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { noticeService } from '@/services/noticeService';
import { useAuth } from '@/contexts/AuthContext';
import { mockAllegations, SeverityLevel } from '@/data/mockAllegations';
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

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await noticeService.getUnreadCount();
      setUnreadCount(response.unread_count);
    } catch (err) {
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
        return { label: 'Captain', color: 'bg-warning text-warning-foreground' };
      case 'teacher':
        return { label: 'Teacher', color: 'bg-success text-white' };
      default:
        return { label: 'Student', color: 'bg-primary text-primary-foreground' };
    }
  };

  const roleBadge = getRoleBadge();

  // Get student allegations and highest severity
  const studentAllegations = useMemo(() => {
    if (user?.role === 'teacher' || user?.role === 'captain') return [];
    // For demo, using mock data - in real app, this would be filtered by actual student ID
    return mockAllegations.filter(a => a.status !== 'resolved');
  }, [user?.role]);

  const highestSeverity = useMemo((): SeverityLevel | null => {
    if (studentAllegations.length === 0) return null;
    if (studentAllegations.some(a => a.severity === 'serious')) return 'serious';
    if (studentAllegations.some(a => a.severity === 'moderate')) return 'moderate';
    return 'minor';
  }, [studentAllegations]);

  const getSeverityColors = (severity: SeverityLevel | null) => {
    switch (severity) {
      case 'serious':
        return { 
          text: 'text-red-500', 
          bg: 'bg-red-500', 
          border: 'border-red-500',
          gradient: 'from-red-500 to-red-600',
          glow: 'shadow-red-500/50'
        };
      case 'moderate':
        return { 
          text: 'text-orange-500', 
          bg: 'bg-orange-500', 
          border: 'border-orange-500',
          gradient: 'from-orange-500 to-orange-600',
          glow: 'shadow-orange-500/50'
        };
      case 'minor':
        return { 
          text: 'text-yellow-500', 
          bg: 'bg-yellow-500', 
          border: 'border-yellow-500',
          gradient: 'from-yellow-500 to-yellow-600',
          glow: 'shadow-yellow-500/50'
        };
      default:
        return { 
          text: 'text-primary', 
          bg: 'bg-primary', 
          border: 'border-primary',
          gradient: 'from-primary to-primary/60',
          glow: ''
        };
    }
  };

  const severityColors = getSeverityColors(highestSeverity);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 md:px-6"
        >
          <div className="flex items-center gap-4 flex-1 pl-12 lg:pl-0">
            <div className="relative hidden md:block max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-secondary/50 border-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Allegation Alert Indicator */}
            {highestSeverity && studentAllegations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className={`relative flex items-center gap-2 px-3 py-2 animate-pulse ${severityColors.text}`}
                onClick={() => navigate('/dashboard/my-allegations')}
                title="View your allegations"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${severityColors.bg} animate-ping`} />
                </motion.div>
                <span className="hidden sm:inline text-sm font-medium">
                  {studentAllegations.length} Alert{studentAllegations.length > 1 ? 's' : ''}
                </span>
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => navigate('/dashboard/notices')}
              title="View Notices & Updates"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <ThemeToggle />
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`relative flex items-center gap-2 px-2 ${highestSeverity ? 'ring-2 ring-offset-2 ring-offset-background ' + severityColors.border : ''}`}>
                  <div className={highestSeverity ? 'ring-2 ring-offset-2 ring-offset-background ' + severityColors.border + ' rounded-full' : ''}>
                    <ProfileAvatar size="sm" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* Profile Header */}
                <div className="px-3 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className={highestSeverity ? 'ring-2 ring-offset-2 ring-offset-background ' + severityColors.border + ' rounded-full' : ''}>
                      <ProfileAvatar size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.studentId || user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                </div>
                
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
          <div className="max-w-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
