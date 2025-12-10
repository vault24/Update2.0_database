import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, MapPin, GraduationCap, BookOpen, Upload, CheckCircle, 
  ChevronRight, ChevronLeft, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const steps = [
  { id: 1, title: 'Personal Information', icon: User },
  { id: 2, title: 'Contact & Address', icon: MapPin },
  { id: 3, title: 'Educational Background', icon: GraduationCap },
  { id: 4, title: 'Academic Information', icon: BookOpen },
  { id: 5, title: 'Documents Upload', icon: Upload },
  { id: 6, title: 'Review & Submit', icon: CheckCircle },
];

const departments = ['Computer Technology', 'Electrical Technology', 'Civil Technology', 'Mechanical Technology', 'Electronics Technology', 'Power Technology'];
const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const shifts = ['Morning', 'Day', 'Evening'];
const sessions = ['2024-2025', '2023-2024', '2022-2023', '2021-2022', '2020-2021'];
const statuses = ['Active', 'Discontinued', 'Alumni'];
const genders = ['Male', 'Female', 'Other'];
const boards = ['Dhaka', 'Rajshahi', 'Comilla', 'Chittagong', 'Jessore', 'Barisal', 'Sylhet', 'Dinajpur'];
const groups = ['Science', 'Commerce', 'Arts', 'Vocational'];
const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
const divisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'];

