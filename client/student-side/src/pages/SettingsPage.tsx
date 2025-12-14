import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings, User, Edit, Save, X, Mail, Phone, MapPin, 
  Building, GraduationCap, Loader2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { studentService, type Student } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    fullNameEnglish: '',
    fullNameBangla: '',
    email: '',
    mobileStudent: '',
    guardianMobile: '',
    emergencyContact: '',
    presentAddress: {
      village: '',
      postOffice: '',
      upazila: '',
      district: '',
      division: ''
    },
    permanentAddress: {
      village: '',
      postOffice: '',
      upazila: '',
      district: '',
      division: ''
    }
  });

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'teacher' && user?.relatedProfileId) {
        fetchStudentProfile();
      } else if (user.role === 'teacher') {
        setLoading(false);
      } else {
        setError('User not authenticated or profile not found');
        setLoading(false);
      }
    }
  }, [authLoading, user?.relatedProfileId, user?.role]);

  const fetchStudentProfile = async () => {
    if (!user?.relatedProfileId) {
      setError('User not authenticated or student profile not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await studentService.getMe(user.relatedProfileId);
      setStudentData(data);
      
      // Initialize form data
      setFormData({
        fullNameEnglish: data.fullNameEnglish || '',
        fullNameBangla: data.fullNameBangla || '',
        email: data.email || '',
        mobileStudent: data.mobileStudent || '',
        guardianMobile: data.guardianMobile || '',
        emergencyContact: data.emergencyContact || '',
        presentAddress: {
          village: data.presentAddress?.village || '',
          postOffice: data.presentAddress?.postOffice || '',
          upazila: data.presentAddress?.upazila || '',
          district: data.presentAddress?.district || '',
          division: data.presentAddress?.division || ''
        },
        permanentAddress: {
          village: data.permanentAddress?.village || '',
          postOffice: data.permanentAddress?.postOffice || '',
          upazila: data.permanentAddress?.upazila || '',
          district: data.permanentAddress?.district || '',
          division: data.permanentAddress?.division || ''
        }
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load profile', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.relatedProfileId) return;

    try {
      setSaving(true);
      
      // Here you would typically call an update API
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
      
      // Refresh data
      await fetchStudentProfile();
    } catch (err) {
      toast.error('Failed to update profile', {
        description: getErrorMessage(err)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (studentData) {
      setFormData({
        fullNameEnglish: studentData.fullNameEnglish || '',
        fullNameBangla: studentData.fullNameBangla || '',
        email: studentData.email || '',
        mobileStudent: studentData.mobileStudent || '',
        guardianMobile: studentData.guardianMobile || '',
        emergencyContact: studentData.emergencyContact || '',
        presentAddress: {
          village: studentData.presentAddress?.village || '',
          postOffice: studentData.presentAddress?.postOffice || '',
          upazila: studentData.presentAddress?.upazila || '',
          district: studentData.presentAddress?.district || '',
          division: studentData.presentAddress?.division || ''
        },
        permanentAddress: {
          village: studentData.permanentAddress?.village || '',
          postOffice: studentData.permanentAddress?.postOffice || '',
          upazila: studentData.permanentAddress?.upazila || '',
          district: studentData.permanentAddress?.district || '',
          division: studentData.permanentAddress?.division || ''
        }
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Settings</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchStudentProfile}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === 'teacher';
  const displayName = isTeacher 
    ? (user?.name || 'Teacher')
    : (studentData?.fullNameEnglish || user?.name || 'Student');
  const displayDepartment = isTeacher
    ? (user?.department || 'N/A')
    : (studentData?.departmentName || 
      (typeof studentData?.department === 'object' ? studentData?.department?.name : studentData?.department) || 
      user?.department || 'N/A');
  const displaySemester = isTeacher ? null : (studentData?.semester || user?.semester || 1);
  const displayStudentId = isTeacher ? (user?.studentId || 'N/A') : (studentData?.currentRollNumber || user?.studentId || 'N/A');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and profile information</p>
      </motion.div>

      {/* Profile Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
      >
        <div className="h-24 gradient-hero relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
        </div>
        
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-2xl gradient-accent flex items-center justify-center text-3xl font-bold text-primary-foreground border-4 border-card shadow-xl">
              {displayName.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-display font-bold truncate">{displayName}</h2>
              <p className="text-muted-foreground truncate">
                {displayDepartment}{displaySemester ? ` • Semester ${displaySemester}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">ID: {displayStudentId}</p>
            </div>

            <Button 
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
              className="gap-2"
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Settings Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-6 shadow-card"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Information
          </h3>
          
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullNameEnglish">Full Name (English)</Label>
                {isEditing ? (
                  <Input
                    id="fullNameEnglish"
                    value={formData.fullNameEnglish}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullNameEnglish: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{formData.fullNameEnglish || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="fullNameBangla">Full Name (Bangla)</Label>
                {isEditing ? (
                  <Input
                    id="fullNameBangla"
                    value={formData.fullNameBangla}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullNameBangla: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{formData.fullNameBangla || 'N/A'}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {formData.email || 'N/A'}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mobileStudent">Mobile Number</Label>
                {isEditing ? (
                  <Input
                    id="mobileStudent"
                    value={formData.mobileStudent}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobileStudent: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {formData.mobileStudent || 'N/A'}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="guardianMobile">Guardian Mobile</Label>
                {isEditing ? (
                  <Input
                    id="guardianMobile"
                    value={formData.guardianMobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianMobile: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{formData.guardianMobile || 'N/A'}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              {isEditing ? (
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{formData.emergencyContact || 'N/A'}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Academic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-6 shadow-card"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Academic Information
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                {displayDepartment}
              </span>
            </div>
            
            {displaySemester && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Current Semester</span>
                <span className="font-medium">{displaySemester}{displaySemester === 1 ? 'st' : displaySemester === 2 ? 'nd' : displaySemester === 3 ? 'rd' : 'th'} Semester</span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Student ID</span>
              <span className="font-medium">{displayStudentId}</span>
            </div>
            
            {studentData?.session && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Session</span>
                <span className="font-medium">{studentData.session}</span>
              </div>
            )}
            
            {studentData?.shift && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Shift</span>
                <span className="font-medium">{studentData.shift}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Status</span>
              <span className={cn(
                "font-medium px-2 py-1 rounded-full text-xs",
                studentData?.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {studentData?.status || 'N/A'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Address Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-6 shadow-card lg:col-span-2"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Address Information
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Present Address */}
            <div>
              <h4 className="font-medium mb-3">Present Address</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="presentVillage">Village/Area</Label>
                  {isEditing ? (
                    <Input
                      id="presentVillage"
                      value={formData.presentAddress.village}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        presentAddress: { ...prev.presentAddress, village: e.target.value }
                      }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{formData.presentAddress.village || 'N/A'}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="presentPostOffice">Post Office</Label>
                    {isEditing ? (
                      <Input
                        id="presentPostOffice"
                        value={formData.presentAddress.postOffice}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          presentAddress: { ...prev.presentAddress, postOffice: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.presentAddress.postOffice || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="presentUpazila">Upazila</Label>
                    {isEditing ? (
                      <Input
                        id="presentUpazila"
                        value={formData.presentAddress.upazila}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          presentAddress: { ...prev.presentAddress, upazila: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.presentAddress.upazila || 'N/A'}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="presentDistrict">District</Label>
                    {isEditing ? (
                      <Input
                        id="presentDistrict"
                        value={formData.presentAddress.district}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          presentAddress: { ...prev.presentAddress, district: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.presentAddress.district || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="presentDivision">Division</Label>
                    {isEditing ? (
                      <Input
                        id="presentDivision"
                        value={formData.presentAddress.division}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          presentAddress: { ...prev.presentAddress, division: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.presentAddress.division || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Permanent Address */}
            <div>
              <h4 className="font-medium mb-3">Permanent Address</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="permanentVillage">Village/Area</Label>
                  {isEditing ? (
                    <Input
                      id="permanentVillage"
                      value={formData.permanentAddress.village}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        permanentAddress: { ...prev.permanentAddress, village: e.target.value }
                      }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{formData.permanentAddress.village || 'N/A'}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="permanentPostOffice">Post Office</Label>
                    {isEditing ? (
                      <Input
                        id="permanentPostOffice"
                        value={formData.permanentAddress.postOffice}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          permanentAddress: { ...prev.permanentAddress, postOffice: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.permanentAddress.postOffice || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permanentUpazila">Upazila</Label>
                    {isEditing ? (
                      <Input
                        id="permanentUpazila"
                        value={formData.permanentAddress.upazila}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          permanentAddress: { ...prev.permanentAddress, upazila: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.permanentAddress.upazila || 'N/A'}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="permanentDistrict">District</Label>
                    {isEditing ? (
                      <Input
                        id="permanentDistrict"
                        value={formData.permanentAddress.district}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          permanentAddress: { ...prev.permanentAddress, district: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.permanentAddress.district || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permanentDivision">Division</Label>
                    {isEditing ? (
                      <Input
                        id="permanentDivision"
                        value={formData.permanentAddress.division}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          permanentAddress: { ...prev.permanentAddress, division: e.target.value }
                        }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{formData.permanentAddress.division || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save Button */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-3"
        >
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}