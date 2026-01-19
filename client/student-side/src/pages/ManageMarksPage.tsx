import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Save, Search, Filter, Loader2, AlertCircle, 
  Download, Upload, TrendingUp, Users, Award, 
  ChevronDown, ChevronUp, FileSpreadsheet, Printer,
  CheckCircle2, XCircle, MoreVertical, Eye, Edit2, RefreshCw,
  GraduationCap, BookOpen, Calculator
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { marksService, type MarksRecord, type ExamType } from '@/services/marksService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';

interface StudentMarks {
  studentId: string;
  studentName: string;
  roll: string;
  subjectCode: string;
  subjectName: string;
  ct1: number | null;
  ct2: number | null;
  ct3: number | null;
  assignment: number | null;
  attendance: number | null;
  final: number | null;
  internal: number;
  total: number;
  grade: string;
  gpa: number;
  marksRecords: { [key: string]: MarksRecord };
  isSelected?: boolean;
}

interface Stats {
  totalStudents: number;
  completedEntries: number;
  averageMarks: number;
  passRate: number;
  highestMarks: number;
  lowestMarks: number;
  gradeDistribution: { [key: string]: number };
}

const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

const subjects = [
  { code: 'MATH101', name: 'Mathematics-I' },
  { code: 'PHY101', name: 'Physics-I' },
  { code: 'CHEM101', name: 'Chemistry' },
  { code: 'ENG101', name: 'English' },
  { code: 'CSE101', name: 'Computer Fundamentals' },
  { code: 'EEE101', name: 'Basic Electrical' },
  { code: 'MECH101', name: 'Workshop Practice' },
  { code: 'CIV101', name: 'Engineering Drawing' },
];

