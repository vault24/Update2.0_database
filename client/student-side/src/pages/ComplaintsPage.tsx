import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Eye, Loader2, CheckCircle, GraduationCap, Monitor, Building,
  Send, MessageSquare, Calendar, ChevronDown, Search,
  FileText, Shield, Plus, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiClient, getErrorMessage, PaginatedResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AdmissionGuard } from '@/components/auth/AdmissionGuard';

type UiCategory = 'academic' | 'website' | 'facility';
type UiStatus = 'pending' | 'seen' | 'in_progress' | 'resolved';

interface UiComplaint {
  id: string;
  rawId: string;
  category: UiCategory;
  subcategory: string;
  title: string;
  description: string;
  status: UiStatus;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  response?: string;
  respondedBy?: string;
}

interface ComplaintApi {
  id: string;
  title: string;
  description: string;
  category: string;
  category_name: string;
  subcategory: string;
  subcategory_name: string;
  status: string;
  is_anonymous: boolean;
  response?: string;
  responded_by_name?: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
}

interface CategoryApi { id: string; name: string; label: string; }
interface SubcategoryApi { id: string; category: string; name: string; }

const statusConfig: Record<UiStatus, { label: string; icon: React.ElementType; color: string; dot: string; border: string }> = {
  pending:     { label: 'Pending',     icon: Clock,        color: 'text-amber-600',   dot: 'bg-amber-500',   border: 'border-l-amber-500' },
  seen:        { label: 'Seen',        icon: Eye,          color: 'text-blue-600',    dot: 'bg-blue-500',    border: 'border-l-blue-500' },
  in_progress: { label: 'In Progress', icon: Loader2,      color: 'text-purple-600',  dot: 'bg-purple-500',  border: 'border-l-purple-500' },
  resolved:    { label: 'Resolved',    icon: CheckCircle,  color: 'text-emerald-600', dot: 'bg-emerald-500', border: 'border-l-emerald-500' },
};

const categoryConfig: Record<UiCategory, { icon: React.ElementType; gradient: string; bg: string }> = {
  academic: { icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600',  bg: 'bg-blue-500/10 text-blue-600' },
  website:  { icon: Monitor,       gradient: 'from-purple-500 to-pink-600',   bg: 'bg-purple-500/10 text-purple-600' },
  facility: { icon: Building,      gradient: 'from-orange-500 to-red-600',    bg: 'bg-orange-500/10 text-orange-600' },
};

const toList = <T,>(p: PaginatedResponse<T> | T[]): T[] => Array.isArray(p) ? p : p.results;

const fetchAll = async <T,>(endpoint: string): Promise<T[]> => {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const res = await apiClient.get<PaginatedResponse<T> | T[]>(endpoint, { page });
    const cur = toList(res);
    all.push(...cur);
    if (Array.isArray(res) || !res.next) break;
    page++;
  }
  return all;
};

const normalizeStatus = (s: string): UiStatus => {
  if (s === 'closed') return 'resolved';
  if (s === 'pending' || s === 'seen' || s === 'in_progress' || s === 'resolved') return s;
  return 'pending';
};

const categoryKey = (value: string): UiCategory => {
  const t = value.toLowerCase();
  if (t.includes('academic')) return 'academic';
  if (t.includes('system') || t.includes('website') || t.includes('technical') || t.includes('portal')) return 'website';
  return 'facility';
};

const mapComplaint = (item: ComplaintApi): UiComplaint => ({
  id: item.reference_number || item.id,
  rawId: item.id,
  category: categoryKey(item.category_name || ''),
  subcategory: item.subcategory_name || 'General',
  title: item.title,
  description: item.description,
  status: normalizeStatus(item.status),
  isAnonymous: item.is_anonymous,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  response: item.response || undefined,
  respondedBy: item.responded_by_name || undefined,
});

