import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User, MapPin, GraduationCap, BookOpen, Upload, CheckCircle, IdCard, Heart,
  ChevronRight, ChevronLeft, Home, Loader2, Phone, Building2, Home as HomeIcon,
  ScrollText, ShieldCheck, X, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { studentService } from '@/services/studentService';
import departmentService, { Department } from '@/services/departmentService';
import { documentService } from '@/services/documentService';
import {
  steps, divisions, getDistricts, genderOptions, bloodGroups, religionOptions,
  maritalStatuses, sscBoards, sscGroups, shiftOptions, academicGroups,
  semesterOptions, semesterToNumber, admissionTypeOptions, statusOptions,
  getPassingYears, getSessions,
} from '@/components/add-student/config';
import { TextField, SelectField, TextareaField, SectionCard, StepIntro } from '@/components/add-student/fields';

const passingYears = getPassingYears(20);
const sessionList = getSessions(8);
const divisionOptions = divisions.map((d) => ({ value: d.toLowerCase(), label: d }));

const initialForm = {
  // Personal
  fullNameBangla: '', fullNameEnglish: '', fatherName: '', fatherNID: '',
  motherName: '', motherNID: '', dateOfBirth: '', gender: '', religion: '',
  bloodGroup: '', nid: '', birthCertificate: '', nationality: 'Bangladeshi', maritalStatus: '',
  // Contact & address
  studentMobile: '', guardianMobile: '', email: '',
  presentAddress: '', presentDivision: '', presentDistrict: '', presentUpazila: '',
  presentPoliceStation: '', presentPostOffice: '', presentMunicipalityUnion: '',
  presentVillageNeighborhood: '', presentWard: '',
  permanentAddress: '', permanentDivision: '', permanentDistrict: '', permanentUpazila: '',
  permanentPoliceStation: '', permanentPostOffice: '', permanentMunicipalityUnion: '',
  permanentVillageNeighborhood: '', permanentWard: '', sameAsPresent: false,
  // Education
  sscBoard: '', sscRoll: '', sscYear: '', sscGPA: '', sscGroup: '', sscInstitution: '',
  // Academic
  department: '', shift: '', session: '', semester: '', admissionType: '',
  academicGroup: '', status: 'active', enrollmentDate: new Date().toISOString().slice(0, 10),
  // Documents
  passportPhoto: null as File | null, sscMarksheet: null as File | null,
  sscCertificate: null as File | null, birthCertificateDoc: null as File | null,
  studentNIDCopy: null as File | null, fatherNIDFront: null as File | null,
  fatherNIDBack: null as File | null, motherNIDFront: null as File | null,
  motherNIDBack: null as File | null, testimonial: null as File | null,
  medicalCertificate: null as File | null, quotaDocument: null as File | null,
  extraCertificates: null as File | null,
};

type FormState = typeof initialForm;
type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^01\d{9}$/;
const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Document field → backend document category + UI label.
const DOC_FIELDS: { key: keyof FormState; label: string; category: string; required?: boolean }[] = [
  { key: 'passportPhoto', label: 'Passport-size Photo', category: 'Photo', required: true },
  { key: 'sscMarksheet', label: 'SSC Marksheet', category: 'Marksheet', required: true },
  { key: 'sscCertificate', label: 'SSC Certificate', category: 'Certificate' },
  { key: 'birthCertificateDoc', label: 'Birth Certificate', category: 'Birth Certificate', required: true },
  { key: 'studentNIDCopy', label: 'Student NID Copy', category: 'NID' },
  { key: 'fatherNIDFront', label: "Father's NID (Front)", category: 'NID', required: true },
  { key: 'fatherNIDBack', label: "Father's NID (Back)", category: 'NID', required: true },
  { key: 'motherNIDFront', label: "Mother's NID (Front)", category: 'NID', required: true },
  { key: 'motherNIDBack', label: "Mother's NID (Back)", category: 'NID', required: true },
  { key: 'testimonial', label: 'Testimonial', category: 'Testimonial' },
  { key: 'medicalCertificate', label: 'Medical Certificate', category: 'Medical Certificate' },
  { key: 'quotaDocument', label: 'Quota Document', category: 'Quota Document' },
  { key: 'extraCertificates', label: 'Extra Certificates', category: 'Other' },
];

