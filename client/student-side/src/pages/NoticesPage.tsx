import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Calendar, AlertTriangle, Info, Megaphone, Loader2, Eye,
  Bell, ChevronDown, CheckCheck, User,
  Paperclip, FileText, Download, ExternalLink, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { noticeService, Notice } from '@/services/noticeService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

type Priority = 'low' | 'normal' | 'high';

const priorityConfig: Record<Priority, {
  icon: React.ElementType;
  label: string;
  chip: string;
  accent: string;
  pill: string;
}> = {
  high:   { icon: AlertTriangle, label: 'Urgent',  chip: 'bg-destructive/10 text-destructive',  accent: 'border-l-destructive', pill: 'bg-destructive/10 text-destructive border-destructive/20' },
  normal: { icon: Info,          label: 'Normal',  chip: 'bg-primary/10 text-primary',          accent: 'border-l-primary',     pill: 'bg-primary/10 text-primary border-primary/20' },
  low:    { icon: Megaphone,     label: 'General', chip: 'bg-muted text-muted-foreground',       accent: 'border-l-border',      pill: 'bg-muted text-muted-foreground border-border' },
};

const PRIORITY_TABS = [
  { value: 'all',    label: 'All' },
  { value: 'high',   label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'low',    label: 'General' },
] as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const isImage = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

function NoticeAttachments({ attachments }: { attachments: NonNullable<Notice['attachments']> }) {
  const images = attachments.filter((a) => a.file_url && isImage(a.name));
  const files  = attachments.filter((a) => a.file_url && !isImage(a.name));

  return (
    <div className="mt-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Attachments ({attachments.length})
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.map((att) => (
            <a
              key={att.id}
              href={att.file_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={att.file_url!}
                alt={att.name}
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-white">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{att.name}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{att.name}</p>
                <p className="text-xs text-muted-foreground">Document</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  <a href={att.file_url!} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" /> View
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <a href={att.file_url!} download={att.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
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
  const [notices, setNotices]             = useState<Notice[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [searchTerm, setSearchTerm]       = useState('');
  const [priorityTab, setPriorityTab]     = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [expandedId, setExpandedId]       = useState<number | null>(null);
  const [bulkLoading, setBulkLoading]     = useState(false);

  useEffect(() => { loadNotices(); }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await noticeService.getNotices({ page_size: 50 });
      setNotices(res.results);
    } catch {
      setError('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: number) => {
    try {
      await noticeService.markAsRead(id);
      setNotices((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    const unread = filteredNotices.filter((n) => !n.is_read).map((n) => n.id);
    if (!unread.length) return;
    try {
      setBulkLoading(true);
      await noticeService.bulkMarkAsRead(unread);
      setNotices((prev) => prev.map((n) => unread.includes(n.id) ? { ...n, is_read: true } : n));
    } catch { /* silent */ } finally { setBulkLoading(false); }
  };

  const filteredNotices = notices.filter((n) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchesPriority = priorityTab === 'all' || n.priority === priorityTab;
    const matchesRead = !showUnreadOnly || !n.is_read;
    return matchesSearch && matchesPriority && matchesRead;
  });

  const unreadCount  = notices.filter((n) => !n.is_read).length;
  const urgentCount  = notices.filter((n) => n.priority === 'high').length;
  const hasFilters   = !!searchTerm || priorityTab !== 'all' || showUnreadOnly;
  const unreadInView = filteredNotices.filter((n) => !n.is_read).length;

  if (loading) return <LoadingState message="Loading notices..." />;
  if (error)   return <ErrorState error={error} onRetry={loadNotices} />;

  return (
    <div className="max-w-full space-y-4 overflow-x-clip">

      {/* ── Page title row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold md:text-2xl">Notices</h1>
          <p className="text-sm text-muted-foreground">Important announcements for you</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={markAllRead}
            disabled={bulkLoading}
          >
            {bulkLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </Button>
        )}
      </div>

      {/* ── Stat pills row ── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        {[
          { label: `${notices.length} Total`,   icon: Bell,          chip: 'bg-primary/10 text-primary' },
          { label: `${unreadCount} Unread`,     icon: Bell,          chip: unreadCount > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground' },
          { label: `${urgentCount} Urgent`,     icon: AlertTriangle, chip: urgentCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground' },
        ].map((s) => (
          <div key={s.label} className={cn('flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium flex-shrink-0', s.chip)}>
            <s.icon className="h-4 w-4" />
            {s.label}
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notices…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 rounded-2xl"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Priority tab strip + unread toggle ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Scrollable tab strip */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {PRIORITY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPriorityTab(tab.value)}
              className={cn(
                'flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                priorityTab === tab.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Unread filter toggle */}
        <button
          onClick={() => setShowUnreadOnly((v) => !v)}
          className={cn(
            'flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border',
            showUnreadOnly
              ? 'bg-amber-500/10 text-amber-700 border-amber-300'
              : 'bg-transparent text-muted-foreground border-border hover:border-primary/40',
          )}
        >
          Unread only
        </button>
      </div>

      {/* ── Notices list ── */}
      {filteredNotices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices found"
          message={hasFilters ? 'Try adjusting your filters.' : 'No notices yet — check back later.'}
          action={hasFilters ? {
            label: 'Clear filters',
            onClick: () => { setSearchTerm(''); setPriorityTab('all'); setShowUnreadOnly(false); },
          } : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {/* Unread-in-view indicator */}
          {unreadInView > 0 && (
            <p className="text-xs text-muted-foreground px-1">
              {unreadInView} unread in view
            </p>
          )}

          {filteredNotices.map((notice) => {
            const cfg       = priorityConfig[notice.priority];
            const Icon      = cfg.icon;
            const isExpanded = expandedId === notice.id;

            const toggle = () => {
              setExpandedId(isExpanded ? null : notice.id);
              if (!notice.is_read && !isExpanded) markRead(notice.id);
            };

            return (
              <div
                key={notice.id}
                className={cn(
                  'surface-card overflow-hidden border-l-4 transition-shadow hover:shadow-md',
                  notice.is_read ? 'border-l-transparent' : cfg.accent,
                )}
              >
                {/* Card header — tap to expand */}
                <button
                  onClick={toggle}
                  className="w-full text-left p-4 md:p-5"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-3">
                    {/* Priority icon */}
                    <div className={cn('mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', cfg.chip)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className={cn(
                            'font-semibold text-sm leading-snug',
                            notice.is_read ? 'text-muted-foreground' : 'text-foreground',
                          )}>
                            {notice.title}
                          </h3>
                          {!notice.is_read && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform mt-0.5', isExpanded && 'rotate-180')} />
                      </div>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(notice.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {notice.created_by_name}
                        </span>
                        {(notice.attachments?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Paperclip className="h-3 w-3" />
                            {notice.attachments!.length}
                          </span>
                        )}
                        {/* Priority pill — mobile visible */}
                        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', cfg.pill)}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Preview (collapsed only) */}
                      {!isExpanded && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{notice.content}</p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/60 px-4 pb-5 pt-4 md:px-5 space-y-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {notice.content}
                        </p>

                        {(notice.attachments?.length ?? 0) > 0 && (
                          <NoticeAttachments attachments={notice.attachments!} />
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(notice.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          {!notice.is_read && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={(e) => { e.stopPropagation(); markRead(notice.id); }}
                            >
                              <Eye className="h-3.5 w-3.5" /> Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
