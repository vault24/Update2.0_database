import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  ListTodo,
  MessageSquare,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Award,
  TrendingUp,
  Mail,
  Phone,
} from "lucide-react";
import { format, parseISO, differenceInDays, differenceInHours, isPast } from "date-fns";

// Types
interface StudentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  avatarUrl?: string;
  status: 'submitted' | 'pending' | 'late' | 'graded';
  submittedAt?: string;
  attachments?: { name: string; url: string; size: string }[];
  grade?: string;
  marks?: number;
  maxMarks?: number;
  feedback?: string;
  email?: string;
  phone?: string;
}

interface AssignmentDetails {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  title: string;
  description: string;
  assignedDate: string;
  deadline: string;
  teacherName: string;
  status: 'pending' | 'submitted' | 'late' | 'graded' | 'active';
  priority: 'normal' | 'important';
  attachments?: { name: string; url: string; size: string }[];
  instructions?: string;
  maxMarks: number;
  passingMarks: number;
}

// Mock data for students
const mockStudents: StudentSubmission[] = [
  { id: '1', studentId: 'SPI-2024-0001', studentName: 'Rakib Ahmed', studentRoll: '01', status: 'submitted', submittedAt: '2024-12-29T14:30:00', attachments: [{ name: 'bst_implementation.cpp', url: '#', size: '12 KB' }], marks: 85, maxMarks: 100, grade: 'A', feedback: 'Excellent work!', email: 'rakib@example.com', phone: '01712345678' },
  { id: '2', studentId: 'SPI-2024-0002', studentName: 'Fatima Khan', studentRoll: '02', status: 'submitted', submittedAt: '2024-12-30T09:15:00', attachments: [{ name: 'bst.cpp', url: '#', size: '10 KB' }], email: 'fatima@example.com', phone: '01812345678' },
  { id: '3', studentId: 'SPI-2024-0003', studentName: 'Mohammad Hassan', studentRoll: '03', status: 'graded', submittedAt: '2024-12-28T16:45:00', attachments: [{ name: 'bst_project.zip', url: '#', size: '45 KB' }], marks: 92, maxMarks: 100, grade: 'A+', feedback: 'Outstanding implementation with proper test cases.', email: 'hassan@example.com', phone: '01912345678' },
  { id: '4', studentId: 'SPI-2024-0004', studentName: 'Ayesha Begum', studentRoll: '04', status: 'pending', email: 'ayesha@example.com', phone: '01612345678' },
  { id: '5', studentId: 'SPI-2024-0005', studentName: 'Karim Uddin', studentRoll: '05', status: 'pending', email: 'karim@example.com', phone: '01512345678' },
  { id: '6', studentId: 'SPI-2024-0006', studentName: 'Nusrat Jahan', studentRoll: '06', status: 'late', submittedAt: '2025-01-02T23:59:00', attachments: [{ name: 'bst_late.cpp', url: '#', size: '11 KB' }], email: 'nusrat@example.com', phone: '01412345678' },
  { id: '7', studentId: 'SPI-2024-0007', studentName: 'Imran Ali', studentRoll: '07', status: 'submitted', submittedAt: '2024-12-30T18:00:00', attachments: [{ name: 'binary_search_tree.cpp', url: '#', size: '14 KB' }], email: 'imran@example.com', phone: '01312345678' },
  { id: '8', studentId: 'SPI-2024-0008', studentName: 'Taslima Akter', studentRoll: '08', status: 'pending', email: 'taslima@example.com', phone: '01212345678' },
  { id: '9', studentId: 'SPI-2024-0009', studentName: 'Rafiq Islam', studentRoll: '09', status: 'graded', submittedAt: '2024-12-29T20:00:00', attachments: [{ name: 'assignment1.cpp', url: '#', size: '13 KB' }], marks: 78, maxMarks: 100, grade: 'B+', feedback: 'Good work but missing some edge cases.', email: 'rafiq@example.com', phone: '01112345678' },
  { id: '10', studentId: 'SPI-2024-0010', studentName: 'Sumaiya Rahman', studentRoll: '10', status: 'pending', email: 'sumaiya@example.com', phone: '01012345678' },
];

const mockAssignment: AssignmentDetails = {
  id: '1',
  subjectId: '1',
  subjectName: 'Data Structures',
  subjectCode: 'CSE-301',
  title: 'Implement Binary Search Tree',
  description: 'Write a complete BST implementation in C++ with insert, delete, search, and traversal operations. Include proper comments and test cases.',
  assignedDate: '2024-12-25',
  deadline: '2024-12-31T23:59:00',
  teacherName: 'Dr. Rahman',
  status: 'active',
  priority: 'important',
  attachments: [
    { name: 'bst_template.cpp', url: '#', size: '2.5 KB' },
    { name: 'instructions.pdf', url: '#', size: '156 KB' },
  ],
  instructions: '1. Implement all basic BST operations\n2. Include at least 5 test cases\n3. Use proper coding conventions\n4. Submit as a single .cpp file or .zip archive',
  maxMarks: 100,
  passingMarks: 40,
};

