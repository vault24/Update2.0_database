import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquareWarning,
  GraduationCap,
  Monitor,
  Building2,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  MoreHorizontal,
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient, getErrorMessage, PaginatedResponse } from '@/lib/api';

type ComplaintCategory = 'academic' | 'system' | 'facility';
type ComplaintStatus = 'pending' | 'seen' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
type ComplaintPriority = 'low' | 'normal' | 'high' | 'urgent';

interface ComplaintApi {
  id: string;
  title: string;
  description: string;
  category_name: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  reporter_name_display: string;
  student?: string | null;
  department_name?: string | null;
  reference_number?: string;
  response?: string;
  created_at: string;
  updated_at: string;
}

interface Complaint {
  rawId: string;
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  submittedBy: string;
  studentId: string;
  department: string;
  submittedAt: string;
  updatedAt: string;
  response?: string;
}

const toList = <T,>(payload: PaginatedResponse<T> | T[]): T[] =>
  Array.isArray(payload) ? payload : payload.results;

const categoryFromText = (value: string): ComplaintCategory => {
  const text = value.toLowerCase();
  if (text.includes('academic')) return 'academic';
  if (text.includes('system') || text.includes('website') || text.includes('technical') || text.includes('portal')) return 'system';
  return 'facility';
};

const mapComplaint = (item: ComplaintApi): Complaint => ({
  rawId: item.id,
  id: item.reference_number || item.id.slice(0, 8),
  title: item.title,
  description: item.description,
  category: categoryFromText(item.category_name || ''),
  status: item.status,
  priority: item.priority,
  submittedBy: item.reporter_name_display || 'Unknown',
  studentId: item.student ? item.student.slice(0, 8) : '-',
  department: item.department_name || 'N/A',
  submittedAt: item.created_at,
  updatedAt: item.updated_at,
  response: item.response || undefined,
});

const getStatusConfig = (status: ComplaintStatus) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock };
    case 'seen':
      return { label: 'Seen', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: Eye };
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: AlertCircle };
    case 'resolved':
      return { label: 'Resolved', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 };
    case 'closed':
      return { label: 'Closed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 };
    case 'rejected':
      return { label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground', icon: Clock };
  }
};

