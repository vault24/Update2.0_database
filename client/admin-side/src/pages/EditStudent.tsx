import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { studentService, Student, StudentUpdateData } from '@/services/studentService';
import departmentService, { Department } from '@/services/departmentService';
import { getErrorMessage } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch student and departments in parallel
        const [studentData, deptResponse] = await Promise.all([
          studentService.getStudent(id),
          departmentService.getDepartments()
        ]);

        setStudent(studentData);
        setDepartments(deptResponse.results || []);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleInputChange = (field: keyof Student, value: any) => {
    if (!student) return;
    setStudent({ ...student, [field]: value });
  };

  const handleAddressChange = (type: 'presentAddress' | 'permanentAddress', field: string, value: string) => {
    if (!student) return;
    setStudent({
      ...student,
      [type]: {
        ...student[type],
        [field]: value
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !id) return;

    setSaving(true);

    try {
      // Validate required fields
      if (!student.fullNameEnglish || !student.mobileStudent || !student.guardianMobile) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }

      // Prepare update data - ONLY include fields that backend accepts
      const updateData: StudentUpdateData = {
        // Personal Information
        fullNameEnglish: student.fullNameEnglish,
        fullNameBangla: student.fullNameBangla,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        religion: student.religion,
        bloodGroup: student.bloodGroup,

        // Contact Information
        mobileStudent: student.mobileStudent,
        guardianMobile: student.guardianMobile,
        email: student.email,
        emergencyContact: student.emergencyContact,
        presentAddress: student.presentAddress,
        permanentAddress: student.permanentAddress,

        // Educational Background (from previous institution)
        highestExam: student.highestExam,
        board: student.board,
        group: student.group,
        rollNumber: student.rollNumber,
        registrationNumber: student.registrationNumber,
        passingYear: student.passingYear,
        gpa: student.gpa && !isNaN(Number(student.gpa)) && Number(student.gpa) >= 0 && Number(student.gpa) <= 5 ? Number(student.gpa) : 0,
        institutionName: student.institutionName,

        // Current Academic Information
        currentRollNumber: student.currentRollNumber,
        currentRegistrationNumber: student.currentRegistrationNumber,
        semester: student.semester,
        department: typeof student.department === 'string' ? student.department : student.department.id,
        session: student.session,
        shift: student.shift,
        currentGroup: student.currentGroup,
        status: student.status,
        
        // Required backend fields
        fatherNID: (student as any).fatherNID || '',
        motherNID: (student as any).motherNID || '',
        birthCertificateNo: (student as any).birthCertificateNo || '',
        nidNumber: (student as any).nidNumber || '',
        maritalStatus: (student as any).maritalStatus || '',
        enrollmentDate: (student as any).enrollmentDate || student.createdAt.split('T')[0],
      };


      console.log('Sending update data:', updateData);
      await studentService.updateStudent(id, updateData);

      toast({
        title: 'Success',
        description: 'Student updated successfully!'
      });

      navigate(`/students/${id}`);
    } catch (err) {
      console.error('Update error:', err);
      const errorMessage = getErrorMessage(err);
      
      // Show detailed error if available
      if (typeof err === 'object' && err !== null && 'field_errors' in err) {
        const fieldErrors = (err as any).field_errors;
        console.error('Field errors:', fieldErrors);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading student information..." />;
  }

  if (error || !student) {
    return <ErrorState error={error || "Student not found"} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Student Information</h1>
          <p className="text-muted-foreground">Update student details and academic records</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name (Bangla) *</Label>
                  <Input
                    value={student.fullNameBangla}
                    onChange={(e) => handleInputChange('fullNameBangla', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name (English) *</Label>
                  <Input
                    value={student.fullNameEnglish}
                    onChange={(e) => handleInputChange('fullNameEnglish', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Father's Name *</Label>
                  <Input
                    value={student.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Name *</Label>
                  <Input
                    value={student.motherName}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={student.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={student.gender} onValueChange={(v) => handleInputChange('gender', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input
                    value={student.religion}
                    onChange={(e) => handleInputChange('religion', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={student.bloodGroup} onValueChange={(v) => handleInputChange('bloodGroup', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nationality *</Label>
                  <Input
                    value={student.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobile No (Student) *</Label>
                  <Input
                    type="tel"
                    value={student.mobileStudent}
                    onChange={(e) => handleInputChange('mobileStudent', e.target.value)}
                    maxLength={11}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guardian Mobile *</Label>
                  <Input
                    type="tel"
                    value={student.guardianMobile}
                    onChange={(e) => handleInputChange('guardianMobile', e.target.value)}
                    maxLength={11}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={student.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact *</Label>
                  <Input
                    value={student.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Present Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Present Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Division *</Label>
                  <Input
                    value={student.presentAddress.division}
                    onChange={(e) => handleAddressChange('presentAddress', 'division', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Input
                    value={student.presentAddress.district}
                    onChange={(e) => handleAddressChange('presentAddress', 'district', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upazila *</Label>
                  <Input
                    value={student.presentAddress.upazila}
                    onChange={(e) => handleAddressChange('presentAddress', 'upazila', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Post Office *</Label>
                  <Input
                    value={student.presentAddress.postOffice}
                    onChange={(e) => handleAddressChange('presentAddress', 'postOffice', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Village *</Label>
                  <Input
                    value={student.presentAddress.village}
                    onChange={(e) => handleAddressChange('presentAddress', 'village', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Permanent Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Permanent Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Division *</Label>
                  <Input
                    value={student.permanentAddress.division}
                    onChange={(e) => handleAddressChange('permanentAddress', 'division', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Input
                    value={student.permanentAddress.district}
                    onChange={(e) => handleAddressChange('permanentAddress', 'district', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upazila *</Label>
                  <Input
                    value={student.permanentAddress.upazila}
                    onChange={(e) => handleAddressChange('permanentAddress', 'upazila', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Post Office *</Label>
                  <Input
                    value={student.permanentAddress.postOffice}
                    onChange={(e) => handleAddressChange('permanentAddress', 'postOffice', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Village *</Label>
                  <Input
                    value={student.permanentAddress.village}
                    onChange={(e) => handleAddressChange('permanentAddress', 'village', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Educational Background */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Educational Background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Highest Exam</Label>
                  <Input
                    value={student.highestExam || ''}
                    onChange={(e) => handleInputChange('highestExam', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Board</Label>
                  <Input
                    value={student.board || ''}
                    onChange={(e) => handleInputChange('board', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Input
                    value={student.group || ''}
                    onChange={(e) => handleInputChange('group', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input
                    value={student.rollNumber || ''}
                    onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={student.registrationNumber || ''}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passing Year</Label>
                  <Input
                    type="number"
                    value={student.passingYear || ''}
                    onChange={(e) => handleInputChange('passingYear', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={student.gpa || ''}
                    onChange={(e) => handleInputChange('gpa', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution Name</Label>
                  <Input
                    value={student.institutionName || ''}
                    onChange={(e) => handleInputChange('institutionName', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Academic Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Current Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Current Roll Number *</Label>
                  <Input
                    value={student.currentRollNumber}
                    onChange={(e) => handleInputChange('currentRollNumber', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Registration Number *</Label>
                  <Input
                    value={student.currentRegistrationNumber}
                    onChange={(e) => handleInputChange('currentRegistrationNumber', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Semester *</Label>
                  <Select value={student.semester.toString()} onValueChange={(v) => handleInputChange('semester', parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <SelectItem key={s} value={s.toString()}>{s}th Semester</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={typeof student.department === 'string' ? student.department : student.department.id}
                    onValueChange={(v) => handleInputChange('department', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session *</Label>
                  <Input
                    value={student.session}
                    onChange={(e) => handleInputChange('session', e.target.value)}
                    placeholder="e.g., 2023-2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shift *</Label>
                  <Select value={student.shift} onValueChange={(v) => handleInputChange('shift', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Input
                    value={student.currentGroup || ''}
                    onChange={(e) => handleInputChange('currentGroup', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={student.status} onValueChange={(v) => handleInputChange('status', v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Form Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="gradient-primary text-primary-foreground"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Updating...' : 'Update Student'}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
