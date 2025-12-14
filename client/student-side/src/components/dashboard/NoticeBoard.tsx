import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, ChevronRight, AlertTriangle, Info, Megaphone, Loader2, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { noticeService, Notice } from '@/services/noticeService';
import { Link } from 'react-router-dom';

const priorityConfig = {
  high: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Urgent' },
  normal: { icon: Info, color: 'text-accent', bg: 'bg-accent/10', label: 'Info' },
  low: { icon: Megaphone, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'General' },
};

export function NoticeBoard() {
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
      // Update the notice in the local state
      setNotices(notices.map(notice => 
        notice.id === noticeId 
          ? { ...notice, is_read: true }
          : notice
      ));
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Notices & Updates</h3>
          {notices.some(notice => !notice.is_read) && (
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          )}
        </div>
        <Link 
          to="/notices" 
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <button 
              onClick={loadNotices}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notices available</p>
          </div>
        ) : (
          <AnimatePresence>
            {notices.map((notice, index) => {
              const config = priorityConfig[notice.priority];
              const TypeIcon = config.icon;
              const isExpanded = expandedId === notice.id;

              return (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="group"
                >
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : notice.id);
                      if (!notice.is_read && !isExpanded) {
                        handleMarkAsRead(notice.id);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      notice.is_read 
                        ? 'bg-secondary/30 hover:bg-secondary/50' 
                        : 'bg-secondary/50 hover:bg-secondary border-l-4 border-primary'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                        <TypeIcon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm truncate ${
                              notice.is_read ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notice.title}
                            </h4>
                            {!notice.is_read && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {new Date(notice.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                        <motion.div
                          initial={false}
                          animate={{ height: isExpanded ? 'auto' : 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-muted-foreground mt-2">
                            {notice.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            By {notice.created_by_name}
                          </p>
                        </motion.div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
