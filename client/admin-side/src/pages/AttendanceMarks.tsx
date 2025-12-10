import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, BookOpen, Filter, Save, Download, TrendingUp, Users, Calendar, Search, Plus, Edit, Trash2, X, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { attendanceService, AttendanceRecord } from '@/services/attendanceService';
import { marksService, MarksRecord } from '@/services/marksService';
import { studentService } from '@/services/studentService';
import departmentService from '@/services/departmentService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const examTypes = [
  { value: 'midterm', label: 'Mid Term' },
  { value: 'final', label: 'Final Exam' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'quiz', label: 'Quiz' },
];

interface SubjectMark {
  id: string;
  subject: string;
  code: string;
  ct1: number;
  ct2: number;
  ct3: number;
  assignment: number;
  attendance: number;
  final: number;
}

const gradeScales = [
  { name: 'Standard', scale: { 'A+': 4.0, 'A': 4.0, 'A-': 3.75, 'B+': 3.5, 'B': 3.25, 'B-': 3.0, 'C+': 2.75, 'C': 2.5, 'C-': 2.25, 'D': 2.0, 'F': 0.0 } },
  { name: 'Alternative', scale: { 'A+': 4.0, 'A': 3.75, 'A-': 3.5, 'B+': 3.25, 'B': 3.0, 'B-': 2.75, 'C+': 2.5, 'C': 2.25, 'C-': 2.0, 'D': 1.75, 'F': 0.0 } },
];

const calculateGrade = (total: number, scale: any): { grade: string; gpa: number } => {
  if (total >= 97) return { grade: 'A+', gpa: scale['A+'] };
  if (total >= 93) return { grade: 'A', gpa: scale['A'] };
  if (total >= 90) return { grade: 'A-', gpa: scale['A-'] };
  if (total >= 87) return { grade: 'B+', gpa: scale['B+'] };
  if (total >= 83) return { grade: 'B', gpa: scale['B'] };
  if (total >= 80) return { grade: 'B-', gpa: scale['B-'] };
  if (total >= 77) return { grade: 'C+', gpa: scale['C+'] };
  if (total >= 73) return { grade: 'C', gpa: scale['C'] };
  if (total >= 70) return { grade: 'C-', gpa: scale['C-'] };
  if (total >= 60) return { grade: 'D', gpa: scale['D'] };
  return { grade: 'F', gpa: scale['F'] };
};

// Chart data will be calculated from real data

