import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  X,
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  FileText,
  Phone,
  Mail,
  Calendar,
  Download,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { admissionService, Admission } from '@/services/admissionService';
import { documentService, Document } from '@/services/documentService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useAuth } from '@/contexts/AuthContext';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                {title}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

export default function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAdmissionDetails();
    }
  }, [id]);

  // Fetch documents after admission details are loaded
  useEffect(() => {
    if (id && !loading) {
      fetchAdmissionDocuments();
    }
  }, [id, loading, admission]);

  const fetchAdmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await admissionService.getAdmission(id!);
      setAdmission(data);
    } catch (err: any) {
      console.error('Error fetching admission details:', err);
      setError(err.message || 'Failed to load admission details');
      toast({
        title: 'Error',
        description: 'Failed to load admission details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmissionDocuments = async () => {
    if (!id || !admission) return;
    
    try {
      setDocumentsLoading(true);
      
      // Use the UUID field from admission object for filtering
      // The 'id' param is application_id (SIPI-xxxxx), but we need the UUID
      const admissionUuid = admission.uuid || id;
      
      console.log(`🔍 Fetching documents for admission: id=${id}, uuid=${admissionUuid}`);
      
      // First, try to get documents by source_type='admission' and source_id=admission_uuid
      const response = await documentService.getDocuments({
        source_type: 'admission',
        source_id: admissionUuid, // Use UUID instead of application_id
        page_size: 100
      });
      
      // STRICT filtering to ensure we only get documents for this specific admission
      let admissionDocuments = (response.results || []).filter(doc => {
        const isAdmissionDoc = doc.source_type === 'admission';
        const isCorrectAdmission = doc.source_id === admissionUuid;
        
        console.log(`Document ${doc.fileName}: source_type=${doc.source_type}, source_id=${doc.source_id}, matches=${isAdmissionDoc && isCorrectAdmission}`);
        
        return isAdmissionDoc && isCorrectAdmission;
      });
      
      // If we have the admission data and no documents found, try alternative filtering
      if (admissionDocuments.length === 0 && admission?.user) {
        console.log('No documents found with source_id, trying user-based filtering...');
        
        // Try to get documents by student ID if available
        const userResponse = await documentService.getDocuments({
          source_type: 'admission',
          student: admission.user.id || admission.user,
          page_size: 100
        });
        
        // Filter these results to only include documents that might be related to this admission
        admissionDocuments = (userResponse.results || []).filter(doc => {
          const isAdmissionDoc = doc.source_type === 'admission';
          const isCorrectAdmission = doc.source_id === admissionUuid;
          const isCorrectStudent = doc.student === admission.user?.id || doc.student === admission.user;
          
          console.log(`Alt Document ${doc.fileName}: source_type=${doc.source_type}, source_id=${doc.source_id}, student=${doc.student}, matches=${isAdmissionDoc && (isCorrectAdmission || isCorrectStudent)}`);
          
          return isAdmissionDoc && (isCorrectAdmission || isCorrectStudent);
        });
      }
      
      setDocuments(admissionDocuments);
      
      console.log(`✅ Filtered to ${admissionDocuments.length} documents for admission ${id} (UUID: ${admissionUuid})`);
      if (admissionDocuments.length > 0) {
        console.log('✅ Document source_ids:', admissionDocuments.map(d => `${d.fileName} -> ${d.source_id}`));
      } else {
        console.log('ℹ️  No documents found for this specific admission');
      }
    } catch (err: any) {
      console.error('❌ Error fetching admission documents:', err);
      // Don't show error toast for documents as it's not critical
      setDocuments([]); // Ensure we set empty array on error
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!admission) return;

    try {
      setProcessing(true);
      // Approve admission with required fields
      // Roll number is auto-generated from SSC Board Roll
      await admissionService.approveAdmission(admission.id, {
        current_registration_number: `REG-${Date.now()}`,
        semester: 1,
        current_group: admission.group || 'A',
        enrollment_date: new Date().toISOString().split('T')[0],
        review_notes: `Approved by ${user?.username || 'Admin'}`,
      });

      toast({
        title: 'Admission Approved',
        description: 'Admission application has been approved successfully.',
      });

      setApproveDialogOpen(false);
      setTimeout(() => {
        navigate('/admissions');
      }, 1500);
    } catch (err: any) {
      console.error('Error approving admission:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to approve admission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!admission) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);
      await admissionService.rejectAdmission(admission.id, {
        review_notes: rejectionReason,
      });

      toast({
        title: 'Admission Rejected',
        description: 'Admission application has been rejected.',
        variant: 'destructive',
      });

      setRejectDialogOpen(false);
      setRejectionReason('');
      setTimeout(() => {
        navigate('/admissions');
      }, 1500);
    } catch (err: any) {
      console.error('Error rejecting admission:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to reject admission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const blob = await documentService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your document is being downloaded.",
      });
    } catch (err: any) {
      console.error('Error downloading document:', err);
      toast({
        title: 'Error',
        description: 'Failed to download document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'jpg':
      case 'png':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="w-8 h-8 text-green-500" />;
      default:
        return <FileText className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <LoadingState message="Loading admission details..." />;
  }

  if (error || !admission) {
    return (
      <ErrorState
        title="Failed to Load Admission"
        error={error || 'Admission not found'}
        onRetry={fetchAdmissionDetails}
      />
    );
  }

  const currentAdmin = user?.username || 'Admin User';
  const statusDisplay = admission.status.charAt(0).toUpperCase() + admission.status.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admissions')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Admission Application Details</h1>
          <p className="text-muted-foreground">Review complete admission application information</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(admission.status)}>{statusDisplay}</Badge>
          {admission.status === 'pending' && (
            <>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setRejectDialogOpen(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                className="gradient-success text-success-foreground"
                onClick={() => setApproveDialogOpen(true)}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Application Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <Avatar className="w-32 h-32 border-4 border-primary/20 ring-4 ring-primary/10">
                <AvatarFallback className="gradient-primary text-primary-foreground text-4xl">
                  {admission.full_name_english.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{admission.full_name_english}</h2>
                <p className="text-lg text-muted-foreground font-medium">{admission.full_name_bangla}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Application ID</p>
                    <p className="font-mono text-sm font-bold text-primary">{admission.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">{admission.department_name || admission.desired_department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Session</p>
                    <p className="text-sm font-medium">{admission.session}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm font-medium">{new Date(admission.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Information Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CollapsibleSection title="Personal Information" icon={<User className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Full Name (English)" value={admission.full_name_english} />
              <InfoRow label="Full Name (Bangla)" value={admission.full_name_bangla} />
              <InfoRow label="Father's Name" value={admission.father_name} />
              <InfoRow label="Father's NID" value={admission.father_nid} />
              <InfoRow label="Mother's Name" value={admission.mother_name} />
              <InfoRow label="Mother's NID" value={admission.mother_nid} />
              <InfoRow label="Date of Birth" value={admission.date_of_birth} />
              <InfoRow label="Gender" value={admission.gender} />
              <InfoRow label="Religion" value={admission.religion} />
              <InfoRow label="Blood Group" value={admission.blood_group} />
              <InfoRow label="Birth Certificate No." value={admission.birth_certificate_no} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CollapsibleSection title="Contact Information" icon={<Phone className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Mobile" value={admission.mobile_student} />
              <InfoRow label="Email" value={admission.email} />
              <InfoRow label="Guardian Mobile" value={admission.guardian_mobile} />
              <InfoRow label="Emergency Contact" value={admission.emergency_contact} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Present Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <CollapsibleSection title="Present Address" icon={<MapPin className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Village" value={admission.present_address?.village} />
              <InfoRow label="Post Office" value={admission.present_address?.postOffice} />
              <InfoRow label="Upazila" value={admission.present_address?.upazila} />
              <InfoRow label="District" value={admission.present_address?.district} />
              <InfoRow label="Division" value={admission.present_address?.division} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Permanent Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <CollapsibleSection title="Permanent Address" icon={<MapPin className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Village" value={admission.permanent_address?.village} />
              <InfoRow label="Post Office" value={admission.permanent_address?.postOffice} />
              <InfoRow label="Upazila" value={admission.permanent_address?.upazila} />
              <InfoRow label="District" value={admission.permanent_address?.district} />
              <InfoRow label="Division" value={admission.permanent_address?.division} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Educational Background */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CollapsibleSection title="Educational Background" icon={<GraduationCap className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Highest Exam" value={admission.highest_exam} />
              <InfoRow label="Board" value={admission.board} />
              <InfoRow label="Roll Number" value={admission.roll_number} />
              <InfoRow label="Registration Number" value={admission.registration_number} />
              <InfoRow label="Passing Year" value={admission.passing_year?.toString()} />
              <InfoRow label="GPA" value={admission.gpa?.toString()} />
              <InfoRow label="Group" value={admission.group} />
              <InfoRow label="Institution Name" value={admission.institution_name} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Academic Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <CollapsibleSection title="Academic Information" icon={<BookOpen className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Desired Department" value={admission.desired_department} />
              <InfoRow label="Department Name" value={admission.department_name} />
              <InfoRow label="Desired Shift" value={admission.desired_shift} />
              <InfoRow label="Session" value={admission.session} />
            </div>
          </CollapsibleSection>
        </motion.div>
      </div>

      {/* Documents Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
              {documentsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading admission documents...</span>
              </div>
            ) : documents.length > 0 ? (
              <>
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Showing {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded for this admission
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Application ID: {id} {admission.uuid && `(UUID: ${admission.uuid})`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="bg-muted/50 hover:bg-muted/70 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getFileIcon(doc.fileType)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.original_field_name || doc.category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(doc.fileSize / 1024).toFixed(0)} KB • {doc.fileType.toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDocument(doc)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownloadDocument(doc)}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No documents found for this admission</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Application ID: {id}
                </p>
                {admission.uuid && (
                  <p className="text-xs text-muted-foreground">
                    UUID: {admission.uuid}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Documents should be uploaded during the admission process
                </p>
              </div>
            )}

          </CardContent>
        </Card>
      </motion.div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              Approve Admission Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this admission application? This action will be recorded in the student's history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Applicant:</strong> {admission.full_name_english}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Department:</strong> {admission.department_name || admission.desired_department}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This action will be recorded as: <strong>"{currentAdmin}" approved the admission application</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button className="gradient-success text-success-foreground" onClick={handleApprove} disabled={processing}>
              <Check className="w-4 h-4 mr-2" />
              {processing ? 'Approving...' : 'Approve Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              Reject Admission Application
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this admission application. This action will be recorded in the student's history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Applicant:</strong> {admission.full_name_english}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Department:</strong> {admission.department_name || admission.desired_department}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px]"
                disabled={processing}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be included in the history entry: <strong>"{currentAdmin}" rejected the admission application</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
            }} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
            >
              <X className="w-4 h-4 mr-2" />
              {processing ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          {selectedDoc && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="flex items-center gap-3">
                  {getFileIcon(selectedDoc.fileType)}
                  {selectedDoc.fileName}
                </DialogTitle>
              </DialogHeader>
              
              {/* Scrollable Content Area */}
              <div 
                className="flex-1 overflow-auto px-6 pb-6"
                style={{
                  maxHeight: 'calc(90vh - 140px)',
                  overflowY: 'scroll'
                }}
              >
                {/* Enhanced Scrollbar Styling for Dialog */}
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .admission-dialog-scroll-container {
                      scrollbar-width: auto !important;
                      scrollbar-color: #9ca3af #f3f4f6 !important;
                    }
                    
                    .admission-dialog-scroll-container::-webkit-scrollbar {
                      width: 14px !important;
                    }
                    
                    .admission-dialog-scroll-container::-webkit-scrollbar-track {
                      background: #f3f4f6 !important;
                      border-radius: 7px !important;
                    }
                    
                    .admission-dialog-scroll-container::-webkit-scrollbar-thumb {
                      background: #9ca3af !important;
                      border-radius: 7px !important;
                      border: 2px solid #f3f4f6 !important;
                    }
                    
                    .admission-dialog-scroll-container::-webkit-scrollbar-thumb:hover {
                      background: #6b7280 !important;
                    }
                    
                    .admission-dialog-scroll-container::-webkit-scrollbar-thumb:active {
                      background: #4b5563 !important;
                    }
                    
                    /* Dark mode */
                    .dark .admission-dialog-scroll-container {
                      scrollbar-color: #6b7280 #374151 !important;
                    }
                    
                    .dark .admission-dialog-scroll-container::-webkit-scrollbar-track {
                      background: #374151 !important;
                    }
                    
                    .dark .admission-dialog-scroll-container::-webkit-scrollbar-thumb {
                      background: #6b7280 !important;
                      border: 2px solid #374151 !important;
                    }
                    
                    .dark .admission-dialog-scroll-container::-webkit-scrollbar-thumb:hover {
                      background: #9ca3af !important;
                    }
                  `
                }} />
                
                <div className="admission-dialog-scroll-container space-y-6">
                  {/* Document Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{selectedDoc.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Format</p>
                      <p className="font-medium uppercase">{selectedDoc.fileType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Original Field</p>
                      <p className="font-medium">{selectedDoc.original_field_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Upload Date</p>
                      <p className="font-medium">{new Date(selectedDoc.uploadDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">File Size</p>
                      <p className="font-medium">{(selectedDoc.fileSize / 1024).toFixed(0)} KB</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="font-medium">Admission Upload</p>
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <div className="p-4 bg-muted/30 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">Document Preview</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedDoc.is_pdf ? 'PDF Document' : selectedDoc.is_image ? 'Image File' : 'Document File'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Admission document</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <span>↕</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Document Content */}
                    <div className="bg-white dark:bg-gray-900 p-4">
                      {selectedDoc.is_pdf ? (
                        <div className="w-full">
                          <iframe
                            src={documentService.getDocumentPreviewUrl(selectedDoc.id)}
                            className="w-full border-0 rounded"
                            title={`Preview of ${selectedDoc.fileName}`}
                            style={{ 
                              height: '600px',
                              minHeight: '600px',
                              width: '100%'
                            }}
                          />
                        </div>
                      ) : selectedDoc.is_image ? (
                        <div className="text-center">
                          <div className="relative inline-block">
                            <img
                              src={documentService.getDocumentPreviewUrl(selectedDoc.id)}
                              alt={selectedDoc.fileName}
                              className="max-w-full h-auto object-contain rounded shadow-lg cursor-zoom-in"
                              style={{ 
                                maxHeight: '500px',
                                minHeight: '200px'
                              }}
                              onClick={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (img.style.transform === 'scale(1.5)') {
                                  img.style.transform = 'scale(1)';
                                  img.style.cursor = 'zoom-in';
                                } else {
                                  img.style.transform = 'scale(1.5)';
                                  img.style.cursor = 'zoom-out';
                                  img.style.transformOrigin = 'center';
                                  img.style.transition = 'transform 0.3s ease';
                                }
                              }}
                            />
                          </div>
                          
                          {/* Image Controls */}
                          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-3 py-2 inline-flex">
                            <span>Click to zoom</span>
                            <span>•</span>
                            <span>Right-click to save</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center py-12">
                          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            File type: {selectedDoc.fileType.toUpperCase()}
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={() => handleDownloadDocument(selectedDoc)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download to View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Document Information */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Document Information</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Uploaded during admission process</p>
                      <p>• Source: Student submission</p>
                      <p>• Status: {selectedDoc.status === 'active' ? 'Active' : selectedDoc.status}</p>
                      <p>• File integrity: Verified</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="px-6 py-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    window.open(documentService.getDocumentPreviewUrl(selectedDoc.id), '_blank');
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button 
                  className="gradient-primary text-primary-foreground" 
                  onClick={() => handleDownloadDocument(selectedDoc)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

