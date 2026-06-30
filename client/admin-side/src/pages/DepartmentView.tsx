import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, GraduationCap, Building2, Search, Eye, Edit, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import departmentService from '@/services/departmentService';
import { studentService, Student as StudentType } from '@/services/studentService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  short_name: string;
  head: string | null;
  total_students: number;
  active_students: number;
  faculty_count: number;
  established_year: string;
  description: string;
  is_active: boolean;
}

type Student = StudentType;

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
// The institute runs Morning and Day shifts only.
const shifts = ['Morning', 'Day'];

export default function DepartmentView() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [department, setDepartment] = useState<Department | null>(location.state?.department || null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch department details if not passed via state
  useEffect(() => {
    const fetchDepartment = async () => {
      if (!department && id) {
        try {
          const data = await departmentService.getDepartment(id);
          setDepartment(data);
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to load department details',
            variant: 'destructive',
          });
          navigate('/departments');
        }
      }
    };

    fetchDepartment();
  }, [id, department, navigate, toast]);

  // Fetch students based on filters
  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const filters: any = {
          department: id,
          page_size: 1000, // Get all students for this department
        };

        if (selectedSemester !== null) {
          filters.semester = selectedSemester;
        }

        if (selectedShift !== null) {
          filters.shift = selectedShift;
        }

        if (search.trim()) {
          filters.search = search.trim();
        }

        const response = await studentService.getStudents(filters);
        setStudents(response.results || []);
      } catch {
        setError('Failed to load students');
        toast({
          title: 'Error',
          description: 'Failed to load students',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [id, selectedSemester, selectedShift, search, toast]);

  if (!department) {
    return <LoadingState />;
  }

  if (error && !loading) {
    return <ErrorState error={error} />;
  }

  const handleStudentClick = (studentId: string) => {
    navigate(`/students/${studentId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'graduated':
        return 'outline';
      case 'discontinued':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const hasFilters = selectedSemester !== null || selectedShift !== null || !!search;
  const clearFilters = () => {
    setSelectedSemester(null);
    setSelectedShift(null);
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/departments')} className="shrink-0" aria-label="Back to departments">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-xl font-semibold text-primary-foreground">{department.short_name}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">{department.name}</h1>
            <p className="text-sm text-muted-foreground">
              {department.established_year && `Established ${department.established_year}`}
              {department.head && `${department.established_year ? ' • ' : ''}Head: ${department.head}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Active students</p>
            <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center"><Users className="w-[18px] h-[18px]" /></div>
          </div>
          <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{department.active_students || 0}</p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Faculty members</p>
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center"><GraduationCap className="w-[18px] h-[18px]" /></div>
          </div>
          <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{department.faculty_count || 0}</p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Filtered students</p>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Building2 className="w-[18px] h-[18px]" /></div>
          </div>
          <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{students.length || 0}</p>
        </div>
      </div>

      {/* Filters — semester + shift + search in one box */}
      <div className="surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">Filters</h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-muted-foreground">
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-x-6 gap-y-4">
          {/* Semester */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Semester</p>
            <div className="flex flex-wrap gap-1.5">
              {semesters.map((semester) => (
                <button
                  key={semester}
                  onClick={() => setSelectedSemester(selectedSemester === semester ? null : semester)}
                  className={cn(
                    'h-9 w-9 rounded-md border text-sm font-medium transition-colors',
                    selectedSemester === semester
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-accent hover:border-primary/40'
                  )}
                >
                  {semester}
                </button>
              ))}
            </div>
          </div>

          {/* Shift */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Shift</p>
            <div className="flex flex-wrap gap-1.5">
              {shifts.map((shift) => (
                <button
                  key={shift}
                  onClick={() => setSelectedShift(selectedShift === shift ? null : shift)}
                  className={cn(
                    'h-9 px-4 rounded-md border text-sm font-medium transition-colors',
                    selectedShift === shift
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-accent hover:border-primary/40'
                  )}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or roll number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Students table */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">Students</h3>
          <span className="text-sm text-muted-foreground">{students.length} shown</span>
        </div>
        {loading ? (
          <div className="p-12"><LoadingState /></div>
        ) : students.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Semester</TableHead>
                <TableHead className="text-center">Shift</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow
                  key={student.id}
                  className="hover:bg-accent cursor-pointer"
                  onClick={() => handleStudentClick(student.id)}
                >
                  <TableCell className="font-medium">{student.currentRollNumber}</TableCell>
                  <TableCell>{student.fullNameEnglish}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{student.semester}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{student.shift}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {getStatusLabel(student.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="View student" onClick={(e) => { e.stopPropagation(); handleStudentClick(student.id); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit student" onClick={(e) => { e.stopPropagation(); navigate(`/students/${student.id}/edit`); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">No students found</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? 'No students match the selected filters. Try adjusting your selection.'
                : 'No students found in this department.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
