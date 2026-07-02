import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Eye, TrendingUp, TrendingDown, Megaphone,
  Paperclip, FileText, Image as ImageIcon, X, Mail, Bell, Loader2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { cn } from '@/lib/utils';
import { noticeService, Notice, NoticeCreateUpdate, NoticeAttachment } from '@/services/noticeService';

type Priority = 'low' | 'normal' | 'high';

const PRIORITY_BADGE: Record<Priority, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  normal: 'bg-muted text-muted-foreground border-border',
  low: 'bg-info/10 text-info border-info/20',
};
const PRIORITY_LABEL: Record<Priority, string> = { high: 'High', normal: 'Normal', low: 'Low' };

const isImage = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

function AttachmentChip({ att }: { att: NoticeAttachment }) {
  const Icon = isImage(att.name) ? ImageIcon : FileText;
  return (
    <a
      href={att.file_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground hover:bg-accent transition-colors max-w-[220px]"
      title={att.name}
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{att.name}</span>
    </a>
  );
}

interface NoticeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  notice: Notice | null;
  onSaved: () => void;
}

function NoticeFormDialog({ open, onOpenChange, mode, notice, onSaved }: NoticeFormDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<NoticeCreateUpdate>({ title: '', content: '', priority: 'normal', is_published: true });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && notice) {
      setForm({ title: notice.title, content: notice.content, priority: notice.priority, is_published: notice.is_published });
    } else {
      setForm({ title: '', content: '', priority: 'normal', is_published: true });
    }
    setNewFiles([]);
    setRemoveIds([]);
  }, [open, mode, notice]);

  const existingAttachments = (notice?.attachments || []).filter((a) => !removeIds.includes(a.id));
  const isHigh = form.priority === 'high';

  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const isAllowedFile = (f: File) =>
    f.type === 'application/pdf' || f.type.startsWith('image/');

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const rejected = incoming.filter((f) => !isAllowedFile(f) || f.size > MAX_FILE_BYTES);
    if (rejected.length > 0) {
      toast({
        title: 'Some files were skipped',
        description: 'Only images and PDF files up to 10 MB are allowed.',
        variant: 'destructive',
      });
    }
    const accepted = incoming.filter((f) => isAllowedFile(f) && f.size <= MAX_FILE_BYTES);
    if (accepted.length > 0) setNewFiles((prev) => [...prev, ...accepted]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Title and content required', description: 'Please fill in both fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      if (mode === 'create') {
        await noticeService.createNotice(form, newFiles);
      } else if (notice) {
        await noticeService.updateNotice(notice.id, form, newFiles, removeIds);
      }
      toast({
        title: mode === 'create' ? 'Notice published' : 'Notice updated',
        description: form.is_published && isHigh
          ? 'All active students were emailed and notified.'
          : form.is_published
            ? 'An in-app notification was sent to recipients.'
            : 'Saved as a draft (unpublished).',
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast({ title: 'Error', description: `Failed to ${mode === 'create' ? 'create' : 'update'} notice.`, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create notice' : 'Edit notice'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Publish an announcement and attach files for students.' : 'Update this notice and its attachments.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter notice title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write the announcement…" rows={5} />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments <span className="text-muted-foreground font-normal">(images or PDF, up to 10 MB each)</span></Label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            {/* Drop zone — click or drag & drop */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={cn(
                'w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/40'
              )}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Paperclip className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Drop PDFs or images here, or <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF or PDF • max 10 MB each</p>
              </div>
            </button>

            {(existingAttachments.length > 0 || newFiles.length > 0) && (
              <div className="space-y-1.5 pt-1">
                {existingAttachments.map((att) => {
                  const Icon = isImage(att.name) ? ImageIcon : FileText;
                  return (
                    <div key={`e-${att.id}`} className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1" title={att.name}>{att.name}</span>
                      <Badge variant="secondary" className="shrink-0 text-[11px]">uploaded</Badge>
                      <button type="button" onClick={() => setRemoveIds((p) => [...p, att.id])} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Remove attachment">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {newFiles.map((f, idx) => {
                  const Icon = isImage(f.name) ? ImageIcon : FileText;
                  return (
                    <div key={`n-${idx}`} className="flex items-center gap-2.5 rounded-md border border-primary/30 bg-[hsl(var(--primary-muted))] px-3 py-2 text-sm text-primary">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1" title={f.name}>{f.name}</span>
                      <span className="text-xs shrink-0 opacity-80">{formatSize(f.size)}</span>
                      <button type="button" onClick={() => setNewFiles((p) => p.filter((_, i) => i !== idx))} className="hover:text-destructive shrink-0" aria-label="Remove file">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select value={form.priority} onValueChange={(value: Priority) => setForm({ ...form, priority: value })}>
                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2 h-9">
                <Switch id="published" checked={form.is_published} onCheckedChange={(checked) => setForm({ ...form, is_published: checked })} />
                <Label htmlFor="published" className="cursor-pointer">Publish now</Label>
              </div>
            </div>
          </div>

          {/* Routing explainer */}
          <div className={cn(
            'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
            isHigh ? 'border-destructive/20 bg-destructive/5 text-foreground' : 'border-border bg-muted/40 text-muted-foreground'
          )}>
            {isHigh ? <Mail className="w-4 h-4 mt-0.5 text-destructive shrink-0" /> : <Bell className="w-4 h-4 mt-0.5 shrink-0" />}
            <p>
              {isHigh
                ? <>This <span className="font-medium text-foreground">high-priority</span> notice will <span className="font-medium text-foreground">email every active student</span> (attachments included) and send an in-app notification.</>
                : <>Low and Normal notices send an <span className="font-medium text-foreground">in-app notification</span> only — no email.</>}
              {!form.is_published && ' Notifications are only sent once the notice is published.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : mode === 'create' ? 'Publish notice' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [engagementSummary, setEngagementSummary] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadNotices();
    loadEngagementSummary();
  }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await noticeService.getNotices({ page_size: 50 });
      setNotices(response.results);
    } catch (err) {
      setError('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementSummary = async () => {
    try {
      setEngagementSummary(await noticeService.getEngagementSummary());
    } catch {
      // Non-critical — the overview row is simply hidden on failure.
    }
  };

  const afterSave = () => {
    loadNotices();
    loadEngagementSummary();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await noticeService.deleteNotice(deleteTarget.id);
      setNotices((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      toast({ title: 'Notice deleted', description: `"${deleteTarget.title}" has been removed.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete notice.', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setEditOpen(true);
  };

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || notice.priority === priorityFilter;
    const matchesPublished = publishedFilter === 'all' ||
      (publishedFilter === 'published' && notice.is_published) ||
      (publishedFilter === 'unpublished' && !notice.is_published);
    return matchesSearch && matchesPriority && matchesPublished;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadNotices} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Notices &amp; updates</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish announcements, attach files, and reach students.</p>
        </div>
        <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create notice
        </Button>
      </div>

      {/* Engagement overview */}
      {engagementSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="surface p-4">
            <p className="text-[13px] font-medium text-muted-foreground">Total notices</p>
            <p className="mt-2 text-[26px] leading-none font-semibold tabular-nums">{engagementSummary.total_notices}</p>
          </div>
          <div className="surface p-4">
            <p className="text-[13px] font-medium text-muted-foreground">Avg engagement</p>
            <p className="mt-2 text-[26px] leading-none font-semibold tabular-nums">{engagementSummary.average_engagement}%</p>
          </div>
          <div className="surface p-4">
            <p className="text-[13px] font-medium text-muted-foreground">High engagement</p>
            <p className="mt-2 text-[26px] leading-none font-semibold tabular-nums text-success">{engagementSummary.high_engagement_notices}</p>
          </div>
          <div className="surface p-4">
            <p className="text-[13px] font-medium text-muted-foreground">Low engagement</p>
            <p className="mt-2 text-[26px] leading-none font-semibold tabular-nums text-destructive">{engagementSummary.low_engagement_notices}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="surface p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search notices…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={publishedFilter} onValueChange={setPublishedFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notices list */}
      {filteredNotices.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Megaphone className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">No notices found</p>
          <p className="text-sm text-muted-foreground">
            {searchTerm || priorityFilter !== 'all' || publishedFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Create your first notice to start communicating with students.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice, index) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
              className="surface p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{notice.title}</h3>
                    <Badge variant="outline" className={cn('font-medium', PRIORITY_BADGE[notice.priority])}>
                      {PRIORITY_LABEL[notice.priority]}
                    </Badge>
                    {!notice.is_published && <Badge variant="secondary">Draft</Badge>}
                    {notice.is_low_engagement && notice.is_published && (
                      <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        <TrendingDown className="w-3 h-3" /> Low engagement
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By {notice.created_by_name} • {new Date(notice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(notice)} aria-label="Edit notice">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(notice)} aria-label="Delete notice" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-3 line-clamp-3 whitespace-pre-line">{notice.content}</p>

              {notice.attachments && notice.attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  {notice.attachments.map((att) => <AttachmentChip key={att.id} att={att} />)}
                </div>
              )}

              {notice.is_published && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    {notice.read_count} / {notice.total_students} read
                  </span>
                  <span className={cn(
                    'flex items-center gap-1.5 font-medium',
                    notice.read_percentage >= 70 ? 'text-success' : notice.read_percentage >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                  )}>
                    {notice.read_percentage >= 40 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {notice.read_percentage}% engagement
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit dialogs */}
      <NoticeFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" notice={null} onSaved={afterSave} />
      <NoticeFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" notice={editingNotice} onSaved={afterSave} />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete notice
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete notice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
