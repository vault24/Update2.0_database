import { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type ComplaintCategory = 'academic' | 'system' | 'facility';
type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: 'low' | 'medium' | 'high';
  submittedBy: string;
  studentId: string;
  department: string;
  submittedAt: string;
  updatedAt: string;
  response?: string;
}

// Mock data
const mockComplaints: Complaint[] = [
  {
    id: 'CMP001',
    title: 'Incorrect marks in semester result',
    description: 'My physics marks are showing 45 but I scored 65 in the exam. Please verify and correct.',
    category: 'academic',
    status: 'pending',
    priority: 'high',
    submittedBy: 'Rahim Uddin',
    studentId: 'STU2024001',
    department: 'Computer Technology',
    submittedAt: '2026-01-20T10:30:00',
    updatedAt: '2026-01-20T10:30:00',
  },
  {
    id: 'CMP002',
    title: 'Unable to download admit card',
    description: 'The download button for admit card is not working. Getting error every time.',
    category: 'system',
    status: 'in_progress',
    priority: 'medium',
    submittedBy: 'Fatima Begum',
    studentId: 'STU2024015',
    department: 'Civil Technology',
    submittedAt: '2026-01-19T14:20:00',
    updatedAt: '2026-01-21T09:00:00',
    response: 'We are investigating the issue. Please try again in 24 hours.',
  },
  {
    id: 'CMP003',
    title: 'Broken chairs in Room 204',
    description: 'Multiple chairs are broken in classroom 204. Students are facing difficulty.',
    category: 'facility',
    status: 'resolved',
    priority: 'medium',
    submittedBy: 'Karim Hassan',
    studentId: 'STU2024022',
    department: 'Electrical Technology',
    submittedAt: '2026-01-15T11:00:00',
    updatedAt: '2026-01-18T16:30:00',
    response: 'New chairs have been installed. Thank you for reporting.',
  },
  {
    id: 'CMP004',
    title: 'Class schedule conflict',
    description: 'Two classes scheduled at the same time on Thursday - Math and English.',
    category: 'academic',
    status: 'resolved',
    priority: 'high',
    submittedBy: 'Nasir Ahmed',
    studentId: 'STU2024008',
    department: 'Mechanical Technology',
    submittedAt: '2026-01-17T09:15:00',
    updatedAt: '2026-01-19T11:00:00',
    response: 'Schedule has been updated. English moved to Friday.',
  },
  {
    id: 'CMP005',
    title: 'Login issues with student portal',
    description: 'Cannot login to student portal. Password reset not working either.',
    category: 'system',
    status: 'pending',
    priority: 'high',
    submittedBy: 'Sabina Khatun',
    studentId: 'STU2024031',
    department: 'Computer Technology',
    submittedAt: '2026-01-21T08:45:00',
    updatedAt: '2026-01-21T08:45:00',
  },
  {
    id: 'CMP006',
    title: 'Water dispenser not working',
    description: 'The water dispenser on 3rd floor has been out of service for a week.',
    category: 'facility',
    status: 'in_progress',
    priority: 'low',
    submittedBy: 'Abdul Karim',
    studentId: 'STU2024045',
    department: 'Electronics Technology',
    submittedAt: '2026-01-18T13:00:00',
    updatedAt: '2026-01-20T10:00:00',
    response: 'Maintenance team has been notified. Parts ordered.',
  },
  {
    id: 'CMP007',
    title: 'Missing attendance record',
    description: 'My attendance for the entire week of January 10-14 is not recorded.',
    category: 'academic',
    status: 'rejected',
    priority: 'medium',
    submittedBy: 'Jalal Uddin',
    studentId: 'STU2024019',
    department: 'Power Technology',
    submittedAt: '2026-01-16T15:30:00',
    updatedAt: '2026-01-17T09:00:00',
    response: 'Records show you were absent during that period. Please contact class teacher.',
  },
  {
    id: 'CMP008',
    title: 'AC not functioning in Lab 3',
    description: 'Air conditioning in Computer Lab 3 has stopped working. Very hot inside.',
    category: 'facility',
    status: 'pending',
    priority: 'high',
    submittedBy: 'Rafiq Islam',
    studentId: 'STU2024012',
    department: 'Computer Technology',
    submittedAt: '2026-01-21T11:00:00',
    updatedAt: '2026-01-21T11:00:00',
  },
];

const getStatusConfig = (status: ComplaintStatus) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock };
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: AlertCircle };
    case 'resolved':
      return { label: 'Resolved', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 };
    case 'rejected':
      return { label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground', icon: Clock };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high':
      return { label: 'High', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
    case 'medium':
      return { label: 'Medium', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
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
  const [activeTab, setActiveTab] = useState<ComplaintCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [responseText, setResponseText] = useState('');

  const filteredComplaints = mockComplaints.filter((complaint) => {
    const matchesCategory = activeTab === 'all' || complaint.category === activeTab;
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const stats = {
    total: mockComplaints.length,
    pending: mockComplaints.filter((c) => c.status === 'pending').length,
    inProgress: mockComplaints.filter((c) => c.status === 'in_progress').length,
    resolved: mockComplaints.filter((c) => c.status === 'resolved').length,
    academic: mockComplaints.filter((c) => c.category === 'academic').length,
    system: mockComplaints.filter((c) => c.category === 'system').length,
    facility: mockComplaints.filter((c) => c.category === 'facility').length,
  };

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponseText(complaint.response || '');
    setDetailsOpen(true);
  };

  const handleUpdateStatus = (status: ComplaintStatus) => {
    if (!selectedComplaint) return;
    toast.success(`Complaint ${selectedComplaint.id} status updated to ${status}`);
    setDetailsOpen(false);
  };

  const handleSubmitResponse = () => {
    if (!selectedComplaint || !responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    toast.success('Response submitted successfully');
    setDetailsOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats Cards */}
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

      {/* Filters and Tabs */}
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
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Complaints List */}
              <TabsContent value={activeTab} className="mt-0">
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
                            key={complaint.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <div className="p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                {/* Icon */}
                                <div className={`p-3 rounded-xl bg-muted/50 shrink-0 ${categoryConfig.color}`}>
                                  <CategoryIcon className="h-5 w-5" />
                                </div>

                                {/* Content */}
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

                                {/* Actions */}
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
                                      <DropdownMenuItem>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Add Response
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Details Dialog */}
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
              {/* Status and Priority */}
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

              {/* Complaint Info */}
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

              {/* Previous Response */}
              {selectedComplaint.response && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Previous Response:</p>
                  <p className="text-sm">{selectedComplaint.response}</p>
                </div>
              )}

              {/* Response Input */}
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

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSubmitResponse} className="gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Submit Response
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-1.5">
                      Update Status
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border z-50">
                    <DropdownMenuItem onClick={() => handleUpdateStatus('pending')}>
                      <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                      Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('in_progress')}>
                      <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
                      Mark as In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('resolved')}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Mark as Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('rejected')}>
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                      Mark as Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" onClick={() => setDetailsOpen(false)}>
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
