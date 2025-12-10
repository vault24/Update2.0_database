import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  UserPlus,
  Eye,
  Edit,
  FileText,
  UserX,
  Award,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { studentService, Student, StudentFilters } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const departments = ['All', 'Computer', 'Electrical', 'Civil', 'Mechanical', 'Electronics', 'Power'];
const semesters = ['All', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const statuses = ['All', 'Active', 'Discontinued', 'Alumni'];
const sessions = ['All', '2023-2024', '2022-2023', '2021-2022', '2020-2021'];

// Mock data removed - will fetch from backend

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-success/10 text-success border-success/20';
    case 'Discontinued':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'Alumni':
      return 'bg-info/10 text-info border-info/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function StudentsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSession, setSelectedSession] = useState('All');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'roll'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Backend data states
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch students from backend
  useEffect(() => {
    fetchStudents();
  }, [selectedDept, selectedSemester, selectedStatus, selectedSession, currentPage, pageSize]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: StudentFilters = {
        page: currentPage,
        page_size: pageSize,
      };
      
      if (selectedDept !== 'All') filters.department = selectedDept;
      if (selectedSemester !== 'All') filters.semester = parseInt(selectedSemester.replace(/\D/g, ''));
      if (selectedStatus !== 'All') filters.status = selectedStatus.toLowerCase() as any;
      if (searchQuery) filters.search = searchQuery;
      
      console.log('Fetching students with filters:', filters);
      const response = await studentService.getStudents(filters);
      console.log('Students response:', response);
      
      setStudents(response.results || []);
      setTotalCount(response.count || 0);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Map students to display format
  const mappedStudents = students.map((student) => {
    // Handle department - can be string or object
    let departmentName = '';
    if (typeof student.department === 'string') {
      departmentName = student.departmentName || student.department;
    } else if (student.department && typeof student.department === 'object') {
      departmentName = student.department.name || student.department.code || '';
    }
    
    return {
      id: student.id,
      name: student.fullNameEnglish,
      roll: student.currentRollNumber,
      department: departmentName,
      semester: `${student.semester}${student.semester === 1 ? 'st' : student.semester === 2 ? 'nd' : student.semester === 3 ? 'rd' : 'th'}`,
      status: student.status.charAt(0).toUpperCase() + student.status.slice(1),
      session: student.session,
      photo: student.profilePhoto,
    };
  });

  const sortedStudents = [...mappedStudents].sort((a, b) => {
    const aVal = sortBy === 'name' ? a.name : a.roll;
    const bVal = sortBy === 'name' ? b.name : b.roll;
    return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedStudents = sortedStudents;

  const toggleSelectAll = () => {
    if (selectedStudents.length === paginatedStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(paginatedStudents.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchStudents();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">Manage all students in the institution</p>
        </div>
        <Link to="/add-student">
          <Button className="gradient-primary text-primary-foreground gap-2">
            <UserPlus className="w-4 h-4" />
            Add Student
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'border-primary text-primary')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session} value={session}>
                        {session}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedStudents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-4 flex items-center justify-between"
          >
            <p className="text-sm text-foreground">
              <span className="font-semibold">{selectedStudents.length}</span> students selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Change Status
              </Button>
              <Button variant="outline" size="sm">
                Export Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading students...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive font-semibold mb-2">Error Loading Students</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={fetchStudents} variant="outline">
              Try Again
            </Button>
          </div>
        ) : paginatedStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-semibold mb-2">No Students Found</p>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery ? `No students match your search "${searchQuery}"` : 'No students are currently enrolled.'}
            </p>
            <Link to="/add-student">
              <Button className="gradient-primary text-primary-foreground">
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Student
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Photo</th>
                    <th className="p-4 text-left">
                      <button
                        onClick={() => {
                          if (sortBy === 'name') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('name');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Name
                        {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                      </button>
                    </th>
                    <th className="p-4 text-left">
                      <button
                        onClick={() => {
                          if (sortBy === 'roll') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('roll');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Roll
                        {sortBy === 'roll' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                      </button>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden md:table-cell">Department</th>
                    <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden lg:table-cell">Semester</th>
                    <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden xl:table-cell">Session</th>
                    <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
              {paginatedStudents.map((student, index) => (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleSelectStudent(student.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground font-semibold">
                      {student.name.charAt(0)}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-foreground">{student.name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-muted-foreground font-mono text-sm">{student.roll}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-muted-foreground">{student.department}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <p className="text-muted-foreground">{student.semester}</p>
                  </td>
                  <td className="p-4">
                    <Badge className={cn('border', getStatusColor(student.status))}>
                      {student.status}
                    </Badge>
                  </td>
                  <td className="p-4 hidden xl:table-cell">
                    <p className="text-muted-foreground text-sm">{student.session}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        title="View Profile"
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        title="Edit"
                        onClick={() => navigate(`/students/${student.id}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" title="Documents">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex text-warning hover:text-warning" title="Discontinue">
                        <UserX className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex text-info hover:text-info" title="Move to Alumni">
                        <Award className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
