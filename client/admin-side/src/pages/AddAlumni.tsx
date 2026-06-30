import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, ArrowLeft, Loader2, Plus, Trash2, Upload, FileText, User,
  Phone, BookOpen, Briefcase, ShieldCheck, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import {
  alumniService, AlumniDocumentCategory, AlumniDocumentUpload,
} from '@/services/alumniService';
import departmentService, { Department } from '@/services/departmentService';
import {
  religionOptions, sscGroups, getSessionsRange, getYearsRange, districtsByDivision,
} from '@/components/add-student/config';

interface PendingDocument extends AlumniDocumentUpload {
  id: string;
  categoryDisplay: string;
}

// Flattened, de-duplicated district list (the form has no division selector).
const ALL_DISTRICTS = Array.from(new Set(Object.values(districtsByDivision).flat())).sort();
// Sessions / years from 2000 up to the current year.
const SESSION_OPTIONS = getSessionsRange(2000);
const GRADUATION_YEARS = getYearsRange(2000);

const ALUMNI_TYPES = [
  { value: 'established', label: 'Established Professional' },
  { value: 'recent', label: 'Recent Graduate' },
];

const SUPPORT_CATEGORIES = [
  { value: 'no_support_needed', label: 'No Support Needed' },
  { value: 'receiving_support', label: 'Receiving Support' },
  { value: 'needs_extra_support', label: 'Needs Extra Support' },
];

