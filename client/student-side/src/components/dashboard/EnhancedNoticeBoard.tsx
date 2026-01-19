import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Calendar, 
  ChevronRight, 
  AlertTriangle, 
  Info, 
  Megaphone, 
  Loader2, 
  ExternalLink,
  Clock,
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { noticeService, Notice } from '@/services/noticeService';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const priorityConfig = {
  high: { 
    icon: AlertTriangle, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10', 
    border: 'border-destructive/30',
    label: 'Urgent',
    gradient: 'from-red-500 to-orange-500'
  },
  normal: { 
    icon: Info, 
    color: 'text-primary', 
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    label: 'Info',
    gradient: 'from-blue-500 to-cyan-500'
  },
  low: { 
    icon: Megaphone, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/50',
    border: 'border-muted',
    label: 'General',
    gradient: 'from-gray-500 to-slate-500'
  },
};

export function EnhancedNoticeBoard() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const recentNotices = await noticeService.getRecentNotices();
      setNotices(recentNotices);
    } catch (err) {
      console.error('Error loading notices:', err);
      setError('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (noticeId: number) => {
    try {
      await noticeService.markAsRead(noticeId);
      setNotices(notices.map(notice => 
        notice.id === noticeId 
          ? { ...notice, is_read: true }
          : notice
      ));
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  const unreadCount = notices.filter(n => !n.is_read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Notices & Updates</h3>
              <p className="text-xs text-muted-foreground">Stay informed</p>
            </div>
          </div>
          <Link 
            to="/dashboard/notices" 
            className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
          >
            View All
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">{error}</p>
              <button 
                onClick={loadNotices}
                className="text-sm text-primary hover:underline font-medium"
              >
                Try again
              </button>
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No notices available</p>
            </div>
          ) : (
            <AnimatePresence>
              {notices.slice(0, 4).map((notice, index) => {
                const config = priorityConfig[notice.priority];
                const TypeIcon = config.icon;
                const isExpanded = expandedId === notice.id;

                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="group"
                  >
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : notice.id);
                        if (!notice.is_read && !isExpanded) {
                          handleMarkAsRead(notice.id);
                        }
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-xl transition-all duration-200",
                        "hover:shadow-md",
                        notice.is_read 
                          ? 'bg-secondary/30 hover:bg-secondary/50' 
                          : `bg-gradient-to-r from-secondary/50 to-transparent border-l-4 ${config.border}`,
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg flex-shrink-0",
                          `bg-gradient-to-br ${config.gradient}`
                        )}>
                          <TypeIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                "font-semibold text-sm truncate",
                                notice.is_read ? 'text-muted-foreground' : 'text-foreground'
                              )}>
                                {notice.title}
                              </h4>
                              {!notice.is_read && (
                                <motion.span 
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="w-2 h-2 bg-primary rounded-full flex-shrink-0" 
                                />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium",
                              config.bg, config.color
                            )}>
                              {config.label}
                            </span>
                          </div>

                          <motion.div
                            initial={false}
                            animate={{ 
                              height: isExpanded ? 'auto' : 0,
                              opacity: isExpanded ? 1 : 0 
                            }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                              {notice.content}
                            </p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>By {notice.created_by_name}</span>
                            </div>
                          </motion.div>
                        </div>
                        <ChevronRight className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                          isExpanded && "rotate-90"
                        )} />
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
