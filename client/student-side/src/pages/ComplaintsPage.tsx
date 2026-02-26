import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Eye, Loader2, CheckCircle, GraduationCap, Monitor, Building,
  Send, MessageSquare, Calendar, ChevronDown, ChevronUp, Search,
  TrendingUp, FileText, Shield, Plus, RefreshCw
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
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiClient, getErrorMessage, PaginatedResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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

interface CategoryApi {
  id: string;
  name: string;
  label: string;
}

interface SubcategoryApi {
  id: string;
  category: string;
  name: string;
}

const statusConfig: Record<UiStatus, { label: string; icon: any; color: string; dotColor: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', dotColor: 'bg-amber-500' },
  seen: { label: 'Seen', icon: Eye, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', dotColor: 'bg-blue-500' },
  in_progress: { label: 'In Progress', icon: Loader2, color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', dotColor: 'bg-purple-500' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', dotColor: 'bg-emerald-500' },
};

const categoryConfig: Record<UiCategory, { icon: any; color: string; bgColor: string }> = {
  academic: { icon: GraduationCap, color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500/10' },
  website: { icon: Monitor, color: 'from-purple-500 to-pink-600', bgColor: 'bg-purple-500/10' },
  facility: { icon: Building, color: 'from-orange-500 to-red-600', bgColor: 'bg-orange-500/10' },
};

const toList = <T,>(payload: PaginatedResponse<T> | T[]): T[] =>
  Array.isArray(payload) ? payload : payload.results;

const fetchAll = async <T,>(endpoint: string): Promise<T[]> => {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const response = await apiClient.get<PaginatedResponse<T> | T[]>(endpoint, { page });
    const current = toList(response);
    all.push(...current);

    if (Array.isArray(response) || !response.next) break;
    page += 1;
  }

  return all;
};

const normalizeStatus = (status: string): UiStatus => {
  if (status === 'closed') return 'resolved';
  if (status === 'pending' || status === 'seen' || status === 'in_progress' || status === 'resolved') return status;
  return 'pending';
};

const categoryKeyFromText = (value: string): UiCategory => {
  const text = value.toLowerCase();
  if (text.includes('academic')) return 'academic';
  if (text.includes('system') || text.includes('website') || text.includes('technical') || text.includes('portal')) return 'website';
  return 'facility';
};

const mapComplaint = (item: ComplaintApi): UiComplaint => ({
  id: item.reference_number || item.id,
  rawId: item.id,
  category: categoryKeyFromText(item.category_name || ''),
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

export default function ComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<UiComplaint[]>([]);
  const [categories, setCategories] = useState<CategoryApi[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryApi[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [complaintsRes, categoriesRes, subcategoriesRes] = await Promise.all([
        fetchAll<ComplaintApi>('complaints/complaints/'),
        fetchAll<CategoryApi>('complaints/categories/'),
        fetchAll<SubcategoryApi>('complaints/subcategories/'),
      ]);

      setComplaints(complaintsRes.map(mapComplaint));
      setCategories(categoriesRes);
      setSubcategories(subcategoriesRes);
      setLastUpdated(new Date());
      
      if (showRefreshIndicator) {
        toast.success('Complaints refreshed');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds to check for status updates
    const intervalId = setInterval(() => {
      loadData(true);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId]
  );

  const subcategoriesForCategory = useMemo(
    () => subcategories.filter((s) => s.category === categoryId),
    [subcategories, categoryId]
  );

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    if (!['student', 'captain'].includes(user.role)) {
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

      setComplaints((prev) => [mapComplaint(created), ...prev]);
      setIsDialogOpen(false);
      setCategoryId('');
      setSubcategoryId('');
      setTitle('');
      setDescription('');
      setIsAnonymous(false);
      toast.success('Report submitted successfully');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress' || c.status === 'seen').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  const filteredComplaints = (status: string) => {
    return complaints
      .filter(c => {
        if (status === 'all') return true;
        if (status === 'in_progress') return c.status === 'in_progress' || c.status === 'seen';
        return c.status === status;
      })
      .filter(c => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.subcategory.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-full overflow-x-hidden"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-destructive/10 via-orange-500/5 to-amber-500/10 rounded-2xl border border-destructive/20 p-6">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-destructive/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive to-orange-600 flex items-center justify-center shadow-lg shadow-destructive/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Report Center</h1>
              <p className="text-muted-foreground">Submit and track your complaints and feedback</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2 shadow-lg">
                  <Plus className="w-5 h-5" />
                  New Report
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Submit a Report
                </DialogTitle>
                <DialogDescription>
                  Fill in the issue details and submit your complaint for review.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-3">
                  <Label>Select Category *</Label>
                  {categories.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                      Loading categories...
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {categories.map((cat) => {
                        const key = categoryKeyFromText(`${cat.name} ${cat.label}`);
                        const config = categoryConfig[key];
                        const Icon = config.icon;
                        const isSelected = categoryId === cat.id;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation();
                              setCategoryId(cat.id); 
                              setSubcategoryId(''); 
                              console.log('Category selected:', cat.id, cat.label);
                            }}
                            className={cn(
                              'p-3 rounded-xl border-2 transition-all text-center cursor-pointer hover:scale-105',
                              isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-primary/5'
                            )}
                          >
                            <div className={cn('w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center', config.bgColor)}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium">{cat.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <Label>Issue Type *</Label>
                    <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                      <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
                      <SelectContent>
                        {subcategoriesForCategory.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title for your report"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  <div className="flex-1">
                    <Label className="cursor-pointer">Submit anonymously</Label>
                    <p className="text-xs text-muted-foreground">Your identity will be hidden</p>
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full gap-2" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Report
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-xs text-muted-foreground text-center -mt-2">
          Last updated: {format(lastUpdated, 'PPpp')}
          {isRefreshing && <span className="ml-2 text-primary">• Refreshing...</span>}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Reports</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Resolution Rate</span>
            </div>
            <span className="text-sm font-bold text-primary">{resolutionRate}%</span>
          </div>
          <Progress value={resolutionRate} className="h-2" />
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg text-xs sm:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-lg text-xs sm:text-sm">Progress</TabsTrigger>
            <TabsTrigger value="resolved" className="rounded-lg text-xs sm:text-sm">Resolved</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'in_progress', 'resolved'].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              <AnimatePresence mode="popLayout">
                {filteredComplaints(tab).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No reports found</p>
                  </motion.div>
                ) : (
                  filteredComplaints(tab).map((complaint, idx) => {
                    const status = statusConfig[complaint.status];
                    const StatusIcon = status.icon;
                    const catConfig = categoryConfig[complaint.category];
                    const CatIcon = catConfig.icon;
                    const isExpanded = expandedId === complaint.rawId;

                    return (
                      <motion.div
                        key={complaint.rawId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: idx * 0.03 }}
                        layout
                      >
                        <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
                          <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : complaint.rawId)}>
                            <CardContent className="p-0">
                              <CollapsibleTrigger asChild>
                                <button className="w-full p-4 text-left">
                                  <div className="flex gap-3">
                                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br', catConfig.color)}>
                                      <CatIcon className="w-6 h-6 text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="font-semibold text-sm line-clamp-1">{complaint.title}</h3>
                                        <Badge variant="outline" className={cn('text-xs flex-shrink-0', status.color)}>
                                          <StatusIcon className={cn('w-3 h-3 mr-1', complaint.status === 'in_progress' && 'animate-spin')} />
                                          {status.label}
                                        </Badge>
                                      </div>

                                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{complaint.description}</p>

                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary" className="text-xs">{complaint.subcategory}</Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {format(new Date(complaint.createdAt), 'MMM d, yyyy')}
                                        </span>
                                        {complaint.isAnonymous && (
                                          <Badge variant="outline" className="text-xs">Anonymous</Badge>
                                        )}
                                        <span className="ml-auto">
                                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="px-4 pb-4 pt-0 border-t border-border/50 mt-0"
                                >
                                  <div className="pt-4 space-y-4">
                                    <div>
                                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Full Description</h4>
                                      <p className="text-sm">{complaint.description}</p>
                                    </div>

                                    {complaint.response && (
                                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                                        <div className="flex items-center gap-2 mb-2">
                                          <MessageSquare className="w-4 h-4 text-primary" />
                                          <span className="text-xs font-medium text-primary">Response from {complaint.respondedBy || 'Admin'}</span>
                                        </div>
                                        <p className="text-sm text-foreground">{complaint.response}</p>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                                      <span>Submitted: {format(new Date(complaint.createdAt), 'PPpp')}</span>
                                      <span>Updated: {format(new Date(complaint.updatedAt), 'PPpp')}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              </CollapsibleContent>
                            </CardContent>
                          </Collapsible>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </motion.div>
  );
}
