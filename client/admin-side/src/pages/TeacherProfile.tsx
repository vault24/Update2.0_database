import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Edit, User, Phone, Mail, MapPin, Building2, Briefcase,
  Calendar, Clock, BookOpen, Users, Shield, Key, FileText, 
  TrendingUp, CheckCircle, XCircle, AlertCircle, Loader2, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { teacherService, Teacher } from '@/services/teacherService';
import { settingsService, SystemSettings } from '@/services/settingsService';
import { getErrorMessage } from '@/lib/api';

export default function TeacherProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instituteSettings, setInstituteSettings] = useState<SystemSettings | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<any>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [savingShift, setSavingShift] = useState(false);
  useEffect(() => {
    if (id) {
      fetchData();
      fetchDepartments();
    }
  }, [id]);

  const fetchDepartments = async () => {
    try {
      const departmentService = await import('@/services/departmentService');
      const response = await departmentService.default.getDepartments({ page_size: 100 });
      setDepartments(response.results);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [teacherData, settings] = await Promise.all([
        teacherService.getTeacher(id),
        settingsService.getSettings().catch(() => null)
      ]);

      console.log('Teacher data received:', teacherData);
      
      setTeacher(teacherData);
      setInstituteSettings(settings);
    } catch (err: any) {
      console.error('Failed to load teacher profile:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = () => {
    if (!teacher) return 'N/A';
    if (teacher.departmentName) return teacher.departmentName;
    if (typeof teacher.department === 'string') return teacher.department;
    if (typeof teacher.department === 'object' && teacher.department && 'name' in teacher.department) {
      return (teacher.department as any).name;
    }
    return 'N/A';
  };

  const handleEdit = (field: string, currentValue: any) => {
    setEditField(field);
    if (field === 'department') {
      // For department, set the department ID
      const deptId = typeof currentValue === 'object' ? currentValue?.id : currentValue;
      setEditValue(deptId || '');
    } else {
      setEditValue(currentValue || '');
    }
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!teacher || !id) return;

    try {
      const updateData: any = {};
      updateData[editField] = editValue;

      await teacherService.updateTeacher(id, updateData);
      
      toast({
        title: 'Success',
        description: 'Teacher information updated successfully',
      });

      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  const handleShiftToggle = async (shift: string, checked: boolean) => {
    if (!teacher || !id || savingShift) return;

    try {
      setSavingShift(true);
      const currentShifts = (teacher as any).shifts || [];
      const newShifts = checked
        ? [...currentShifts.filter((s: string) => s !== shift), shift]
        : currentShifts.filter((s: string) => s !== shift);

      console.log('Updating shifts:', { currentShifts, newShifts, shift, checked });
      
      await teacherService.updateTeacher(id, { shifts: newShifts } as any);
      
      // Update local state
      setTeacher({ ...teacher, shifts: newShifts } as any);
      
      toast({
        title: 'Success',
        description: `${shift.charAt(0).toUpperCase() + shift.slice(1)} shift ${checked ? 'assigned' : 'removed'}`,
      });
    } catch (err) {
      console.error('Shift toggle error:', err);
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSavingShift(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Profile Not Found</h3>
          <p className="text-muted-foreground">
            {error || 'The teacher profile you are looking for could not be found.'}
          </p>
          <Button onClick={() => navigate('/teachers')}>
            Back to Teachers
          </Button>
        </div>
      </div>
    );
  }

  const departmentName = getDepartmentName();
  const instituteName = instituteSettings?.institute_name || 'Institute';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teachers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Teacher Profile</h1>
            <p className="text-muted-foreground">Manage teacher information and assignments</p>
          </div>
        </div>
      </motion.div>

      {/* Basic Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={teacher.profilePhoto} />
                  <AvatarFallback className="text-2xl gradient-primary text-primary-foreground">
                    {teacher.fullNameEnglish?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <Badge variant={teacher.employmentStatus === 'active' ? 'default' : 'secondary'}>
                  {teacher.employmentStatus}
                </Badge>
              </div>

              {/* Information Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Full Name (English)</Label>
                  <p className="font-medium">{teacher.fullNameEnglish}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Full Name (Bangla)</Label>
                  <p className="font-medium">{teacher.fullNameBangla || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Teacher ID</Label>
                  <p className="font-medium font-mono">{teacher.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Designation</Label>
                  <p className="font-medium">{teacher.designation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Department</Label>
                  <p className="font-medium">{departmentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Employment Status</Label>
                  <Badge variant={teacher.employmentStatus === 'active' ? 'default' : 'secondary'}>
                    {teacher.employmentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="contact" className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="w-4 h-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="assignment" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-2">
            <Shield className="w-4 h-4" />
            Access
          </TabsTrigger>
          <TabsTrigger value="job" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Job Info
          </TabsTrigger>
        </TabsList>

        {/* Contact Information Tab */}
        <TabsContent value="contact">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{teacher.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Mobile Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{teacher.mobileNumber}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Office Location</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{teacher.officeLocation || 'Not assigned'}</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit('officeLocation', teacher.officeLocation)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Room Number</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{(teacher as any).roomNumber || 'Not assigned'}</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit('roomNumber', (teacher as any).roomNumber)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignment">
          <div className="grid gap-4">
            {/* Assigned Classes */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Assigned Classes
                  </div>
                  <Button size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Manage Classes
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacher.subjects && teacher.subjects.length > 0 ? (
                  <div className="space-y-3">
                    {teacher.subjects.map((subject, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{subject}</p>
                          <p className="text-sm text-muted-foreground">Department: {departmentName}</p>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No classes assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department & Shift Assignment */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4" />
                    Department Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Current Department</Label>
                      <p className="font-medium">{departmentName}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleEdit('department', teacher.department)}
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Change Department
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4" />
                    Shift Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">
                      Assign shifts to control class routine availability
                    </Label>
                    
                    {/* Morning Shift */}
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">Morning Shift</p>
                          <p className="text-xs text-muted-foreground">8:00 AM - 12:00 PM</p>
                        </div>
                      </div>
                      <Switch
                        checked={(teacher as any).shifts?.includes('morning') || false}
                        onCheckedChange={(checked) => handleShiftToggle('morning', checked)}
                        disabled={savingShift}
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </div>

                    {/* Day Shift */}
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Day Shift</p>
                          <p className="text-xs text-muted-foreground">12:00 PM - 5:00 PM</p>
                        </div>
                      </div>
                      <Switch
                        checked={(teacher as any).shifts?.includes('day') || false}
                        onCheckedChange={(checked) => handleShiftToggle('day', checked)}
                        disabled={savingShift}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    {/* Current Assignment Summary */}
                    <div className="pt-2 border-t">
                      <Label className="text-xs text-muted-foreground">Currently Assigned</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(teacher as any).shifts && (teacher as any).shifts.length > 0 ? (
                          (teacher as any).shifts.map((shift: string) => (
                            <Badge key={shift} variant="default" className="capitalize">
                              {shift}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No shifts assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Attendance Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Average Class Attendance</Label>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">85%</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all classes</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Classes Conducted</Label>
                    <BookOpen className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">124</p>
                  <p className="text-xs text-muted-foreground mt-1">This semester</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Student Satisfaction</Label>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold">4.5/5</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Access Control & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Account Status</Label>
                  <div className="flex items-center gap-2">
                    {teacher.employmentStatus === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <p className="font-medium capitalize">{teacher.employmentStatus}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">User Role</Label>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">Teacher</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Account Created</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">
                      {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Last Updated</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">
                      {teacher.updatedAt ? new Date(teacher.updatedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">System Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Mark Attendance</span>
                    <Badge variant="default">Granted</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">View Student Records</span>
                    <Badge variant="default">Granted</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Submit Marks</span>
                    <Badge variant="default">Granted</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Manage Class Routine</span>
                    <Badge variant="secondary">Limited</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Information Tab */}
        <TabsContent value="job">
          <div className="grid gap-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Joining Date</Label>
                  <p className="font-medium">
                    {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Years of Service</Label>
                  <p className="font-medium">
                    {teacher.joiningDate 
                      ? Math.floor((new Date().getTime() - new Date(teacher.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                      : 0} years
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Employment Type</Label>
                  <p className="font-medium">{(teacher as any).employmentType || 'Full-time'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Contract Status</Label>
                  <Badge variant={teacher.employmentStatus === 'active' ? 'default' : 'secondary'}>
                    {(teacher as any).contractStatus || 'Permanent'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Qualifications & Specializations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Qualifications</Label>
                  {teacher.qualifications && teacher.qualifications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacher.qualifications.map((qual, index) => (
                        <Badge key={index} variant="secondary">{qual}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No qualifications listed</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Specializations</Label>
                  {teacher.specializations && teacher.specializations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacher.specializations.map((spec, index) => (
                        <Badge key={index} variant="outline">{spec}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specializations listed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editField}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editField === 'department' ? (
              <div>
                <Label>Select Department</Label>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Value</Label>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={`Enter ${editField}`}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