export default function ManageMarksPage() {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].code);
  const [selectedSemester, setSelectedSemester] = useState(semesters[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentMarks[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkField, setBulkField] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [selectedSemester]);

  useEffect(() => {
    if (allStudents.length > 0) {
      fetchMarks();
    }
  }, [selectedSubject, selectedSemester, allStudents]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const semesterNum = parseInt(selectedSemester);
      const response = await studentService.getStudents({
        semester: semesterNum,
        status: 'active',
        page_size: 1000,
        ordering: 'currentRollNumber'
      });
      
      setAllStudents(response.results);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load students', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarks = async () => {
    if (allStudents.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const semesterNum = parseInt(selectedSemester);
      
      let allMarks: MarksRecord[] = [];
      try {
        const marksResponse = await marksService.getMarks({
          subject_code: selectedSubject,
          semester: semesterNum,
          page_size: 1000,
          ordering: 'studentRoll'
        });
        allMarks = marksResponse.results;
      } catch (err) {
        console.log('No marks found for this subject/semester');
      }
      
      const marksByStudent = new Map<string, MarksRecord[]>();
      allMarks.forEach(mark => {
        if (!marksByStudent.has(mark.student)) {
          marksByStudent.set(mark.student, []);
        }
        marksByStudent.get(mark.student)!.push(mark);
      });
      
      const transformedData: StudentMarks[] = allStudents.map((student) => {
        const studentMarks = marksByStudent.get(student.id) || [];
        
        const marksRecords: { [key: string]: MarksRecord } = {};
        studentMarks.forEach(mark => {
          if (mark.examType === 'quiz') {
            if (!marksRecords['quiz1']) marksRecords['quiz1'] = mark;
            else if (!marksRecords['quiz2']) marksRecords['quiz2'] = mark;
            else if (!marksRecords['quiz3']) marksRecords['quiz3'] = mark;
          } else {
            marksRecords[mark.examType] = mark;
          }
        });
        
        const ct1 = marksRecords['quiz1']?.marksObtained || null;
        const ct2 = marksRecords['quiz2']?.marksObtained || null;
        const ct3 = marksRecords['quiz3']?.marksObtained || null;
        const assignment = marksRecords['assignment']?.marksObtained || null;
        const attendance = marksRecords['practical']?.marksObtained || null;
        const final = marksRecords['final']?.marksObtained || null;
        
        const internal = (ct1 || 0) + (ct2 || 0) + (ct3 || 0) + (assignment || 0) + (attendance || 0);
        const total = internal + (final || 0);
        
        return {
          studentId: student.id,
          studentName: student.fullNameEnglish,
          roll: student.currentRollNumber,
          subjectCode: selectedSubject,
          subjectName: subjects.find(s => s.code === selectedSubject)?.name || selectedSubject,
          ct1, ct2, ct3, assignment, attendance, final,
          internal, total,
          grade: calculateGrade(total),
          gpa: calculateGPA(total),
          marksRecords: marksRecords as any,
          isSelected: false
        };
      });
      
      setStudents(transformedData);
      setSelectedStudents(new Set());
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load marks', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (total: number): string => {
    if (total >= 90) return 'A+';
    if (total >= 85) return 'A';
    if (total >= 80) return 'A-';
    if (total >= 75) return 'B+';
    if (total >= 70) return 'B';
    if (total >= 65) return 'C+';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    return 'F';
  };

  const calculateGPA = (total: number): number => {
    if (total >= 90) return 4.00;
    if (total >= 85) return 4.00;
    if (total >= 80) return 3.75;
    if (total >= 75) return 3.50;
    if (total >= 70) return 3.25;
    if (total >= 65) return 3.00;
    if (total >= 60) return 2.75;
    if (total >= 50) return 2.50;
    return 0;
  };

  const calculateStats = (): Stats => {
    const completedStudents = students.filter(s => s.total > 0);
    const passedStudents = students.filter(s => s.grade !== 'F' && s.total > 0);
    const totals = completedStudents.map(s => s.total);
    
    const gradeDistribution: { [key: string]: number } = {};
    students.forEach(s => {
      if (s.grade) {
        gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
      }
    });

    return {
      totalStudents: students.length,
      completedEntries: completedStudents.length,
      averageMarks: totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0,
      passRate: students.length > 0 ? (passedStudents.length / students.length) * 100 : 0,
      highestMarks: totals.length > 0 ? Math.max(...totals) : 0,
      lowestMarks: totals.length > 0 ? Math.min(...totals) : 0,
      gradeDistribution
    };
  };

  const handleMarkChange = (studentId: string, field: 'ct1' | 'ct2' | 'ct3' | 'assignment' | 'attendance' | 'final', value: string) => {
    setStudents(prev => prev.map(student => {
      if (student.studentId === studentId) {
        const numValue = value === '' ? null : parseFloat(value);
        const updated = { ...student, [field]: numValue };
        
        const internal = (updated.ct1 || 0) + (updated.ct2 || 0) + (updated.ct3 || 0) + 
                        (updated.assignment || 0) + (updated.attendance || 0);
        const total = internal + (updated.final || 0);
        
        updated.internal = internal;
        updated.total = total;
        updated.grade = calculateGrade(total);
        updated.gpa = calculateGPA(total);
        
        return updated;
      }
      return student;
    }));
    setHasChanges(true);
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(studentId);
      else newSet.delete(studentId);
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.studentId)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleBulkEdit = () => {
    if (!bulkField || bulkValue === '') return;
    
    const numValue = parseFloat(bulkValue);
    if (isNaN(numValue)) return;

    setStudents(prev => prev.map(student => {
      if (selectedStudents.has(student.studentId)) {
        const updated = { ...student, [bulkField]: numValue };
        
        const internal = (updated.ct1 || 0) + (updated.ct2 || 0) + (updated.ct3 || 0) + 
                        (updated.assignment || 0) + (updated.attendance || 0);
        const total = internal + (updated.final || 0);
        
        updated.internal = internal;
        updated.total = total;
        updated.grade = calculateGrade(total);
        updated.gpa = calculateGPA(total);
        
        return updated;
      }
      return student;
    }));
    
    setHasChanges(true);
    setBulkEditDialog(false);
    setBulkField('');
    setBulkValue('');
    toast.success(`Updated ${selectedStudents.size} students`);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExport = (format: 'csv' | 'excel') => {
    const headers = ['Roll', 'Name', 'CT1', 'CT2', 'CT3', 'Assignment', 'Attendance', 'Internal', 'Final', 'Total', 'Grade', 'GPA'];
    const rows = filteredStudents.map(s => [
      s.roll, s.studentName, s.ct1 || '', s.ct2 || '', s.ct3 || '',
      s.assignment || '', s.attendance || '', s.internal, s.final || '',
      s.total, s.grade, s.gpa.toFixed(2)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks_${selectedSubject}_sem${selectedSemester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Marks exported successfully!');
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const semesterNum = parseInt(selectedSemester);
      const subjectName = subjects.find(s => s.code === selectedSubject)?.name || selectedSubject;
      
      const marksToSave: any[] = [];
      
      students.forEach(student => {
        if (student.ct1 !== null) {
          marksToSave.push({
            student: student.studentId, subjectCode: selectedSubject, subjectName,
            semester: semesterNum, examType: 'quiz' as ExamType,
            marksObtained: student.ct1, totalMarks: 20,
            id: (student.marksRecords as any)['quiz1']?.id
          });
        }
        if (student.ct2 !== null) {
          marksToSave.push({
            student: student.studentId, subjectCode: selectedSubject, subjectName,
            semester: semesterNum, examType: 'quiz' as ExamType,
            marksObtained: student.ct2, totalMarks: 20,
            id: (student.marksRecords as any)['quiz2']?.id
          });
        }
        if (student.ct3 !== null) {
          marksToSave.push({
            student: student.studentId, subjectCode: selectedSubject, subjectName,
            semester: semesterNum, examType: 'quiz' as ExamType,
            marksObtained: student.ct3, totalMarks: 20,
            id: (student.marksRecords as any)['quiz3']?.id
          });
        }
        if (student.assignment !== null) {
          marksToSave.push({
            student: student.studentId, subjectCode: selectedSubject, subjectName,
            semester: semesterNum, examType: 'assignment' as ExamType,
            marksObtained: student.assignment, totalMarks: 10,
            id: (student.marksRecords as any)['assignment']?.id
          });
        }
        if (student.attendance !== null) {
          marksToSave.push({
            student: student.studentId, subjectCode: selectedSubject, subjectName,
            semester: semesterNum, examType: 'practical' as ExamType,
            marksObtained: student.attendance, totalMarks: 10,
            id: (student.marksRecords as any)['practical']?.id
          });
        }
        if (student.final !== null) {
          marksToSave.push({
            student: student.studentId, subjectCode: selectedSubject, subjectName,
            semester: semesterNum, examType: 'final' as ExamType,
            marksObtained: student.final, totalMarks: 50,
            id: (student.marksRecords as any)['final']?.id
          });
        }
      });
      
      const savePromises = marksToSave.map(mark => {
        if (mark.id) {
          return marksService.updateMarks(mark.id, { marksObtained: mark.marksObtained, totalMarks: mark.totalMarks });
        } else {
          return marksService.createMarks({
            student: mark.student, subjectCode: mark.subjectCode, subjectName: mark.subjectName,
            semester: mark.semester, examType: mark.examType,
            marksObtained: mark.marksObtained, totalMarks: mark.totalMarks
          });
        }
      });
      
      await Promise.all(savePromises);
      
      toast.success('All marks saved successfully!');
      setHasChanges(false);
      await fetchMarks();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error('Failed to save marks', { description: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  let filteredStudents = students.filter(student =>
    student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sortConfig) {
    filteredStudents = [...filteredStudents].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof StudentMarks];
      const bVal = b[sortConfig.key as keyof StudentMarks];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const stats = calculateStats();

  const getGradeColor = (grade: string) => {
    const colors: { [key: string]: string } = {
      'A+': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      'A': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      'A-': 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25',
      'B+': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
      'B': 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
      'C+': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
      'C': 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25',
      'D': 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
      'F': 'bg-red-600/20 text-red-600 dark:text-red-400 border-red-600/30',
    };
    return colors[grade] || 'bg-muted text-muted-foreground';
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.75) return 'text-emerald-600 dark:text-emerald-400';
    if (gpa >= 3.25) return 'text-blue-600 dark:text-blue-400';
    if (gpa >= 2.75) return 'text-amber-600 dark:text-amber-400';
    if (gpa > 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading marks data...</p>
        </div>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Marks</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchStudents}><RefreshCw className="w-4 h-4 mr-2" />Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
            <BarChart3 className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Manage Marks</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Enter, update and analyze student academic performance</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />Print Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={handleSaveAll} 
            disabled={saving || !hasChanges}
            className={`${hasChanges ? 'bg-gradient-to-r from-primary to-primary/80' : 'opacity-60'}`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save All</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <AnimatePresence>
        {showStatsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completedEntries}</p>
                    <p className="text-xs text-muted-foreground">Entries Done</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.averageMarks.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Average Marks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.passRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Pass Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/20">
                    <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.highestMarks}</p>
                    <p className="text-xs text-muted-foreground">Highest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20">
                    <BookOpen className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.lowestMarks || '-'}</p>
                    <p className="text-xs text-muted-foreground">Lowest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border rounded-xl p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Semester</Label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="h-9">
                  <GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(semester => {
                    const num = parseInt(semester);
                    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
                    return <SelectItem key={semester} value={semester}>{semester}{suffix} Semester</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-9">
                  <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.code} value={subject.code}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Search Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              className="h-9"
            >
              {showStatsPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="ml-1 hidden sm:inline">Stats</span>
            </Button>
            
            {selectedStudents.size > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBulkEditDialog(true)}
                className="h-9"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit ({selectedStudents.size})
              </Button>
            )}
          </div>
        </div>

        {/* Current Selection Info */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className="bg-primary/5 border-primary/20">
            <Filter className="w-3 h-3 mr-1" />
            {(() => {
              const num = parseInt(selectedSemester);
              const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
              return `${selectedSemester}${suffix} Semester`;
            })()}
          </Badge>
          <Badge variant="outline" className="bg-secondary/50">
            {subjects.find(s => s.code === selectedSubject)?.name}
          </Badge>
          <Badge variant="outline">
            {filteredStudents.length} Students
          </Badge>
          {hasChanges && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
              Unsaved Changes
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Marks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border rounded-xl shadow-sm overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold">Internal Assessment & Final Results</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                CT: 20 each • Assignment: 10 • Attendance: 10 • Final: 50 • Total: 100
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchMarks} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10 px-3">
                  <Checkbox 
                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="min-w-[180px] cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('studentName')}
                >
                  <div className="flex items-center gap-1">
                    Student
                    {sortConfig?.key === 'studentName' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center w-20">CT-1<br/><span className="text-[10px] font-normal text-muted-foreground">/20</span></TableHead>
                <TableHead className="text-center w-20">CT-2<br/><span className="text-[10px] font-normal text-muted-foreground">/20</span></TableHead>
                <TableHead className="text-center w-20">CT-3<br/><span className="text-[10px] font-normal text-muted-foreground">/20</span></TableHead>
                <TableHead className="text-center w-20">Assign<br/><span className="text-[10px] font-normal text-muted-foreground">/10</span></TableHead>
                <TableHead className="text-center w-20">Attend<br/><span className="text-[10px] font-normal text-muted-foreground">/10</span></TableHead>
                <TableHead className="text-center w-16 bg-primary/5">Int.</TableHead>
                <TableHead className="text-center w-20 bg-primary/5">Final<br/><span className="text-[10px] font-normal text-muted-foreground">/50</span></TableHead>
                <TableHead 
                  className="text-center w-16 bg-primary/10 cursor-pointer hover:bg-primary/15"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Total
                    {sortConfig?.key === 'total' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center w-16 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('grade')}
                >
                  Grade
                </TableHead>
                <TableHead 
                  className="text-center w-16 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('gpa')}
                >
                  GPA
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="w-8 h-8 opacity-50" />
                      <p>{searchQuery ? 'No students found matching your search.' : 'No students found for this semester.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => (
                  <motion.tr
                    key={student.studentId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                    className={`border-b hover:bg-muted/30 transition-colors ${selectedStudents.has(student.studentId) ? 'bg-primary/5' : ''}`}
                  >
                    <TableCell className="px-3">
                      <Checkbox 
                        checked={selectedStudents.has(student.studentId)}
                        onCheckedChange={(checked) => handleSelectStudent(student.studentId, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {student.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{student.studentName}</p>
                          <p className="text-xs text-muted-foreground">{student.roll}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ct1 ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'ct1', e.target.value)}
                        className="w-14 h-8 text-center text-sm mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ct2 ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'ct2', e.target.value)}
                        className="w-14 h-8 text-center text-sm mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ct3 ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'ct3', e.target.value)}
                        className="w-14 h-8 text-center text-sm mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={student.assignment ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'assignment', e.target.value)}
                        className="w-14 h-8 text-center text-sm mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={student.attendance ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'attendance', e.target.value)}
                        className="w-14 h-8 text-center text-sm mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="text-center p-2 bg-primary/5">
                      <span className="font-semibold text-primary">{student.internal}</span>
                    </TableCell>
                    <TableCell className="text-center p-2 bg-primary/5">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={student.final ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'final', e.target.value)}
                        className="w-14 h-8 text-center text-sm mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="text-center p-2 bg-primary/10">
                      <span className="font-bold text-base text-primary">{student.total}</span>
                    </TableCell>
                    <TableCell className="text-center p-2">
                      {student.total > 0 ? (
                        <Badge variant="outline" className={`${getGradeColor(student.grade)} font-semibold`}>
                          {student.grade}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <span className={`font-semibold ${getGPAColor(student.gpa)}`}>
                        {student.gpa > 0 ? student.gpa.toFixed(2) : '-'}
                      </span>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Grade Legend */}
        <div className="p-4 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Grade Scale:</p>
          <div className="flex flex-wrap gap-2">
            {['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'F'].map(grade => (
              <Badge key={grade} variant="outline" className={`${getGradeColor(grade)} text-[10px] px-2 py-0.5`}>
                {grade}: {grade === 'A+' ? '90-100' : grade === 'A' ? '85-89' : grade === 'A-' ? '80-84' : 
                  grade === 'B+' ? '75-79' : grade === 'B' ? '70-74' : grade === 'C+' ? '65-69' : 
                  grade === 'C' ? '60-64' : grade === 'D' ? '50-59' : '<50'}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialog} onOpenChange={setBulkEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Marks</DialogTitle>
            <DialogDescription>
              Apply the same mark to {selectedStudents.size} selected students
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Field</Label>
              <Select value={bulkField} onValueChange={setBulkField}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a field..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ct1">CT-1 (max 20)</SelectItem>
                  <SelectItem value="ct2">CT-2 (max 20)</SelectItem>
                  <SelectItem value="ct3">CT-3 (max 20)</SelectItem>
                  <SelectItem value="assignment">Assignment (max 10)</SelectItem>
                  <SelectItem value="attendance">Attendance (max 10)</SelectItem>
                  <SelectItem value="final">Final (max 50)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                max={bulkField === 'final' ? 50 : ['assignment', 'attendance'].includes(bulkField) ? 10 : 20}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="Enter marks..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkEdit} disabled={!bulkField || bulkValue === ''}>
              Apply to {selectedStudents.size} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