// ── Sub-component: Complaint card ────────────────────────────────────────────
function ComplaintCard({ complaint, isExpanded, onToggle }: {
  complaint: UiComplaint;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const status = statusConfig[complaint.status];
  const StatusIcon = status.icon;
  const cat = categoryConfig[complaint.category];
  const CatIcon = cat.icon;

  return (
    <div
      className={cn(
        'surface-card overflow-hidden border-l-4 transition-colors cursor-pointer',
        status.border,
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      aria-expanded={isExpanded}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4 md:p-5">
        {/* Category icon chip */}
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', cat.bg)}>
          <CatIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-1 pr-1">{complaint.title}</h3>
            {/* Status badge */}
            <span className={cn('flex items-center gap-1 text-xs font-medium flex-shrink-0', status.color)}>
              <StatusIcon className={cn('w-3.5 h-3.5', complaint.status === 'in_progress' && 'animate-spin')} />
              <span className="hidden sm:inline">{status.label}</span>
            </span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 mb-2">{complaint.description}</p>

          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">{complaint.subcategory}</Badge>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(complaint.createdAt), 'MMM d, yyyy')}
            </span>
            {complaint.isAnonymous && (
              <Badge variant="outline" className="text-xs">Anonymous</Badge>
            )}
            <span className="ml-auto">
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-4 pb-4 pt-4 md:px-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Full Description</p>
                <p className="text-sm leading-relaxed">{complaint.description}</p>
              </div>

              {complaint.response && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      Response from {complaint.respondedBy || 'Admin'}
                    </span>
                  </div>
                  <p className="text-sm">{complaint.response}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground border-t border-border/50 pt-3">
                <span>Submitted: {format(new Date(complaint.createdAt), 'PPpp')}</span>
                <span>Updated: {format(new Date(complaint.updatedAt), 'PPpp')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-component: New report dialog form ────────────────────────────────────
function NewReportForm({
  categories, subcategories, onSuccess,
}: {
  categories: CategoryApi[];
  subcategories: SubcategoryApi[];
  onSuccess: (complaint: UiComplaint) => void;
}) {
  const { user } = useAuth();
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subcategoriesForCategory = useMemo(
    () => subcategories.filter((s) => s.category === categoryId),
    [subcategories, categoryId],
  );

  const handleSubmit = async () => {
    if (!user || !['student', 'captain'].includes(user.role)) {
      toast.error('Only student/captain accounts can submit complaints');
      return;
    }
    if (!categoryId || !subcategoryId || !title.trim() || !description.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await apiClient.post<ComplaintApi>('complaints/complaints/', {
        category: categoryId,
        subcategory: subcategoryId,
        title: title.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
      });
      onSuccess(mapComplaint(created));
      setCategoryId(''); setSubcategoryId(''); setTitle(''); setDescription(''); setIsAnonymous(false);
      toast.success('Report submitted successfully');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Category picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Category <span className="text-destructive">*</span></Label>
        {categories.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading categories…
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => {
              const key = categoryKey(`${cat.name} ${cat.label}`);
              const cfg = categoryConfig[key];
              const Icon = cfg.icon;
              const selected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategoryId(cat.id); setSubcategoryId(''); }}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.03] active:scale-[0.97]',
                    selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-lg mx-auto mb-1.5 flex items-center justify-center', cfg.bg)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium leading-tight block">{cat.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Subcategory */}
      {categoryId && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Issue Type <span className="text-destructive">*</span></Label>
          <Select value={subcategoryId} onValueChange={setSubcategoryId}>
            <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
            <SelectContent>
              {subcategoriesForCategory.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Title <span className="text-destructive">*</span></Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title for your report" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Description <span className="text-destructive">*</span></Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your issue in detail…"
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-xl border border-border">
        <Switch id="anon-switch" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
        <div className="flex-1">
          <Label htmlFor="anon-switch" className="cursor-pointer text-sm">Submit anonymously</Label>
          <p className="text-xs text-muted-foreground">Your identity will be hidden from admins</p>
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full gap-2" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit Report
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<UiComplaint[]>([]);
  const [categories, setCategories] = useState<CategoryApi[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryApi[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    silent ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const [complaintsRes, categoriesRes, subcategoriesRes] = await Promise.all([
        fetchAll<ComplaintApi>('complaints/complaints/'),
        fetchAll<CategoryApi>('complaints/categories/'),
        fetchAll<SubcategoryApi>('complaints/subcategories/'),
      ]);
      setComplaints(complaintsRes.map(mapComplaint));
      setCategories(categoriesRes);
      setSubcategories(subcategoriesRes);
      if (silent) toast.success('Refreshed');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const id = setInterval(() => loadData(true), 30_000);
    return () => clearInterval(id);
  }, []);

  const stats = {
    total:      complaints.length,
    pending:    complaints.filter((c) => c.status === 'pending').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress' || c.status === 'seen').length,
    resolved:   complaints.filter((c) => c.status === 'resolved').length,
  };

  const filterComplaints = (tab: string) =>
    complaints
      .filter((c) => {
        if (tab === 'all') return true;
        if (tab === 'in_progress') return c.status === 'in_progress' || c.status === 'seen';
        return c.status === tab;
      })
      .filter((c) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.subcategory.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      });

  const handleNewComplaint = (complaint: UiComplaint) => {
    setComplaints((prev) => [complaint, ...prev]);
    setIsDialogOpen(false);
  };

  return (
    <AdmissionGuard>
      <div className="max-w-full space-y-5 overflow-x-clip md:space-y-6">

        {/* ── Header ── */}
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="surface-card relative overflow-hidden">
          <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive to-orange-600 shadow-sm">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold md:text-2xl">Report Center</h1>
                <p className="text-sm text-muted-foreground">Submit and track your complaints</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                aria-label="Refresh complaints"
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 shadow-sm">
                    <Plus className="w-4 h-4" />
                    New Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Submit a Report
                    </DialogTitle>
                    <DialogDescription>
                      Fill in the details and submit your complaint for review.
                    </DialogDescription>
                  </DialogHeader>
                  <NewReportForm
                    categories={categories}
                    subcategories={subcategories}
                    onSuccess={handleNewComplaint}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
          {[
            { label: 'Total',       value: stats.total,      icon: FileText,      chip: 'bg-primary/10 text-primary' },
            { label: 'Pending',     value: stats.pending,    icon: Clock,         chip: 'bg-amber-500/10 text-amber-600' },
            { label: 'In Progress', value: stats.inProgress, icon: AlertCircle,   chip: 'bg-purple-500/10 text-purple-600' },
            { label: 'Resolved',    value: stats.resolved,   icon: CheckCircle,   chip: 'bg-emerald-500/10 text-emerald-600' },
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

        {/* ── Search ── */}
        <div className="surface-card p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, description or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* ── List ── */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="w-full grid grid-cols-4 bg-muted/50 p-1 rounded-xl">
              {[
                { value: 'all',         label: 'All',      count: stats.total },
                { value: 'pending',     label: 'Pending',  count: stats.pending },
                { value: 'in_progress', label: 'Progress', count: stats.inProgress },
                { value: 'resolved',    label: 'Resolved', count: stats.resolved },
              ].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg text-xs sm:text-sm gap-1.5">
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="hidden sm:inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {['all', 'pending', 'in_progress', 'resolved'].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                {filterComplaints(tab).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-14 flex flex-col items-center gap-2 text-center">
                      <FileText className="w-10 h-10 text-muted-foreground/40" />
                      <p className="font-medium text-muted-foreground">No reports found</p>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground">Try a different search term</p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filterComplaints(tab).map((complaint) => (
                    <ComplaintCard
                      key={complaint.rawId}
                      complaint={complaint}
                      isExpanded={expandedId === complaint.rawId}
                      onToggle={() => setExpandedId(expandedId === complaint.rawId ? null : complaint.rawId)}
                    />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AdmissionGuard>
  );
}
