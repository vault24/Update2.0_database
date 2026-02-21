import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Save, Search, Filter, Loader2, AlertCircle, 
  Download, Users, TrendingUp, Award,
  ChevronDown, ChevronUp, FileSpreadsheet, Printer,
  Edit2, RefreshCw, CheckCircle2,
  GraduationCap, BookOpen, Plus, Trash2, Settings, Calculator
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { type Subject, type ClassRoutine } from '@/services/subjectService';
import { teacherService } from '@/services/teacherService';
import { getErrorMessage, apiClient, PaginatedResponse } from '@/lib/api';
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

interface TeacherRoutineOption {
  shift: string;
  semester: number;
  subjectCode: string;
  subjectName: string;
  departmentId: string;
  departmentName: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface SummaryStats {
  totalStudents: number;
  completedEntries: number;
  averageMarks: number;
  passRate: number;
  highestMarks: number;
  lowestMarks: number;
}

export default function ManageMarksPage() {
  const { user } = useAuth();
  const studentRequestRef = useRef(0);
  const marksRequestRef = useRef(0);
  
  // Data states
  const [routineOptions, setRoutineOptions] = useState<TeacherRoutineOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [teacherShifts, setTeacherShifts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentMarks[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkField, setBulkField] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Column Management - start with empty, will be populated from database
  const [markColumns, setMarkColumns] = useState<MarkColumn[]>([]);
  const [columnDialog, setColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<MarkColumn | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnMax, setNewColumnMax] = useState('20');
  const [newColumnType, setNewColumnType] = useState<ExamType>('quiz');

  const semesters = useMemo(() => {
    if (!selectedShift) return [];

    const uniqueSemesters = new Set<number>();
    routineOptions.forEach((option) => {
      if (option.shift === selectedShift) {
        uniqueSemesters.add(option.semester);
      }
    });
    return Array.from(uniqueSemesters).sort((a, b) => a - b);
  }, [routineOptions, selectedShift]);

  const filteredSubjects = useMemo(() => {
    if (!selectedShift || !selectedSemester) return [];

    const semester = parseInt(selectedSemester, 10);
    if (Number.isNaN(semester)) return [];

    const subjectsMap = new Map<string, Subject>();
    routineOptions.forEach((option) => {
      if (
        option.shift === selectedShift &&
        option.semester === semester &&
        option.subjectCode
      ) {
        if (!subjectsMap.has(option.subjectCode)) {
          subjectsMap.set(option.subjectCode, {
            code: option.subjectCode,
            name: option.subjectName,
            semester: option.semester,
          });
        }
      }
    });

    return Array.from(subjectsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [routineOptions, selectedShift, selectedSemester]);

  const selectedSubjectName = useMemo(() => {
    return filteredSubjects.find((subject) => subject.code === selectedSubject)?.name || '';
  }, [filteredSubjects, selectedSubject]);

  const filteredDepartments = useMemo(() => {
    if (!selectedShift || !selectedSemester || !selectedSubject) return [];

    const semester = parseInt(selectedSemester, 10);
    if (Number.isNaN(semester)) return [];

    const departmentsMap = new Map<string, DepartmentOption>();
    routineOptions.forEach((option) => {
      if (
        option.shift === selectedShift &&
        option.semester === semester &&
        option.subjectCode === selectedSubject &&
        option.departmentId
      ) {
        if (!departmentsMap.has(option.departmentId)) {
          departmentsMap.set(option.departmentId, {
            id: option.departmentId,
            name: option.departmentName || option.departmentId,
          });
        }
      }
    });

    return Array.from(departmentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [routineOptions, selectedShift, selectedSemester, selectedSubject]);

  const selectedDepartmentName = useMemo(() => {
    return filteredDepartments.find((department) => department.id === selectedDepartment)?.name || '';
  }, [filteredDepartments, selectedDepartment]);

  // Fetch semesters and subjects on mount
  useEffect(() => {
    fetchSemestersAndSubjects();
  }, []);

  useEffect(() => {
    if (!selectedShift) {
      setSelectedSemester('');
      setSelectedSubject('');
      return;
    }

    if (semesters.length === 0) {
      setSelectedSemester('');
      setSelectedSubject('');
      return;
    }

    const currentSemester = parseInt(selectedSemester, 10);
    if (Number.isNaN(currentSemester) || !semesters.includes(currentSemester)) {
      setSelectedSemester(semesters[0].toString());
    }
  }, [selectedShift, semesters, selectedSemester]);

  useEffect(() => {
    if (!selectedShift || !selectedSemester) {
      setSelectedSubject('');
      return;
    }

    if (filteredSubjects.length === 0) {
      setSelectedSubject('');
      return;
    }

    if (!filteredSubjects.some((subject) => subject.code === selectedSubject)) {
      setSelectedSubject(filteredSubjects[0].code);
    }
  }, [selectedShift, selectedSemester, filteredSubjects, selectedSubject]);

  useEffect(() => {
    if (!selectedShift || !selectedSemester || !selectedSubject) {
      setSelectedDepartment('');
      return;
    }

    if (filteredDepartments.length === 0) {
      setSelectedDepartment('');
      return;
    }

    if (!filteredDepartments.some((department) => department.id === selectedDepartment)) {
      setSelectedDepartment(filteredDepartments[0].id);
    }
  }, [selectedShift, selectedSemester, selectedSubject, filteredDepartments, selectedDepartment]);

  useEffect(() => {
    // Invalidate in-flight requests whenever any core filter changes.
    studentRequestRef.current += 1;
    marksRequestRef.current += 1;
  }, [selectedShift, selectedSemester, selectedSubject, selectedDepartment]);

  useEffect(() => {
    if (!selectedSemester || !selectedShift || !selectedSubject || !selectedDepartment) return;

    const semester = parseInt(selectedSemester, 10);
    const validSemester = !Number.isNaN(semester) && semesters.includes(semester);
    const validSubject = filteredSubjects.some((subject) => subject.code === selectedSubject);
    const validDepartment = filteredDepartments.some((department) => department.id === selectedDepartment);

    if (!validSemester || !validSubject || !validDepartment) return;
    fetchStudents();
  }, [
    selectedSemester,
    selectedShift,
    selectedSubject,
    selectedDepartment,
    semesters,
    filteredSubjects,
    filteredDepartments,
  ]);

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
      
      // Fetch teacher profile to get assigned shifts
      let assignedShifts: string[] = [];
      try {
        const teacherProfile = await teacherService.getTeacher(teacherId);
        assignedShifts = ((teacherProfile as any).shifts || [])
          .map((shift: string) => shift.toLowerCase());
        setTeacherShifts(assignedShifts);
        console.log('Teacher assigned shifts:', assignedShifts);
      } catch (err) {
        console.warn('Could not fetch teacher shifts:', err);
      }
      
      // Fetch class routines to get subjects and shifts
      const routinesResponse = await apiClient.get<PaginatedResponse<ClassRoutine>>('class-routines/', {
        teacher: teacherId,
        is_active: true,
        page_size: 1000,
        ordering: 'semester,subject_code'
      });
      
      console.log('Fetched class routines:', routinesResponse);
      
      if (routinesResponse.results.length === 0) {
        toast.error('No subjects assigned', { 
          description: 'You have no subjects assigned in your class routine. Please contact administration.' 
        });
        setRoutineOptions([]);
        setAvailableShifts([]);
        setSelectedShift('');
        setSelectedSemester('');
        setSelectedSubject('');
        setSelectedDepartment('');
        return;
      }
      
      const parsedOptions: TeacherRoutineOption[] = [];

      routinesResponse.results.forEach((routine: any) => {
        const shift = (routine.shift || '').toLowerCase();
        const semester = Number(routine.semester || 0);
        const subjectCode = routine.subjectCode || routine.subject_code || '';
        const subjectName = routine.subjectName || routine.subject_name || '';
        const departmentData = routine.department;
        const departmentId = (departmentData && typeof departmentData === 'object')
          ? String((departmentData as any).id || '')
          : String(departmentData || '');
        const departmentName = (departmentData && typeof departmentData === 'object')
          ? String((departmentData as any).name || '')
          : '';

        if (!shift || !semester || !subjectCode || !departmentId) return;

        parsedOptions.push({
          shift,
          semester,
          subjectCode,
          subjectName,
          departmentId,
          departmentName,
        });
      });

      let filteredOptions = parsedOptions;
      if (assignedShifts.length > 0) {
        filteredOptions = parsedOptions.filter((option) => assignedShifts.includes(option.shift));
      }

      const shiftOrder: Record<string, number> = { morning: 0, day: 1, evening: 2 };
      const availableShiftsList = Array.from(
        new Set(filteredOptions.map((option) => option.shift))
      ).sort((a, b) => {
        const aOrder = shiftOrder[a] ?? 99;
        const bOrder = shiftOrder[b] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.localeCompare(b);
      });

      setRoutineOptions(filteredOptions);
      setAvailableShifts(availableShiftsList);
      console.log('Available shifts:', availableShiftsList);

      if (availableShiftsList.length > 0) {
        setSelectedShift((prev) => (prev && availableShiftsList.includes(prev) ? prev : availableShiftsList[0]));
      } else {
        setSelectedShift('');
        setSelectedSemester('');
        setSelectedSubject('');
        setSelectedDepartment('');
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
    const requestId = ++studentRequestRef.current;

    try {
      setLoading(true);
      setError(null);
      
      // Clear current students immediately when filters change
      setAllStudents([]);
      setStudents([]);
      
      if (!selectedShift || !selectedSemester || !selectedSubject || !selectedDepartment) {
        return;
      }
      
      // Capitalize shift for API call (API expects 'Morning', 'Day', 'Evening')
      const capitalizedShift = selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1);

      const semesterNum = parseInt(selectedSemester, 10);
      const matchingRoutines = routineOptions.filter((routine) => (
        routine.shift === selectedShift &&
        routine.semester === semesterNum &&
        routine.subjectCode === selectedSubject &&
        routine.departmentId === selectedDepartment
      ));
      
      if (matchingRoutines.length === 0) {
        toast.error('No routine found', { 
          description: 'No class routine found for this subject, semester, and shift combination.' 
        });
        return;
      }
      
      const departmentId = selectedDepartment;
      console.log('Auto-selected department ID from routine:', departmentId);
      
      console.log('Fetching students with filters:', {
        semester: semesterNum,
        department: departmentId,
        shift: capitalizedShift,
        status: 'active',
        page_size: 1000,
        ordering: 'currentRollNumber'
      });
      
      const response = await studentService.getStudents({
        semester: semesterNum,
        department: departmentId,
        shift: capitalizedShift,
        status: 'active',
        page_size: 1000,
        ordering: 'currentRollNumber'
      });
      
      console.log('Fetched students:', response.results.length, 'students');
      console.log('Sample student:', response.results[0]);

      // Ignore stale responses when filters changed while this request was in-flight.
      if (requestId !== studentRequestRef.current) {
        console.log('Ignoring stale student response');
        return;
      }

      // Defensive client-side filtering to ensure strict match with selected filters.
      const strictFilteredStudents = response.results.filter((student: any) => {
        const studentDepartmentId = (student.department && typeof student.department === 'object')
          ? student.department.id
          : student.department;
        const studentShift = String(student.shift || '').toLowerCase().trim();
        const selectedShiftNormalized = selectedShift.toLowerCase().trim();
        const matchesShift = studentShift ? studentShift === selectedShiftNormalized : true;

        return (
          Number(student.semester) === semesterNum &&
          String(studentDepartmentId || '') === String(departmentId) &&
          matchesShift
        );
      });

      if (strictFilteredStudents.length !== response.results.length) {
        console.warn(
          'Student API returned out-of-filter records; applied strict client filtering.',
          { before: response.results.length, after: strictFilteredStudents.length }
        );
      }

      setAllStudents(strictFilteredStudents);
    } catch (err) {
      if (requestId !== studentRequestRef.current) return;
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load students', { description: errorMsg });
    } finally {
      if (requestId === studentRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchMarks = async () => {
    const requestId = ++marksRequestRef.current;

    if (allStudents.length === 0) {
      console.log('No students to fetch marks for');
      if (requestId === marksRequestRef.current) {
        setStudents([]);
        setMarkColumns([]);
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching marks for', allStudents.length, 'students');
      console.log('Subject:', selectedSubject, 'Semester:', selectedSemester);
      
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
      
      // Build columns dynamically from marks data with consistent ordering
      const columnsMap = new Map<string, MarkColumn>();
      
      // Define exam type priority for consistent ordering
      const examTypePriority: Record<string, number> = {
        'quiz': 1,
        'assignment': 2,
        'practical': 3,
        'midterm': 4,
        'final': 5
      };
      
      allMarks.forEach(mark => {
        const columnKey = `${mark.exam_type}_${mark.remarks || 'default'}`;
        if (!columnsMap.has(columnKey)) {
          columnsMap.set(columnKey, {
            id: columnKey,
            name: mark.remarks || mark.exam_type,
            maxMarks: Number(mark.total_marks) || 0,
            examType: mark.exam_type,
            order: 0 // Will be set during sorting
          });
        }
      });
      
      // Convert to array and sort by exam type priority, then by name
      const dynamicColumns = Array.from(columnsMap.values()).sort((a, b) => {
        const aPriority = examTypePriority[a.examType] || 99;
        const bPriority = examTypePriority[b.examType] || 99;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same exam type, sort by name
        return a.name.localeCompare(b.name);
      }).map((col, index) => ({
        ...col,
        order: index + 1
      }));
      
      // If no marks exist yet, use default columns
      const columnsToUse = dynamicColumns.length > 0 ? dynamicColumns : [
        { id: 'ct1', name: 'CT-1', maxMarks: 20, examType: 'quiz' as ExamType, order: 1 },
        { id: 'ct2', name: 'CT-2', maxMarks: 20, examType: 'quiz' as ExamType, order: 2 },
        { id: 'ct3', name: 'CT-3', maxMarks: 20, examType: 'quiz' as ExamType, order: 3 },
        { id: 'assignment', name: 'Assignment', maxMarks: 10, examType: 'assignment' as ExamType, order: 4 },
        { id: 'attendance', name: 'Attendance', maxMarks: 10, examType: 'practical' as ExamType, order: 5 },
        { id: 'final', name: 'Final', maxMarks: 50, examType: 'final' as ExamType, order: 6 },
      ];
      
      setMarkColumns(columnsToUse);
      
      const marksByStudent = new Map<string, MarksRecord[]>();
      allMarks.forEach(mark => {
        if (!marksByStudent.has(mark.student)) {
          marksByStudent.set(mark.student, []);
        }
        marksByStudent.get(mark.student)!.push(mark);
      });
      
      console.log('Loaded marks:', allMarks.length, 'records');
      console.log('Dynamic columns:', columnsToUse.map(c => ({ id: c.id, name: c.name, type: c.examType })));
      
      const transformedData: StudentMarks[] = allStudents.map((student) => {
        const studentMarks = marksByStudent.get(student.id) || [];
        
        const marksRecords: { [key: string]: MarksRecord } = {};
        const customMarks: { [columnId: string]: number | null } = {};
        
        // Map marks to columns by matching remarks (column name) and exam_type
        columnsToUse.forEach((col) => {
          // Try to find exact match by remarks and exam_type
          let matchingMark = studentMarks.find(m => 
            m.exam_type === col.examType && m.remarks === col.name
          );
          
          // If no exact match, try matching by exam_type only (for backward compatibility)
          if (!matchingMark) {
            // For backward compatibility with old data without remarks
            const marksOfType = studentMarks.filter(m => m.exam_type === col.examType);
            
            // Check if this column ID suggests it's an old default column
            if (col.id === 'ct1' || col.id === 'ct2' || col.id === 'ct3') {
              const index = col.id === 'ct1' ? 0 : col.id === 'ct2' ? 1 : 2;
              matchingMark = marksOfType[index];
            } else if (col.id === 'assignment' || col.id === 'attendance' || col.id === 'final') {
              matchingMark = marksOfType[0];
            }
          }
          
          if (matchingMark) {
            // Parse as number to avoid string concatenation issues
            const marksValue = Number(matchingMark.marks_obtained);
            customMarks[col.id] = isNaN(marksValue) ? null : marksValue;
            marksRecords[col.id] = matchingMark;
          } else {
            customMarks[col.id] = null;
          }
        });
        
        const totalObtained = Object.values(customMarks).reduce((sum, val) => sum + (val || 0), 0);
        const totalMax = columnsToUse.reduce((sum, col) => sum + col.maxMarks, 0);
        const percentage = calculatePercentage(totalObtained, totalMax);
        
        return {
          studentId: student.id,
          studentName: student.fullNameEnglish,
          roll: student.currentRollNumber,
          subjectCode: selectedSubject,
          subjectName: selectedSubjectName || selectedSubject,
          customMarks,
          total: totalObtained,
          percentage,
          marksRecords: marksRecords as any,
          isSelected: false
        };
      });
      
      console.log('Transformed student marks data:', transformedData.length, 'students');
      console.log('Sample transformed student:', transformedData[0]);

      if (requestId !== marksRequestRef.current) {
        console.log('Ignoring stale marks response');
        return;
      }

      setStudents(transformedData);
      setSelectedStudents(new Set());
    } catch (err) {
      if (requestId !== marksRequestRef.current) return;
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load marks', { description: errorMsg });
    } finally {
      if (requestId === marksRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const calculatePercentage = (obtained: number, total: number): number => {
    if (total === 0) return 0;
    return (obtained / total) * 100;
  };

  const calculateSummaryStats = (): SummaryStats => {
    const completedStudents = students.filter((student) => student.total > 0);
    const totals = completedStudents.map((student) => student.total);
    const percentages = completedStudents.map((student) => student.percentage);
    const passedStudents = students.filter((student) => student.percentage >= 40 && student.total > 0);

    return {
      totalStudents: students.length,
      completedEntries: completedStudents.length,
      averageMarks: percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0,
      passRate: students.length > 0 ? (passedStudents.length / students.length) * 100 : 0,
      highestMarks: totals.length > 0 ? Math.max(...totals) : 0,
      lowestMarks: totals.length > 0 ? Math.min(...totals) : 0,
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
    
    // Define exam type priority for consistent ordering
    const examTypePriority: Record<string, number> = {
      'quiz': 1,
      'assignment': 2,
      'practical': 3,
      'midterm': 4,
      'final': 5
    };
    
    const newColumn: MarkColumn = {
      id: `${newColumnType}_${newColumnName.trim().replace(/\s+/g, '_').toLowerCase()}`,
      name: newColumnName.trim(),
      maxMarks: parseInt(newColumnMax),
      examType: newColumnType,
      order: 0 // Will be recalculated
    };
    
    // Add new column and re-sort all columns
    const updatedColumns = [...markColumns, newColumn].sort((a, b) => {
      const aPriority = examTypePriority[a.examType] || 99;
      const bPriority = examTypePriority[b.examType] || 99;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same exam type, sort by name
      return a.name.localeCompare(b.name);
    }).map((col, index) => ({
      ...col,
      order: index + 1
    }));
    
    setMarkColumns(updatedColumns);
    
    // Add null values for this column to all students and recalculate
    setStudents(prev => prev.map(student => {
      const updated = {
        ...student,
        customMarks: { ...student.customMarks, [newColumn.id]: null }
      };
      
      const totalObtained = Object.values(updated.customMarks).reduce((sum, val) => sum + (val || 0), 0);
      const totalMax = updatedColumns.reduce((sum, col) => sum + col.maxMarks, 0);
      
      updated.total = totalObtained;
      updated.percentage = calculatePercentage(totalObtained, totalMax);
      
      return updated;
    }));
    
    setNewColumnName('');
    setNewColumnMax('20');
    setNewColumnType('quiz');
    setColumnDialog(false);
    setHasChanges(true);
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
    
    // Define exam type priority for consistent ordering
    const examTypePriority: Record<string, number> = {
      'quiz': 1,
      'assignment': 2,
      'practical': 3,
      'midterm': 4,
      'final': 5
    };
    
    // Update the column and re-sort if exam type changed
    const updatedColumns = markColumns.map(col => 
      col.id === editingColumn.id 
        ? { ...col, name: newColumnName.trim(), maxMarks: parseInt(newColumnMax), examType: newColumnType }
        : col
    ).sort((a, b) => {
      const aPriority = examTypePriority[a.examType] || 99;
      const bPriority = examTypePriority[b.examType] || 99;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same exam type, sort by name
      return a.name.localeCompare(b.name);
    }).map((col, index) => ({
      ...col,
      order: index + 1
    }));
    
    setMarkColumns(updatedColumns);
    
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnMax('20');
    setNewColumnType('quiz');
    setColumnDialog(false);
    setHasChanges(true);
    toast.success('Column updated successfully!');
  };

  const handleDeleteColumn = async (columnId: string) => {
    const columnToDelete = markColumns.find(col => col.id === columnId);
    if (!columnToDelete) return;
    
    try {
      // Delete all marks records for this column from the database
      const marksToDelete: string[] = [];
      students.forEach(student => {
        const markRecord = (student.marksRecords as any)[columnId];
        if (markRecord?.id) {
          marksToDelete.push(markRecord.id);
        }
      });
      
      if (marksToDelete.length > 0) {
        // Delete marks from database
        await Promise.all(marksToDelete.map(id => marksService.deleteMarks(id)));
        console.log(`Deleted ${marksToDelete.length} marks records for column ${columnToDelete.name}`);
      }
      
      // Update local state
      const updatedColumns = markColumns.filter(col => col.id !== columnId);
      setMarkColumns(updatedColumns);
      
      // Remove this column's data from all students and recalculate
      setStudents(prev => prev.map(student => {
        const { [columnId]: removed, ...restMarks } = student.customMarks;
        const { [columnId]: removedRecord, ...restRecords } = student.marksRecords as any;
        
        const totalObtained = Object.values(restMarks).reduce((sum, val) => sum + (val || 0), 0);
        const totalMax = updatedColumns.reduce((sum, col) => sum + col.maxMarks, 0);
        
        return {
          ...student,
          customMarks: restMarks,
          marksRecords: restRecords,
          total: totalObtained,
          percentage: calculatePercentage(totalObtained, totalMax)
        };
      }));
      
      toast.success(`Column "${columnToDelete.name}" and all its marks deleted successfully!`);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error('Delete column error:', err);
      toast.error('Failed to delete column', { description: errorMsg });
    }
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
      const subjectName = selectedSubjectName || selectedSubject;
      
      const marksToSave: any[] = [];
      
      students.forEach(student => {
        markColumns.forEach(col => {
          const markValue = student.customMarks[col.id];
          // Save even if mark is 0, but skip if null/undefined
          if (markValue !== null && markValue !== undefined) {
            const existingMarkId = (student.marksRecords as any)[col.id]?.id;
            
            marksToSave.push({
              student: student.studentId,
              subject_code: selectedSubject,
              subject_name: subjectName,
              semester: semesterNum,
              exam_type: col.examType,
              marks_obtained: markValue,
              total_marks: col.maxMarks,
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
            marks_obtained: mark.marks_obtained, 
            total_marks: mark.total_marks,
            remarks: mark.remarks 
          }).catch(err => {
            console.error('Failed to update mark:', mark.id, err);
            throw err;
          });
        } else {
          // Create new mark
          return marksService.createMarks({
            student: mark.student,
            subject_code: mark.subject_code,
            subject_name: mark.subject_name,
            semester: mark.semester,
            exam_type: mark.exam_type,
            marks_obtained: mark.marks_obtained,
            total_marks: mark.total_marks,
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

  const summaryStats = calculateSummaryStats();

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

  if (availableShifts.length === 0 || routineOptions.length === 0) {
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

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.totalStudents}</p>
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
                <p className="text-2xl font-bold">{summaryStats.completedEntries}</p>
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
                <p className="text-2xl font-bold">{summaryStats.averageMarks.toFixed(1)}%</p>
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
                <p className="text-2xl font-bold">{summaryStats.passRate.toFixed(0)}%</p>
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
                <p className="text-2xl font-bold">{summaryStats.highestMarks}</p>
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
                <p className="text-2xl font-bold">{summaryStats.lowestMarks || '-'}</p>
                <p className="text-xs text-muted-foreground">Lowest Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters & Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border rounded-xl p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {availableShifts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Shift {teacherShifts.length > 0 && <span className="text-[10px] text-muted-foreground/70">(Based on permissions)</span>}
                </Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="h-9">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableShifts.map(shift => (
                      <SelectItem key={shift} value={shift} className="capitalize">
                        {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Semester</Label>
              <Select
                value={selectedSemester}
                onValueChange={handleSemesterChange}
                disabled={!selectedShift || semesters.length === 0}
              >
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
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={loadingSubjects || !selectedSemester || filteredSubjects.length === 0}
              >
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                disabled={!selectedSubject || filteredDepartments.length === 0}
              >
                <SelectTrigger className="h-9">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`space-y-1.5 ${availableShifts.length > 0 ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-2 lg:col-span-2'}`}>
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
            {selectedSemester ? (() => {
              const num = parseInt(selectedSemester);
              const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
              return `${selectedSemester}${suffix} Semester`;
            })() : 'Semester not selected'}
          </Badge>
          <Badge variant="outline" className="bg-secondary/50">
            {selectedSubjectName || 'Subject not selected'}
          </Badge>
          {selectedShift && (
            <Badge variant="outline" className="capitalize">
              {selectedShift} Shift
            </Badge>
          )}
          <Badge variant="outline">
            {selectedDepartmentName || 'Department not selected'}
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
                      <span className="font-bold text-base text-primary">{Number(student.total).toFixed(2)}</span>
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <span className={`font-semibold ${student.percentage >= 40 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isNaN(student.percentage) ? '0.00' : Number(student.percentage).toFixed(2)}%
                      </span>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
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