export default function AddStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    // Personal Info
    fullNameBangla: '',
    fullNameEnglish: '',
    fatherName: '',
    fatherNID: '',
    motherName: '',
    motherNID: '',
    dateOfBirth: '',
    gender: '',
    religion: '',
    bloodGroup: '',
    nid: '',
    birthCertificate: '',
    maritalStatus: '',
    
    // Contact & Address
    studentMobile: '',
    guardianMobile: '',
    email: '',
    emergencyContact: '',
    presentAddress: '',
    presentDivision: '',
    presentDistrict: '',
    presentUpazila: '',
    presentPoliceStation: '',
    presentPostOffice: '',
    presentMunicipalityUnion: '',
    presentVillageNeighborhood: '',
    presentWard: '',
    permanentAddress: '',
    permanentDivision: '',
    permanentDistrict: '',
    permanentUpazila: '',
    permanentPoliceStation: '',
    permanentPostOffice: '',
    permanentMunicipalityUnion: '',
    permanentVillageNeighborhood: '',
    permanentWard: '',
    sameAsPresent: false,
    
    // Education
    sscBoard: '',
    sscRoll: '',
    sscYear: '',
    sscGPA: '',
    sscGroup: '',
    sscInstitution: '',
    
    // Academic
    rollNumber: '',
    registrationNumber: '',
    department: '',
    shift: '',
    session: '',
    semester: '',
    status: 'Active',
    group: '',
    
    // Documents
    passportPhoto: null as File | null,
    sscMarksheet: null as File | null,
    sscCertificate: null as File | null,
    birthCertificateDoc: null as File | null,
    studentNIDCopy: null as File | null,
    fatherNIDFront: null as File | null,
    fatherNIDBack: null as File | null,
    motherNIDFront: null as File | null,
    motherNIDBack: null as File | null,
    testimonial: null as File | null,
    medicalCertificate: null as File | null,
    quotaDocument: null as File | null,
    extraCertificates: null as File | null,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (!formData.fullNameEnglish || !formData.studentMobile || !formData.department) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitted(true);
    toast({
      title: 'Success',
      description: 'Student added successfully!'
    });
    
    setTimeout(() => {
      navigate('/students');
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center"
        >
          <CheckCircle className="w-12 h-12 text-success" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Student Added Successfully!</h2>
        <p className="text-muted-foreground mb-6">The student has been registered in the system.</p>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Student Name</p>
          <p className="text-2xl font-bold text-primary">{formData.fullNameEnglish}</p>
        </div>

        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => navigate('/students')}>
          <Home className="w-4 h-4" />
          Go to Students List
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Tracker */}
      <div className="mb-8 overflow-x-auto pb-4">
        <div className="flex items-center min-w-max">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? 'gradient-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/10 text-primary border-2 border-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </motion.div>
                
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-colors ${
                    currentStep > step.id ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">Enter student's personal details</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name (Bangla)</Label>
                    <Input 
                      placeholder="সম্পূর্ণ নাম"
                      value={formData.fullNameBangla}
                      onChange={(e) => handleInputChange('fullNameBangla', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name (English) *</Label>
                    <Input 
                      placeholder="Full name"
                      value={formData.fullNameEnglish}
                      onChange={(e) => handleInputChange('fullNameEnglish', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Father's Name</Label>
                    <Input 
                      placeholder="Father's name"
                      value={formData.fatherName}
                      onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Father's NID</Label>
                    <Input 
                      placeholder="NID number"
                      value={formData.fatherNID}
                      onChange={(e) => handleInputChange('fatherNID', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mother's Name</Label>
                    <Input 
                      placeholder="Mother's name"
                      value={formData.motherName}
                      onChange={(e) => handleInputChange('motherName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mother's NID</Label>
                    <Input 
                      placeholder="NID number"
                      value={formData.motherNID}
                      onChange={(e) => handleInputChange('motherNID', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input 
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleInputChange('gender', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {genders.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Blood Group</Label>
                    <Select value={formData.bloodGroup} onValueChange={(v) => handleInputChange('bloodGroup', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NID Number</Label>
                    <Input 
                      placeholder="NID"
                      value={formData.nid}
                      onChange={(e) => handleInputChange('nid', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Birth Certificate No.</Label>
                    <Input 
                      placeholder="Certificate number"
                      value={formData.birthCertificate}
                      onChange={(e) => handleInputChange('birthCertificate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input 
                    placeholder="Religion"
                    value={formData.religion}
                    onChange={(e) => handleInputChange('religion', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={(v) => handleInputChange('maritalStatus', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatuses.map(ms => (
                        <SelectItem key={ms} value={ms}>{ms}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Contact & Address */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Contact & Address</h3>
                  <p className="text-sm text-muted-foreground">Enter contact and address details</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Student Mobile *</Label>
                    <Input 
                      placeholder="01XXXXXXXXX"
                      value={formData.studentMobile}
                      onChange={(e) => handleInputChange('studentMobile', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Guardian Mobile *</Label>
                    <Input 
                      placeholder="01XXXXXXXXX"
                      value={formData.guardianMobile}
                      onChange={(e) => handleInputChange('guardianMobile', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input 
                    placeholder="Contact number"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  />
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="font-medium mb-4">Present Address</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea 
                        placeholder="Full address"
                        value={formData.presentAddress}
                        onChange={(e) => handleInputChange('presentAddress', e.target.value)}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Division</Label>
                        <Select value={formData.presentDivision} onValueChange={(v) => handleInputChange('presentDivision', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>District</Label>
                        <Input 
                          placeholder="District"
                          value={formData.presentDistrict}
                          onChange={(e) => handleInputChange('presentDistrict', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Upazila</Label>
                        <Input 
                          placeholder="Upazila"
                          value={formData.presentUpazila}
                          onChange={(e) => handleInputChange('presentUpazila', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Police Station</Label>
                        <Input 
                          placeholder="Police Station"
                          value={formData.presentPoliceStation}
                          onChange={(e) => handleInputChange('presentPoliceStation', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Post Office</Label>
                        <Input 
                          placeholder="Post Office"
                          value={formData.presentPostOffice}
                          onChange={(e) => handleInputChange('presentPostOffice', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Municipality/Union</Label>
                        <Input 
                          placeholder="Municipality/Union"
                          value={formData.presentMunicipalityUnion}
                          onChange={(e) => handleInputChange('presentMunicipalityUnion', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Village/Neighborhood</Label>
                        <Input 
                          placeholder="Village/Neighborhood"
                          value={formData.presentVillageNeighborhood}
                          onChange={(e) => handleInputChange('presentVillageNeighborhood', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ward</Label>
                        <Input 
                          placeholder="Ward"
                          value={formData.presentWard}
                          onChange={(e) => handleInputChange('presentWard', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Permanent Address</h4>
                    <label className="flex items-center gap-2 text-sm">
                      <input 
                        type="checkbox"
                        checked={formData.sameAsPresent}
                        onChange={(e) => handleInputChange('sameAsPresent', e.target.checked)}
                        className="rounded"
                      />
                      Same as present
                    </label>
                  </div>
                  {!formData.sameAsPresent && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea 
                          placeholder="Full address"
                          value={formData.permanentAddress}
                          onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Division</Label>
                          <Select value={formData.permanentDivision} onValueChange={(v) => handleInputChange('permanentDivision', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {divisions.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>District</Label>
                          <Input 
                            placeholder="District"
                            value={formData.permanentDistrict}
                            onChange={(e) => handleInputChange('permanentDistrict', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Upazila</Label>
                          <Input 
                            placeholder="Upazila"
                            value={formData.permanentUpazila}
                            onChange={(e) => handleInputChange('permanentUpazila', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Police Station</Label>
                          <Input 
                            placeholder="Police Station"
                            value={formData.permanentPoliceStation}
                            onChange={(e) => handleInputChange('permanentPoliceStation', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Post Office</Label>
                          <Input 
                            placeholder="Post Office"
                            value={formData.permanentPostOffice}
                            onChange={(e) => handleInputChange('permanentPostOffice', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Municipality/Union</Label>
                          <Input 
                            placeholder="Municipality/Union"
                            value={formData.permanentMunicipalityUnion}
                            onChange={(e) => handleInputChange('permanentMunicipalityUnion', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Village/Neighborhood</Label>
                          <Input 
                            placeholder="Village/Neighborhood"
                            value={formData.permanentVillageNeighborhood}
                            onChange={(e) => handleInputChange('permanentVillageNeighborhood', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ward</Label>
                          <Input 
                            placeholder="Ward"
                            value={formData.permanentWard}
                            onChange={(e) => handleInputChange('permanentWard', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Educational Background */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Educational Background</h3>
                  <p className="text-sm text-muted-foreground">Enter SSC/equivalent exam details</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Board</Label>
                    <Select value={formData.sscBoard} onValueChange={(v) => handleInputChange('sscBoard', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {boards.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input 
                      placeholder="Roll"
                      value={formData.sscRoll}
                      onChange={(e) => handleInputChange('sscRoll', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Passing Year</Label>
                    <Select value={formData.sscYear} onValueChange={(v) => handleInputChange('sscYear', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2023, 2022, 2021, 2020, 2019].map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>GPA</Label>
                    <Input 
                      placeholder="e.g., 4.50"
                      value={formData.sscGPA}
                      onChange={(e) => handleInputChange('sscGPA', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Group</Label>
                    <Select value={formData.sscGroup} onValueChange={(v) => handleInputChange('sscGroup', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Institution Name</Label>
                  <Input 
                    placeholder="School/Institution"
                    value={formData.sscInstitution}
                    onChange={(e) => handleInputChange('sscInstitution', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Academic Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Academic Information</h3>
                  <p className="text-sm text-muted-foreground">Select department and session details</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input 
                      placeholder="Roll"
                      value={formData.rollNumber}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input 
                      placeholder="REG-XXXX-XXX"
                      value={formData.registrationNumber}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Group (Optional)</Label>
                  <Select value={formData.group} onValueChange={(v) => handleInputChange('group', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select value={formData.department} onValueChange={(v) => handleInputChange('department', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Semester *</Label>
                    <Select value={formData.semester} onValueChange={(v) => handleInputChange('semester', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {semesters.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Shift *</Label>
                    <Select value={formData.shift} onValueChange={(v) => handleInputChange('shift', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Session *</Label>
                    <Select value={formData.session} onValueChange={(v) => handleInputChange('session', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Documents Upload */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Documents Upload</h3>
                  <p className="text-sm text-muted-foreground">Upload required documents (PDF, JPG, PNG)</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Passport-size Photo *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="passportPhoto"
                        accept="image/*"
                        onChange={(e) => handleInputChange('passportPhoto', e.target.files?.[0])}
                      />
                      <label htmlFor="passportPhoto" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">300x300px, max 500KB</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>SSC Marksheet *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="sscMarksheet"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('sscMarksheet', e.target.files?.[0])}
                      />
                      <label htmlFor="sscMarksheet" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>SSC Certificate (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="sscCertificate"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('sscCertificate', e.target.files?.[0])}
                      />
                      <label htmlFor="sscCertificate" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Birth Certificate *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="birthCertificateDoc"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('birthCertificateDoc', e.target.files?.[0])}
                      />
                      <label htmlFor="birthCertificateDoc" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Student NID Copy (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="studentNIDCopy"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('studentNIDCopy', e.target.files?.[0])}
                      />
                      <label htmlFor="studentNIDCopy" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Father's NID (Front) *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="fatherNIDFront"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('fatherNIDFront', e.target.files?.[0])}
                      />
                      <label htmlFor="fatherNIDFront" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Father's NID (Back) *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="fatherNIDBack"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('fatherNIDBack', e.target.files?.[0])}
                      />
                      <label htmlFor="fatherNIDBack" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mother's NID (Front) *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="motherNIDFront"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('motherNIDFront', e.target.files?.[0])}
                      />
                      <label htmlFor="motherNIDFront" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mother's NID (Back) *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="motherNIDBack"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('motherNIDBack', e.target.files?.[0])}
                      />
                      <label htmlFor="motherNIDBack" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Testimonial (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="testimonial"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('testimonial', e.target.files?.[0])}
                      />
                      <label htmlFor="testimonial" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Medical Certificate (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="medicalCertificate"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('medicalCertificate', e.target.files?.[0])}
                      />
                      <label htmlFor="medicalCertificate" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quota Document (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="quotaDocument"
                        accept=".pdf,image/*"
                        onChange={(e) => handleInputChange('quotaDocument', e.target.files?.[0])}
                      />
                      <label htmlFor="quotaDocument" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Extra Certificates (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        id="extraCertificates"
                        accept=".pdf,image/*"
                        multiple
                        onChange={(e) => handleInputChange('extraCertificates', e.target.files?.[0])}
                      />
                      <label htmlFor="extraCertificates" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or Image</p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Review & Submit */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Review & Submit</h3>
                  <p className="text-sm text-muted-foreground">Review all information before submitting</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Personal Information</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Name:</span> {formData.fullNameEnglish}</p>
                      <p><span className="text-muted-foreground">DOB:</span> {formData.dateOfBirth}</p>
                      <p><span className="text-muted-foreground">Gender:</span> {formData.gender}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Contact Information</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Mobile:</span> {formData.studentMobile}</p>
                      <p><span className="text-muted-foreground">Email:</span> {formData.email}</p>
                      <p><span className="text-muted-foreground">Guardian:</span> {formData.guardianMobile}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Academic Information</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Roll:</span> {formData.rollNumber}</p>
                      <p><span className="text-muted-foreground">Department:</span> {formData.department}</p>
                      <p><span className="text-muted-foreground">Semester:</span> {formData.semester}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Session Details</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Session:</span> {formData.session}</p>
                      <p><span className="text-muted-foreground">Shift:</span> {formData.shift}</p>
                      <p><span className="text-muted-foreground">Status:</span> {formData.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length}
        </div>

        {currentStep < 6 ? (
          <Button
            type="button"
            className="gradient-primary text-primary-foreground gap-2"
            onClick={handleNext}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="gradient-primary text-primary-foreground gap-2"
            onClick={handleSubmit}
          >
            <CheckCircle className="w-4 h-4" />
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}
