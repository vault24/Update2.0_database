import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { badgeService, type BadgeCounts } from '@/services/badgeService';
import { connectNotificationsSocket } from '@/lib/notificationsSocket';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Maps a sidebar route to its backend badge module key. Used both to render the
 * badge on the matching nav item and to reset the badge when the page is opened.
 */
export const PATH_TO_MODULE: Record<string, string> = {
  '/dashboard/notices': 'notices',
  '/dashboard/documents': 'documents',
  '/dashboard/applications': 'applications',
  '/dashboard/complaints': 'complaints',
  '/dashboard/routine': 'routine',
  '/dashboard/attendance': 'attendance',
  '/dashboard/teacher-attendance': 'manage_attendance',
  '/dashboard/add-attendance': 'manage_attendance',
  '/dashboard/alumni-directory': 'alumni_directory',
};

interface BadgeContextType {
  counts: BadgeCounts;
  /** Count for a single module (0 when absent). */
  countFor: (module?: string) => number;
  /** Mark a module opened: optimistically zero it, then persist. */
  markSeen: (module: string) => void;
  /** Re-fetch all counts from the server. */
  refresh: () => void;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

const POLL_INTERVAL = 60 * 1000; // 60s fallback poll

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState<BadgeCounts>({});
  const countsRef = useRef<BadgeCounts>({});
  countsRef.current = counts;

  const refresh = useCallback(async () => {
    try {
      const next = await badgeService.getBadges();
      setCounts(next);
    } catch {
      // Badges are non-critical: on any failure keep whatever we had.
    }
  }, []);

  const markSeen = useCallback((module: string) => {
    if (!module) return;
    // Optimistically clear so the badge disappears instantly on navigation.
    setCounts((prev) => (prev[module] ? { ...prev, [module]: 0 } : prev));
    badgeService.markSeen(module).catch(() => {});
  }, []);

  // Initial load + realtime/polling refresh, tied to the auth session.
  useEffect(() => {
    if (!user) {
      setCounts({});
      return;
    }
    refresh();

    const socket = connectNotificationsSocket({
      onOpen: () => refresh(),
      onCreated: () => refresh(),
      onUpdated: () => refresh(),
    });

    const poll = window.setInterval(refresh, POLL_INTERVAL);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      socket.close();
      window.clearInterval(poll);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, refresh]);

  // Opening a tracked page resets its badge (records "seen" = now).
  useEffect(() => {
    if (!user) return;
    const module = PATH_TO_MODULE[location.pathname];
    if (module) markSeen(module);
  }, [location.pathname, user, markSeen]);

  const countFor = useCallback((module?: string) => (module ? counts[module] || 0 : 0), [counts]);

  return (
    <BadgeContext.Provider value={{ counts, countFor, markSeen, refresh }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges(): BadgeContextType {
  const ctx = useContext(BadgeContext);
  // Degrade gracefully if a component using badges renders outside the provider.
  if (!ctx) {
    return { counts: {}, countFor: () => 0, markSeen: () => {}, refresh: () => {} };
  }
  return ctx;
}
