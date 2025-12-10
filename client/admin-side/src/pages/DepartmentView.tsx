import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Users, GraduationCap, Building2, Search, Eye, Edit
} from 'lucide-react';
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
const shifts = ['Morning', 'Day', 'Evening'];

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
        } catch (err) {
          console.error('Error fetching department:', err);
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
      } catch (err) {
        console.error('Error fetching students:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/departments')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">{department.short_name}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{department.name}</h1>
            <p className="text-muted-foreground">
              Established {department.established_year} 
              {department.head && ` • ${department.head}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{department.active_students || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{department.faculty_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Faculty Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{students.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Filtered Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Semester Selection */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Select Semester</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {semesters.map((semester) => (
              <motion.button
                key={semester}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSemester(selectedSemester === semester ? null : semester)}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200
                  ${selectedSemester === semester 
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center">
                  <p className="text-2xl font-bold">{semester}</p>
                  <p className="text-xs mt-1">Semester</p>
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Selection */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Select Shift</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {shifts.map((shift) => (
              <motion.button
                key={shift}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedShift(selectedShift === shift ? null : shift)}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200
                  ${selectedShift === shift 
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
              >
                <p className="text-lg font-semibold text-center">{shift}</p>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12">
              <LoadingState />
            </div>
          ) : students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Semester</TableHead>
                  <TableHead className="text-center">Shift</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-muted/50 cursor-pointer"
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
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStudentClick(student.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/students/${student.id}/edit`);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {selectedSemester || selectedShift || search
                  ? 'No students match the selected filters. Try adjusting your selection.'
                  : 'No students found in this department.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
