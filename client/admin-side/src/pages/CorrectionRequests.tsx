import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle, Clock, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import correctionRequestService, { CorrectionRequest } from '@/services/correctionRequestService';
import { LoadingState } from '@/components/LoadingState';

interface MappedRequest {
  id: string;
  studentName: string;
  studentId: string;
  requestedBy: string;
  requestedByRole: string;
  fieldName: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export default function CorrectionRequests() {
  const [requests, setRequests] = useState<MappedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MappedRequest | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await correctionRequestService.getCorrectionRequests();
      
      // Ensure response has the expected structure
      if (!response || !Array.isArray(response.results)) {
        console.error('Invalid response structure:', response);
        setRequests([]);
        return;
      }
      
      const mapped = response.results.map((req: CorrectionRequest) => {
        try {
          console.log('Processing correction request:', req);
          // Handle requested_by field which might have different structure
          let requestedByName = 'Unknown User';
          let requestedByRole = 'Unknown Role';
          
          if (req.requested_by) {
            if (typeof req.requested_by === 'object' && req.requested_by !== null) {
              // Handle UserSerializer structure: first_name, last_name, username
              const firstName = String(req.requested_by.first_name || '');
              const lastName = String(req.requested_by.last_name || '');
              const fullName = `${firstName} ${lastName}`.trim();
              requestedByName = fullName || String(req.requested_by.username || 'Unknown User');
              requestedByRole = String(req.requested_by.role || 'Unknown Role');
            } else if (typeof req.requested_by === 'string') {
              requestedByName = String(req.requested_by);
            }
          }

          // Handle reviewed_by field similarly
          let reviewedByName = undefined;
          if (req.reviewed_by) {
            if (typeof req.reviewed_by === 'string') {
              reviewedByName = String(req.reviewed_by);
            } else if (typeof req.reviewed_by === 'object' && req.reviewed_by !== null) {
              const firstName = String(req.reviewed_by.first_name || '');
              const lastName = String(req.reviewed_by.last_name || '');
              const fullName = `${firstName} ${lastName}`.trim();
              reviewedByName = fullName || String(req.reviewed_by.username || 'Unknown Reviewer');
            }
          }

          const mappedRequest = {
            id: String(req.id || ''),
            studentName: String(req.student?.full_name_english || 'Unknown Student'),
            studentId: String(req.student?.roll_number || 'N/A'),
            requestedBy: String(requestedByName),
            requestedByRole: String(requestedByRole),
            fieldName: String(req.field_name || 'Unknown Field'),
            currentValue: String(req.current_value || ''),
            requestedValue: String(req.requested_value || ''),
            reason: String(req.reason || ''),
            status: req.status,
            submittedAt: req.submitted_at,
            reviewedAt: req.reviewed_at || undefined,
            reviewedBy: reviewedByName ? String(reviewedByName) : undefined,
            reviewNotes: req.review_notes ? String(req.review_notes) : undefined,
          };
          
          console.log('Mapped correction request:', mappedRequest);
          return mappedRequest;
        } catch (error) {
          console.error('Error mapping correction request:', req, error);
          // Return a safe fallback object
          return {
            id: String(req.id || Math.random()),
            studentName: 'Error Loading Student',
            studentId: 'N/A',
            requestedBy: 'Unknown User',
            requestedByRole: 'Unknown Role',
            fieldName: 'Unknown Field',
            currentValue: '',
            requestedValue: '',
            reason: '',
            status: 'pending' as const,
            submittedAt: new Date().toISOString(),
            reviewedAt: undefined,
            reviewedBy: undefined,
            reviewNotes: undefined,
          };
        }
      });
      setRequests(mapped);
    } catch (error) {
      console.error('Error fetching correction requests:', error);
      toast.error('Failed to load correction requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      if (reviewAction === 'approve') {
        await correctionRequestService.approveCorrectionRequest(
          selectedRequest.id,
          reviewNotes || undefined
        );
      } else {
        if (!reviewNotes.trim()) {
          toast.error('Review notes are required for rejection');
          return;
        }
        await correctionRequestService.rejectCorrectionRequest(
          selectedRequest.id,
          reviewNotes
        );
      }

      toast.success(`Request ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewDialog = (request: MappedRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setIsReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    if (status === 'approved') return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return <LoadingState message="Loading correction requests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          Correction Requests
        </h1>
        <p className="text-muted-foreground mt-1">Review and manage student data correction requests from teachers</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setFilterStatus('all')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{requests.length}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setFilterStatus('pending')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setFilterStatus('approved')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-success">{approvedCount}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setFilterStatus('rejected')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Requests List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {filterStatus === 'all' ? 'All Requests' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Requests`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{String(request.studentName || 'Unknown Student')}</h3>
                        <span className="text-sm text-muted-foreground">({String(request.studentId || 'N/A')})</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Requested by: {String(request.requestedBy || 'Unknown User')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>Field: {String(request.fieldName || 'Unknown Field')}</span>
                        </div>
                      </div>
                      <div className="mt-2 p-3 bg-secondary/50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Current: </span>
                            <span className="font-medium text-destructive">{String(request.currentValue || '')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requested: </span>
                            <span className="font-medium text-success">{String(request.requestedValue || '')}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-muted-foreground text-sm">Reason: </span>
                          <span className="text-sm">{String(request.reason || '')}</span>
                        </div>
                      </div>
                      {request.status !== 'pending' && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reviewed by {String(request.reviewedBy || 'Unknown')} on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'Unknown date'}
                          {request.reviewNotes && <div className="mt-1">Notes: {String(request.reviewNotes)}</div>}
                        </div>
                      )}
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-success text-success-foreground hover:bg-success/90"
                          onClick={() => openReviewDialog(request, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openReviewDialog(request, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {filteredRequests.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-foreground font-medium mb-2">No Requests Found</p>
                  <p className="text-sm text-muted-foreground">
                    {filterStatus === 'all' 
                      ? 'No correction requests have been submitted yet.' 
                      : `No ${filterStatus} requests at this time.`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Correction Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'This will update the student record with the requested value.' 
                : 'This will reject the correction request and keep the current value.'}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm"><span className="font-medium">Student:</span> {String(selectedRequest.studentName || 'Unknown')}</p>
                <p className="text-sm"><span className="font-medium">Field:</span> {String(selectedRequest.fieldName || 'Unknown')}</p>
                <p className="text-sm"><span className="font-medium">Current:</span> <span className="text-destructive">{String(selectedRequest.currentValue || '')}</span></p>
                <p className="text-sm"><span className="font-medium">Requested:</span> <span className="text-success">{String(selectedRequest.requestedValue || '')}</span></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                <Textarea 
                  id="reviewNotes"
                  placeholder="Add any notes about this decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} disabled={processing}>Cancel</Button>
            <Button 
              onClick={handleReview}
              disabled={processing}
              className={reviewAction === 'approve' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : (reviewAction === 'approve' ? 'Approve Request' : 'Reject Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