function getStepErrors(step: number, f: FormState): Errors {
  const e: Errors = {};
  const req = (k: keyof FormState, msg: string) => { if (isEmpty(f[k])) e[k] = msg; };
  if (step === 1) {
    req('fullNameBangla', 'Full name (Bangla) is required');
    req('fullNameEnglish', 'Full name (English) is required');
    req('fatherName', "Father's name is required");
    req('fatherNID', "Father's NID is required");
    req('motherName', "Mother's name is required");
    req('motherNID', "Mother's NID is required");
    req('dateOfBirth', 'Date of birth is required');
    req('gender', 'Gender is required');
    req('birthCertificate', 'Birth certificate number is required');
    req('religion', 'Religion is required');
    req('maritalStatus', 'Marital status is required');
  } else if (step === 2) {
    req('studentMobile', 'Mobile number is required');
    req('email', 'Email is required');
    req('guardianMobile', "Guardian's mobile is required");
    req('presentAddress', 'Present address is required');
    req('presentDivision', 'Division is required');
    req('presentDistrict', 'District is required');
    req('presentUpazila', 'Upazila is required');
    req('presentPoliceStation', 'Police station is required');
    req('presentPostOffice', 'Post office is required');
    req('presentWard', 'Ward number is required');
    if (!e.email && f.email && !EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (!e.studentMobile && f.studentMobile && !MOBILE_RE.test(f.studentMobile)) e.studentMobile = 'Enter an 11-digit number (01XXXXXXXXX)';
    if (!e.guardianMobile && f.guardianMobile && !MOBILE_RE.test(f.guardianMobile)) e.guardianMobile = 'Enter an 11-digit number (01XXXXXXXXX)';
  } else if (step === 3) {
    req('sscBoard', 'Board is required');
    req('sscRoll', 'Roll number is required');
    req('sscYear', 'Passing year is required');
    req('sscGPA', 'GPA is required');
    req('sscGroup', 'Group is required');
    req('sscInstitution', 'Institution name is required');
    if (!e.sscGPA && f.sscGPA) {
      const gpa = parseFloat(f.sscGPA);
      if (Number.isNaN(gpa) || gpa < 0 || gpa > 5) e.sscGPA = 'GPA must be between 0.00 and 5.00';
    }
  } else if (step === 4) {
    req('department', 'Department is required');
    req('shift', 'Shift is required');
    req('session', 'Session is required');
    req('semester', 'Semester is required');
    req('admissionType', 'Admission type is required');
    req('status', 'Status is required');
    req('enrollmentDate', 'Enrollment date is required');
  } else if (step === 5) {
    DOC_FIELDS.filter((d) => d.required).forEach((d) => {
      if (!f[d.key]) e[d.key] = `${d.label} is required`;
    });
  }
  return e;
}

/** Address block (present/permanent) with dependent District dropdown. */
function AddressBlock({
  prefix, form, set, errors, required,
}: {
  prefix: 'present' | 'permanent';
  form: FormState;
  set: (k: keyof FormState, v: any) => void;
  errors: Errors;
  required: boolean;
}) {
  const k = (s: string) => `${prefix}${s}` as keyof FormState;
  const val = (s: string) => (form[k(s)] as string) || '';
  const err = (s: string) => errors[k(s)];
  const division = val('Division');
  const districts = getDistricts(division);

  return (
    <div className="space-y-4">
      <TextareaField
        label="Full Address" required={required} rows={2} placeholder="House / road / area"
        value={val('Address')} onChange={(v) => set(k('Address'), v)} error={err('Address')}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Division" required={required} placeholder="Select division"
          value={division} onChange={(v) => set(k('Division'), v)} options={divisionOptions} error={err('Division')}
        />
        <SelectField
          label="District" required={required}
          placeholder={division ? 'Select district' : 'Select a division first'}
          value={val('District')} onChange={(v) => set(k('District'), v)} options={districts}
          disabled={!division} helper={!division ? 'Choose a division to load its districts.' : undefined} error={err('District')}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Upazila / Thana" required={required} placeholder="Enter upazila" value={val('Upazila')} onChange={(v) => set(k('Upazila'), v)} error={err('Upazila')} />
        <TextField label="Police Station" required={required} placeholder="Enter police station" value={val('PoliceStation')} onChange={(v) => set(k('PoliceStation'), v)} error={err('PoliceStation')} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Post Office" required={required} placeholder="Enter post office" value={val('PostOffice')} onChange={(v) => set(k('PostOffice'), v)} error={err('PostOffice')} />
        <TextField label="Municipality / Union" placeholder="Enter municipality / union" value={val('MunicipalityUnion')} onChange={(v) => set(k('MunicipalityUnion'), v)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Village / Neighborhood" placeholder="Enter village / neighborhood" value={val('VillageNeighborhood')} onChange={(v) => set(k('VillageNeighborhood'), v)} />
        <TextField label="Ward Number" required={required} numeric placeholder="Enter ward number" value={val('Ward')} onChange={(v) => set(k('Ward'), v)} error={err('Ward')} />
      </div>
    </div>
  );
}

export default function AddStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<{ name: string; roll: string; registration: string } | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    departmentService.getDepartments({ page_size: 100 })
      .then((res) => setDepartments(res.results || []))
      .catch(() => setDepartments([]));
  }, []);

  const set = (field: keyof FormState, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value } as FormState;
      if (field === 'presentDivision') next.presentDistrict = '';
      if (field === 'permanentDivision') next.permanentDistrict = '';
      return next;
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const n = { ...prev }; delete n[field]; return n;
    });
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleNext = () => {
    const stepErrors = getStepErrors(currentStep, form);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      const count = Object.keys(stepErrors).length;
      toast({ title: `Please complete ${count} field${count > 1 ? 's' : ''}`, description: 'We highlighted what still needs attention.', variant: 'destructive' });
      scrollTop();
      return;
    }
    setErrors({});
    if (currentStep < 6) { setCurrentStep((s) => s + 1); scrollTop(); }
  };

  const handlePrev = () => { setErrors({}); if (currentStep > 1) { setCurrentStep((s) => s - 1); scrollTop(); } };

  const buildAddress = (prefix: 'present' | 'permanent') => {
    const g = (s: string) => (form[`${prefix}${s}` as keyof FormState] as string) || '';
    return {
      division: g('Division'), district: g('District'), upazila: g('Upazila'),
      postOffice: g('PostOffice'), policeStation: g('PoliceStation'),
      municipality: g('MunicipalityUnion'), village: g('VillageNeighborhood'),
      ward: g('Ward'), fullAddress: g('Address'),
    };
  };

  const handleSubmit = async () => {
    // Final validation across the required steps.
    for (const s of [1, 2, 3, 4, 5]) {
      const errs = getStepErrors(s, form);
      if (Object.keys(errs).length) {
        setErrors(errs);
        setCurrentStep(s);
        toast({ title: 'Incomplete application', description: 'Please complete the highlighted fields.', variant: 'destructive' });
        scrollTop();
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const presentAddress = buildAddress('present');
      const permanentAddress = form.sameAsPresent ? presentAddress : buildAddress('permanent');

      const payload: any = {
        fullNameBangla: form.fullNameBangla,
        fullNameEnglish: form.fullNameEnglish,
        fatherName: form.fatherName,
        fatherNID: form.fatherNID,
        motherName: form.motherName,
        motherNID: form.motherNID,
        dateOfBirth: form.dateOfBirth,
        birthCertificateNo: form.birthCertificate,
        nidNumber: form.nid,
        gender: form.gender,
        religion: form.religion,
        bloodGroup: form.bloodGroup,
        nationality: form.nationality || 'Bangladeshi',
        maritalStatus: form.maritalStatus,
        mobileStudent: form.studentMobile,
        guardianMobile: form.guardianMobile,
        email: form.email,
        emergencyContact: form.guardianMobile,
        presentAddress,
        permanentAddress,
        highestExam: 'SSC',
        board: form.sscBoard,
        group: form.sscGroup,
        rollNumber: form.sscRoll,
        registrationNumber: form.sscRoll,
        passingYear: parseInt(form.sscYear, 10),
        gpa: parseFloat(form.sscGPA),
        institutionName: form.sscInstitution,
        department: form.department,
        semester: semesterToNumber(form.semester),
        shift: form.shift,
        session: form.session,
        currentGroup: form.academicGroup || form.sscGroup || 'N/A',
        status: form.status,
        enrollmentDate: form.enrollmentDate,
      };

      const student: any = await studentService.createStudent(payload);
      const studentId = student.id;

      // Upload documents (best-effort — never block a successful enrolment).
      const docs = DOC_FIELDS.filter((d) => form[d.key] instanceof File);
      let docFailures = 0;
      for (const d of docs) {
        try {
          await documentService.uploadDocument({
            student: studentId,
            category: d.category as any,
            file: form[d.key] as File,
            source_type: 'manual',
            original_field_name: String(d.key),
          });
        } catch (err) {
          docFailures += 1;
          console.error(`Document upload failed for ${String(d.key)}:`, err);
        }
      }

      if (docFailures > 0) {
        toast({ title: 'Student added (some documents failed)', description: `${docFailures} document(s) could not be uploaded. You can add them later from the student's profile.` });
      } else {
        toast({ title: 'Student added successfully', description: 'The student has been enrolled.' });
      }

      setCreated({
        name: student.fullNameEnglish || form.fullNameEnglish,
        roll: student.currentRollNumber || '—',
        registration: student.currentRegistrationNumber || '—',
      });
    } catch (err: any) {
      const detail = err?.details || err?.error || err?.message || 'Please review the form and try again.';
      const fieldErrs = err && typeof err === 'object' ? err : null;
      // Surface first DRF field error if present.
      let description = typeof detail === 'string' ? detail : 'Please review the form and try again.';
      if (fieldErrs) {
        for (const key of Object.keys(fieldErrs)) {
          const v = (fieldErrs as any)[key];
          if (Array.isArray(v) && v.length) { description = `${key}: ${v[0]}`; break; }
        }
      }
      toast({ title: 'Failed to add student', description, variant: 'destructive' });
      console.error('Add student error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Success screen ─── */
  if (created) {
    const copy = (text: string) => { navigator.clipboard?.writeText(text); toast({ title: 'Copied', description: text }); };
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl py-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring' }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-10 w-10 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold">Student Enrolled Successfully</h2>
        <p className="mt-1 text-muted-foreground">{created.name} has been added to the system.</p>

        <div className="surface-card mt-6 space-y-3 rounded-2xl border border-border bg-card p-5 text-left shadow-card">
          {[
            { label: 'Roll Number', value: created.roll },
            { label: 'Registration Number', value: created.registration },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p>
                <p className="font-mono text-lg font-bold text-primary">{row.value}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copy(row.value)} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => { setCreated(null); setForm(initialForm); setCurrentStep(1); }} className="gap-2">
            <User className="h-4 w-4" /> Add Another
          </Button>
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => navigate('/students')}>
            <Home className="h-4 w-4" /> Go to Students List
          </Button>
        </div>
      </motion.div>
    );
  }

  const departmentOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));

  return (
    <div ref={topRef} className="mx-auto max-w-4xl scroll-mt-4">
      {/* Header + progress */}
      <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-card md:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold md:text-2xl">Add Student</h1>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length} · <span className="font-medium text-foreground">{steps[currentStep - 1].title}</span>
          </p>
        </div>
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;
            return (
              <div key={step.id} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div initial={false} animate={{ scale: isActive ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition-colors md:h-11 md:w-11',
                      isCompleted ? 'gradient-primary text-primary-foreground shadow-sm'
                        : isActive ? 'border-2 border-primary bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground')}>
                    {isCompleted ? <CheckCircle className="h-4 w-4 md:h-5 md:w-5" /> : <StepIcon className="h-4 w-4 md:h-5 md:w-5" />}
                  </motion.div>
                  <span className={cn('hidden text-[11px] font-medium sm:block', isActive ? 'text-primary' : 'text-muted-foreground')}>{step.shortTitle}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-1.5 h-1 flex-1 overflow-hidden rounded-full bg-border md:mx-2">
                    <motion.div className="h-full gradient-primary" initial={false} animate={{ width: isCompleted ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
            {/* Step 1 — Personal */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <StepIntro icon={User} title="Personal Information" description="The student's personal and family details." />
                <SectionCard icon={User} title="Name">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Full Name (Bangla)" required placeholder="সম্পূর্ণ নাম" value={form.fullNameBangla} onChange={(v) => set('fullNameBangla', v)} error={errors.fullNameBangla} />
                    <TextField label="Full Name (English)" required placeholder="Full name" value={form.fullNameEnglish} onChange={(v) => set('fullNameEnglish', v)} error={errors.fullNameEnglish} />
                  </div>
                </SectionCard>
                <SectionCard icon={Heart} title="Parents' Information">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Father's Name" required placeholder="Father's name" value={form.fatherName} onChange={(v) => set('fatherName', v)} error={errors.fatherName} />
                    <TextField label="Father's NID" required numeric placeholder="NID number" value={form.fatherNID} onChange={(v) => set('fatherNID', v)} error={errors.fatherNID} />
                    <TextField label="Mother's Name" required placeholder="Mother's name" value={form.motherName} onChange={(v) => set('motherName', v)} error={errors.motherName} />
                    <TextField label="Mother's NID" required numeric placeholder="NID number" value={form.motherNID} onChange={(v) => set('motherNID', v)} error={errors.motherNID} />
                  </div>
                </SectionCard>
                <SectionCard icon={IdCard} title="Identity Details">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <TextField label="Date of Birth" required type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} error={errors.dateOfBirth} />
                      <SelectField label="Gender" required placeholder="Select gender" value={form.gender} onChange={(v) => set('gender', v)} options={genderOptions} error={errors.gender} />
                      <SelectField label="Blood Group" placeholder="Select blood group" value={form.bloodGroup} onChange={(v) => set('bloodGroup', v)} options={bloodGroups} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label="NID Number" numeric placeholder="NID number" helper="Optional" value={form.nid} onChange={(v) => set('nid', v)} />
                      <TextField label="Birth Certificate No." required numeric placeholder="Certificate number" value={form.birthCertificate} onChange={(v) => set('birthCertificate', v)} error={errors.birthCertificate} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <SelectField label="Religion" required placeholder="Select religion" value={form.religion} onChange={(v) => set('religion', v)} options={religionOptions} error={errors.religion} />
                      <TextField label="Nationality" placeholder="Nationality" value={form.nationality} onChange={(v) => set('nationality', v)} />
                      <SelectField label="Marital Status" required placeholder="Select status" value={form.maritalStatus} onChange={(v) => set('maritalStatus', v)} options={maritalStatuses} error={errors.maritalStatus} />
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 2 — Contact & Address */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <StepIntro icon={MapPin} title="Contact & Address" description="Contact numbers and addresses." />
                <SectionCard icon={Phone} title="Contact Details">
                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Student Mobile" required numeric maxLength={11} placeholder="01XXXXXXXXX" value={form.studentMobile} onChange={(v) => set('studentMobile', v)} error={errors.studentMobile} />
                    <TextField label="Email Address" required type="email" placeholder="email@example.com" value={form.email} onChange={(v) => set('email', v)} error={errors.email} />
                    <TextField label="Guardian's Mobile" required numeric maxLength={11} placeholder="01XXXXXXXXX" value={form.guardianMobile} onChange={(v) => set('guardianMobile', v)} error={errors.guardianMobile} />
                  </div>
                </SectionCard>
                <SectionCard icon={MapPin} title="Present Address" description="Where the student currently lives.">
                  <AddressBlock prefix="present" form={form} set={set} errors={errors} required />
                </SectionCard>
                <SectionCard icon={HomeIcon} title="Permanent Address"
                  action={
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.sameAsPresent} onChange={(e) => set('sameAsPresent', e.target.checked)} />
                      <span className="text-muted-foreground">Same as present</span>
                    </label>
                  }>
                  {form.sameAsPresent ? (
                    <p className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                      The permanent address will be the same as the present address.
                    </p>
                  ) : (
                    <AddressBlock prefix="permanent" form={form} set={set} errors={errors} required={false} />
                  )}
                </SectionCard>
              </div>
            )}

            {/* Step 3 — Education */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <StepIntro icon={GraduationCap} title="Educational Background" description="SSC or equivalent exam details." />
                <SectionCard icon={ScrollText} title="SSC / Equivalent">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Board" required placeholder="Select board" value={form.sscBoard} onChange={(v) => set('sscBoard', v)} options={sscBoards} error={errors.sscBoard} />
                      <TextField label="Roll Number" required numeric placeholder="Roll" value={form.sscRoll} onChange={(v) => set('sscRoll', v)} error={errors.sscRoll} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <SelectField label="Passing Year" required placeholder="Select year" value={form.sscYear} onChange={(v) => set('sscYear', v)} options={passingYears} error={errors.sscYear} />
                      <TextField label="GPA" required placeholder="e.g. 4.50" inputMode="decimal" helper="Out of 5.00" value={form.sscGPA} onChange={(v) => set('sscGPA', v)} error={errors.sscGPA} />
                      <SelectField label="Group" required placeholder="Select group" value={form.sscGroup} onChange={(v) => set('sscGroup', v)} options={sscGroups} error={errors.sscGroup} />
                    </div>
                    <TextField label="Institution Name" required placeholder="School / Institution" value={form.sscInstitution} onChange={(v) => set('sscInstitution', v)} error={errors.sscInstitution} />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 4 — Academic */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <StepIntro icon={BookOpen} title="Academic Information" description="Programme, session and enrolment details." />
                <SectionCard icon={Building2} title="Programme">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField label="Department" required placeholder={departments.length ? 'Select department' : 'Loading…'} value={form.department} onChange={(v) => set('department', v)} options={departmentOptions} error={errors.department} />
                    <SelectField label="Shift" required placeholder="Select shift" value={form.shift} onChange={(v) => set('shift', v)} options={shiftOptions} error={errors.shift} />
                  </div>
                </SectionCard>
                <SectionCard icon={BookOpen} title="Session & Enrolment">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Session" required placeholder="Select session" value={form.session} onChange={(v) => set('session', v)} options={sessionList} error={errors.session} />
                      <SelectField label="Semester" required placeholder="Select semester" value={form.semester} onChange={(v) => set('semester', v)} options={semesterOptions} error={errors.semester} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Admission Type" required placeholder="Select admission type" value={form.admissionType} onChange={(v) => set('admissionType', v)} options={admissionTypeOptions} error={errors.admissionType} />
                      <SelectField label="Group" placeholder="Select group" helper="Optional" value={form.academicGroup} onChange={(v) => set('academicGroup', v)} options={academicGroups} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Status" required placeholder="Select status" value={form.status} onChange={(v) => set('status', v)} options={statusOptions} error={errors.status} />
                      <TextField label="Enrollment Date" required type="date" value={form.enrollmentDate} onChange={(v) => set('enrollmentDate', v)} error={errors.enrollmentDate} />
                    </div>
                  </div>
                </SectionCard>
                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  <IdCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>A unique Roll Number and Registration Number will be generated automatically when you submit.</span>
                </div>
              </div>
            )}

            {/* Step 5 — Documents */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <StepIntro icon={Upload} title="Documents Upload" description="Upload the student's documents (PDF, JPG, PNG)." />
                <div className="grid gap-5 md:grid-cols-2">
                  {DOC_FIELDS.map((d) => {
                    const file = form[d.key] as File | null;
                    const hasError = !!errors[d.key];
                    return (
                      <div key={String(d.key)} className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          {d.label} {d.required ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(optional)</span>}
                        </label>
                        <div className={cn('rounded-2xl border-2 border-dashed p-5 text-center transition-colors',
                          file ? 'border-success/50 bg-success/5' : hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border hover:border-primary/50 hover:bg-muted/40')}>
                          <input type="file" className="hidden" id={String(d.key)} accept={d.key === 'passportPhoto' ? 'image/*' : '.pdf,image/*'}
                            onChange={(e) => set(d.key, e.target.files?.[0] || null)} />
                          {file ? (
                            <div className="space-y-2">
                              <CheckCircle className="mx-auto h-7 w-7 text-success" />
                              <p className="truncate text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              <div className="flex justify-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(String(d.key))?.click()}>Replace</Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => set(d.key, null)} aria-label="Remove"><X className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          ) : (
                            <label htmlFor={String(d.key)} className="block cursor-pointer">
                              <Upload className={cn('mx-auto mb-2 h-7 w-7', hasError ? 'text-destructive' : 'text-muted-foreground')} />
                              <p className="text-sm font-medium">Click to upload</p>
                              <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG • Max 10MB</p>
                            </label>
                          )}
                        </div>
                        {hasError && <p className="text-xs font-medium text-destructive">{errors[d.key]}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6 — Review */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <StepIntro icon={CheckCircle} title="Review & Submit" description="Confirm the details before enrolling the student." />
                {[
                  { icon: User, title: 'Personal', rows: [['Name', form.fullNameEnglish], ['Father', form.fatherName], ['Mother', form.motherName], ['Date of Birth', form.dateOfBirth], ['Gender', form.gender], ['Religion', form.religion]] },
                  { icon: Phone, title: 'Contact', rows: [['Mobile', form.studentMobile], ['Email', form.email], ['Guardian', form.guardianMobile], ['Division', form.presentDivision], ['District', form.presentDistrict]] },
                  { icon: GraduationCap, title: 'Education', rows: [['Board', form.sscBoard], ['Roll', form.sscRoll], ['Year', form.sscYear], ['GPA', form.sscGPA], ['Group', form.sscGroup]] },
                  { icon: BookOpen, title: 'Academic', rows: [['Department', departments.find((d) => String(d.id) === form.department)?.name || form.department], ['Shift', form.shift], ['Session', form.session], ['Semester', semesterOptions.find((s) => s.value === form.semester)?.label || form.semester], ['Status', statusOptions.find((s) => s.value === form.status)?.label || form.status]] },
                ].map((card) => (
                  <SectionCard key={card.title} icon={card.icon} title={`${card.title} Information`}>
                    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {card.rows.map(([label, value]) => (
                        <div key={label as string} className="flex items-center gap-2 border-b border-border/40 py-1 last:border-0">
                          <span className="min-w-[7rem] text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
                          <span className="text-sm font-medium">{(value as string) || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                ))}
                <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  <span>On submit, the student is enrolled and a unique Roll &amp; Registration Number is assigned. Uploaded documents are attached to the profile.</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1 || isSubmitting} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Back</span>
          </Button>
          {currentStep < 6 ? (
            <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleNext}>
              Next Step <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling…</> : <><CheckCircle className="h-4 w-4" /> Enroll Student</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
