import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useInterfaceMode } from '@/contexts/InterfaceModeContext';
import { getVisibleMenu, getRoleLabel, resolveAdminRole } from '@/config/permissions';

interface SidebarProps {
  onClose: () => void;
  isMobile?: boolean;
}

const NON_COLLAPSIBLE_GROUPS = new Set(['Main']);

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { mode, isAdvanced } = useInterfaceMode();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const role = useMemo(() => resolveAdminRole(user), [user]);
  // Recomputes instantly whenever role or interface mode changes.
  const menuItems = useMemo(() => getVisibleMenu(role, mode), [role, mode]);

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
    <div className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border shrink-0">
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

        {/* Role + interface mode indicator */}
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
            {getRoleLabel(role)}
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
            isAdvanced
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-muted text-muted-foreground'
          )}>
            {isAdvanced ? <Sparkles className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
            {isAdvanced ? 'Advanced' : 'Simple'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {menuItems.map((group, groupIndex) => {
          const collapsible = !NON_COLLAPSIBLE_GROUPS.has(group.label);
          const isCollapsed = collapsible && isSectionCollapsed(group.label);

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
                collapsible && "cursor-pointer hover:bg-sidebar-accent/50 rounded-md py-1 transition-colors"
              )}
              onClick={collapsible ? () => toggleSection(group.label) : undefined}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
                {collapsible && (
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
                {(!collapsible || !isCollapsed) && (
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
    </div>
  );
}
