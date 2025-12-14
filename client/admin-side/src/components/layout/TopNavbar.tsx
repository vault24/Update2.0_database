import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  '/student-profiles': 'Student Profiles',
  '/alumni': 'Alumni',
  '/documents': 'Documents',
  '/applications': 'Applications',
  '/correction-requests': 'Correction Requests',
  '/notices': 'Notices & Updates',
  '/analytics': 'Analytics & Reports',
  '/settings': 'Settings',
  '/activity-logs': 'Activity Logs',
};

const notifications = [
  { id: 1, title: 'New admission request', time: '2 min ago', unread: true },
  { id: 2, title: 'Student profile updated', time: '15 min ago', unread: true },
  { id: 3, title: 'Correction request submitted', time: '1 hour ago', unread: false },
  { id: 4, title: 'New alumni registered', time: '3 hours ago', unread: false },
];

export function TopNavbar({ onMenuToggle, sidebarOpen }: TopNavbarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const currentPage = pageNames[location.pathname] || 'Dashboard';
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="h-16 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <motion.h1
            key={currentPage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-semibold text-foreground hidden sm:block"
          >
            {currentPage}
          </motion.h1>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students, admissions..."
              className="pl-10 bg-secondary/50 border-0 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative overflow-hidden"
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
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 glass-card rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Notifications</h3>
                      <Badge variant="secondary">{unreadCount} new</Badge>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer',
                          notification.unread && 'bg-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {notification.unread && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          )}
                          <div className={cn(!notification.unread && 'ml-5')}>
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border">
                    <Button variant="ghost" className="w-full text-primary">
                      View all notifications
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 px-2"
            >
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {user?.first_name?.[0] || 'A'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium">
                {user?.first_name || 'Admin'}
              </span>
              <ChevronDown className="w-4 h-4 hidden sm:block" />
            </Button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 glass-card rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border">
                    <p className="font-semibold text-foreground">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
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

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-border bg-background overflow-hidden"
          >
            <div className="p-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 bg-secondary/50 border-0"
                  autoFocus
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
