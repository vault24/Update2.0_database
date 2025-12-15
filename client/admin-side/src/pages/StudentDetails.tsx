import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Edit, Download, Unplug, Trash2, ChevronDown, ChevronUp,
  User, Phone, MapPin, GraduationCap, BookOpen, 
  AlertTriangle, CheckCircle, Home, TrendingUp, Award
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
      await studentService.patchStudent(id, {
        semesterAttendance: attendanceData
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

  if (loading) {
    return <LoadingState message="Loading student details..." />;
  }

  if (error || !student) {
    return <ErrorState error={error || "Student not found"} />;
  }

  const averageAttendance = student.semesterAttendance && student.semesterAttendance.length > 0
    ? Math.round(
        student.semesterAttendance.reduce((acc, s) => acc + s.averagePercentage, 0) / student.semesterAttendance.length
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
                        Average: {semester.averagePercentage.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {semester.subjects.map((subject, subIndex) => (
                        <div key={subIndex} className="bg-muted/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-2 font-medium truncate">
                            {subject.name}
                          </div>
                          <div className="flex items-center justify-between">
                            <span 
                              className={`text-lg font-bold ${
                                subject.percentage >= 80 
                                  ? 'text-success' 
                                  : subject.percentage >= 60 
                                  ? 'text-warning' 
                                  : 'text-destructive'
                              }`}
                            >
                              {subject.percentage}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {subject.present}/{subject.total}
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
                        Average: <span className="font-semibold text-foreground">{semester.averagePercentage.toFixed(2)}%</span>
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
    </div>
  );
}
