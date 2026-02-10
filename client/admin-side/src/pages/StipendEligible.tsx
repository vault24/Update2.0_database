import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Search, Filter, Users, Percent, GraduationCap, Loader2, AlertCircle,
  Eye, MoreHorizontal, CheckCircle, XCircle, TrendingUp, Settings2, RefreshCw,
  ChevronDown, ArrowUpDown, SlidersHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { stipendService, EligibleStudent } from '@/services/stipendService';
import { getErrorMessage, apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Attendance threshold options
const ATTENDANCE_OPTIONS = [
  { value: 50, label: '50%' },
  { value: 60, label: '60%' },
  { value: 65, label: '65%' },
  { value: 70, label: '70%' },
  { value: 75, label: '75%' },
  { value: 80, label: '80%' },
  { value: 85, label: '85%' },
  { value: 90, label: '90%' },
];

// Pass requirement options
const PASS_REQUIREMENT_OPTIONS = [
  { value: 'all_pass', label: 'All Subjects Pass' },
  { value: '1_referred', label: 'Max 1 Referred' },
  { value: '2_referred', label: 'Max 2 Referred' },
  { value: 'any', label: 'Any (No Restriction)' },
];

interface EligibleStudent {
  id: string;
  name: string;
  nameBangla?: string;
  roll: string;
  department: string;
  semester: number;
  session: string;
  shift: string;
  photo?: string;
  attendance: number;
  gpa: number;
  referredSubjects: number;
  totalSubjects: number;
  passedSubjects: number;
  cgpa: number;
  rank?: number;
}

type SortField = 'name' | 'roll' | 'attendance' | 'gpa' | 'semester' | 'department';
type SortOrder = 'asc' | 'desc';

export default function StipendEligible() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<EligibleStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalEligible: 0,
    avgAttendance: 0,
    avgGpa: 0,
    allPassCount: 0,
    referredCount: 0,
  });
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  
  // Eligibility criteria (customizable)
  const [minAttendance, setMinAttendance] = useState(75);
  const [passRequirement, setPassRequirement] = useState('all_pass');
  const [showCriteriaDialog, setShowCriteriaDialog] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('gpa');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Dynamic filter options
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const shifts = ['Morning', 'Day', 'Evening']; // Static as these are standard shifts

  useEffect(() => {
    fetchEligibleStudents();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchQuery, departmentFilter, semesterFilter, shiftFilter, sessionFilter, sortField, sortOrder]);

  const loadFilterOptions = async () => {
    try {
      // Fetch all departments from API
      const response = await apiClient.get<any>('/departments/');
      
      // Handle both paginated and non-paginated responses
      const depts = Array.isArray(response) ? response : (response.results || []);
      setDepartments(depts);
    } catch (error) {
      console.error('Failed to load departments:', error);
      // Set empty array on error to prevent map error
      setDepartments([]);
    }
    
    // Generate sessions dynamically (current year and 3 previous years)
    const currentYear = new Date().getFullYear();
    const generatedSessions = [];
    for (let i = 0; i < 4; i++) {
      const year = currentYear - i;
      generatedSessions.push(`${year}-${year + 1}`);
    }
    setSessions(generatedSessions);
  };

  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await stipendService.calculateEligibility({
        minAttendance,
        passRequirement,
      });
      
      setStudents(response.students);
      setStatistics(response.statistics);
      
      toast({
        title: 'Success',
        description: `Found ${response.students.length} eligible students`,
      });
    } catch (err) {
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

  const checkPassRequirement = (student: EligibleStudent): boolean => {
    // This is now handled by the backend, but kept for client-side filtering
    switch (passRequirement) {
      case 'all_pass':
        return student.referredSubjects === 0;
      case '1_referred':
        return student.referredSubjects <= 1;
      case '2_referred':
        return student.referredSubjects <= 2;
      case 'any':
        return true;
      default:
        return true;
    }
  };

  const filterAndSortStudents = () => {
    let filtered = students.filter((student) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !student.name.toLowerCase().includes(query) &&
          !student.nameBangla?.toLowerCase().includes(query) &&
          !student.roll.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // Apply department filter
      if (departmentFilter !== 'all' && student.department !== departmentFilter) return false;
      
      // Apply semester filter
      if (semesterFilter !== 'all' && student.semester !== parseInt(semesterFilter)) return false;
      
      // Apply shift filter
      if (shiftFilter !== 'all' && student.shift !== shiftFilter) return false;
      
      // Apply session filter
      if (sessionFilter !== 'all' && student.session !== sessionFilter) return false;
      
      return true;
    });
    
    // Sort students
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'roll':
          comparison = a.roll.localeCompare(b.roll);
          break;
        case 'attendance':
          comparison = a.attendance - b.attendance;
          break;
        case 'gpa':
          comparison = a.gpa - b.gpa;
          break;
        case 'semester':
          comparison = a.semester - b.semester;
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Add rank based on GPA
    filtered = filtered.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
    
    setFilteredStudents(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setSemesterFilter('all');
    setShiftFilter('all');
    setSessionFilter('all');
  };

  const resetCriteria = () => {
    setMinAttendance(75);
    setPassRequirement('all_pass');
  };
  
  const applyCriteria = () => {
    setShowCriteriaDialog(false);
    fetchEligibleStudents();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAttendanceBadgeVariant = (attendance: number) => {
    if (attendance >= 90) return 'default';
    if (attendance >= 80) return 'secondary';
    return 'outline';
  };

  const getGpaBadgeVariant = (gpa: number) => {
    if (gpa >= 3.5) return 'default';
    if (gpa >= 3.0) return 'secondary';
    return 'outline';
  };

  const getPassStatusBadge = (student: EligibleStudent) => {
    if (student.referredSubjects === 0) {
      return <Badge variant="default" className="bg-success/10 text-success border-success/20">All Pass</Badge>;
    } else {
      return <Badge variant="outline" className="border-warning/30 text-warning">{student.referredSubjects} Referred</Badge>;
    }
  };

  const getShiftBadge = (shift: string) => {
    const colors: Record<string, string> = {
      'Morning': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      'Day': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      'Evening': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    };
    return <Badge variant="outline" className={colors[shift] || ''}>{shift}</Badge>;
  };

  // Stats calculations
  const totalEligible = filteredStudents.length;
  const avgAttendance = filteredStudents.length > 0 
    ? (filteredStudents.reduce((sum, s) => sum + s.attendance, 0) / filteredStudents.length).toFixed(1)
    : statistics.avgAttendance.toFixed(1);
  const avgGpa = filteredStudents.length > 0
    ? (filteredStudents.reduce((sum, s) => sum + s.gpa, 0) / filteredStudents.length).toFixed(2)
    : statistics.avgGpa.toFixed(2);
  const allPassCount = filteredStudents.filter(s => s.referredSubjects === 0).length;
  const referredCount = filteredStudents.filter(s => s.referredSubjects > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading eligible students...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Award className="h-8 w-8 text-primary" />
              Stipend Eligible Students
            </h1>
            <p className="text-muted-foreground mt-1">
              Current criteria: Attendance ≥ {minAttendance}%, {PASS_REQUIREMENT_OPTIONS.find(o => o.value === passRequirement)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchEligibleStudents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showCriteriaDialog} onOpenChange={setShowCriteriaDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Criteria Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Eligibility Criteria
                  </DialogTitle>
                  <DialogDescription>
                    Customize the eligibility requirements for stipend selection.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Attendance Threshold */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Minimum Attendance</Label>
                      <Badge variant="secondary">{minAttendance}%</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ATTENDANCE_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant={minAttendance === option.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMinAttendance(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Pass Requirement */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Pass Requirement</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PASS_REQUIREMENT_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant={passRequirement === option.value ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start"
                          onClick={() => setPassRequirement(option.value)}
                        >
                          {option.value === 'all_pass' && <CheckCircle className="h-4 w-4 mr-2" />}
                          {option.value !== 'all_pass' && option.value !== 'any' && <XCircle className="h-4 w-4 mr-2" />}
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={resetCriteria}>
                      Reset to Default
                    </Button>
                    <Button onClick={applyCriteria}>
                      Apply Criteria
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Eligible</p>
                    <p className="text-2xl font-bold">{totalEligible}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <Percent className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                    <p className="text-2xl font-bold">{avgAttendance}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-info/10">
                    <GraduationCap className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. GPA</p>
                    <p className="text-2xl font-bold">{avgGpa}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-warning/10">
                    <CheckCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">All Pass</p>
                    <p className="text-2xl font-bold">{allPassCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={shiftFilter} onValueChange={setShiftFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {shifts.map((shift) => (
                      <SelectItem key={shift} value={shift}>
                        {shift}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {sessions.map((session) => (
                      <SelectItem key={session} value={session}>
                        {session}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpa">GPA</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="roll">Roll</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </Button>
                <Button variant="outline" onClick={clearAllFilters} className="ml-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Eligible Students List
                  </CardTitle>
                  <CardDescription>
                    Showing {filteredStudents.length} of {students.length} students
                  </CardDescription>
                </div>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="table">Table</TabsTrigger>
                    <TabsTrigger value="cards">Cards</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Eligible Students Found</h3>
                  <p className="text-muted-foreground">
                    {students.length === 0
                      ? 'No students meet the eligibility criteria.'
                      : 'No students match your current filters. Try adjusting the criteria or filters.'}
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => { clearAllFilters(); resetCriteria(); }}>
                    Reset All Filters & Criteria
                  </Button>
                </div>
              ) : viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('roll')}>
                          <div className="flex items-center gap-1">
                            Roll
                            {sortField === 'roll' && <ChevronDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('department')}>
                          <div className="flex items-center gap-1">
                            Department
                            {sortField === 'department' && <ChevronDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('semester')}>
                          <div className="flex items-center gap-1">
                            Semester
                            {sortField === 'semester' && <ChevronDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead className="text-center cursor-pointer" onClick={() => handleSort('attendance')}>
                          <div className="flex items-center justify-center gap-1">
                            Attendance
                            {sortField === 'attendance' && <ChevronDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                        <TableHead className="text-center cursor-pointer" onClick={() => handleSort('gpa')}>
                          <div className="flex items-center justify-center gap-1">
                            GPA
                            {sortField === 'gpa' && <ChevronDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredStudents.map((student, index) => (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="font-mono">
                                    {student.rank}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Rank #{student.rank}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={student.photo} alt={student.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(student.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  {student.nameBangla && (
                                    <p className="text-sm text-muted-foreground">{student.nameBangla}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">{student.roll}</TableCell>
                            <TableCell>{student.department}</TableCell>
                            <TableCell>{getShiftBadge(student.shift)}</TableCell>
                            <TableCell>Semester {student.semester}</TableCell>
                            <TableCell>{student.session}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={getAttendanceBadgeVariant(student.attendance)}>
                                {student.attendance}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant={getGpaBadgeVariant(student.gpa)}>
                                    {student.gpa.toFixed(2)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>CGPA: {student.cgpa.toFixed(2)}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-center">
                              {getPassStatusBadge(student)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => navigate(`/students/${student.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Full Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/students/${student.id}`)}>
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    Academic Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => navigate(`/documents?student=${student.id}`)}>
                                    <Award className="h-4 w-4 mr-2" />
                                    Generate Stipend Letter
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {filteredStudents.map((student, index) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-14 w-14">
                                <AvatarImage src={student.photo} alt={student.name} />
                                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                  {getInitials(student.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-semibold truncate">{student.name}</h3>
                                    {student.nameBangla && (
                                      <p className="text-sm text-muted-foreground truncate">{student.nameBangla}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="font-mono shrink-0">
                                    #{student.rank}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Roll: {student.roll}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Department:</span>
                                <p className="font-medium truncate">{student.department}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Shift:</span>
                                <p className="font-medium">{student.shift}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Semester:</span>
                                <p className="font-medium">{student.semester}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Session:</span>
                                <p className="font-medium">{student.session}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                              <div className="flex items-center gap-2">
                                <Badge variant={getAttendanceBadgeVariant(student.attendance)}>
                                  {student.attendance}%
                                </Badge>
                                <Badge variant={getGpaBadgeVariant(student.gpa)}>
                                  GPA {student.gpa.toFixed(2)}
                                </Badge>
                              </div>
                              {getPassStatusBadge(student)}
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => navigate(`/students/${student.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => navigate(`/students/${student.id}`)}
                              >
                                <GraduationCap className="h-4 w-4 mr-2" />
                                Academic
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
