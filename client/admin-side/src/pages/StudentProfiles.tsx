import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Eye, GraduationCap, Mail, Phone, Calendar, MapPin, BookOpen, ClipboardCheck, FileText, Inbox, FileEdit, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { studentService, Student } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { marksService } from '@/services/marksService';
import departmentService from '@/services/departmentService';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/use-toast';

interface MappedStudent {
  id: string;
  name: string;
  roll: string;
  department: string;
  semester: string;
  status: string;
  email: string;
  phone: string;
  session: string;
  avatar: string;
  dob: string;
  address: string;
  gpa: number;
}

// These will be fetched dynamically when a student is selected

export default function StudentProfiles() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<MappedStudent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [students, setStudents] = useState<MappedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const { toast } = useToast();
  
  // Student details data
  const [academicHistory, setAcademicHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [studentMarks, setStudentMarks] = useState<any[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [department]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getDepartments();
      setDepartments(response.results || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students with filters:', { department, status: 'active' });
      
      const response = await studentService.getStudents({
        department: department !== 'all' ? department : undefined,
        status: 'active',
        page_size: 100,
      });

      console.log('Students API response:', response);

      if (!response.results || response.results.length === 0) {
        console.warn('No students found in the response');
        setStudents([]);
        return;
      }

      const mapped = response.results.map((s: Student) => {
        // Handle department - can be string or object
        let departmentName = '';
        if (typeof s.department === 'string') {
          departmentName = s.departmentName || s.department;
        } else if (s.department && typeof s.department === 'object') {
          departmentName = s.department.name || s.department.code || '';
        }
        
        return {
          id: s.id,
          name: s.fullNameEnglish,
          roll: s.currentRollNumber,
          department: departmentName,
          semester: `${s.semester}${s.semester === 1 ? 'st' : s.semester === 2 ? 'nd' : s.semester === 3 ? 'rd' : 'th'}`,
          status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
          email: s.email,
          phone: s.mobileStudent,
          session: s.session,
          avatar: s.profilePhoto || '',
          dob: s.dateOfBirth,
          address: `${s.presentAddress.district}, Bangladesh`,
          gpa: s.semesterResults?.[s.semesterResults.length - 1]?.cgpa || 0,
        };
      });

      console.log('Mapped students:', mapped);
      setStudents(mapped);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || error.message || 'Failed to load students. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.roll.includes(search);
    return matchesSearch;
  });

  const openProfile = async (student: MappedStudent) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
    setDetailsLoading(true);
    
    try {
      // Fetch student details
      const studentDetails = await studentService.getStudent(student.id);
      
      // Set academic history from semester results
      if (studentDetails.semesterResults && studentDetails.semesterResults.length > 0) {
        const history = studentDetails.semesterResults.map((result: any) => ({
          semester: `${result.semester}${result.semester === 1 ? 'st' : result.semester === 2 ? 'nd' : result.semester === 3 ? 'rd' : 'th'}`,
          gpa: result.sgpa || 0,
          credits: result.totalCredits || 0,
          year: result.year || new Date().getFullYear(),
        }));
        setAcademicHistory(history);
      } else {
        setAcademicHistory([]);
      }
      
      // Fetch attendance summary
      try {
        const attendanceResponse = await attendanceService.getStudentSummary(student.id);
        const attendance = attendanceResponse.summary.map((item: any) => ({
          subject: item.subject_name,
          present: item.present,
          absent: item.total - item.present,
          percentage: Math.round(item.percentage),
        }));
        setAttendanceHistory(attendance);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setAttendanceHistory([]);
      }
      
      // Fetch marks
      try {
        const marksResponse = await marksService.getStudentMarks(student.id);
        setStudentMarks(marksResponse.marks || []);
      } catch (err) {
        console.error('Error fetching marks:', err);
        setStudentMarks([]);
      }
      
    } catch (error) {
      console.error('Error fetching student details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student details',
        variant: 'destructive',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/20 text-success border-success/30';
      case 'Discontinued': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Alumni': return 'bg-primary/20 text-primary border-primary/30';
      case 'Graduated': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <LoadingState message="Loading student profiles..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Profiles</h1>
        <p className="text-muted-foreground">View detailed profiles of all students</p>
      </div>

      {/* Search & Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Grid */}
      {filteredStudents.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? `No students match your search "${search}"` : 'No students are currently enrolled in this department.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Check your backend server is running and there are students in the database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass-card hover:shadow-lg transition-all cursor-pointer group" onClick={() => openProfile(student)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="gradient-primary text-primary-foreground">
                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">Roll: {student.roll}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.department}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={getStatusColor(student.status)}>
                          {student.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{student.semester}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Profile Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={selectedStudent.avatar} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xl">
                      {selectedStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                    <p className="text-sm text-muted-foreground font-normal">Roll: {selectedStudent.roll} | {selectedStudent.department}</p>
                    <Badge variant="outline" className={`mt-1 ${getStatusColor(selectedStudent.status)}`}>
                      {selectedStudent.status}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="academic" className="text-xs">Academic</TabsTrigger>
                  <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
                  <TabsTrigger value="applications" className="text-xs">Applications</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="glass-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedStudent.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedStudent.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedStudent.dob}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedStudent.address}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Academic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Department</span>
                          <span className="text-sm font-medium">{selectedStudent.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Semester</span>
                          <span className="text-sm font-medium">{selectedStudent.semester}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Session</span>
                          <span className="text-sm font-medium">{selectedStudent.session}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Current GPA</span>
                          <span className="text-sm font-bold text-primary">{selectedStudent.gpa}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="mt-4">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Academic History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detailsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading academic history...</div>
                      ) : academicHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No academic history available</div>
                      ) : (
                        <div className="space-y-3">
                          {academicHistory.map((sem, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div>
                                <p className="font-medium">{sem.semester} Semester</p>
                                <p className="text-xs text-muted-foreground">{sem.year} | {sem.credits} Credits</p>
                              </div>
                              <Badge className="gradient-primary text-primary-foreground">GPA: {sem.gpa.toFixed(2)}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4" />
                        Attendance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detailsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading attendance data...</div>
                      ) : attendanceHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No attendance records available</div>
                      ) : (
                        <div className="space-y-3">
                          {attendanceHistory.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div>
                                <p className="font-medium">{item.subject}</p>
                                <p className="text-xs text-muted-foreground">Present: {item.present} | Absent: {item.absent}</p>
                              </div>
                              <Badge variant={item.percentage >= 75 ? 'default' : 'destructive'}>
                                {item.percentage}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        Document management feature coming soon
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="applications" className="mt-4">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Inbox className="w-4 h-4" />
                        Applications & Correction Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        Applications and correction requests feature coming soon
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        Student timeline feature coming soon
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