const GENDERS = ['Male', 'Female', 'Other'];
const SHIFTS = ['Morning', 'Day'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const initialForm = {
  // Personal (essential identifying)
  fullNameEnglish: '',
  fullNameBangla: '',
  fatherName: '',
  motherName: '',
  fatherNID: '',
  motherNID: '',
  dateOfBirth: '',
  gender: '',
  religion: '',
  bloodGroup: '',
  // Contact
  mobileStudent: '',
  guardianMobile: '',
  email: '',
  presentDistrict: '',
  // Academic
  department: '',
  session: '',
  shift: '',
  group: '',
  diplomaBoardRoll: '',
  finalCgpa: '',
  rollNumber: '',
  passingYear: '',
  gpa: '',
  // Alumni-specific
  graduationYear: '',
  alumniType: 'established',
  currentSupportCategory: 'no_support_needed',
  positionTitle: '',
  organizationName: '',
  bio: '',
  linkedinUrl: '',
  portfolioUrl: '',
};

export default function AddAlumni() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesterGpas, setSemesterGpas] = useState<Record<number, string>>({});
  const [docCategories, setDocCategories] = useState<AlumniDocumentCategory[]>([]);
  const [maxDocuments, setMaxDocuments] = useState(20);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);

  // Document picker state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customName, setCustomName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [deptRes, catRes] = await Promise.all([
          departmentService.getDepartments({ page_size: 200 }),
          alumniService.getDocumentCategories(),
        ]);
        setDepartments(deptRes.results || []);
        setDocCategories(catRes.categories || []);
        setMaxDocuments(catRes.maxDocuments || 20);
      } catch (err) {
        toast({ title: 'Failed to load form data', description: getErrorMessage(err), variant: 'destructive' });
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [toast]);

  const setField = (key: keyof typeof initialForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isCustomCategory = useMemo(
    () => docCategories.find((c) => c.key === selectedCategory)?.isCustom ?? false,
    [docCategories, selectedCategory],
  );

  const addDocument = () => {
    if (!selectedCategory || !pendingFile) {
      toast({ title: 'Select a category and a file', variant: 'destructive' });
      return;
    }
    if (isCustomCategory && !customName.trim()) {
      toast({ title: 'Enter a name for the custom document', variant: 'destructive' });
      return;
    }
    if (documents.length >= maxDocuments) {
      toast({ title: `Maximum ${maxDocuments} documents allowed`, variant: 'destructive' });
      return;
    }
    const cat = docCategories.find((c) => c.key === selectedCategory);
    setDocuments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: pendingFile,
        category: selectedCategory,
        customName: isCustomCategory ? customName.trim() : '',
        categoryDisplay: isCustomCategory ? customName.trim() : cat?.display || selectedCategory,
      },
    ]);
    setSelectedCategory('');
    setCustomName('');
    setPendingFile(null);
    // Reset the native file input
    const input = document.getElementById('alumni-doc-file') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const removeDocument = (id: string) =>
    setDocuments((prev) => prev.filter((d) => d.id !== id));

  const buildPayload = () => {
    const semesterResults = Object.entries(semesterGpas)
      .filter(([, gpa]) => gpa !== '' && gpa != null)
      .map(([semester, gpa]) => ({
        semester: Number(semester),
        gpa: Number(gpa),
        resultType: 'gpa' as const,
        cgpa: undefined as number | undefined,
      }));

    // Final CGPA is the overall diploma result. Attach it to the highest
    // semester result (or create an 8th-semester result) so it surfaces as the
    // alumni's CGPA wherever the latest result's cgpa/gpa is read.
    const finalCgpa = form.finalCgpa !== '' ? Number(form.finalCgpa) : null;
    if (finalCgpa != null && !Number.isNaN(finalCgpa)) {
      const highest = semesterResults.reduce(
        (max, r) => (r.semester > (max?.semester ?? 0) ? r : max),
        undefined as (typeof semesterResults)[number] | undefined,
      );
      if (highest) {
        highest.cgpa = finalCgpa;
      } else {
        semesterResults.push({ semester: 8, gpa: finalCgpa, resultType: 'gpa', cgpa: finalCgpa });
      }
    }

    return {
      fullNameEnglish: form.fullNameEnglish.trim(),
      fullNameBangla: form.fullNameBangla,
      fatherName: form.fatherName,
      motherName: form.motherName,
      fatherNID: form.fatherNID,
      motherNID: form.motherNID,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      religion: form.religion,
      bloodGroup: form.bloodGroup,
      mobileStudent: form.mobileStudent,
      guardianMobile: form.guardianMobile,
      email: form.email,
      presentAddress: form.presentDistrict ? { district: form.presentDistrict } : {},
      department: form.department,
      session: form.session,
      shift: form.shift,
      group: form.group,
      // Diploma (BTEB) board roll becomes the student's institute roll number.
      currentRollNumber: form.diplomaBoardRoll,
      rollNumber: form.rollNumber,
      passingYear: form.passingYear,
      gpa: form.gpa,
      graduationYear: form.graduationYear,
      alumniType: form.alumniType,
      currentSupportCategory: form.currentSupportCategory,
      currentPosition: form.positionTitle || form.organizationName
        ? {
            positionType: 'job',
            positionTitle: form.positionTitle,
            organizationName: form.organizationName,
            isCurrent: true,
          }
        : null,
      bio: form.bio,
      linkedinUrl: form.linkedinUrl,
      portfolioUrl: form.portfolioUrl,
      semesterResults,
    };
  };

  const handleSubmit = async () => {
    if (!form.fullNameEnglish.trim()) {
      toast({ title: 'Full name (English) is required', variant: 'destructive' });
      return;
    }
    if (!form.department) {
      toast({ title: 'Please select a department', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const uploads: AlumniDocumentUpload[] = documents.map((d) => ({
        file: d.file,
        category: d.category,
        customName: d.customName,
      }));
      const result = await alumniService.manualCreateAlumni(buildPayload(), uploads);

      const docErrors = result.documents?.errors || [];
      if (docErrors.length > 0) {
        toast({
          title: 'Alumni created with some document issues',
          description: docErrors.join(' • '),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Alumni created successfully',
          description: `${form.fullNameEnglish} has been added to the alumni network.`,
        });
      }
      navigate(`/alumni/${result.alumni.student.id}`);
    } catch (err) {
      toast({ title: 'Failed to create alumni', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/alumni')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Add Alumni Manually</h1>
              <p className="text-sm text-muted-foreground">
                For graduates who left before the system existed — only essential info is required.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Only <span className="font-semibold text-foreground">Full Name (English)</span> and{' '}
            <span className="font-semibold text-foreground">Department</span> are required. Everything else is
            optional — fill in whatever information is available. The graduate is registered as a student in the
            background and immediately moved to the alumni network.
          </p>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <SectionCard icon={User} title="Personal Information">
        <FieldGrid>
          <Field label="Full Name (English)" required>
            <Input value={form.fullNameEnglish} onChange={(e) => setField('fullNameEnglish', e.target.value)} placeholder="e.g. Md. Rahim Uddin" />
          </Field>
          <Field label="Full Name (Bangla)">
            <Input value={form.fullNameBangla} onChange={(e) => setField('fullNameBangla', e.target.value)} placeholder="পূর্ণ নাম" />
          </Field>
          <Field label="Father's Name">
            <Input value={form.fatherName} onChange={(e) => setField('fatherName', e.target.value)} />
          </Field>
          <Field label="Mother's Name">
            <Input value={form.motherName} onChange={(e) => setField('motherName', e.target.value)} />
          </Field>
          <Field label="Father's NID">
            <Input value={form.fatherNID} onChange={(e) => setField('fatherNID', e.target.value)} />
          </Field>
          <Field label="Mother's NID">
            <Input value={form.motherNID} onChange={(e) => setField('motherNID', e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setField('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Religion">
            <Select value={form.religion} onValueChange={(v) => setField('religion', v)}>
              <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
              <SelectContent>{religionOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Blood Group">
            <Select value={form.bloodGroup} onValueChange={(v) => setField('bloodGroup', v)}>
              <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </FieldGrid>
      </SectionCard>

      {/* Contact */}
      <SectionCard icon={Phone} title="Contact Information">
        <FieldGrid>
          <Field label="Mobile Number">
            <Input value={form.mobileStudent} onChange={(e) => setField('mobileStudent', e.target.value)} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Guardian Mobile">
            <Input value={form.guardianMobile} onChange={(e) => setField('guardianMobile', e.target.value)} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Present District">
            <Select value={form.presentDistrict} onValueChange={(v) => setField('presentDistrict', v)}>
              <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>{ALL_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </FieldGrid>
      </SectionCard>

      {/* Academic */}
      <SectionCard icon={BookOpen} title="Academic Background">
        <FieldGrid>
          <Field label="Department" required>
            <Select value={form.department} onValueChange={(v) => setField('department', v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Diploma Board Roll">
            <Input value={form.diplomaBoardRoll} onChange={(e) => setField('diplomaBoardRoll', e.target.value)} placeholder="BTEB board roll" />
          </Field>
          <Field label="Final CGPA">
            <Input type="number" step="0.01" min="0" max="4" value={form.finalCgpa} onChange={(e) => setField('finalCgpa', e.target.value)} placeholder="e.g. 3.75" />
          </Field>
          <Field label="Session">
            <Select value={form.session} onValueChange={(v) => setField('session', v)}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>{SESSION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Shift">
            <Select value={form.shift} onValueChange={(v) => setField('shift', v)}>
              <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>{SHIFTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Group">
            <Select value={form.group} onValueChange={(v) => setField('group', v)}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>{sscGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="SSC Roll">
            <Input value={form.rollNumber} onChange={(e) => setField('rollNumber', e.target.value)} />
          </Field>
          <Field label="Passing Year (SSC)">
            <Input type="number" value={form.passingYear} onChange={(e) => setField('passingYear', e.target.value)} />
          </Field>
          <Field label="SSC GPA">
            <Input type="number" step="0.01" value={form.gpa} onChange={(e) => setField('gpa', e.target.value)} />
          </Field>
        </FieldGrid>
      </SectionCard>

      {/* Semester Results (optional) */}
      <SectionCard icon={GraduationCap} title="Semester Results (optional)">
        <p className="text-sm text-muted-foreground mb-4">
          Add GPA for any semester you have a record for. Leave the rest blank.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <div key={sem} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Semester {sem} GPA</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="4"
                placeholder="—"
                value={semesterGpas[sem] ?? ''}
                onChange={(e) => setSemesterGpas((prev) => ({ ...prev, [sem]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Alumni Information */}
      <SectionCard icon={Briefcase} title="Alumni Information">
        <FieldGrid>
          <Field label="Graduation Year">
            <Select value={form.graduationYear} onValueChange={(v) => setField('graduationYear', v)}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>{GRADUATION_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Alumni Type">
            <Select value={form.alumniType} onValueChange={(v) => setField('alumniType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALUMNI_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Support Category">
            <Select value={form.currentSupportCategory} onValueChange={(v) => setField('currentSupportCategory', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUPPORT_CATEGORIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Current Position / Title">
            <Input value={form.positionTitle} onChange={(e) => setField('positionTitle', e.target.value)} placeholder="e.g. Software Engineer" />
          </Field>
          <Field label="Organization / Company">
            <Input value={form.organizationName} onChange={(e) => setField('organizationName', e.target.value)} placeholder="e.g. Google" />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={form.linkedinUrl} onChange={(e) => setField('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </Field>
          <Field label="Portfolio URL">
            <Input value={form.portfolioUrl} onChange={(e) => setField('portfolioUrl', e.target.value)} placeholder="https://..." />
          </Field>
        </FieldGrid>
        <div className="mt-4 space-y-1.5">
          <Label className="text-sm">Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setField('bio', e.target.value)} rows={3} placeholder="Short biography..." />
        </div>
      </SectionCard>

      {/* Documents */}
      <SectionCard icon={FileText} title={`Documents (${documents.length}/${maxDocuments})`}>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a category (or "Custom Document" to name your own), pick a file, then add it. Up to {maxDocuments} documents.
        </p>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end p-4 rounded-lg bg-muted/40 border border-border/50">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {docCategories.map((c) => <SelectItem key={c.key} value={c.key}>{c.display}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isCustomCategory && (
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Custom Name</Label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Award Letter" />
            </div>
          )}
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">File</Label>
            <Input
              id="alumni-doc-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="button" onClick={addDocument} disabled={documents.length >= maxDocuments}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {documents.length > 0 && (
          <div className="mt-4 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-primary/10 shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.categoryDisplay}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.file.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeDocument(doc.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-4 border-t border-border/50">
        <Button variant="outline" onClick={() => navigate('/alumni')} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Create Alumni</>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- small helpers ----------------------------- */

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-2 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
