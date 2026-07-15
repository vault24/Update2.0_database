import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send, FileText, Plus, Clock, CheckCircle, XCircle, Search, Filter,
  Printer, ArrowRight, User2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import applicationService, { Application, DocumentTemplateOption } from '@/services/applicationService';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/services/studentService';
import { AdmissionBanner, useAdmissionIncomplete, useValidProfileId } from '@/components/auth/AdmissionGuard';

interface DeptOption { id: string; name: string; code?: string }
type AssigneeRole = 'registrar' | 'institute_head' | 'department_head';

export function ApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const admissionIncomplete = useAdmissionIncomplete();
  const validProfileId = useValidProfileId();
  const [showNewForm, setShowNewForm] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateOption | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [assignee, setAssignee] = useState<AssigneeRole>('registrar');
  const [assigneeDeptId, setAssigneeDeptId] = useState('');
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);

  // Load available document templates + departments for the new-application form
  useEffect(() => {
    applicationService.getAvailableTemplates().then(setTemplates).catch(() => setTemplates([]));
    api.get<{ results?: DeptOption[] } | DeptOption[]>('/departments/')
      .then((res: any) => setDepartments(res?.results || res || []))
      .catch(() => setDepartments([]));
  }, []);

  // Fetch student profile to get rollNumber and registrationNumber
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (!authLoading) {
        if (validProfileId) {
          try {
            const data = await studentService.getMe(validProfileId);
            setStudentData(data);
          } catch (error) {
            console.error('Error fetching student profile:', error);
          }
        } else {
          // Admission incomplete — stop loading
          setLoading(false);
        }
      }
    };
    fetchStudentProfile();
  }, [authLoading, validProfileId, admissionIncomplete]);

  const fetchApplications = async () => {
    if (!studentData?.currentRollNumber) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await applicationService.getMyApplications(
        studentData.currentRollNumber,
        studentData.currentRegistrationNumber
      );
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentData?.currentRollNumber) {
      fetchApplications();
    }
  }, [studentData]);

  const resetForm = () => {
    setShowNewForm(false);
    setSelectedTemplate(null);
    setSubject('');
    setMessage('');
    setAssignee('registrar');
    setAssigneeDeptId('');
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a document to apply for');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (assignee === 'department_head' && !assigneeDeptId) {
      toast.error('Please select which Department Head to assign to');
      return;
    }
    if (!studentData) {
      toast.error('Student profile not found. Please complete your admission.');
      return;
    }

    try {
      setSubmitting(true);
      await applicationService.submitApplication({
        fullNameBangla: studentData.fullNameBangla,
        fullNameEnglish: studentData.fullNameEnglish,
        fatherName: studentData.fatherName,
        motherName: studentData.motherName,
        department: typeof studentData.department === 'string'
          ? studentData.department
          : studentData.department?.name || '',
        session: studentData.session,
        shift: studentData.shift,
        rollNumber: studentData.currentRollNumber,
        registrationNumber: studentData.currentRegistrationNumber,
        email: studentData.email,
        applicationType: selectedTemplate.name,
        template: selectedTemplate.slug,
        initial_assignee: assignee,
        department_id: assignee === 'department_head' ? assigneeDeptId : undefined,
        subject,
        message,
      });

      toast.success('Application submitted successfully!');
      resetForm();
      fetchApplications(); // Refresh list
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const openDocument = (app: Application) => {
    const roll = studentData?.currentRollNumber || app.rollNumber;
    window.open(applicationService.getDocumentUrl(app.id, roll), '_blank', 'noopener');
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    rejected: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  return (
    <div className="space-y-6">
      {/* Admission banner — shown when admission incomplete */}
      {admissionIncomplete && <AdmissionBanner />}

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4${admissionIncomplete ? ' opacity-40 pointer-events-none select-none' : ''}`}
      >
        <div>
          <h1 className="text-2xl font-display font-bold">Applications</h1>
          <p className="text-muted-foreground">Submit and track your requests</p>
        </div>
        <Button variant="gradient" onClick={() => setShowNewForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Application
        </Button>
      </motion.div>

      {/* New Application Form */}
      {!admissionIncomplete && showNewForm && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-card"
        >
          <h3 className="font-semibold mb-1">Submit New Application</h3>
          <p className="text-sm text-muted-foreground mb-4">Choose a document to apply for</p>

          {templates.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 rounded-xl border border-dashed border-border mb-6">
              No documents are currently available to apply for. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    selectedTemplate?.id === tpl.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <FileText className={cn(
                    "w-6 h-6 mb-2",
                    selectedTemplate?.id === tpl.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="font-medium text-sm">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                </button>
              ))}
            </div>
          )}

          {selectedTemplate && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Enter subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Message / Description</Label>
                <Textarea
                  placeholder="Explain your request in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Initial assignee — default Registrar */}
              <div className="space-y-2">
                <Label>Send to</Label>
                <Select value={assignee} onValueChange={(v) => setAssignee(v as AssigneeRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registrar">Registrar (default)</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="institute_head">Principal</SelectItem>
                  </SelectContent>
                </Select>
                {assignee === 'department_head' && (
                  <Select value={assigneeDeptId} onValueChange={setAssigneeDeptId}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="gradient" 
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Filter Bar */}
      <div className={`flex flex-col md:flex-row gap-3${admissionIncomplete ? ' opacity-40 pointer-events-none select-none' : ''}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search applications..." className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Applications List */}
      {admissionIncomplete ? (
        <div className="opacity-40 pointer-events-none select-none">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Applications Locked</h3>
            <p className="text-sm text-muted-foreground">Complete your admission to submit and view applications</p>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, index) => {
            const status = statusConfig[app.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={app.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className={cn("p-3 rounded-xl", status.bg)}>
                    <StatusIcon className={cn("w-6 h-6", status.color)} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{app.applicationType}</h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        status.bg, status.color
                      )}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{app.subject}</p>
                    <p className="text-sm text-muted-foreground">{app.message}</p>

                    {/* Current holder */}
                    {app.status === 'pending' && app.current_holder && (
                      <p className="text-sm mt-2 flex items-center gap-1.5">
                        <User2 className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">Currently with:</span>
                        <span className="font-medium">{app.current_holder}</span>
                      </p>
                    )}

                    {/* Approval progress / history */}
                    {app.approvals && app.approvals.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-l-2 border-primary/30 pl-3">
                        {app.approvals.map((ap) => (
                          <div key={ap.id} className="text-xs">
                            <span className="font-medium capitalize">
                              {ap.action === 'forwarded'
                                ? <>{ap.approver_role_label} forwarded <ArrowRight className="w-3 h-3 inline" /> {ap.forwarded_to_name}</>
                                : `${ap.action} by ${ap.approver_role_label}`}
                            </span>
                            <span className="text-muted-foreground"> • {new Date(ap.created_at).toLocaleDateString()}</span>
                            {ap.notes && <span className="text-muted-foreground italic"> — “{ap.notes}”</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {app.reviewNotes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Notes:</span> {app.reviewNotes}
                      </p>
                    )}

                    {app.status === 'approved' && (
                      <Button size="sm" variant="gradient" className="mt-3 gap-2" onClick={() => openDocument(app)}>
                        <Printer className="w-4 h-4" />
                        Download / Print Document
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {new Date(app.submittedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {applications.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">No Applications Yet</h3>
          <p className="text-sm text-muted-foreground">Submit your first application to get started</p>
        </div>
      )}
    </div>
  );
}

export default ApplicationsPage;
