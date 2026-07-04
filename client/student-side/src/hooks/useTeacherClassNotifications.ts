import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';

const WEEK_DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const formatClassTime = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export const formatCountdown = (minutes: number) => {
  if (minutes <= 0) return 'now';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

export interface TodayClass {
  id: string;
  subject: string;
  subjectCode: string;
  department: string;
  semester: number;
  shift: string;
  room: string;
  startTime: string;
  endTime: string;
}

/**
 * Loads today's classes for the logged-in teacher and fires
 * in-app (toast) + browser notifications 5 minutes before and
 * at the exact start of every class. Safe to mount anywhere —
 * duplicate notifications are prevented per class per day.
 */
export function useTeacherClassNotifications() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TodayClass[]>([]);
  const [now, setNow] = useState(new Date());
  const notifiedRef = useRef<Set<string>>(new Set());

  const isTeacher = user?.role === 'teacher';
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const isClassDay = WEEK_DAYS.includes(dayName as DayOfWeek);
  const todayKey = now.toISOString().slice(0, 10);

  // Tick every 30s so countdowns and notification windows stay accurate.
  useEffect(() => {
    if (!isTeacher) return;
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [isTeacher]);

  // Ask for browser notification permission once.
  useEffect(() => {
    if (!isTeacher) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher || !user?.relatedProfileId || !isClassDay) {
      setClasses([]);
      return;
    }
    let cancelled = false;
    const fetchToday = async () => {
      try {
        const response = await routineService.getRoutine({
          teacher: user.relatedProfileId,
          day_of_week: dayName as DayOfWeek,
          is_active: true,
          page_size: 50,
        });
        if (cancelled) return;
        const mapped: TodayClass[] = response.results
          .map((r: ClassRoutine) => ({
            id: r.id,
            subject: r.subject_name,
            subjectCode: r.subject_code,
            department: r.department?.name || '',
            semester: r.semester,
            shift: r.shift,
            room: r.class_type === 'Lab' && r.lab_name ? r.lab_name : r.room_number,
            startTime: r.start_time.slice(0, 5),
            endTime: r.end_time.slice(0, 5),
          }))
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        setClasses(mapped);
      } catch (err) {
        console.error('Failed to load today classes for notifications:', err);
      }
    };
    fetchToday();
    return () => { cancelled = true; };
  }, [isTeacher, user?.relatedProfileId, dayName, isClassDay]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const currentClass = useMemo(
    () => classes.find(c => nowMinutes >= timeToMinutes(c.startTime) && nowMinutes < timeToMinutes(c.endTime)) || null,
    [classes, nowMinutes]
  );

  const nextClass = useMemo(
    () => classes.find(c => timeToMinutes(c.startTime) > nowMinutes) || null,
    [classes, nowMinutes]
  );

  // Class notifications: 5 minutes before start + at exact start time.
  useEffect(() => {
    if (!isTeacher || classes.length === 0) return;

    const notify = (title: string, body: string, key: string) => {
      const storageKey = `class-notify:${todayKey}:${key}`;
      if (notifiedRef.current.has(storageKey)) return;
      try {
        if (sessionStorage.getItem(storageKey)) {
          notifiedRef.current.add(storageKey);
          return;
        }
      } catch { /* sessionStorage unavailable */ }

      notifiedRef.current.add(storageKey);
      try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }

      toast.info(title, { description: body, duration: 15000 });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/spi-logo.png', tag: storageKey });
        } catch { /* notification blocked */ }
      }
    };

    classes.forEach(c => {
      const start = timeToMinutes(c.startTime);
      const detail = `${c.subject} · Room ${c.room || 'TBA'} · ${c.department} Sem ${c.semester} · ${formatClassTime(c.startTime)} – ${formatClassTime(c.endTime)}`;
      // 5-minute warning window (fires once within [start-5, start))
      if (nowMinutes >= start - 5 && nowMinutes < start) {
        notify(`Class in ${formatCountdown(start - nowMinutes)}`, detail, `${c.id}:pre`);
      }
      // Start-time window (fires once within [start, start+2))
      if (nowMinutes >= start && nowMinutes < start + 2) {
        notify('Class starting now', detail, `${c.id}:start`);
      }
    });
  }, [isTeacher, classes, nowMinutes, todayKey]);

  return { classes, currentClass, nextClass, now, nowMinutes, isClassDay };
}
