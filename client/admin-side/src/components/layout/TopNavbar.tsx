import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  BarChart3,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, resolveAdminRole } from '@/config/permissions';
import { cn } from '@/lib/utils';
import { notificationService, Notification } from '@/services/notificationService';
import { connectNotificationsSocket } from '@/lib/notificationsSocket';
import { getErrorMessage } from '@/lib/api';

interface TopNavbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/students': 'Students List',
  '/add-student': 'Add Student',
  '/discontinued-students': 'Discontinued Students',
  '/admissions': 'Admissions',
  '/class-routine': 'Class Routine',
  '/attendance-marks': 'Attendance & Marks',
  '/alumni': 'Alumni',
  '/documents': 'Documents',
  '/applications': 'Applications',
  '/correction-requests': 'Correction Requests',
  '/notices': 'Notices & Updates',
  '/analytics': 'System Reports',
  '/settings': 'Settings',
  '/activity-logs': 'System Activity & Reports',
};

const getNotificationIcon = (type: string) => {
  // Return appropriate icon based on notification type
  return Bell;
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'student_admission':
      return 'bg-success/10 text-success';
    case 'application_status':
      return 'bg-primary/10 text-primary';
    case 'document_approval':
      return 'bg-info/10 text-info';
    case 'system_announcement':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export function TopNavbar({ onMenuToggle, sidebarOpen }: TopNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentPage = pageNames[location.pathname] || 'Dashboard';
  const canViewAnalytics = canAccessRoute(resolveAdminRole(user), '/analytics');

  // Real-time notifications over WebSocket (replaces 30s polling).
  // Initial fetch on mount; then the socket pushes new notifications and we
  // re-sync the count on every (re)connect so nothing is missed while offline.
  useEffect(() => {
    fetchUnreadCount();
    const socket = connectNotificationsSocket({
      onOpen: () => fetchUnreadCount(),
      onCreated: (notification) => {
        setUnreadCount((prev) => prev + 1);
        // Prepend to the list only if it's already been loaded, so the
        // "fetch when dropdown opens" path still works on first open.
        setNotifications((prev) =>
          prev.length ? [notification as Notification, ...prev].slice(0, 10) : prev,
        );
      },
    });
    return () => socket.close();
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notificationsOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [notificationsOpen]);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await notificationService.getNotifications({ page_size: 10 });
      setNotifications(response.results);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' as const } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
  };

  const handleNavigate = (path: string) => {
    setProfileOpen(false);
    navigate(path);
  };

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="shrink-0 text-muted-foreground"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <h1 className="text-[15px] font-semibold text-foreground hidden sm:block truncate">
            {currentPage}
          </h1>
        </div>

        {/* Spacer (search removed) */}
        <div className="flex-1" />

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative overflow-hidden text-muted-foreground"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </motion.div>
            </AnimatePresence>
          </Button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative text-muted-foreground"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center ring-2 ring-card">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-96 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <Badge variant="secondary">{unreadCount} new</Badge>
                        )}
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="h-7 text-xs"
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Mark all read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const Icon = getNotificationIcon(notification.notification_type);
                        const colorClass = getNotificationColor(notification.notification_type);
                        
                        return (
                          <div
                            key={notification.id}
                            onClick={() => {
                              if (notification.status === 'unread') {
                                handleMarkAsRead(notification.id);
                              }
                            }}
                            className={cn(
                              'p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer',
                              notification.status === 'unread' && 'bg-primary/5'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                                <Icon className="w-4 h-4" />
                              </div>
                              {notification.status === 'unread' && (
                                <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                              )}
                              <div className={cn('flex-1 min-w-0', notification.status === 'read' && 'ml-2')}>
                                <p className="text-sm font-medium text-foreground line-clamp-1">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 0 && canViewAnalytics && (
                    <div className="p-3 border-t border-border">
                      <Button variant="ghost" className="w-full text-primary" onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/analytics');
                      }}>
                        View all notifications
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <Button
              variant="ghost"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 px-1.5 sm:pl-1.5 sm:pr-2.5"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary-foreground">
                  {user?.first_name?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground">
                {user?.first_name || 'Admin'}
              </span>
              <ChevronDown className="w-4 h-4 hidden sm:block text-muted-foreground" />
            </Button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border">
                    <p className="font-semibold text-foreground">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => handleNavigate('/settings')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    {canViewAnalytics && (
                      <button
                        onClick={() => handleNavigate('/analytics')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </button>
                    )}
                    <button
                      onClick={() => handleNavigate('/settings')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="my-2 border-t border-border" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </header>
  );
}