export default function TeacherAssignmentDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState<AssignmentDetails>(mockAssignment);
  const [students, setStudents] = useState<StudentSubmission[]>(mockStudents);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // Grading Dialog
  const [gradingDialog, setGradingDialog] = useState(false);
  const [gradingStudent, setGradingStudent] = useState<StudentSubmission | null>(null);
  const [gradingForm, setGradingForm] = useState({ marks: '', feedback: '' });
  
  // Notification Dialog
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [notificationType, setNotificationType] = useState<'reminder' | 'urgent' | 'custom'>('reminder');
  const [customMessage, setCustomMessage] = useState('');
  
  // Student Detail Dialog
  const [studentDetailDialog, setStudentDetailDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);

  // Calculate statistics
  const stats = {
    total: students.length,
    submitted: students.filter(s => s.status === 'submitted' || s.status === 'graded' || s.status === 'late').length,
    pending: students.filter(s => s.status === 'pending').length,
    graded: students.filter(s => s.status === 'graded').length,
    late: students.filter(s => s.status === 'late').length,
    averageMarks: Math.round(students.filter(s => s.marks).reduce((acc, s) => acc + (s.marks || 0), 0) / students.filter(s => s.marks).length) || 0,
    highestMarks: Math.max(...students.filter(s => s.marks).map(s => s.marks || 0), 0),
    lowestMarks: Math.min(...students.filter(s => s.marks).map(s => s.marks || 0), 0),
  };

  const submissionRate = Math.round((stats.submitted / stats.total) * 100);
  const gradingProgress = Math.round((stats.graded / stats.submitted) * 100) || 0;

  // Time remaining calculations
  const deadline = parseISO(assignment.deadline);
  const isOverdue = isPast(deadline);
  const daysRemaining = differenceInDays(deadline, new Date());
  const hoursRemaining = differenceInHours(deadline, new Date());

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.studentRoll.includes(searchQuery) ||
                         student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || student.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Grade calculation helper
  const calculateGrade = (marks: number, maxMarks: number): string => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Handle grading submission
  const handleGradeSubmit = () => {
    if (!gradingStudent || !gradingForm.marks) return;
    
    const marks = parseInt(gradingForm.marks);
    const grade = calculateGrade(marks, assignment.maxMarks);
    
    setStudents(students.map(s => 
      s.id === gradingStudent.id 
        ? { ...s, marks, grade, feedback: gradingForm.feedback, status: 'graded' as const, maxMarks: assignment.maxMarks }
        : s
    ));
    
    setGradingDialog(false);
    setGradingStudent(null);
    setGradingForm({ marks: '', feedback: '' });
    toast({ title: "Grade Submitted", description: `${gradingStudent.studentName} has been graded.` });
  };

  // Handle bulk notification
  const handleSendNotification = () => {
    const targetStudents = selectedStudents.length > 0 
      ? students.filter(s => selectedStudents.includes(s.id))
      : students.filter(s => s.status === 'pending');
    
    let message = '';
    switch (notificationType) {
      case 'reminder':
        message = `Reminder: Assignment "${assignment.title}" deadline is ${isOverdue ? 'passed' : `in ${daysRemaining > 0 ? daysRemaining + ' days' : hoursRemaining + ' hours'}`}. Please submit your work.`;
        break;
      case 'urgent':
        message = `URGENT: Assignment "${assignment.title}" requires immediate attention. Submit your work as soon as possible to avoid penalties.`;
        break;
      case 'custom':
        message = customMessage;
        break;
    }
    
    toast({ 
      title: "Notifications Sent", 
      description: `Sent to ${targetStudents.length} student(s): ${targetStudents.map(s => s.studentName).join(', ')}` 
    });
    
    setNotificationDialog(false);
    setSelectedStudents([]);
    setCustomMessage('');
  };

  // Open grading dialog
  const openGradingDialog = (student: StudentSubmission) => {
    setGradingStudent(student);
    setGradingForm({ 
      marks: student.marks?.toString() || '', 
      feedback: student.feedback || '' 
    });
    setGradingDialog(true);
  };

  // Open student detail
  const openStudentDetail = (student: StudentSubmission) => {
    setSelectedStudent(student);
    setStudentDetailDialog(true);
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all pending students
  const selectAllPending = () => {
    const pendingIds = students.filter(s => s.status === 'pending').map(s => s.id);
    setSelectedStudents(pendingIds);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Submitted</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
      case 'late':
        return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">Late</Badge>;
      case 'graded':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Graded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{assignment.subjectCode}</Badge>
                {assignment.priority === 'important' && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Important
                  </Badge>
                )}
                {isOverdue && (
                  <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Deadline Passed</Badge>
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold">{assignment.title}</h1>
              <p className="text-muted-foreground mt-1">{assignment.subjectName} • {assignment.teacherName}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setNotificationDialog(true)}
              >
                <BellRing className="h-4 w-4" />
                Send Notification
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6"
        >
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Students</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Submitted</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.submitted}</p>
              <p className="text-xs text-muted-foreground">{submissionRate}% rate</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Graded</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.graded}</p>
              <p className="text-xs text-muted-foreground">{gradingProgress}% complete</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Late</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.late}</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Avg. Marks</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.averageMarks}</p>
              <p className="text-xs text-muted-foreground">/{assignment.maxMarks}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Submissions</span>
              <Badge variant="secondary" className="ml-1">{stats.submitted}</Badge>
            </TabsTrigger>
            <TabsTrigger value="grading" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Grading</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="mt-1">{assignment.description}</p>
                    </div>
                    
                    {assignment.instructions && (
                      <div>
                        <Label className="text-muted-foreground">Instructions</Label>
                        <pre className="mt-1 text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{assignment.instructions}</pre>
                      </div>
                    )}
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Assigned Date</Label>
                        <p className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(assignment.assignedDate), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Deadline</Label>
                        <p className={`mt-1 flex items-center gap-2 ${isOverdue ? 'text-destructive' : ''}`}>
                          <Clock className="h-4 w-4" />
                          {format(deadline, 'MMMM dd, yyyy hh:mm a')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Maximum Marks</Label>
                        <p className="mt-1">{assignment.maxMarks}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Passing Marks</Label>
                        <p className="mt-1">{assignment.passingMarks}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {assignment.attachments && assignment.attachments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Attachments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {assignment.attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{file.size}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Submission Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Submissions</span>
                        <span>{stats.submitted}/{stats.total}</span>
                      </div>
                      <Progress value={submissionRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Grading Progress</span>
                        <span>{stats.graded}/{stats.submitted}</span>
                      </div>
                      <Progress value={gradingProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        selectAllPending();
                        setNotificationType('reminder');
                        setNotificationDialog(true);
                      }}
                    >
                      <Bell className="h-4 w-4" />
                      Remind Pending Students ({stats.pending})
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 text-orange-600"
                      onClick={() => {
                        selectAllPending();
                        setNotificationType('urgent');
                        setNotificationDialog(true);
                      }}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Send Urgent Notice
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Download className="h-4 w-4" />
                      Download All Submissions
                    </Button>
                  </CardContent>
                </Card>

                {stats.graded > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Grade Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Highest</span>
                        <span className="font-semibold text-green-600">{stats.highestMarks}/{assignment.maxMarks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lowest</span>
                        <span className="font-semibold text-red-600">{stats.lowestMarks}/{assignment.maxMarks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average</span>
                        <span className="font-semibold">{stats.averageMarks}/{assignment.maxMarks}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Student Submissions</CardTitle>
                      <CardDescription>View and manage all student submissions</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search students..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-full sm:w-64"
                        />
                      </div>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="graded">Graded</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox 
                              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStudents(filteredStudents.map(s => s.id));
                                } else {
                                  setSelectedStudents([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Roll</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead className="hidden md:table-cell">Submitted At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Files</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.id} className={selectedStudents.includes(student.id) ? 'bg-muted/50' : ''}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={() => toggleStudentSelection(student.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono">{student.studentRoll}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{student.studentName}</p>
                                  <p className="text-xs text-muted-foreground">{student.studentId}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {student.submittedAt ? format(parseISO(student.submittedAt), 'MMM dd, hh:mm a') : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(student.status)}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {student.attachments ? (
                                <Badge variant="outline" className="gap-1">
                                  <FileText className="h-3 w-3" />
                                  {student.attachments.length}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openStudentDetail(student)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(student.status === 'submitted' || student.status === 'late') && (
                                  <Button variant="ghost" size="icon" onClick={() => openGradingDialog(student)}>
                                    <GraduationCap className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {selectedStudents.length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-sm">{selectedStudents.length} student(s) selected</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedStudents([])}>
                          Clear Selection
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => setNotificationDialog(true)}>
                          <Bell className="h-4 w-4" />
                          Send Notification
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Grading Tab */}
          <TabsContent value="grading">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Grading Dashboard</CardTitle>
                  <CardDescription>Grade student submissions and provide feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {students.filter(s => s.status === 'submitted' || s.status === 'late' || s.status === 'graded').map((student) => (
                      <div 
                        key={student.id} 
                        className={`p-4 rounded-lg border ${student.status === 'graded' ? 'bg-green-500/5 border-green-500/20' : 'bg-card'}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{student.studentName}</p>
                                {getStatusBadge(student.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">Roll: {student.studentRoll} • {student.studentId}</p>
                              {student.submittedAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Submitted: {format(parseISO(student.submittedAt), 'MMM dd, yyyy hh:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {student.attachments && (
                              <div className="flex flex-wrap gap-2">
                                {student.attachments.map((file, idx) => (
                                  <Button key={idx} variant="outline" size="sm" className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    {file.name}
                                    <Download className="h-3 w-3" />
                                  </Button>
                                ))}
                              </div>
                            )}
                            
                            {student.status === 'graded' ? (
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600">{student.marks}/{student.maxMarks}</p>
                                  <Badge className="bg-green-500/10 text-green-600">{student.grade}</Badge>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openGradingDialog(student)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button onClick={() => openGradingDialog(student)} className="gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Grade Now
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {student.feedback && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Feedback:</p>
                            <p className="text-sm text-muted-foreground">{student.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {students.filter(s => s.status === 'submitted' || s.status === 'late' || s.status === 'graded').length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No submissions to grade yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Grading Dialog */}
      <Dialog open={gradingDialog} onOpenChange={setGradingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              {gradingStudent && `Grade ${gradingStudent.studentName}'s submission`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marks (out of {assignment.maxMarks})</Label>
              <Input 
                type="number" 
                min="0" 
                max={assignment.maxMarks}
                value={gradingForm.marks}
                onChange={(e) => setGradingForm({ ...gradingForm, marks: e.target.value })}
                placeholder="Enter marks"
              />
              {gradingForm.marks && (
                <p className="text-sm text-muted-foreground">
                  Grade: <span className="font-semibold">{calculateGrade(parseInt(gradingForm.marks), assignment.maxMarks)}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Feedback (Optional)</Label>
              <Textarea 
                value={gradingForm.feedback}
                onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                placeholder="Provide feedback for the student..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingDialog(false)}>Cancel</Button>
            <Button onClick={handleGradeSubmit} disabled={!gradingForm.marks}>
              <Check className="h-4 w-4 mr-2" />
              Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialog} onOpenChange={setNotificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send notification to {selectedStudents.length > 0 ? `${selectedStudents.length} selected student(s)` : 'pending students'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select value={notificationType} onValueChange={(v: 'reminder' | 'urgent' | 'custom') => setNotificationType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">📝 Deadline Reminder</SelectItem>
                  <SelectItem value="urgent">🚨 Urgent Notice</SelectItem>
                  <SelectItem value="custom">✍️ Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {notificationType === 'custom' && (
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
            )}
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <p className="text-sm text-muted-foreground">
                {notificationType === 'reminder' && `Reminder: Assignment "${assignment.title}" deadline is ${isOverdue ? 'passed' : `approaching`}. Please submit your work.`}
                {notificationType === 'urgent' && `URGENT: Assignment "${assignment.title}" requires immediate attention.`}
                {notificationType === 'custom' && (customMessage || 'Enter your custom message above')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialog(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} className="gap-2">
              <Send className="h-4 w-4" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Detail Dialog */}
      <Dialog open={studentDetailDialog} onOpenChange={setStudentDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.studentName}</h3>
                  <p className="text-muted-foreground">{selectedStudent.studentId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedStudent.status)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Roll Number</Label>
                  <p className="font-medium">{selectedStudent.studentRoll}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="capitalize">{selectedStudent.status}</p>
                </div>
                {selectedStudent.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedStudent.email}
                    </p>
                  </div>
                )}
                {selectedStudent.phone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedStudent.phone}
                    </p>
                  </div>
                )}
              </div>
              
              {selectedStudent.submittedAt && (
                <div>
                  <Label className="text-muted-foreground">Submitted At</Label>
                  <p>{format(parseISO(selectedStudent.submittedAt), 'MMMM dd, yyyy hh:mm a')}</p>
                </div>
              )}
              
              {selectedStudent.attachments && (
                <div>
                  <Label className="text-muted-foreground">Submitted Files</Label>
                  <div className="space-y-2 mt-2">
                    {selectedStudent.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.size}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedStudent.status === 'graded' && (
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-green-600">Grade</Label>
                    <Badge className="bg-green-500/20 text-green-600 text-lg">{selectedStudent.grade}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{selectedStudent.marks}/{selectedStudent.maxMarks}</p>
                  {selectedStudent.feedback && (
                    <div className="mt-3">
                      <Label className="text-muted-foreground">Feedback</Label>
                      <p className="text-sm mt-1">{selectedStudent.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDetailDialog(false)}>Close</Button>
            {selectedStudent && (selectedStudent.status === 'submitted' || selectedStudent.status === 'late') && (
              <Button onClick={() => {
                setStudentDetailDialog(false);
                openGradingDialog(selectedStudent);
              }}>
                Grade Submission
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
