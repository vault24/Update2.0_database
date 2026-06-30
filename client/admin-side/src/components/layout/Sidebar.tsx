import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { X, GraduationCap, ChevronDown, Sparkles, Layers } from 'lucide-react';
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
        setCollapsedSections(new Set(JSON.parse(saved)));
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
      newSet.has(sectionLabel) ? newSet.delete(sectionLabel) : newSet.add(sectionLabel);
      return newSet;
    });
  };

  const isSectionCollapsed = (sectionLabel: string) => collapsedSections.has(sectionLabel);

  return (
    <div className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0">
      {/* Logo / brand lockup */}
      <div className="h-16 px-4 border-b border-sidebar-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground text-[13px] leading-tight truncate">
              Sirajganj Polytechnic
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Admin Panel</p>
          </div>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Close menu">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Role + interface mode indicator */}
      <div className="px-4 py-3 border-b border-sidebar-border shrink-0 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-[hsl(var(--primary-muted))] px-2 py-0.5 text-[11px] font-semibold text-primary">
          {getRoleLabel(role)}
        </span>
        <span className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
          isAdvanced
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {isAdvanced ? <Sparkles className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
          {isAdvanced ? 'Advanced' : 'Simple'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {menuItems.map((group) => {
          const collapsible = !NON_COLLAPSIBLE_GROUPS.has(group.label);
          const isCollapsed = collapsible && isSectionCollapsed(group.label);

          return (
            <div key={group.label}>
              {/* Section header */}
              <button
                type="button"
                onClick={collapsible ? () => toggleSection(group.label) : undefined}
                aria-expanded={collapsible ? !isCollapsed : undefined}
                className={cn(
                  'w-full flex items-center justify-between px-3 mb-1.5 select-none',
                  collapsible && 'cursor-pointer rounded-md py-1 hover:text-foreground transition-colors'
                )}
              >
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
                {collapsible && (
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
                      isCollapsed && '-rotate-90'
                    )}
                  />
                )}
              </button>

              {/* Section items */}
              <AnimatePresence initial={false}>
                {(!collapsible || !isCollapsed) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="space-y-0.5 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={isMobile ? onClose : undefined}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                            isActive
                              ? 'bg-[hsl(var(--primary-muted))] text-primary'
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="sidebarActiveBar"
                              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
                              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                            />
                          )}
                          <item.icon
                            className={cn(
                              'w-[18px] h-[18px] shrink-0 transition-colors',
                              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
