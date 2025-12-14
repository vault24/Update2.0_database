import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserX,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  UserCircle,
  Award,
  FileText,
  Inbox,
  FileEdit,
  BarChart3,
  Settings,
  Activity,
  X,
  BookOpen,
  UserCheck,
  UserCog,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  onClose: () => void;
  isMobile?: boolean;
}

interface MenuGroup {
  label: string;
  items: {
    icon: any;
    label: string;
    path: string;
  }[];
  collapsible?: boolean;
}

const menuItems: MenuGroup[] = [
  {
    label: 'Main',
    collapsible: false,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ],
  },
  {
    label: 'Students',
    collapsible: true,
    items: [
      { icon: Users, label: 'Students List', path: '/students' },
      { icon: UserPlus, label: 'Add Student', path: '/add-student' },
      { icon: UserX, label: 'Discontinued Students', path: '/discontinued-students' },
      { icon: GraduationCap, label: 'Admissions', path: '/admissions' },
    ],
  },
  {
    label: 'Academics',
    collapsible: true,
    items: [
      { icon: BookOpen, label: 'Departments', path: '/departments' },
      { icon: UserCheck, label: 'Teachers', path: '/teachers' },
      { icon: Calendar, label: 'Class Routine', path: '/class-routine' },
      { icon: ClipboardCheck, label: 'Attendance & Marks', path: '/attendance-marks' },
    ],
  },
  {
    label: 'Profiles & Records',
    collapsible: true,
    items: [
      { icon: UserCircle, label: 'Student Profiles', path: '/student-profiles' },
      { icon: Award, label: 'Alumni', path: '/alumni' },
      { icon: FileText, label: 'Documents', path: '/documents' },
    ],
  },
  {
    label: 'Requests',
    collapsible: true,
    items: [
      { icon: Inbox, label: 'Applications', path: '/applications' },
      { icon: FileEdit, label: 'Correction Requests', path: '/correction-requests' },
      { icon: UserCog, label: 'Signup Requests', path: '/signup-requests' },
    ],
  },
  {
    label: 'Communication',
    collapsible: true,
    items: [
      { icon: Bell, label: 'Notices & Updates', path: '/notices' },
    ],
  },
  {
    label: 'System',
    collapsible: true,
    items: [
      { icon: BarChart3, label: 'Analytics & Reports', path: '/analytics' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: Activity, label: 'Activity Logs', path: '/activity-logs' },
    ],
  },
];

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCollapsedSections(new Set(parsed));
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(Array.from(collapsedSections)));
  }, [collapsedSections]);

  const toggleSection = (sectionLabel: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionLabel)) {
        newSet.delete(sectionLabel);
      } else {
        newSet.add(sectionLabel);
      }
      return newSet;
    });
  };

  const isSectionCollapsed = (sectionLabel: string) => collapsedSections.has(sectionLabel);

  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Sirajganj Polytechnic</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {menuItems.map((group, groupIndex) => {
          const isCollapsed = group.collapsible && isSectionCollapsed(group.label);
          
          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              {/* Section Header */}
              <div className={cn(
                "flex items-center justify-between mb-3 px-3",
                group.collapsible && "cursor-pointer hover:bg-sidebar-accent/50 rounded-md py-1 transition-colors"
              )}
              onClick={group.collapsible ? () => toggleSection(group.label) : undefined}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
                {group.collapsible && (
                  <motion.div
                    animate={{ rotate: isCollapsed ? 0 : 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                )}
              </div>

              {/* Section Items */}
              <AnimatePresence initial={false}>
                {(!group.collapsible || !isCollapsed) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="space-y-1 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={isMobile ? onClose : undefined}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className={cn('w-5 h-5', isActive && 'animate-scale-in')} />
                          <span>{item.label}</span>
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                            />
                          )}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
