import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Save, Search, Filter, Loader2, AlertCircle, 
  Download, Upload, TrendingUp, Users, Award, 
  ChevronDown, ChevronUp, FileSpreadsheet, Printer,
  CheckCircle2, XCircle, MoreVertical, Eye, Edit2, RefreshCw,
  GraduationCap, BookOpen, Calculator, Plus, Trash2, Settings
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
import { subjectService, type Subject } from '@/services/subjectService';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface MarkColumn {
  id: string;
  name: string;
  maxMarks: number;
  examType: ExamType;
  order: number;
}

interface StudentMarks {
  studentId: string;
  studentName: string;
  roll: string;
  subjectCode: string;
  subjectName: string;
  customMarks: { [columnId: string]: number | null };
  total: number;
  percentage: number;
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

export default function ManageMarksPage() {
  const { user } = useAuth();
  
  // Data states
  const [semesters, setSemesters] = useState<number[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentMarks[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
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
  
  // Column Management
  const [markColumns, setMarkColumns] = useState<MarkColumn[]>([
    { id: 'ct1', name: 'CT-1', maxMarks: 20, examType: 'quiz', order: 1 },
    { id: 'ct2', name: 'CT-2', maxMarks: 20, examType: 'quiz', order: 2 },
    { id: 'ct3', name: 'CT-3', maxMarks: 20, examType: 'quiz', order: 3 },
    { id: 'assignment', name: 'Assignment', maxMarks: 10, examType: 'assignment', order: 4 },
    { id: 'attendance', name: 'Attendance', maxMarks: 10, examType: 'practical', order: 5 },
    { id: 'final', name: 'Final', maxMarks: 50, examType: 'final', order: 6 },
  ]);
  const [columnDialog, setColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<MarkColumn | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnMax, setNewColumnMax] = useState('20');
  const [newColumnType, setNewColumnType] = useState<ExamType>('quiz');

  // Fetch semesters and subjects on mount
  useEffect(() => {
    fetchSemestersAndSubjects();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchStudents();
    }
  }, [selectedSemester]);

  useEffect(() => {
    if (allStudents.length > 0 && selectedSubject) {
      fetchMarks();
    }
  }, [selectedSubject, selectedSemester, allStudents]);

  const fetchSemestersAndSubjects = async () => {
    try {
      setLoadingSubjects(true);
      
      // Get teacher ID from user context
      const teacherId = user?.relatedProfileId;
      console.log('Fetching subjects for teacher:', teacherId);
      
      // Fetch subjects from teacher's class routines
      const teacherSubjects = await subjectService.getTeacherSubjects(teacherId);
      console.log('Fetched teacher subjects:', teacherSubjects);
      
      if (teacherSubjects.length === 0) {
        toast.error('No subjects assigned', { 
          description: 'You have no subjects assigned in your class routine. Please contact administration.' 
        });
        setSubjects([]);
        setSemesters([]);
        return;
      }
      
      setSubjects(teacherSubjects);
      
      // Extract unique semesters
      const uniqueSemesters = new Set<number>();
      teacherSubjects.forEach(subject => uniqueSemesters.add(subject.semester));
      const semesterList = Array.from(uniqueSemesters).sort((a, b) => a - b);
      setSemesters(semesterList);
      console.log('Available semesters:', semesterList);
      
      // Set default selections
      if (semesterList.length > 0) {
        setSelectedSemester(semesterList[0].toString());
        
        // Find subjects for first semester
        const firstSemesterSubjects = teacherSubjects.filter(
          s => s.semester === semesterList[0]
        );
        console.log('First semester subjects:', firstSemesterSubjects);
        
        if (firstSemesterSubjects.length > 0) {
          setSelectedSubject(firstSemesterSubjects[0].code);
          console.log('Selected subject:', firstSemesterSubjects[0]);
        }
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error('Failed to load subjects', { description: errorMsg });
      console.error('Error fetching subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

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
      
      console.log('Loaded marks:', allMarks.length, 'records');
      console.log('Current columns:', markColumns.map(c => ({ id: c.id, name: c.name, type: c.examType })));
      
      const transformedData: StudentMarks[] = allStudents.map((student) => {
        const studentMarks = marksByStudent.get(student.id) || [];
        
        const marksRecords: { [key: string]: MarksRecord } = {};
        const customMarks: { [columnId: string]: number | null } = {};
        
        // Map marks to columns by matching remarks (column name) and examType
        markColumns.forEach((col) => {
          // Try to find exact match by remarks and examType
          let matchingMark = studentMarks.find(m => 
            m.examType === col.examType && m.remarks === col.name
          );
          
          // If no exact match, try matching by examType only (for backward compatibility)
          if (!matchingMark) {
            // For backward compatibility with old data without remarks
            const marksOfType = studentMarks.filter(m => m.examType === col.examType);
            
            // Check if this column ID suggests it's an old default column
            if (col.id === 'ct1' || col.id === 'ct2' || col.id === 'ct3') {
              const index = col.id === 'ct1' ? 0 : col.id === 'ct2' ? 1 : 2;
              matchingMark = marksOfType[index];
            } else if (col.id === 'assignment' || col.id === 'attendance' || col.id === 'final') {
              matchingMark = marksOfType[0];
            }
          }
          
          if (matchingMark) {
            customMarks[col.id] = matchingMark.marksObtained;
            marksRecords[col.id] = matchingMark;
          } else {
            customMarks[col.id] = null;
          }
        });
        
        const totalObtained = Object.values(customMarks).reduce((sum, val) => sum + (val || 0), 0);
        const totalMax = markColumns.reduce((sum, col) => sum + col.maxMarks, 0);
        const percentage = calculatePercentage(totalObtained, totalMax);
        
        return {
          studentId: student.id,
          studentName: student.fullNameEnglish,
          roll: student.currentRollNumber,
          subjectCode: selectedSubject,
          subjectName: subjects.find(s => s.code === selectedSubject)?.name || selectedSubject,
          customMarks,
          total: totalObtained,
          percentage,
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

  const calculatePercentage = (obtained: number, total: number): number => {
    if (total === 0) return 0;
    return (obtained / total) * 100;
  };

  const calculateStats = (): Stats => {
    const completedStudents = students.filter(s => s.total > 0);
    const totals = completedStudents.map(s => s.total);
    const percentages = completedStudents.map(s => s.percentage);
    const passedStudents = students.filter(s => s.percentage >= 40 && s.total > 0);
    
    const gradeDistribution: { [key: string]: number } = {};

    return {
      totalStudents: students.length,
      completedEntries: completedStudents.length,
      averageMarks: percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0,
      passRate: students.length > 0 ? (passedStudents.length / students.length) * 100 : 0,
      highestMarks: totals.length > 0 ? Math.max(...totals) : 0,
      lowestMarks: totals.length > 0 ? Math.min(...totals) : 0,
      gradeDistribution
    };
  };

  const handleMarkChange = (studentId: string, columnId: string, value: string) => {
    setStudents(prev => prev.map(student => {
      if (student.studentId === studentId) {
        const numValue = value === '' ? null : parseFloat(value);
        const updated = { 
          ...student, 
          customMarks: { ...student.customMarks, [columnId]: numValue }
        };
        
        const totalObtained = Object.values(updated.customMarks).reduce((sum, val) => sum + (val || 0), 0);
        const totalMax = markColumns.reduce((sum, col) => sum + col.maxMarks, 0);
        
        updated.total = totalObtained;
        updated.percentage = calculatePercentage(totalObtained, totalMax);
        
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
        let updated = { 
          ...student,
          customMarks: { ...student.customMarks, [bulkField]: numValue }
        };
        
        const totalObtained = Object.values(updated.customMarks).reduce((sum, val) => sum + (val || 0), 0);
        const totalMax = markColumns.reduce((sum, col) => sum + col.maxMarks, 0);
        
        updated.total = totalObtained;
        updated.percentage = calculatePercentage(totalObtained, totalMax);
        
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

  const handleAddColumn = () => {
    if (!newColumnName.trim() || !newColumnMax) return;
    
    const newColumn: MarkColumn = {
      id: `col_${Date.now()}`,
      name: newColumnName.trim(),
      maxMarks: parseInt(newColumnMax),
      examType: newColumnType,
      order: markColumns.length + 1
    };
    
    setMarkColumns(prev => [...prev, newColumn]);
    
    // Add null values for this column to all students and recalculate
    setStudents(prev => prev.map(student => {
      const updated = {
        ...student,
        customMarks: { ...student.customMarks, [newColumn.id]: null }
      };
      
      const totalObtained = Object.values(updated.customMarks).reduce((sum, val) => sum + (val || 0), 0);
      const totalMax = [...markColumns, newColumn].reduce((sum, col) => sum + col.maxMarks, 0);
      
      updated.total = totalObtained;
      updated.percentage = calculatePercentage(totalObtained, totalMax);
      
      return updated;
    }));
    
    setNewColumnName('');
    setNewColumnMax('20');
    setNewColumnType('quiz');
    setColumnDialog(false);
    toast.success(`Column "${newColumn.name}" added successfully!`);
  };

  const handleEditColumn = (column: MarkColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
    setNewColumnMax(column.maxMarks.toString());
    setNewColumnType(column.examType);
    setColumnDialog(true);
  };

  const handleUpdateColumn = () => {
    if (!editingColumn || !newColumnName.trim() || !newColumnMax) return;
    
    setMarkColumns(prev => prev.map(col => 
      col.id === editingColumn.id 
        ? { ...col, name: newColumnName.trim(), maxMarks: parseInt(newColumnMax), examType: newColumnType }
        : col
    ));
    
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnMax('20');
    setNewColumnType('quiz');
    setColumnDialog(false);
    toast.success('Column updated successfully!');
  };

  const handleDeleteColumn = (columnId: string) => {
    const updatedColumns = markColumns.filter(col => col.id !== columnId);
    setMarkColumns(updatedColumns);
    
    // Remove this column's data from all students and recalculate
    setStudents(prev => prev.map(student => {
      const { [columnId]: removed, ...restMarks } = student.customMarks;
      
      const totalObtained = Object.values(restMarks).reduce((sum, val) => sum + (val || 0), 0);
      const totalMax = updatedColumns.reduce((sum, col) => sum + col.maxMarks, 0);
      
      return {
        ...student,
        customMarks: restMarks,
        total: totalObtained,
        percentage: calculatePercentage(totalObtained, totalMax)
      };
    }));
    
    setHasChanges(true);
    toast.success('Column deleted successfully!');
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExport = (format: 'csv' | 'excel') => {
    const columnHeaders = markColumns.map(col => col.name);
    const headers = ['Roll', 'Name', ...columnHeaders, 'Total', 'Percentage'];
    const rows = filteredStudents.map(s => [
      s.roll, 
      s.studentName, 
      ...markColumns.map(col => s.customMarks[col.id] ?? ''),
      s.total,
      s.percentage.toFixed(2) + '%'
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
        markColumns.forEach(col => {
          const markValue = student.customMarks[col.id];
          // Save even if mark is 0, but skip if null/undefined
          if (markValue !== null && markValue !== undefined) {
            const existingMarkId = (student.marksRecords as any)[col.id]?.id;
            
            marksToSave.push({
              student: student.studentId,
              subjectCode: selectedSubject,
              subjectName,
              semester: semesterNum,
              examType: col.examType,
              marksObtained: markValue,
              totalMarks: col.maxMarks,
              remarks: col.name,
              id: existingMarkId
            });
          }
        });
      });
      
      console.log('Saving marks:', marksToSave.length, 'records');
      
      const savePromises = marksToSave.map(mark => {
        if (mark.id) {
          // Update existing mark
          return marksService.updateMarks(mark.id, { 
            marksObtained: mark.marksObtained, 
            totalMarks: mark.totalMarks,
            remarks: mark.remarks 
          }).catch(err => {
            console.error('Failed to update mark:', mark.id, err);
            throw err;
          });
        } else {
          // Create new mark
          return marksService.createMarks({
            student: mark.student,
            subjectCode: mark.subjectCode,
            subjectName: mark.subjectName,
            semester: mark.semester,
            examType: mark.examType,
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks,
            remarks: mark.remarks
          }).catch(err => {
            console.error('Failed to create mark:', mark, err);
            throw err;
          });
        }
      });
      
      await Promise.all(savePromises);
      
      console.log('All marks saved successfully');
      toast.success('All marks saved successfully!');
      setHasChanges(false);
      await fetchMarks();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error('Save error:', err);
      toast.error('Failed to save marks', { description: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester);
    
    // Filter subjects for selected semester
    const semesterSubjects = subjects.filter(s => s.semester === parseInt(semester));
    if (semesterSubjects.length > 0) {
      setSelectedSubject(semesterSubjects[0].code);
    } else {
      setSelectedSubject('');
    }
  };

  const filteredSubjects = subjects.filter(s => s.semester === parseInt(selectedSemester || '0'));

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

  if (loadingSubjects) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading subjects and semesters...</p>
        </div>
      </div>
    );
  }

  if (semesters.length === 0 || subjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">No Subjects Available</h3>
          <p className="text-muted-foreground">No active subjects found. Please contact administration.</p>
          <Button onClick={fetchSemestersAndSubjects}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
                    <p className="text-2xl font-bold">{stats.averageMarks.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Avg Percentage</p>
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
              <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                <SelectTrigger className="h-9">
                  <GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(semester => {
                    const num = semester;
                    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
                    return <SelectItem key={semester} value={semester.toString()}>{semester}{suffix} Semester</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={loadingSubjects || filteredSubjects.length === 0}>
                <SelectTrigger className="h-9">
                  <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map(subject => (
                    <SelectItem key={`${subject.code}_${subject.semester}`} value={subject.code}>
                      {subject.code} - {subject.name}
                    </SelectItem>
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
              <h2 className="font-semibold">Assessment Marks Entry</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Customizable columns • Total: {markColumns.reduce((sum, col) => sum + col.maxMarks, 0)} marks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditingColumn(null);
                setNewColumnName('');
                setNewColumnMax('20');
                setNewColumnType('quiz');
                setColumnDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchMarks} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
                {markColumns.map(col => (
                  <TableHead key={col.id} className="text-center w-20">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{col.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-muted">
                              <Settings className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditColumn(col)}>
                              <Edit2 className="w-3 h-3 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteColumn(col.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <span className="text-[10px] font-normal text-muted-foreground">/{col.maxMarks}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead 
                  className="text-center w-20 bg-primary/10 cursor-pointer hover:bg-primary/15"
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
                  className="text-center w-24 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('percentage')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Percentage
                    {sortConfig?.key === 'percentage' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={markColumns.length + 4} className="text-center py-12">
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
                    {markColumns.map(col => (
                      <TableCell key={col.id} className="text-center p-2">
                        <Input
                          type="number"
                          min="0"
                          max={col.maxMarks}
                          value={student.customMarks[col.id] ?? ''}
                          onChange={(e) => handleMarkChange(student.studentId, col.id, e.target.value)}
                          className="w-14 h-8 text-center text-sm mx-auto"
                          placeholder="-"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center p-2 bg-primary/10">
                      <span className="font-bold text-base text-primary">{student.total}</span>
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <span className={`font-semibold ${student.percentage >= 40 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {student.percentage.toFixed(2)}%
                      </span>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Stats Footer */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Total Marks: </span>
              <span className="text-foreground">{markColumns.reduce((sum, col) => sum + col.maxMarks, 0)}</span>
            </div>
            <div>
              <span className="font-medium">Pass Percentage: </span>
              <span className="text-foreground">40%</span>
            </div>
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
                  {markColumns.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name} (max {col.maxMarks})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                max={markColumns.find(c => c.id === bulkField)?.maxMarks || 20}
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

      {/* Column Management Dialog */}
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Edit Column' : 'Add New Column'}</DialogTitle>
            <DialogDescription>
              {editingColumn ? 'Update column details' : 'Create a new marks column with custom name and maximum marks'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Column Name</Label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., Quiz 1, Midterm, Project"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Maximum Marks</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={newColumnMax}
                onChange={(e) => setNewColumnMax(e.target.value)}
                placeholder="e.g., 20, 10, 50"
              />
            </div>

            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={newColumnType} onValueChange={(val) => setNewColumnType(val as ExamType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="practical">Practical</SelectItem>
                  <SelectItem value="midterm">Midterm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setColumnDialog(false);
              setEditingColumn(null);
              setNewColumnName('');
              setNewColumnMax('20');
              setNewColumnType('quiz');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingColumn ? handleUpdateColumn : handleAddColumn} 
              disabled={!newColumnName.trim() || !newColumnMax}
            >
              {editingColumn ? 'Update' : 'Add'} Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
