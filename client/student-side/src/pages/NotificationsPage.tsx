import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, X, Clock, Calendar, BookOpen, 
  AlertCircle, Loader2, Check, Archive, Trash2, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { notificationService, type Notification } from '@/services/notificationService';
import { getErrorMessage } from '@/lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'attendance'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page_size: 50,
        ordering: '-created_at',
      };

      if (activeTab === 'unread') {
        filters.status = 'unread';
      } else if (activeTab === 'attendance') {
        filters.notification_type = 'attendance_update';
      }

      const response = await notificationService.getMyNotifications(filters);
      setNotifications(response.results);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      toast.error('Failed to load notifications', { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      setProcessingId(id);
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, status: 'read' as const } : n))
      );
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to mark as read', { description: getErrorMessage(err) });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read', { description: getErrorMessage(err) });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      setProcessingId(id);
      await notificationService.archive(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification archived');
    } catch (err) {
      toast.error('Failed to archive', { description: getErrorMessage(err) });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setProcessingId(id);
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete', { description: getErrorMessage(err) });
    } finally {
      setProcessingId(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'attendance_update':
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'deadline_reminder':
        return <Clock className="w-5 h-5 text-warning" />;
      case 'system_announcement':
        return <Bell className="w-5 h-5 text-info" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <div className="space-y-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="gap-2">
            <Check className="w-4 h-4" />
            Mark all as read
          </Button>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="all" className="gap-2">
            All
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="font-semibold mb-1">No notifications</p>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'unread' ? 'All caught up!' : 'You have no notifications yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map((notification, index) => {
                  const isProcessing = processingId === notification.id;
                  const isUnread = notification.status === 'unread';

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'bg-card rounded-xl border p-4 shadow-sm transition-all',
                        isUnread ? 'border-primary/50 bg-primary/5' : 'border-border'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification.notification_type)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{notification.title}</h3>
                            {isUnread && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

                          {notification.data && notification.notification_type === 'attendance_update' && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                              {notification.data.subject_name && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {notification.data.subject_name}
                                </span>
                              )}
                              {notification.data.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {notification.data.date}
                                </span>
                              )}
                              {notification.data.is_present !== undefined && (
                                <Badge
                                  variant={notification.data.is_present ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {notification.data.is_present ? 'Present' : 'Absent'}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(notification.created_at)}
                            </span>

                            <div className="flex gap-1">
                              {isUnread && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  disabled={isProcessing}
                                  className="h-7 px-2 text-xs gap-1"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  Mark read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(notification.id)}
                                disabled={isProcessing}
                                className="h-7 px-2 text-xs gap-1"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Archive className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(notification.id)}
                                disabled={isProcessing}
                                className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
