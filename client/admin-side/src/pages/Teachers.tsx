import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Inbox, Search, Filter, Check, X, Eye, Calendar, Mail, Phone, Briefcase, Building2, Award, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { teacherService, type TeacherSignupRequest, type TeacherStats, type Teacher, type TeacherFilters } from '@/services/teacherService';
import { getErrorMessage } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import departmentService from '@/services/departmentService';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const TeacherRequestsTab = () => {
  const [requests, setRequests] = useState<TeacherSignupRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TeacherSignupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<TeacherStats | null>(null);
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<TeacherSignupRequest | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Approval form state
  const [joiningDate, setJoiningDate] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [statusFilter]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, statusFilter]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: any = { page_size: 100 };
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const response = await teacherService.getTeacherRequests(filters);
      setRequests(response.results || []);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: `Failed to load teacher requests: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await teacherService.getTeacherRequestStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        (req.full_name_english || '').toLowerCase().includes(query) ||
        (req.full_name_bangla || '').toLowerCase().includes(query) ||
        (req.email || '').toLowerCase().includes(query) ||
        (req.designation || '').toLowerCase().includes(query) ||
        (req.department_name || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredRequests(filtered);
  };

  const handleView = (request: TeacherSignupRequest) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
  };

  const handleApprove = (request: TeacherSignupRequest) => {
    setSelectedRequest(request);
    setJoiningDate('');
    setSubjects([]);
    setSubjectInput('');
    setReviewNotes('');
    setApproveModalOpen(true);
  };

  const handleReject = (request: TeacherSignupRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;

    try {
      setIsProcessing(true);
      await teacherService.approveTeacherRequest(selectedRequest.id, {
        joining_date: joiningDate,
        subjects: subjects,
        review_notes: reviewNotes,
      });
      
      toast({
        title: 'Request Approved',
        description: `${selectedRequest.full_name_english}'s teacher account has been created successfully.`,
      });

      setApproveModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await teacherService.rejectTeacherRequest(selectedRequest.id, {
        review_notes: rejectionReason,
      });
      
      toast({
        title: 'Request Rejected',
        description: `${selectedRequest.full_name_english}'s signup request has been rejected.`,
      });

      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <X className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Teacher Signup Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={fetchRequests} className="mt-4">Try Again</Button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teacher requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{request.full_name_english}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{request.full_name_bangla}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          <span>{request.designation}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{request.department_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>{request.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{request.mobile_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Submitted: {new Date(request.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleView(request)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(request)}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleReject(request)}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRequest.full_name_english}</DialogTitle>
                <DialogDescription>{selectedRequest.full_name_bangla}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Designation</Label>
                    <p className="font-medium">{selectedRequest.designation}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Department</Label>
                    <p className="font-medium">{selectedRequest.department_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Mobile</Label>
                    <p className="font-medium">{selectedRequest.mobile_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Office Location</Label>
                    <p className="font-medium">{selectedRequest.office_location || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                </div>
                {selectedRequest.qualifications && selectedRequest.qualifications.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Qualifications</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRequest.qualifications.map((qual, idx) => (
                        <Badge key={idx} variant="secondary">{qual}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRequest.specializations && selectedRequest.specializations.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Specializations</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRequest.specializations.map((spec, idx) => (
                        <Badge key={idx} variant="outline">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-muted-foreground">Submitted At</Label>
                  <p className="font-medium">{new Date(selectedRequest.submitted_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {selectedRequest.reviewed_at && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Reviewed At</Label>
                    <p className="font-medium">{new Date(selectedRequest.reviewed_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                {selectedRequest.review_notes && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Review Notes</Label>
                    <p className="font-medium">{selectedRequest.review_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Teacher Request</DialogTitle>
            <DialogDescription>
              Approve {selectedRequest?.full_name_english}'s teacher signup request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="joiningDate">Joining Date <span className="text-destructive">*</span></Label>
              <Input
                id="joiningDate"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subjects">Subjects (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="subjects"
                  placeholder="Enter subject name"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && subjectInput.trim()) {
                      e.preventDefault();
                      setSubjects([...subjects, subjectInput.trim()]);
                      setSubjectInput('');
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (subjectInput.trim()) {
                      setSubjects([...subjects, subjectInput.trim()]);
                      setSubjectInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {subjects.map((subject, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {subject}
                      <button
                        onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmApprove}
              disabled={!joiningDate || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Teacher Request</DialogTitle>
            <DialogDescription>
              Reject {selectedRequest?.full_name_english}'s teacher signup request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Reason for Rejection <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="mt-1"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  </div>
);
};

const TeacherDirectoryTab = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
    fetchDepartments();
  }, [departmentFilter, statusFilter]);

  useEffect(() => {
    filterTeachers();
  }, [teachers, searchQuery]);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: TeacherFilters = { page_size: 100 };
      
      if (departmentFilter !== 'all') {
        filters.department = departmentFilter;
      }
      if (statusFilter !== 'all') {
        filters.employmentStatus = statusFilter;
      }
      // Note: Search is done client-side for instant feedback
      
      const response = await teacherService.getTeachers(filters);
      setTeachers(response.results || []);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: `Failed to load teachers: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getDepartments({ page_size: 100 });
      setDepartments(response.results.map(dept => ({ id: dept.id, name: dept.name })));
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const filterTeachers = () => {
    let filtered = [...teachers];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(teacher =>
        (teacher.fullNameEnglish || '').toLowerCase().includes(query) ||
        (teacher.fullNameBangla || '').toLowerCase().includes(query) ||
        (teacher.email || '').toLowerCase().includes(query) ||
        (teacher.designation || '').toLowerCase().includes(query) ||
        (teacher.departmentName || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredTeachers(filtered);
  };

  const handleView = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setViewModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      retired: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold">{teachers.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {teachers.filter(t => t.employmentStatus === 'active').length}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">
                  {new Set(teachers.map(t => t.department)).size}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Teachers ({filteredTeachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={fetchTeachers} className="mt-4">Try Again</Button>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teachers found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTeachers.map((teacher) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={teacher.profilePhoto} />
                        <AvatarFallback className="gradient-primary text-primary-foreground">
                          {teacher.fullNameEnglish?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">{teacher.fullNameEnglish}</h3>
                          {getStatusBadge(teacher.employmentStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{teacher.fullNameBangla}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            <span>{teacher.designation}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{teacher.departmentName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{teacher.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{teacher.mobileNumber}</span>
                          </div>
                        </div>
                        {teacher.subjects && teacher.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {teacher.subjects.map((subject, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{subject}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleView(teacher)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Teacher Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTeacher && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedTeacher.profilePhoto} />
                    <AvatarFallback className="gradient-primary text-primary-foreground">
                      {selectedTeacher.fullNameEnglish?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  {selectedTeacher.fullNameEnglish}
                </DialogTitle>
                <DialogDescription>{selectedTeacher.fullNameBangla}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Designation</Label>
                    <p className="font-medium">{selectedTeacher.designation}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Department</Label>
                    <p className="font-medium">{selectedTeacher.departmentName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedTeacher.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Mobile</Label>
                    <p className="font-medium">{selectedTeacher.mobileNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Office Location</Label>
                    <p className="font-medium">{selectedTeacher.officeLocation || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Employment Status</Label>
                    <div>{getStatusBadge(selectedTeacher.employmentStatus)}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Joining Date</Label>
                    <p className="font-medium">
                      {selectedTeacher.joiningDate 
                        ? new Date(selectedTeacher.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedTeacher.qualifications && selectedTeacher.qualifications.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Qualifications</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTeacher.qualifications.map((qual, idx) => (
                        <Badge key={idx} variant="secondary">{qual}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTeacher.specializations && selectedTeacher.specializations.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Specializations</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTeacher.specializations.map((spec, idx) => (
                        <Badge key={idx} variant="outline">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Subjects</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTeacher.subjects.map((subject, idx) => (
                        <Badge key={idx} variant="secondary">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function Teachers() {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Teachers</h1>
        <p className="text-muted-foreground mt-1">Manage teacher requests and directory</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card p-1">
            <TabsTrigger value="requests" className="gap-2">
              <Inbox className="w-4 h-4" />
              Teacher Requests
            </TabsTrigger>
            <TabsTrigger value="directory" className="gap-2">
              <Users className="w-4 h-4" />
              All Teachers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6">
            <TeacherRequestsTab />
          </TabsContent>

          <TabsContent value="directory" className="space-y-6">
            <TeacherDirectoryTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
