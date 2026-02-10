import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Edit, Download, Unplug, Trash2, ChevronDown, ChevronUp,
  User, Phone, MapPin, GraduationCap, BookOpen, 
  AlertTriangle, CheckCircle, Home, TrendingUp, Award, FileText, Eye, Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { studentService, Student, SemesterAttendance, SemesterResult, SubjectAttendance } from '@/services/studentService';
import { admissionService, Admission } from '@/services/admissionService';
import { documentService, Document } from '@/services/documentService';
import { getErrorMessage } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';



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

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isMathDialogOpen, setIsMathDialogOpen] = useState(false);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpdateAttendanceDialogOpen, setIsUpdateAttendanceDialogOpen] = useState(false);
  const [isUpdateResultsDialogOpen, setIsUpdateResultsDialogOpen] = useState(false);
  const [isTransitionToAlumniDialogOpen, setIsTransitionToAlumniDialogOpen] = useState(false);
  const [mathProblem, setMathProblem] = useState({ num1: 0, num2: 0, answer: '' });
  const [deleteMathProblem, setDeleteMathProblem] = useState({ num1: 0, num2: 0, answer: '' });
  const [disconnectForm, setDisconnectForm] = useState({
    reason: '',
    dropSemester: '',
    guardianContacted: false,
    additionalNotes: ''
  });
  const [attendanceData, setAttendanceData] = useState<SemesterAttendance[]>([]);
  const [resultsData, setResultsData] = useState<SemesterResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await studentService.getStudent(id);
        setStudent(data);
        // Initialize attendance and results data
        setAttendanceData(data.semesterAttendance || []);
        setResultsData(data.semesterResults || []);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, toast]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!id || !student) return;
      
      try {
        setDocumentsLoading(true);
        
        console.log('=== FETCHING DOCUMENTS FOR STUDENT ===');
        console.log('Student ID:', id);
        console.log('Student Name:', student.fullNameEnglish);
        console.log('Student Email:', student.email);
        
        // Fetch ALL documents
        const allDocsResponse = await documentService.getDocuments({
          page_size: 1000
        });
        
        console.log(`Total documents in system: ${allDocsResponse.count}`);
        
        // Log a sample document to see structure
        if (allDocsResponse.results && allDocsResponse.results.length > 0) {
          const sampleDoc = allDocsResponse.results[0];
          console.log('Sample document structure:', {
            id: sampleDoc.id,
            fileName: sampleDoc.fileName,
            student: sampleDoc.student,
            studentName: sampleDoc.studentName,
            studentRoll: sampleDoc.studentRoll,
            source_type: sampleDoc.source_type,
            source_id: sampleDoc.source_id,
            category: sampleDoc.category
          });
        }
        
        // Try to find related admissions using student email
        let matchedAdmissions: Admission[] = [];
        let admissionIds: string[] = [];
        
        if (student.email) {
          try {
            const admissionsResponse = await admissionService.getAdmissions({
              search: student.email,
              page_size: 50
            });
            
            matchedAdmissions = (admissionsResponse.results || []).filter(admission => 
              admission.email?.toLowerCase().trim() === student.email.toLowerCase().trim()
            );
            
            admissionIds = matchedAdmissions.map(admission => admission.id);
            
            console.log(`Matched admissions by email: ${matchedAdmissions.length}`, admissionIds);
          } catch (admissionErr) {
            console.warn('⚠️ Error fetching admissions by email:', admissionErr);
          }
        }
        
        // Find documents that match this student
        const studentDocuments = (allDocsResponse.results || []).filter(doc => {
          const docStudentId = doc.student ? String(doc.student) : null;
          const currentStudentId = String(id);
          
          // Strategy 1: Direct student ID match
          const matchesStudentId = docStudentId === currentStudentId;
          
          // Strategy 2: Name match (exact, case-insensitive)
          const matchesName = doc.studentName && student.fullNameEnglish && 
                             doc.studentName.toLowerCase().trim() === student.fullNameEnglish.toLowerCase().trim();
          
          // Strategy 3: Roll number match
          const matchesRoll = doc.studentRoll && student.currentRollNumber &&
                             doc.studentRoll === student.currentRollNumber;
          
          // Strategy 4: Admission documents linked to related admission records
          const isAdmissionDoc = doc.source_type === 'admission';
          const matchesAdmissionId = isAdmissionDoc && !!doc.source_id && admissionIds.includes(String(doc.source_id));
          
          const isMatch = matchesStudentId || matchesName || matchesRoll || matchesAdmissionId;
          
          if (isMatch) {
            console.log(`✅ MATCH: ${doc.fileName}`, {
              fileName: doc.fileName,
              docStudentId: docStudentId,
              docStudentName: doc.studentName,
              sourceType: doc.source_type,
              sourceId: doc.source_id,
              matchReason: matchesStudentId ? 'Student ID' : matchesName ? 'Name' : matchesRoll ? 'Roll' : 'Admission ID'
            });
          }
          
          return isMatch;
        });
        
        setDocuments(studentDocuments);
        
        console.log(`✅ Found ${studentDocuments.length} documents for this student`);
        
        if (studentDocuments.length === 0) {
          console.warn('⚠️ NO DOCUMENTS FOUND');
          console.log('This student might have documents from their admission that are not linked.');
          console.log('Check the Admission Details page for this student to see their admission documents.');
        }
      } catch (err) {
        console.error('❌ Error fetching documents:', err);
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };

    fetchDocuments();
  }, [id, student]);

  const generateMathProblem = () => {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    return { num1, num2, answer: '' };
  };

  const handleDisconnectClick = () => {
    setMathProblem(generateMathProblem());
    setIsMathDialogOpen(true);
  };

  const handleMathSubmit = () => {
    const correctAnswer = mathProblem.num1 + mathProblem.num2;
    if (parseInt(mathProblem.answer) === correctAnswer) {
      setIsMathDialogOpen(false);
      setIsDisconnectDialogOpen(true);
    } else {
      toast({
        title: "Incorrect Answer",
        description: "Please solve the math problem correctly to proceed.",
        variant: "destructive"
      });
      setMathProblem(generateMathProblem());
    }
  };

  const handleDisconnectSubmit = () => {
    if (!disconnectForm.reason) {
      toast({
        title: "Required Field",
        description: "Please select a reason for disconnection.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Student Disconnected",
      description: "The student has been moved to discontinued list.",
    });
    setIsDisconnectDialogOpen(false);
    navigate('/discontinued-students');
  };

  const handleDeleteClick = () => {
    setDeleteMathProblem(generateMathProblem());
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSubmit = () => {
    const correctAnswer = deleteMathProblem.num1 + deleteMathProblem.num2;
    if (parseInt(deleteMathProblem.answer) === correctAnswer) {
      toast({
        title: "Student Deleted",
        description: "The student record has been permanently deleted.",
      });
      setIsDeleteDialogOpen(false);
      navigate('/students');
    } else {
      toast({
        title: "Incorrect Answer",
        description: "Please solve the math problem correctly to confirm deletion.",
        variant: "destructive"
      });
      setDeleteMathProblem(generateMathProblem());
    }
  };

  const handleUpdateAttendance = (semesterIndex: number, subjectIndex: number, field: 'present' | 'total', value: string) => {
    const newAttendanceData = [...attendanceData];
    const numValue = parseInt(value) || 0;
    
    if (newAttendanceData[semesterIndex] && newAttendanceData[semesterIndex].subjects[subjectIndex]) {
      newAttendanceData[semesterIndex].subjects[subjectIndex][field] = numValue;
      
      // Recalculate percentage for this subject
      const subject = newAttendanceData[semesterIndex].subjects[subjectIndex];
      subject.percentage = subject.total > 0 ? Math.round((subject.present / subject.total) * 100) : 0;
      
      // Recalculate average percentage for the semester
      const subjects = newAttendanceData[semesterIndex].subjects;
      const totalPercentage = subjects.reduce((sum, s) => sum + s.percentage, 0);
      newAttendanceData[semesterIndex].averagePercentage = subjects.length > 0 ? totalPercentage / subjects.length : 0;
      
      setAttendanceData(newAttendanceData);
    }
  };

  const handleSaveAttendance = async () => {
    if (!id) return;
    
    try {
      setIsSaving(true);
      // Normalize and validate attendance payload before sending
      const normalizedAttendance = attendanceData.map((semester) => ({
        semester: semester.semester,
        year: semester.year,
        subjects: (semester.subjects || []).map((subject) => ({
          code: (subject.code || '').trim(),
          name: (subject.name || '').trim(),
          present: Number.isFinite(subject.present) ? subject.present : Number(subject.present) || 0,
          total: Number.isFinite(subject.total) ? subject.total : Number(subject.total) || 0,
        })),
      }));

      // Basic validation to prevent backend 400s
      for (const semester of normalizedAttendance) {
        if (semester.semester < 1 || semester.semester > 8) {
          toast({
            title: "Invalid Semester",
            description: "Semester must be between 1 and 8.",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
        for (const subject of semester.subjects) {
          if (subject.present < 0 || subject.total < 0) {
            toast({
              title: "Invalid Attendance",
              description: "Present and total must be non-negative numbers.",
              variant: "destructive"
            });
            setIsSaving(false);
            return;
          }
          if (subject.present > subject.total) {
            toast({
              title: "Invalid Attendance",
              description: "Present count cannot exceed total count.",
              variant: "destructive"
            });
            setIsSaving(false);
            return;
          }
        }
      }

      await studentService.patchStudent(id, {
        semesterAttendance: normalizedAttendance
      });
      
      // Refresh student data
      const updatedStudent = await studentService.getStudent(id);
      setStudent(updatedStudent);
      setAttendanceData(updatedStudent.semesterAttendance || []);
      
      toast({
        title: "Success",
        description: "Semester attendance has been updated successfully.",
      });
      setIsUpdateAttendanceDialogOpen(false);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSemester = () => {
    const newSemester: SemesterAttendance = {
      semester: (attendanceData.length > 0 ? Math.max(...attendanceData.map(s => s.semester)) + 1 : 1),
      year: new Date().getFullYear(),
      subjects: [],
      averagePercentage: 0
    };
    setAttendanceData([...attendanceData, newSemester]);
  };

  const handleAddSubject = (semesterIndex: number) => {
    const newAttendanceData = [...attendanceData];
    const newSubject: SubjectAttendance = {
      code: '',
      name: '',
      present: 0,
      total: 0,
      percentage: 0
    };
    newAttendanceData[semesterIndex].subjects.push(newSubject);
    setAttendanceData(newAttendanceData);
  };

  const handleUpdateSubjectInfo = (semesterIndex: number, subjectIndex: number, field: 'code' | 'name', value: string) => {
    const newAttendanceData = [...attendanceData];
    if (newAttendanceData[semesterIndex] && newAttendanceData[semesterIndex].subjects[subjectIndex]) {
      newAttendanceData[semesterIndex].subjects[subjectIndex][field] = value;
      setAttendanceData(newAttendanceData);
    }
  };

  const handleRemoveSubject = (semesterIndex: number, subjectIndex: number) => {
    const newAttendanceData = [...attendanceData];
    newAttendanceData[semesterIndex].subjects.splice(subjectIndex, 1);
    
    // Recalculate average percentage
    const subjects = newAttendanceData[semesterIndex].subjects;
    const totalPercentage = subjects.reduce((sum, s) => sum + s.percentage, 0);
    newAttendanceData[semesterIndex].averagePercentage = subjects.length > 0 ? totalPercentage / subjects.length : 0;
    
    setAttendanceData(newAttendanceData);
  };

  const handleUpdateResult = (semesterIndex: number, field: string, value: any) => {
    const newResultsData = [...resultsData];
    if (newResultsData[semesterIndex]) {
      const result = newResultsData[semesterIndex];
      
      // Handle result type changes - clear conflicting fields
      if (field === 'resultType') {
        if (value === 'gpa') {
          // Clear referred subjects when switching to GPA
          delete result.referredSubjects;
          result.gpa = result.gpa || 0;
          result.cgpa = result.cgpa || 0;
        } else if (value === 'referred') {
          // Clear GPA fields when switching to referred
          delete result.gpa;
          delete result.cgpa;
          result.referredSubjects = result.referredSubjects || [];
        }
      }
      
      (result as any)[field] = value;
      setResultsData(newResultsData);
    }
  };

  const handleAddResultSemester = () => {
    const newResult: SemesterResult = {
      semester: (resultsData.length > 0 ? Math.max(...resultsData.map(r => r.semester)) + 1 : 1),
      year: new Date().getFullYear(),
      resultType: 'gpa',
      gpa: 0,
      cgpa: 0,
      subjects: []
    };
    setResultsData([...resultsData, newResult]);
  };

  const handleSaveResults = async () => {
    if (!id) return;
    
    try {
      setIsSaving(true);
      
      // Clean up the results data before sending
      const cleanedResultsData = resultsData.map(result => {
        const cleanedResult: any = {
          semester: result.semester,
          year: result.year,
          resultType: result.resultType
        };
        
        if (result.resultType === 'gpa') {
          // Only include GPA fields for GPA type
          if (result.gpa !== undefined) cleanedResult.gpa = result.gpa;
          if (result.cgpa !== undefined) cleanedResult.cgpa = result.cgpa;
          if (result.subjects) cleanedResult.subjects = result.subjects;
        } else if (result.resultType === 'referred') {
          // Only include referred subjects for referred type
          if (result.referredSubjects) cleanedResult.referredSubjects = result.referredSubjects;
        }
        
        return cleanedResult;
      });
      
      await studentService.patchStudent(id, {
        semesterResults: cleanedResultsData
      });
      
      // Refresh student data
      const updatedStudent = await studentService.getStudent(id);
      setStudent(updatedStudent);
      setResultsData(updatedStudent.semesterResults || []);
      
      // Check if 8th semester result was just added
      const has8thSemesterResult = cleanedResultsData.some(result => 
        result.semester === 8 && result.resultType === 'gpa' && result.gpa && result.gpa > 0
      );
      
      if (has8thSemesterResult && updatedStudent.status === 'active') {
        toast({
          title: "8th Semester Completed!",
          description: "This student is now eligible for alumni transition. You can transition them using the 'Transition to Alumni' button.",
        });
      } else {
        toast({
          title: "Success",
          description: "Semester results have been updated successfully.",
        });
      }
      
      setIsUpdateResultsDialogOpen(false);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/20 text-success border-success/30';
      case 'Discontinued': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Alumni': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-success';
    if (percentage >= 75) return 'text-warning';
    return 'text-destructive';
  };

  const getSubjectPercentage = (subject: SubjectAttendance): number => {
    if (Number.isFinite(subject.percentage)) return subject.percentage;
    if (subject.total && subject.total > 0) {
      return Math.round((subject.present / subject.total) * 100);
    }
    return 0;
  };

  const getSemesterAverage = (semester: SemesterAttendance): number => {
    if (Number.isFinite(semester.averagePercentage)) return semester.averagePercentage;
    const subjects = semester.subjects || [];
    if (subjects.length === 0) return 0;
    const total = subjects.reduce((sum, subject) => sum + getSubjectPercentage(subject), 0);
    return Math.round((total / subjects.length) * 100) / 100;
  };

  // Check if student is eligible for alumni transition
  const isEligibleForAlumni = () => {
    if (!student) return false;
    
    // Check if student is in 8th semester
    const isIn8thSemester = student.semester === 8;
    
    // Check if student has 8th semester results
    const has8thSemesterResult = student.semesterResults?.some(result => 
      result.semester === 8 && result.resultType === 'gpa' && result.gpa && result.gpa > 0
    );
    
    // Student should be active and either in 8th semester or have 8th semester results
    return student.status === 'active' && (isIn8thSemester || has8thSemesterResult);
  };

  const handleTransitionToAlumni = async () => {
    if (!id) return;
    
    try {
      setIsSaving(true);
      
      // Use the proper transition to alumni endpoint
      await studentService.transitionToAlumni(id, {
        graduationYear: new Date().getFullYear()
      });
      
      // Refresh student data
      const updatedStudent = await studentService.getStudent(id);
      setStudent(updatedStudent);
      
      toast({
        title: "Success",
        description: "Student has been successfully transitioned to alumni. They now appear in the Alumni section.",
      });
      
      // Navigate to alumni page
      navigate('/alumni');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setIsTransitionToAlumniDialogOpen(false);
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

  if (loading) {
    return <LoadingState message="Loading student details..." />;
  }

  if (error || !student) {
    return <ErrorState error={error || "Student not found"} />;
  }

  const averageAttendance = student.semesterAttendance && student.semesterAttendance.length > 0
    ? Math.round(
        student.semesterAttendance.reduce((acc, s) => acc + getSemesterAverage(s), 0) / student.semesterAttendance.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Details</h1>
          <p className="text-muted-foreground">Complete student information and records</p>
        </div>
      </div>

      {/* Hero Section - Profile Photo & Quick Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Profile Photo */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="relative">
                  <Avatar className="w-40 h-40 border-4 border-primary/20 ring-4 ring-primary/10">
                    <AvatarImage src={student.profilePhoto} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-4xl">
                      {student.fullNameEnglish.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge 
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${getStatusColor(student.status)}`}
                  >
                    {student.status}
                  </Badge>
                </div>
              </div>

              {/* Names & Info */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground">{student.fullNameEnglish}</h2>
                <p className="text-lg text-muted-foreground font-medium">{student.fullNameBangla}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeof student.department === 'string' ? student.department : student.department.name}
                </p>

                {/* Quick Info Cards */}
                <div className={`grid grid-cols-2 gap-4 mt-6 ${isEligibleForAlumni() ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Roll Number</p>
                      <p className="text-lg font-bold text-primary">{student.currentRollNumber}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Semester</p>
                      <p className="text-lg font-bold text-foreground">{student.semester}th</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">CGPA</p>
                      <p className="text-lg font-bold text-success">
                        {student.semesterResults && student.semesterResults.length > 0 
                          ? student.semesterResults[student.semesterResults.length - 1]?.cgpa 
                          : '-'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Attendance</p>
                      <p className={`text-lg font-bold ${getAttendanceColor(averageAttendance)}`}>{averageAttendance}%</p>
                    </CardContent>
                  </Card>
                  {isEligibleForAlumni() && (
                    <Card className="bg-primary/10 border-primary/30">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-primary font-medium">Status</p>
                        <div className="flex items-center justify-center gap-1">
                          <Award className="w-4 h-4 text-primary" />
                          <p className="text-sm font-bold text-primary">Ready for Alumni</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row lg:flex-col gap-2 justify-center">
                <Button onClick={() => navigate(`/students/${id}/edit`)} className="gradient-primary text-primary-foreground">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                {isEligibleForAlumni() && (
                  <Button 
                    variant="outline" 
                    className="text-primary border-primary/30 hover:bg-primary/10" 
                    onClick={() => setIsTransitionToAlumniDialogOpen(true)}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Mark as Graduated
                  </Button>
                )}
                {student.status === 'active' && (
                  <Button variant="outline" className="text-warning border-warning/30 hover:bg-warning/10" onClick={handleDisconnectClick}>
                    <Unplug className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                )}
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleDeleteClick}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Collapsible Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CollapsibleSection title="Personal Information" icon={<User className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Full Name (English)" value={student.fullNameEnglish} />
              <InfoRow label="Full Name (Bangla)" value={student.fullNameBangla} />
              <InfoRow label="Father's Name" value={student.fatherName} />
              <InfoRow label="Mother's Name" value={student.motherName} />
              <InfoRow label="Date of Birth" value={student.dateOfBirth} />
              <InfoRow label="Gender" value={student.gender} />
              <InfoRow label="Religion" value={student.religion} />
              <InfoRow label="Blood Group" value={student.bloodGroup} />
              <InfoRow label="Nationality" value={student.nationality} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CollapsibleSection title="Contact Information" icon={<Phone className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Student Mobile" value={student.mobileStudent} />
              <InfoRow label="Guardian Mobile" value={student.guardianMobile} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Emergency Contact" value={student.emergencyContact} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Present Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <CollapsibleSection title="Present Address" icon={<MapPin className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Division" value={student.presentAddress.division} />
              <InfoRow label="District" value={student.presentAddress.district} />
              <InfoRow label="Upazila" value={student.presentAddress.upazila} />
              <InfoRow label="Post Office" value={student.presentAddress.postOffice} />
              <InfoRow label="Village" value={student.presentAddress.village} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Permanent Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <CollapsibleSection title="Permanent Address" icon={<Home className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Division" value={student.permanentAddress.division} />
              <InfoRow label="District" value={student.permanentAddress.district} />
              <InfoRow label="Upazila" value={student.permanentAddress.upazila} />
              <InfoRow label="Post Office" value={student.permanentAddress.postOffice} />
              <InfoRow label="Village" value={student.permanentAddress.village} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Educational Background */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CollapsibleSection title="Educational Background" icon={<GraduationCap className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Highest Exam" value={student.highestExam} />
              <InfoRow label="Board" value={student.board} />
              <InfoRow label="Group" value={student.group} />
              <InfoRow label="Roll Number" value={student.rollNumber} />
              <InfoRow label="Registration Number" value={student.registrationNumber} />
              <InfoRow label="Passing Year" value={student.passingYear?.toString()} />
              <InfoRow label="GPA" value={student.gpa?.toString()} />
              <InfoRow label="Institution Name" value={student.institutionName} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Current Academic Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <CollapsibleSection title="Current Academic Information" icon={<BookOpen className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Roll Number" value={student.currentRollNumber} />
              <InfoRow label="Registration Number" value={student.currentRegistrationNumber} />
              <InfoRow label="Semester" value={`${student.semester}th`} />
              <InfoRow label="Department" value={typeof student.department === 'string' ? student.department : student.department.name} />
              <InfoRow label="Session" value={student.session} />
              <InfoRow label="Shift" value={student.shift} />
              <InfoRow label="Status" value={student.status} />
            </div>
          </CollapsibleSection>
        </motion.div>
      </div>

      {/* Semester Results */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Semester Results
                {isEligibleForAlumni() && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 ml-2">
                    <Award className="w-3 h-3 mr-1" />
                    Ready for Alumni
                  </Badge>
                )}
              </CardTitle>
              <Button 
                size="sm" 
                className="gradient-primary text-primary-foreground"
                onClick={() => setIsUpdateResultsDialogOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {student.semesterResults && student.semesterResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {student.semesterResults.map((result, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{result.semester}th Semester</span>
                      {result.gpa && (
                        <Badge className="gradient-primary text-primary-foreground">GPA: {result.gpa}</Badge>
                      )}
                    </div>
                    {result.cgpa && (
                      <div className="text-sm text-muted-foreground">CGPA: {result.cgpa}</div>
                    )}
                    {result.referredSubjects && result.referredSubjects.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-destructive font-medium">Referred Subjects:</p>
                        {result.referredSubjects.map((sub, i) => (
                          <Badge key={i} variant="outline" className="text-xs mt-1 mr-1 bg-destructive/10 text-destructive border-destructive/30">
                            {sub}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Results Available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Semester results have not been added yet.
                </p>
                <Button 
                  size="sm"
                  className="gradient-primary text-primary-foreground"
                  onClick={() => setIsUpdateResultsDialogOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Add Results
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Semester Attendance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Semester Attendance
              </CardTitle>
              <Button 
                size="sm" 
                className="gradient-primary text-primary-foreground"
                onClick={() => setIsUpdateAttendanceDialogOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Attendance
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {student.semesterAttendance && student.semesterAttendance.length > 0 ? (
              <div className="space-y-4">
                {student.semesterAttendance.map((semester, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-foreground">Semester {semester.semester}</span>
                      <Badge 
                        variant="outline"
                        className={`${
                          semester.averagePercentage >= 80 
                            ? 'bg-success/10 text-success border-success/30' 
                            : semester.averagePercentage >= 60 
                            ? 'bg-warning/10 text-warning border-warning/30' 
                            : 'bg-destructive/10 text-destructive border-destructive/30'
                        }`}
                      >
                        Average: {getSemesterAverage(semester).toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {semester.subjects.map((subject, subIndex) => (
                        <div key={subIndex} className="bg-muted/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-2 font-medium truncate">
                            {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                          </div>
                          <div className="flex items-center justify-between">
                            <span 
                              className={`text-lg font-bold ${
                                getSubjectPercentage(subject) >= 80 
                                  ? 'text-success' 
                                  : getSubjectPercentage(subject) >= 60 
                                  ? 'text-warning' 
                                  : 'text-destructive'
                              }`}
                            >
                              {getSubjectPercentage(subject)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {subject.present ?? 0}/{subject.total ?? 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Attendance Available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Semester attendance records have not been added yet.
                </p>
                <Button 
                  size="sm"
                  className="gradient-primary text-primary-foreground"
                  onClick={() => setIsUpdateAttendanceDialogOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Add Attendance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
                {documents.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {documents.length}
                  </Badge>
                )}
              </CardTitle>
              <Button 
                size="sm" 
                className="gradient-primary text-primary-foreground"
                onClick={() => navigate(`/documents?student=${id}`)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Manage Documents
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="ml-3 text-muted-foreground">Loading documents...</span>
              </div>
            ) : documents.length > 0 ? (
              <>
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Showing {documents.length} document{documents.length !== 1 ? 's' : ''} for this student
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Student ID: {id} | Name: {student?.fullNameEnglish} | Roll: {student?.currentRollNumber}
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
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Documents Linked</p>
                <p className="text-sm text-muted-foreground mb-3">
                  No documents are currently linked to this student record.
                </p>
                <div className="text-xs text-muted-foreground space-y-2 mb-4 bg-muted/30 rounded p-4 max-w-md mx-auto text-left">
                  <p className="font-medium text-foreground text-center mb-2">📋 Student Information</p>
                  <p><span className="font-medium">ID:</span> {id}</p>
                  <p><span className="font-medium">Name:</span> {student?.fullNameEnglish}</p>
                  <p><span className="font-medium">Roll:</span> {student?.currentRollNumber || 'Not assigned'}</p>
                  
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-warning font-medium mb-1">💡 Note:</p>
                    <p className="text-xs">If this student was created from an admission application, their documents may still be linked to the admission record. Check the <span className="font-medium">Admissions</span> page to view those documents.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/admissions')}
                  >
                    View Admissions
                  </Button>
                  <Button 
                    size="sm"
                    className="gradient-primary text-primary-foreground"
                    onClick={() => navigate(`/documents?student=${id}`)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Documents
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>



      {/* Math Challenge Dialog for Disconnect */}
      <Dialog open={isMathDialogOpen} onOpenChange={setIsMathDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Security Verification
            </DialogTitle>
            <DialogDescription>
              Solve this math problem to proceed with disconnecting the student.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center space-y-4">
              <p className="text-2xl font-bold text-foreground">
                {mathProblem.num1} + {mathProblem.num2} = ?
              </p>
              <Input
                type="number"
                placeholder="Enter your answer"
                value={mathProblem.answer}
                onChange={(e) => setMathProblem({ ...mathProblem, answer: e.target.value })}
                className="text-center text-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMathDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMathSubmit} className="gradient-primary text-primary-foreground">Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Form Dialog */}
      <Dialog open={isDisconnectDialogOpen} onOpenChange={setIsDisconnectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unplug className="w-5 h-5 text-warning" />
              Disconnect Student
            </DialogTitle>
            <DialogDescription>
              Please provide the reason for disconnecting this student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={disconnectForm.reason} onValueChange={(v) => setDisconnectForm({ ...disconnectForm, reason: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dropout">Dropout</SelectItem>
                  <SelectItem value="expelled">Expelled</SelectItem>
                  <SelectItem value="migrated">Migrated</SelectItem>
                  <SelectItem value="financial">Financial Issue</SelectItem>
                  <SelectItem value="medical">Medical Reason</SelectItem>
                  <SelectItem value="personal">Personal Reason</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropSemester">Drop Semester</Label>
              <Select value={disconnectForm.dropSemester} onValueChange={(v) => setDisconnectForm({ ...disconnectForm, dropSemester: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Semester</SelectItem>
                  <SelectItem value="2nd">2nd Semester</SelectItem>
                  <SelectItem value="3rd">3rd Semester</SelectItem>
                  <SelectItem value="4th">4th Semester</SelectItem>
                  <SelectItem value="5th">5th Semester</SelectItem>
                  <SelectItem value="6th">6th Semester</SelectItem>
                  <SelectItem value="7th">7th Semester</SelectItem>
                  <SelectItem value="8th">8th Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="guardianContacted" 
                checked={disconnectForm.guardianContacted}
                onCheckedChange={(c) => setDisconnectForm({ ...disconnectForm, guardianContacted: c as boolean })}
              />
              <Label htmlFor="guardianContacted" className="text-sm">Guardian has been contacted</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Any additional information..."
                value={disconnectForm.additionalNotes}
                onChange={(e) => setDisconnectForm({ ...disconnectForm, additionalNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisconnectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDisconnectSubmit} className="bg-warning text-warning-foreground hover:bg-warning/90">
              Confirm Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Student Permanently
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Solve the math problem to confirm deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center space-y-4">
              <p className="text-2xl font-bold text-foreground">
                {deleteMathProblem.num1} + {deleteMathProblem.num2} = ?
              </p>
              <Input
                type="number"
                placeholder="Enter your answer"
                value={deleteMathProblem.answer}
                onChange={(e) => setDeleteMathProblem({ ...deleteMathProblem, answer: e.target.value })}
                className="text-center text-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSubmit}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Attendance Dialog */}
      <Dialog open={isUpdateAttendanceDialogOpen} onOpenChange={setIsUpdateAttendanceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Update Attendance
            </DialogTitle>
            <DialogDescription>
              Update semester attendance records for the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {attendanceData.length > 0 ? (
              attendanceData.map((semester, semesterIndex) => (
                <div key={semesterIndex} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">Semester {semester.semester}</h4>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAddSubject(semesterIndex)}
                    >
                      Add Subject
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {semester.subjects.map((subject, subjectIndex) => (
                      <div key={subjectIndex} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <Label className="text-xs">Subject Code</Label>
                          <Input 
                            placeholder="Code" 
                            value={subject.code}
                            onChange={(e) => handleUpdateSubjectInfo(semesterIndex, subjectIndex, 'code', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs">Subject Name</Label>
                          <Input 
                            placeholder="Name" 
                            value={subject.name}
                            onChange={(e) => handleUpdateSubjectInfo(semesterIndex, subjectIndex, 'name', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Present</Label>
                          <Input 
                            type="number" 
                            placeholder="Present" 
                            value={subject.present}
                            onChange={(e) => handleUpdateAttendance(semesterIndex, subjectIndex, 'present', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Total</Label>
                          <Input 
                            type="number" 
                            placeholder="Total" 
                            value={subject.total}
                            onChange={(e) => handleUpdateAttendance(semesterIndex, subjectIndex, 'total', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-destructive h-9 w-full"
                            onClick={() => handleRemoveSubject(semesterIndex, subjectIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {semester.subjects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Average: <span className="font-semibold text-foreground">{getSemesterAverage(semester).toFixed(2)}%</span>
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No attendance data available</p>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAddSemester}
            >
              Add Semester
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateAttendanceDialogOpen(false)}>Cancel</Button>
            <Button 
              className="gradient-primary text-primary-foreground"
              onClick={handleSaveAttendance}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Results Dialog */}
      <Dialog open={isUpdateResultsDialogOpen} onOpenChange={setIsUpdateResultsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Update Semester Results
            </DialogTitle>
            <DialogDescription>
              Update semester results and grades for the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {resultsData.length > 0 ? (
              resultsData.map((result, resultIndex) => (
                <div key={resultIndex} className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3">Semester {result.semester}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Year</Label>
                      <Input 
                        type="number" 
                        value={result.year}
                        onChange={(e) => handleUpdateResult(resultIndex, 'year', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Result Type</Label>
                      <Select 
                        value={result.resultType} 
                        onValueChange={(v) => handleUpdateResult(resultIndex, 'resultType', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpa">GPA</SelectItem>
                          <SelectItem value="referred">Referred</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {result.resultType === 'gpa' && (
                      <>
                        <div>
                          <Label className="text-sm">GPA</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={result.gpa || ''}
                            onChange={(e) => handleUpdateResult(resultIndex, 'gpa', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">CGPA</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={result.cgpa || ''}
                            onChange={(e) => handleUpdateResult(resultIndex, 'cgpa', parseFloat(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                    {result.resultType === 'referred' && (
                      <div className="col-span-2">
                        <Label className="text-sm">Referred Subjects (comma-separated)</Label>
                        <Textarea 
                          value={result.referredSubjects?.join(', ') || ''}
                          onChange={(e) => handleUpdateResult(resultIndex, 'referredSubjects', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="Subject 1, Subject 2, Subject 3"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No results data available</p>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAddResultSemester}
            >
              Add Semester Result
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateResultsDialogOpen(false)}>Cancel</Button>
            <Button 
              className="gradient-primary text-primary-foreground"
              onClick={handleSaveResults}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition to Alumni Dialog */}
      <Dialog open={isTransitionToAlumniDialogOpen} onOpenChange={setIsTransitionToAlumniDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Mark Student as Graduated
            </DialogTitle>
            <DialogDescription>
              This will mark the student as graduated. The student will be available for alumni management in the Alumni section.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Student Information</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {student?.fullNameEnglish}</p>
                  <p><span className="text-muted-foreground">Roll:</span> {student?.currentRollNumber}</p>
                  <p><span className="text-muted-foreground">Department:</span> {typeof student?.department === 'string' ? student.department : student?.department.name}</p>
                  <p><span className="text-muted-foreground">Current Semester:</span> {student?.semester}th</p>
                </div>
              </div>
              
              {student?.semesterResults?.some(r => r.semester === 8) && (
                <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="font-semibold text-success">8th Semester Completed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This student has completed their 8th semester and is eligible for alumni transition.
                  </p>
                </div>
              )}
              
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <h5 className="font-semibold text-primary mb-2">What happens next?</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Student status will be changed to "Graduated"</li>
                  <li>• Student will be available for alumni management</li>
                  <li>• Student will appear in the Alumni section</li>
                  <li>• Alumni record can be created later if needed</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransitionToAlumniDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="gradient-primary text-primary-foreground"
              onClick={handleTransitionToAlumni}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Transitioning...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Mark as Graduated
                </div>
              )}
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
              
              <div 
                className="flex-1 overflow-auto px-6 pb-6"
                style={{
                  maxHeight: 'calc(90vh - 140px)',
                  overflowY: 'scroll'
                }}
              >
                <div className="space-y-6">
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
                      <p className="font-medium">{selectedDoc.source_type_display || 'Student Document'}</p>
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
                      <p>• Status: {selectedDoc.status === 'active' ? 'Active' : selectedDoc.status}</p>
                      <p>• File integrity: Verified</p>
                      {selectedDoc.description && <p>• Description: {selectedDoc.description}</p>}
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
