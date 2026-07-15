import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Calendar, AlertTriangle, Info, Megaphone, Loader2, Eye,
  CheckSquare, Square, Bell, ChevronDown, CheckCheck, Inbox, User,
  Paperclip, FileText, Download, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { noticeService, Notice } from '@/services/noticeService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

type Priority = 'low' | 'normal' | 'high';

const priorityConfig: Record<Priority, {
  icon: typeof Info;
  label: string;
  chip: string;       // icon chip (soft tinted)
  accent: string;     // left border colour for unread
  badge: 'destructive' | 'info' | 'muted';
}> = {
  high: {
    icon: AlertTriangle,
    label: 'High Priority',
    chip: 'bg-destructive/10 text-destructive',
    accent: 'border-l-destructive',
    badge: 'destructive',
  },
  normal: {
    icon: Info,
    label: 'Normal',
    chip: 'bg-primary/10 text-primary',
    accent: 'border-l-primary',
    badge: 'info',
  },
  low: {
    icon: Megaphone,
    label: 'Low Priority',
    chip: 'bg-muted text-muted-foreground',
    accent: 'border-l-border',
    badge: 'muted',
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const isImageAttachment = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

/** Inline attachment viewer: images render as previews, PDFs as file cards. */
function NoticeAttachments({ attachments }: { attachments: NonNullable<Notice['attachments']> }) {
  const images = attachments.filter((a) => a.file_url && isImageAttachment(a.name));
  const files = attachments.filter((a) => a.file_url && !isImageAttachment(a.name));

  return (
    <div className="mt-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Attachments ({attachments.length})
      </p>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.map((att) => (
            <a
              key={att.id}
              href={att.file_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted/30"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={att.file_url!}
                alt={att.name}
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-medium text-white">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{att.name}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      {/* PDF / other file cards */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{att.name}</p>
                <p className="text-xs text-muted-foreground">PDF document</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={att.file_url!} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" /> View
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <a href={att.file_url!} download={att.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readStatusFilter, setReadStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedNotices, setSelectedNotices] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await noticeService.getNotices({ page_size: 50 });
      setNotices(response.results);
    } catch (err) {
      setError('Failed to load notices');
      console.error('Error loading notices:', err);
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

  const handleBulkMarkAsRead = async () => {
    if (selectedNotices.size === 0) return;

    try {
      setBulkActionLoading(true);
      const noticeIds = Array.from(selectedNotices);
      await noticeService.bulkMarkAsRead(noticeIds);

      // Update notices state
      setNotices(notices.map(notice =>
        selectedNotices.has(notice.id)
          ? { ...notice, is_read: true }
          : notice
      ));

      // Clear selection
      setSelectedNotices(new Set());
    } catch (err) {
      console.error('Error bulk marking notices as read:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectNotice = (noticeId: number) => {
    const newSelected = new Set(selectedNotices);
    if (newSelected.has(noticeId)) {
      newSelected.delete(noticeId);
    } else {
      newSelected.add(noticeId);
    }
    setSelectedNotices(newSelected);
  };

  const handleSelectAll = () => {
    const unreadNotices = filteredNotices.filter(n => !n.is_read);
    if (selectedNotices.size === unreadNotices.length) {
      setSelectedNotices(new Set());
    } else {
      setSelectedNotices(new Set(unreadNotices.map(n => n.id)));
    }
  };

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || notice.priority === priorityFilter;
    const matchesReadStatus = readStatusFilter === 'all' ||
                             (readStatusFilter === 'read' && notice.is_read) ||
                             (readStatusFilter === 'unread' && !notice.is_read);

    return matchesSearch && matchesPriority && matchesReadStatus;
  });

  const unreadCount = notices.filter(n => !n.is_read).length;
  const highCount = notices.filter(n => n.priority === 'high').length;
  const unreadInView = filteredNotices.filter(n => !n.is_read);
  const allUnreadSelected = unreadInView.length > 0 && selectedNotices.size === unreadInView.length;
  const hasActiveFilters = !!searchTerm || priorityFilter !== 'all' || readStatusFilter !== 'all';

  if (loading) return <LoadingState message="Loading notices..." />;
  if (error) return <ErrorState error={error} onRetry={loadNotices} />;

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden md:space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card relative overflow-hidden"
      >
        <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-sm">
              <Bell className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold md:text-2xl">Notices &amp; Updates</h1>
              <p className="text-sm text-muted-foreground">Stay updated with important announcements</p>
            </div>
          </div>

          <AnimatePresence>
            {selectedNotices.size > 0 && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button onClick={handleBulkMarkAsRead} disabled={bulkActionLoading} className="gap-2">
                  {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                  Mark {selectedNotices.size} as read
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Total', value: notices.length, icon: Inbox, chip: 'bg-primary/10 text-primary' },
          { label: 'Unread', value: unreadCount, icon: Bell, chip: 'bg-accent/15 text-accent-foreground' },
          { label: 'High priority', value: highCount, icon: AlertTriangle, chip: 'bg-destructive/10 text-destructive' },
        ].map((s) => (
          <div key={s.label} className="surface-card flex items-center gap-3 p-3 md:p-4">
            <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', s.chip)}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none md:text-2xl">{s.value}</p>
              <p className="truncate text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="surface-card p-3 md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readStatusFilter} onValueChange={setReadStatusFilter}>
              <SelectTrigger className="w-[110px] sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {unreadInView.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {allUnreadSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Select all unread ({unreadInView.length})
            </button>
            {selectedNotices.size > 0 && (
              <button
                onClick={() => setSelectedNotices(new Set())}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Notices list ── */}
      {filteredNotices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices found"
          message={hasActiveFilters ? 'No notices match your current filters.' : 'There are no notices to show yet.'}
          action={hasActiveFilters ? {
            label: 'Clear Filters',
            onClick: () => {
              setSearchTerm('');
              setPriorityFilter('all');
              setReadStatusFilter('all');
            },
          } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice, index) => {
            const config = priorityConfig[notice.priority];
            const TypeIcon = config.icon;
            const isExpanded = expandedId === notice.id;
            const isSelected = selectedNotices.has(notice.id);

            const toggle = () => {
              setExpandedId(isExpanded ? null : notice.id);
              if (!notice.is_read && !isExpanded) {
                handleMarkAsRead(notice.id);
              }
            };

            return (
              <motion.div
                key={notice.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                className={cn(
                  'surface-card overflow-hidden border-l-4 transition-colors',
                  notice.is_read ? 'border-l-transparent' : config.accent,
                  !notice.is_read && 'bg-primary/[0.02]',
                  isSelected && 'ring-2 ring-primary/40',
                )}
              >
                <div className="flex items-start gap-3 p-4 md:p-5">
                  {/* Selection (unread only) */}
                  {!notice.is_read && (
                    <button
                      onClick={() => handleSelectNotice(notice.id)}
                      className="mt-1 flex-shrink-0"
                      aria-label={isSelected ? 'Deselect notice' : 'Select notice'}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                  )}

                  {/* Priority icon chip */}
                  <button
                    onClick={toggle}
                    className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', config.chip)}
                    aria-label="Toggle notice"
                  >
                    <TypeIcon className="h-5 w-5" />
                  </button>

                  {/* Main */}
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={toggle}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className={cn(
                          'truncate font-semibold',
                          notice.is_read ? 'text-muted-foreground' : 'text-foreground',
                        )}>
                          {notice.title}
                        </h3>
                        {!notice.is_read && (
                          <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <Badge variant={config.badge} className="hidden sm:inline-flex">{config.label}</Badge>
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(notice.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {notice.created_by_name}
                      </span>
                      {(notice.attachments?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Paperclip className="h-3.5 w-3.5" />
                          {notice.attachments!.length} attachment{notice.attachments!.length === 1 ? '' : 's'}
                        </span>
                      )}
                      {notice.is_read && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Eye className="h-3.5 w-3.5" /> Read
                        </span>
                      )}
                    </div>

                    {/* Collapsed preview */}
                    {!isExpanded && (
                      <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{notice.content}</p>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={false}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/60 px-4 pb-4 pt-4 md:px-5">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {notice.content}
                        </p>
                        {(notice.attachments?.length ?? 0) > 0 && (
                          <NoticeAttachments attachments={notice.attachments!} />
                        )}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Last updated: {new Date(notice.updated_at).toLocaleString()}
                          </p>
                          {!notice.is_read && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notice.id); }}
                            >
                              <Eye className="h-4 w-4" /> Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