const getPriorityConfig = (priority: ComplaintPriority) => {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
    case 'high':
      return { label: 'High', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
    case 'normal':
      return { label: 'Normal', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
    case 'low':
      return { label: 'Low', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
    default:
      return { label: priority, color: 'bg-muted text-muted-foreground' };
  }
};

const getCategoryConfig = (category: ComplaintCategory) => {
  switch (category) {
    case 'academic':
      return { label: 'Academic', icon: GraduationCap, color: 'text-blue-500' };
    case 'system':
      return { label: 'System/Website', icon: Monitor, color: 'text-purple-500' };
    case 'facility':
      return { label: 'Facility', icon: Building2, color: 'text-green-500' };
    default:
      return { label: category, icon: MessageSquareWarning, color: 'text-muted-foreground' };
  }
};

export default function Complaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<ComplaintCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadComplaints = async (selectedRawId?: string) => {
    setIsLoading(true);
    try {
      const all: ComplaintApi[] = [];
      let page = 1;

      while (true) {
        const response = await apiClient.get<PaginatedResponse<ComplaintApi> | ComplaintApi[]>('complaints/complaints/', { page });
        const current = toList(response);
        all.push(...current);

        if (Array.isArray(response) || !response.next) break;
        page += 1;
      }

      const mapped = all.map(mapComplaint);
      setComplaints(mapped);
      if (selectedRawId) {
        const refreshed = mapped.find((item) => item.rawId === selectedRawId) || null;
        setSelectedComplaint(refreshed);
        setResponseText(refreshed?.response || '');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesCategory = activeTab === 'all' || complaint.category === activeTab;
      const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query ||
        complaint.title.toLowerCase().includes(query) ||
        complaint.submittedBy.toLowerCase().includes(query) ||
        complaint.id.toLowerCase().includes(query);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [complaints, activeTab, statusFilter, searchQuery]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'pending').length,
    inProgress: complaints.filter((c) => c.status === 'seen' || c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length,
    academic: complaints.filter((c) => c.category === 'academic').length,
    system: complaints.filter((c) => c.category === 'system').length,
    facility: complaints.filter((c) => c.category === 'facility').length,
  };

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponseText(complaint.response || '');
    setDetailsOpen(true);
  };

  const handleUpdateStatus = async (status: ComplaintStatus) => {
    if (!selectedComplaint) return;

    setIsActionLoading(true);
    try {
      if (status === 'seen') {
        await apiClient.post(`complaints/complaints/${selectedComplaint.rawId}/mark_seen/`, {});
      } else {
        const effectiveResponse = responseText.trim() || selectedComplaint.response || '';
        if (!effectiveResponse) {
          toast.error('Please add a response before updating this status');
          return;
        }
        await apiClient.post(`complaints/complaints/${selectedComplaint.rawId}/add_response/`, {
          response: effectiveResponse,
          status,
        });
      }

      await loadComplaints(selectedComplaint.rawId);
      toast.success(`Complaint ${selectedComplaint.id} updated`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedComplaint) return;
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setIsActionLoading(true);
    try {
      const nextStatus: ComplaintStatus =
        selectedComplaint.status === 'pending' || selectedComplaint.status === 'seen'
          ? 'in_progress'
          : selectedComplaint.status;

      await apiClient.post(`complaints/complaints/${selectedComplaint.rawId}/add_response/`, {
        response: responseText.trim(),
        status: nextStatus,
      });

      await loadComplaints(selectedComplaint.rawId);
      toast.success('Response submitted successfully');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareWarning className="h-7 w-7 text-primary" />
            Complaints Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage student complaints across all categories
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
      >
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.academic}</p>
            <p className="text-xs text-muted-foreground">Academic</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.system}</p>
            <p className="text-xs text-muted-foreground">System</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.facility}</p>
            <p className="text-xs text-muted-foreground">Facility</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ComplaintCategory | 'all')}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
                  <TabsTrigger value="all" className="data-[state=active]:bg-background gap-2">
                    <MessageSquareWarning className="h-4 w-4" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="academic" className="data-[state=active]:bg-background gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Academic
                  </TabsTrigger>
                  <TabsTrigger value="system" className="data-[state=active]:bg-background gap-2">
                    <Monitor className="h-4 w-4" />
                    System/Website
                  </TabsTrigger>
                  <TabsTrigger value="facility" className="data-[state=active]:bg-background gap-2">
                    <Building2 className="h-4 w-4" />
                    Facility
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search complaints..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-64 bg-background"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ComplaintStatus | 'all')}>
                    <SelectTrigger className="w-full sm:w-40 bg-background">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="seen">Seen</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value={activeTab} className="mt-0">
                {isLoading ? (
                  <div className="text-center py-14">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filteredComplaints.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12 text-muted-foreground"
                        >
                          <MessageSquareWarning className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No complaints found</p>
                        </motion.div>
                      ) : (
                        filteredComplaints.map((complaint, index) => {
                          const statusConfig = getStatusConfig(complaint.status);
                          const priorityConfig = getPriorityConfig(complaint.priority);
                          const categoryConfig = getCategoryConfig(complaint.category);
                          const StatusIcon = statusConfig.icon;
                          const CategoryIcon = categoryConfig.icon;

                          return (
                            <motion.div
                              key={complaint.rawId}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              className="group"
                            >
                              <div className="p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                  <div className={`p-3 rounded-xl bg-muted/50 shrink-0 ${categoryConfig.color}`}>
                                    <CategoryIcon className="h-5 w-5" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                          {complaint.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                          {complaint.description}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className={priorityConfig.color}>
                                          {priorityConfig.label}
                                        </Badge>
                                        <Badge variant="outline" className={statusConfig.color}>
                                          <StatusIcon className="h-3 w-3 mr-1" />
                                          {statusConfig.label}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {complaint.submittedBy}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span className="font-mono">{complaint.studentId}</span>
                                      </span>
                                      <span>{complaint.department}</span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(complaint.submittedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDetails(complaint)}
                                      className="gap-1.5"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                                        <DropdownMenuItem onClick={() => handleViewDetails(complaint)}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleViewDetails(complaint)}>
                                          <MessageSquare className="h-4 w-4 mr-2" />
                                          Add Response
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleViewDetails(complaint)}>
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Mark Resolved
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              Complaint Details
            </DialogTitle>
            <DialogDescription>
              {selectedComplaint?.id} - Submitted on{' '}
              {selectedComplaint && new Date(selectedComplaint.submittedAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getStatusConfig(selectedComplaint.status).color}>
                  {getStatusConfig(selectedComplaint.status).label}
                </Badge>
                <Badge variant="outline" className={getPriorityConfig(selectedComplaint.priority).color}>
                  {getPriorityConfig(selectedComplaint.priority).label} Priority
                </Badge>
                <Badge variant="outline" className="bg-muted">
                  {getCategoryConfig(selectedComplaint.category).label}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{selectedComplaint.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedComplaint.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Submitted By:</span>
                    <p className="font-medium">{selectedComplaint.submittedBy}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Student ID:</span>
                    <p className="font-medium font-mono">{selectedComplaint.studentId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department:</span>
                    <p className="font-medium">{selectedComplaint.department}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <p className="font-medium">{new Date(selectedComplaint.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selectedComplaint.response && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Previous Response:</p>
                  <p className="text-sm">{selectedComplaint.response}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Add/Update Response</label>
                <Textarea
                  placeholder="Enter your response to this complaint..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={3}
                  className="bg-background"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSubmitResponse} className="gap-1.5" disabled={isActionLoading}>
                  {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Submit Response
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-1.5" disabled={isActionLoading}>
                      Update Status
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border z-50">
                    <DropdownMenuItem onClick={() => handleUpdateStatus('pending')}>
                      <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                      Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('seen')}>
                      <Eye className="h-4 w-4 mr-2 text-indigo-500" />
                      Mark as Seen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('in_progress')}>
                      <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
                      Mark as In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('resolved')}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Mark as Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('closed')}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                      Mark as Closed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('rejected')}>
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                      Mark as Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" onClick={() => setDetailsOpen(false)} disabled={isActionLoading}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