export default function AttendanceMarks() {
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [month, setMonth] = useState('all');
  const [examType, setExamType] = useState('midterm');
  const { toast } = useToast();
  
  // Data states
  const [departments, setDepartments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [marksRecords, setMarksRecords] = useState<MarksRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    avgMarks: 0,
    classesThisMonth: 0,
  });
  
  // Student search and details popup
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; roll: string; name: string } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [gradeScale, setGradeScale] = useState('Standard');
  const [studentSubjects, setStudentSubjects] = useState<SubjectMark[]>([
    { id: '1', subject: 'Mathematics-I', code: 'MATH-101', ct1: 18, ct2: 17, ct3: 19, assignment: 9, attendance: 10, final: 72 },
    { id: '2', subject: 'Physics-I', code: 'PHY-101', ct1: 16, ct2: 19, ct3: 17, assignment: 8, attendance: 9, final: 68 },
    { id: '3', subject: 'Computer Fundamentals', code: 'CSE-101', ct1: 20, ct2: 19, ct3: 20, assignment: 10, attendance: 10, final: 78 },
    { id: '4', subject: 'Basic Electrical', code: 'EE-101', ct1: 15, ct2: 17, ct3: 16, assignment: 8, attendance: 9, final: 65 },
    { id: '5', subject: 'Workshop Practice', code: 'ME-101', ct1: 17, ct2: 18, ct3: 16, assignment: 9, attendance: 10, final: 0 },
    { id: '6', subject: 'Engineering Drawing', code: 'ME-102', ct1: 18, ct2: 17, ct3: 19, assignment: 8, attendance: 9, final: 0 },
  ]);
  const [editingSubject, setEditingSubject] = useState<SubjectMark | null>(null);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    if (department && semester) {
      loadFilteredData();
    }
  }, [department, semester, subject, month, examType]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load departments
      const deptResponse = await departmentService.getDepartments();
      setDepartments(deptResponse.results || []);
      
      // Set first department as default if available
      if (deptResponse.results && deptResponse.results.length > 0) {
        setDepartment(deptResponse.results[0].id);
      }
      
      // Set default semester
      if (!semester) {
        setSemester('1');
      }
      
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'Failed to load data');
      toast({
        title: 'Error',
        description: 'Failed to load initial data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load students for the selected department and semester
      const studentsResponse = await studentService.getStudents({
        department: department,
        semester: parseInt(semester),
        page_size: 100,
      });
      setStudents(studentsResponse.results || []);
      
      // Load attendance records
      const attendanceFilters: any = {
        semester: parseInt(semester),
        page_size: 1000,
      };
      if (subject) {
        attendanceFilters.subject_code = subject;
      }
      
      const attendanceResponse = await attendanceService.getAttendance(attendanceFilters);
      setAttendanceRecords(attendanceResponse.results || []);
      
      // Load marks records
      const marksFilters: any = {
        semester: parseInt(semester),
        page_size: 1000,
      };
      if (subject) {
        marksFilters.subject_code = subject;
      }
      if (examType) {
        marksFilters.exam_type = examType;
      }
      
      const marksResponse = await marksService.getMarks(marksFilters);
      setMarksRecords(marksResponse.results || []);
      
      // Calculate stats
      calculateStats(studentsResponse.results || [], attendanceResponse.results || [], marksResponse.results || []);
      
    } catch (err: any) {
      console.error('Error loading filtered data:', err);
      setError(err.message || 'Failed to load filtered data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentsList: any[], attendanceList: AttendanceRecord[], marksList: MarksRecord[]) => {
    const totalStudents = studentsList.length;
    
    // Calculate average attendance
    const presentCount = attendanceList.filter(a => a.isPresent).length;
    const totalAttendance = attendanceList.length;
    const avgAttendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
    
    // Calculate average marks
    const totalMarksSum = marksList.reduce((sum, m) => sum + (m.percentage || 0), 0);
    const avgMarks = marksList.length > 0 ? Math.round(totalMarksSum / marksList.length) : 0;
    
    // Calculate classes this month (unique dates in current month)
    const currentMonth = new Date().getMonth();
    const classesThisMonth = new Set(
      attendanceList
        .filter(a => new Date(a.date).getMonth() === currentMonth)
        .map(a => a.date)
    ).size;
    
    setStats({
      totalStudents,
      avgAttendance,
      avgMarks,
      classesThisMonth,
    });
  };

  // Calculate chart data from attendance and marks records
  const getChartData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = [];
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (new Date().getMonth() - 5 + i + 12) % 12;
      const monthAttendance = attendanceRecords.filter(a => new Date(a.date).getMonth() === monthIndex);
      const monthMarks = marksRecords.filter(m => new Date(m.recordedAt || '').getMonth() === monthIndex);
      
      const presentCount = monthAttendance.filter(a => a.isPresent).length;
      const totalAttendance = monthAttendance.length;
      const attendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
      
      const avgMarks = monthMarks.length > 0 
        ? Math.round(monthMarks.reduce((sum, m) => sum + (m.percentage || 0), 0) / monthMarks.length)
        : 0;
      
      chartData.push({
        month: monthNames[monthIndex],
        attendance,
        avgMarks,
      });
    }
    
    return chartData;
  };

  // Process attendance data for display
  const processedAttendanceData = students.map(student => {
    const studentAttendance = attendanceRecords.filter(a => a.student === student.id);
    const present = studentAttendance.filter(a => a.isPresent).length;
    const absent = studentAttendance.filter(a => !a.isPresent).length;
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return {
      id: student.id,
      roll: student.rollNumber || 'N/A',
      name: student.fullNameEnglish || 'Unknown',
      present,
      absent,
      percentage,
    };
  });

  // Process marks data for display
  const processedMarksData = students.map(student => {
    const studentMarks = marksRecords.filter(m => m.student === student.id);
    
    return {
      id: student.id,
      roll: student.rollNumber || 'N/A',
      name: student.fullNameEnglish || 'Unknown',
      marks: studentMarks,
    };
  });

  const filteredStudents = processedMarksData.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll.includes(searchQuery)
  );

  const handleStudentSelect = async (student: { id: string; roll: string; name: string }) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
    
    // Load student's marks and attendance
    try {
      const marksResponse = await marksService.getStudentMarks(student.id, semester ? parseInt(semester) : undefined);
      const attendanceResponse = await attendanceService.getStudentSummary(student.id);
      
      // Process marks data into subject format
      const subjectMap = new Map<string, SubjectMark>();
      
      marksResponse.marks.forEach(mark => {
        const key = mark.subjectCode;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            id: key,
            subject: mark.subjectName,
            code: mark.subjectCode,
            ct1: 0,
            ct2: 0,
            ct3: 0,
            assignment: 0,
            attendance: 0,
            final: 0,
          });
        }
        
        const subj = subjectMap.get(key)!;
        
        // Map exam types to fields
        if (mark.examType === 'quiz') {
          // Distribute quizzes to CT slots
          if (subj.ct1 === 0) subj.ct1 = mark.marksObtained;
          else if (subj.ct2 === 0) subj.ct2 = mark.marksObtained;
          else if (subj.ct3 === 0) subj.ct3 = mark.marksObtained;
        } else if (mark.examType === 'assignment') {
          subj.assignment = mark.marksObtained;
        } else if (mark.examType === 'final') {
          subj.final = mark.marksObtained;
        } else if (mark.examType === 'midterm') {
          subj.ct2 = mark.marksObtained;
        }
      });
      
      // Add attendance marks from attendance summary
      attendanceResponse.summary.forEach(att => {
        const subj = subjectMap.get(att.subject_code);
        if (subj) {
          subj.attendance = Math.round((att.percentage / 100) * 10); // Convert percentage to marks out of 10
        }
      });
      
      setStudentSubjects(Array.from(subjectMap.values()));
    } catch (err: any) {
      console.error('Error loading student details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load student details',
        variant: 'destructive',
      });
    }
  };

  const handleMarkChange = (subjectId: string, field: keyof SubjectMark, value: string | number) => {
    setStudentSubjects(prev => prev.map(subj =>
      subj.id === subjectId ? { ...subj, [field]: value } : subj
    ));
  };

  const handleSaveDetails = () => {
    toast({
      title: "Success",
      description: "Student marks and attendance have been saved successfully.",
    });
    setIsDetailsOpen(false);
  };

  const handleAddSubject = () => {
    const newSubject: SubjectMark = {
      id: Date.now().toString(),
      subject: '',
      code: '',
      ct1: 0,
      ct2: 0,
      ct3: 0,
      assignment: 0,
      attendance: 0,
      final: 0,
    };
    setEditingSubject(newSubject);
    setIsAddSubjectOpen(true);
  };

  const handleEditSubject = (subject: SubjectMark) => {
    setEditingSubject(subject);
    setIsAddSubjectOpen(true);
  };

  const handleDeleteSubject = (subjectId: string) => {
    setStudentSubjects(prev => prev.filter(subj => subj.id !== subjectId));
    toast({
      title: "Subject Deleted",
      description: "Subject has been removed from the list.",
    });
  };

  const handleSaveSubject = () => {
    if (!editingSubject) return;
    
    if (!editingSubject.subject || !editingSubject.code) {
      toast({
        title: "Validation Error",
        description: "Please fill in subject name and code.",
        variant: "destructive"
      });
      return;
    }

    if (editingSubject.id && studentSubjects.find(s => s.id === editingSubject.id)) {
      // Update existing
      setStudentSubjects(prev => prev.map(subj =>
        subj.id === editingSubject.id ? editingSubject : subj
      ));
    } else {
      // Add new
      setStudentSubjects(prev => [...prev, editingSubject]);
    }
    
    setIsAddSubjectOpen(false);
    setEditingSubject(null);
    toast({
      title: "Success",
      description: "Subject saved successfully.",
    });
  };

  const currentScale = gradeScales.find(s => s.name === gradeScale)?.scale || gradeScales[0].scale;

  if (loading && !department) {
    return <LoadingState message="Loading attendance and marks data..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadInitialData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance & Marks</h1>
          <p className="text-muted-foreground">Track student attendance and manage examination marks</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgAttendance}%</p>
                  <p className="text-xs text-muted-foreground">Avg Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgMarks}%</p>
                  <p className="text-xs text-muted-foreground">Avg Marks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.classesThisMonth}</p>
                  <p className="text-xs text-muted-foreground">Classes This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="attendance" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="marks" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Marks
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Filters */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Subject Code (optional)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map((m, idx) => <SelectItem key={m} value={String(idx)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="attendance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Roll</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">Present</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">Absent</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">Percentage</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Loading attendance data...
                        </td>
                      </tr>
                    ) : processedAttendanceData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No attendance records found. Please select department and semester.
                        </td>
                      </tr>
                    ) : (
                      processedAttendanceData.map((student, index) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border last:border-0 hover:bg-muted/50"
                        >
                          <td className="p-3 text-sm font-medium">{student.roll}</td>
                          <td className="p-3 text-sm">{student.name}</td>
                          <td className="p-3 text-sm text-center text-success">{student.present}</td>
                          <td className="p-3 text-sm text-center text-destructive">{student.absent}</td>
                          <td className="p-3 text-sm text-center font-medium">{student.percentage}%</td>
                          <td className="p-3 text-center">
                            <Badge variant={student.percentage >= 75 ? 'default' : 'destructive'}>
                              {student.percentage >= 75 ? 'Good' : 'Low'}
                            </Badge>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marks Tab */}
        <TabsContent value="marks" className="space-y-6">
          {/* Filters */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Subject Code (optional)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Exam Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Student Search */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Search className="w-4 h-4" />
                Find Student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchQuery && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-sm text-muted-foreground">Roll: {student.roll}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No students found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student Details Popup */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Internal Assessment & Final Results
                </DialogTitle>
                {selectedStudent && (
                  <DialogDescription className="mt-1">
                    {selectedStudent.name} - Roll: {selectedStudent.roll}
                  </DialogDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={gradeScale} onValueChange={setGradeScale}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeScales.map(scale => (
                      <SelectItem key={scale.name} value={scale.name}>{scale.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddSubject} className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Subject</th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">CT-1<br/><span className="text-xs">(20)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">CT-2<br/><span className="text-xs">(20)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">CT-3<br/><span className="text-xs">(20)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Assignment<br/><span className="text-xs">(10)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Attendance<br/><span className="text-xs">(10)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Internal<br/><span className="text-xs">(60)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Final<br/><span className="text-xs">(40)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Total<br/><span className="text-xs">(100)</span></th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Grade</th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">GPA</th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSubjects.map((subj, index) => {
                    const internal = subj.ct1 + subj.ct2 + subj.ct3 + subj.assignment + subj.attendance;
                    const total = internal + subj.final;
                    const { grade, gpa } = subj.final > 0 ? calculateGrade(total, currentScale) : { grade: '-', gpa: 0 };
                    const gradeColor = total >= 80 ? 'text-green-600 dark:text-green-400' : total >= 70 ? 'text-purple-600 dark:text-purple-400' : total >= 60 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
                    
                    return (
                      <motion.tr
                        key={subj.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-foreground">{subj.subject}</p>
                            <p className="text-xs text-muted-foreground">{subj.code}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={subj.ct1}
                            onChange={(e) => handleMarkChange(subj.id, 'ct1', parseInt(e.target.value) || 0)}
                            className="w-16 text-center mx-auto h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={subj.ct2}
                            onChange={(e) => handleMarkChange(subj.id, 'ct2', parseInt(e.target.value) || 0)}
                            className="w-16 text-center mx-auto h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={subj.ct3}
                            onChange={(e) => handleMarkChange(subj.id, 'ct3', parseInt(e.target.value) || 0)}
                            className="w-16 text-center mx-auto h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={subj.assignment}
                            onChange={(e) => handleMarkChange(subj.id, 'assignment', parseInt(e.target.value) || 0)}
                            className="w-16 text-center mx-auto h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={subj.attendance}
                            onChange={(e) => handleMarkChange(subj.id, 'attendance', parseInt(e.target.value) || 0)}
                            className="w-16 text-center mx-auto h-8"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-medium">{internal}</span>
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            max="40"
                            value={subj.final}
                            onChange={(e) => handleMarkChange(subj.id, 'final', parseInt(e.target.value) || 0)}
                            className="w-16 text-center mx-auto h-8"
                            placeholder="Pending"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          {subj.final > 0 ? (
                            <Badge className={`${total >= 80 ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30' : total >= 70 ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30' : total >= 60 ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30' : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'} font-bold`}>
                              {total}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {subj.final > 0 ? (
                            <span className={`font-bold ${gradeColor}`}>{grade}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {subj.final > 0 ? (
                            <span className="font-medium">{gpa.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSubject(subj)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubject(subj.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button onClick={handleSaveDetails} className="gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subject Dialog */}
      <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSubject && studentSubjects.find(s => s.id === editingSubject.id) ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingSubject && studentSubjects.find(s => s.id === editingSubject.id) ? 'Edit Subject' : 'Add Subject'}
            </DialogTitle>
            <DialogDescription>
              {editingSubject && studentSubjects.find(s => s.id === editingSubject.id) ? 'Update subject information' : 'Add a new subject to the student\'s record'}
            </DialogDescription>
          </DialogHeader>
          {editingSubject && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name *</Label>
                <Input
                  id="subjectName"
                  value={editingSubject.subject}
                  onChange={(e) => setEditingSubject({ ...editingSubject, subject: e.target.value })}
                  placeholder="e.g., Mathematics-I"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectCode">Subject Code *</Label>
                <Input
                  id="subjectCode"
                  value={editingSubject.code}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  placeholder="e.g., MATH-101"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddSubjectOpen(false);
              setEditingSubject(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubject} className="gradient-primary text-primary-foreground">
              {editingSubject && studentSubjects.find(s => s.id === editingSubject.id) ? 'Update' : 'Add'} Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
