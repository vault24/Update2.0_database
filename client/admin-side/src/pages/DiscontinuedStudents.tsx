import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Eye,
  RotateCcw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Edit,
  Save,
  X,
  ExternalLink,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { studentService, type Student } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';

const reasons = ['All', 'Dropout', 'Expelled', 'Migrated', 'Financial Issue', 'Health Issue', 'Personal Reasons'];
const departments = ['All', 'Computer', 'Electrical', 'Civil', 'Mechanical', 'Electronics', 'Power'];
const years = ['All', '2024', '2023', '2022', '2021', '2020'];

// Helper function to safely get department name
const getDepartmentName = (student: Student): string => {
  if (student.departmentName) return student.departmentName;
  if (typeof student.department === 'string') return student.department;
  if (typeof student.department === 'object' && student.department?.name) return student.department.name;
  return 'Unknown';
};

const getReasonColor = (reason: string) => {
  switch (reason) {
    case 'Dropout':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'Expelled':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'Migrated':
      return 'bg-info/10 text-info border-info/20';
    case 'Financial Issue':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'Health Issue':
      return 'bg-accent/10 text-accent border-accent/20';
    case 'Personal Reasons':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function DiscontinuedStudents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedReason, setSelectedReason] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reAdmitDialogOpen, setReAdmitDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reAdmitData, setReAdmitData] = useState({
    semester: '',
    remarks: '',
  });
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  
  // API state
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch discontinued students
  useEffect(() => {
    fetchDiscontinuedStudents();
  }, [currentPage, pageSize, searchQuery, selectedDept, selectedReason, selectedYear]);

  const fetchDiscontinuedStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {
        status: 'discontinued',
        page: currentPage,
        page_size: pageSize,
      };
      
      if (searchQuery) filters.search = searchQuery;
      if (selectedDept !== 'All') filters.department = selectedDept;
      // Note: The API might not support filtering by reason and year directly
      // You may need to filter these client-side or add backend support
      
      const response = await studentService.getStudents(filters);
      setStudents(response.results);
      setTotalCount(response.count);
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

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleReAdmit = async () => {
    if (!selectedStudent || !reAdmitData.semester) {
      toast({
        title: 'Error',
        description: 'Please select a semester',
        variant: 'destructive',
      });
      return;
    }

    try {
      await studentService.patchStudent(selectedStudent.id, {
        status: 'active',
        semester: parseInt(reAdmitData.semester),
      });
      
      toast({
        title: 'Student Re-admitted',
        description: `${selectedStudent.fullNameEnglish} has been successfully re-admitted.`,
      });
      
      setReAdmitDialogOpen(false);
      setSelectedStudent(null);
      setReAdmitData({ semester: '', remarks: '' });
      fetchDiscontinuedStudents(); // Refresh the list
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };

  const handleViewClick = (student: Student) => {
    setSelectedStudent(student);
    setEditedNotes(''); // Notes might not be in the API response
    setIsEditingNotes(false);
    setViewDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (selectedStudent) {
      // In a real app, you would update the student's notes here via API
      toast({
        title: 'Notes Updated',
        description: 'Student notes have been saved successfully.',
      });
      setIsEditingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            Discontinued Students
          </h1>
          <p className="text-muted-foreground mt-1">Manage students whose studies have been discontinued</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export List
        </Button>
      </div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex items-start gap-4"
      >
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Discontinued Students Section</p>
          <p className="text-sm text-muted-foreground mt-1">
            This section contains students who are no longer actively enrolled. You can re-admit students or add notes to their records.
          </p>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'border-primary text-primary')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
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

                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl overflow-hidden border-l-4 border-l-warning relative"
      >
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading students...</p>
            </div>
          </div>
        )}
        
        {error && !loading && (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDiscontinuedStudents}>Try Again</Button>
          </div>
        )}
        
        {!loading && !error && students.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No discontinued students found</p>
          </div>
        )}
        
        {!loading && !error && students.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-warning/5">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Name</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Roll</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden md:table-cell">Department</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden lg:table-cell">Session</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Reason</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden xl:table-cell">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Semester
                    </div>
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden xl:table-cell">Last Semester</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border/50 hover:bg-warning/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-accent flex items-center justify-center text-warning-foreground font-semibold">
                          {student.fullNameEnglish.charAt(0)}
                        </div>
                        <p className="font-medium text-foreground">{student.fullNameEnglish}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-muted-foreground font-mono text-sm">{student.currentRollNumber}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-muted-foreground">{getDepartmentName(student)}</p>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <p className="text-muted-foreground text-sm">{student.session}</p>
                    </td>
                    <td className="p-4">
                      <Badge className={cn('border', getReasonColor(student.discontinuedReason || 'Unknown'))}>
                        {student.discontinuedReason || 'Not specified'}
                      </Badge>
                    </td>
                    <td className="p-4 hidden xl:table-cell">
                      <p className="text-muted-foreground text-sm">{student.semester}</p>
                    </td>
                    <td className="p-4 hidden xl:table-cell">
                      <p className="text-muted-foreground text-sm">{student.lastSemester || 'N/A'}</p>
                    </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        title="View"
                        onClick={() => handleViewClick(student)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success hover:text-success"
                        title="Re-admit"
                        onClick={() => {
                          setSelectedStudent(student);
                          setReAdmitDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Add Note">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-warning/5">
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
      </motion.div>

      {/* View Student Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-warning to-accent flex items-center justify-center text-warning-foreground font-semibold text-xl">
                    {selectedStudent.fullNameEnglish.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedStudent.fullNameEnglish}</h2>
                    <p className="text-sm text-muted-foreground font-normal">
                      Roll: {selectedStudent.currentRollNumber} | {getDepartmentName(selectedStudent)}
                    </p>
                    <Badge className={cn('mt-1 border', getReasonColor(selectedStudent.discontinuedReason || 'Unknown'))}>
                      {selectedStudent.discontinuedReason || 'Not specified'}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Information */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{selectedStudent.dateOfBirth}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{selectedStudent.gender}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Blood Group</p>
                      <p className="font-medium">{selectedStudent.bloodGroup}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedStudent.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mobile</p>
                      <p className="font-medium">{selectedStudent.mobileStudent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Guardian Mobile</p>
                      <p className="font-medium">{selectedStudent.guardianMobile}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{selectedStudent.presentAddress?.district || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Discontinuing Information */}
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Discontinuing Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reason</p>
                      <Badge className={cn('mt-1 border', getReasonColor(selectedStudent.discontinuedReason || 'Unknown'))}>
                        {selectedStudent.discontinuedReason || 'Not specified'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium flex items-center gap-2 mt-1">
                        {selectedStudent.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Semester</p>
                      <p className="font-medium">{selectedStudent.lastSemester || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Semester</p>
                      <p className="font-medium">{selectedStudent.semester}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Session</p>
                      <p className="font-medium">{selectedStudent.session}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Shift</p>
                      <p className="font-medium">{selectedStudent.shift}</p>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Notes
                    </h3>
                    {!isEditingNotes ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Notes
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingNotes(false);
                            setEditedNotes('');
                          }}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          className="gradient-primary text-primary-foreground gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  {isEditingNotes ? (
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Enter notes about this student..."
                      className="min-h-[120px]"
                    />
                  ) : (
                    <div className="bg-background rounded-lg p-4 min-h-[120px]">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {editedNotes || 'No notes available.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Academic Information */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Academic Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{getDepartmentName(selectedStudent)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Semester</p>
                      <p className="font-medium">{selectedStudent.semester}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Session</p>
                      <p className="font-medium">{selectedStudent.session}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Roll Number</p>
                      <p className="font-medium font-mono">{selectedStudent.currentRollNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Registration Number</p>
                      <p className="font-medium font-mono">{selectedStudent.currentRegistrationNumber}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="gradient-primary text-primary-foreground gap-2"
                  onClick={() => {
                    setViewDialogOpen(false);
                    navigate(`/students/${selectedStudent.id}`);
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Profile
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Re-admit Dialog */}
      <Dialog open={reAdmitDialogOpen} onOpenChange={setReAdmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Re-admit Student</DialogTitle>
            <DialogDescription>
              Re-admit {selectedStudent?.fullNameEnglish} back to active status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Semester *</Label>
              <Select value={reAdmitData.semester} onValueChange={(val) => setReAdmitData((prev) => ({ ...prev, semester: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Add any notes about this re-admission..."
                value={reAdmitData.remarks}
                onChange={(e) => setReAdmitData((prev) => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReAdmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReAdmit} className="gradient-success text-success-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-admit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
