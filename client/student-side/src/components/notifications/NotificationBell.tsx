import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, Clock, AlertCircle, Loader2, CheckCheck, ArrowRight, Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { notificationService, type Notification } from '@/services/notificationService';

interface NotificationBellProps {
  unreadCount: number;
  onCountChange?: () => void;
}

const iconFor = (type: string) => {
  switch (type) {
    case 'attendance_update':
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    case 'deadline_reminder':
      return <Clock className="w-4 h-4 text-warning" />;
    case 'system_announcement':
      return <Bell className="w-4 h-4 text-info" />;
    default:
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
};

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export function NotificationBell({ unreadCount, onCountChange }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const fetchedOnce = useRef(false);

  const loadRecent = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getMyNotifications({
        page_size: 6,
        ordering: '-created_at',
      });
      setNotifications(response.results || []);
      fetchedOnce.current = true;
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when the dropdown opens (and refresh each open so it stays current).
  useEffect(() => {
    if (open) loadRecent();
  }, [open]);

  const handleItemClick = async (notification: Notification) => {
    if (notification.status === 'unread') {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, status: 'read' as const } : n))
        );
        onCountChange?.();
      } catch { /* non-blocking */ }
    }
    setOpen(false);
    navigate('/dashboard/notifications');
  };

  const handleMarkAll = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
      onCountChange?.();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const viewAll = () => {
    setOpen(false);
    navigate('/dashboard/notifications');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold leading-none text-destructive-foreground ring-2 ring-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[360px] max-w-[calc(100vw-1.5rem)] p-0 rounded-2xl overflow-hidden shadow-xl border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Notifications</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              disabled={markingAll}
              className="h-8 gap-1 text-xs text-primary hover:text-primary"
            >
              {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[340px] overflow-y-auto">
          {loading && !fetchedOnce.current ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">We'll let you know when something arrives</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notification, index) => {
                const isUnread = notification.status === 'unread';
                return (
                  <motion.button
                    key={notification.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.2) }}
                    onClick={() => handleItemClick(notification)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/60 transition-colors hover:bg-secondary/60',
                      isUnread && 'bg-primary/[0.04]'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      {iconFor(notification.notification_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-tight line-clamp-1', isUnread ? 'font-semibold' : 'font-medium')}>
                          {notification.title}
                        </p>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-1">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <button
          onClick={viewAll}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-t border-border text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          View All Notifications
          <ArrowRight className="w-4 h-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
}
