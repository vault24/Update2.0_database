import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap, Loader2, Plus, Trash2, FileText, User, Phone, BookOpen,
  Briefcase, CheckCircle2, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { alumniService, AlumniDocCategory, AlumniDocUpload } from '@/services/alumniService';
import departmentService, { Department } from '@/services/departmentService';
import { divisions, getDistricts } from '@/components/admission/wizard/stepConfig';

// Sessions / graduation years from 2000 up to the current year (newest first).
const currentYear = new Date().getFullYear();
const SESSION_OPTIONS = Array.from({ length: currentYear - 1999 }, (_, i) => {
  const y = currentYear - i;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
});
const YEAR_OPTIONS = Array.from({ length: currentYear - 1999 }, (_, i) => String(currentYear - i));

interface PendingDoc extends AlumniDocUpload {
  id: string;
  categoryDisplay: string;
}

const GENDERS = ['Male', 'Female', 'Other'];

const initialForm = {
  fullNameEnglish: '',
  fullNameBangla: '',
  fatherName: '',
  motherName: '',
  dateOfBirth: '',
  gender: '',
  mobileStudent: '',
  email: '',
  division: '',
  presentDistrict: '',
  department: '',
  session: '',
  graduationYear: '',
  positionTitle: '',
  organizationName: '',
  bio: '',
  linkedinUrl: '',
};

export default function AlumniRegistrationPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesterGpas, setSemesterGpas] = useState<Record<number, string>>({});
  const [docCategories, setDocCategories] = useState<AlumniDocCategory[]>([]);
  const [maxDocuments, setMaxDocuments] = useState(20);
  const [documents, setDocuments] = useState<PendingDoc[]>([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [customName, setCustomName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    // Prefill name & email from the account.
    setForm((prev) => ({
      ...prev,
      fullNameEnglish: prev.fullNameEnglish || user?.name || '',
      email: prev.email || user?.email || '',
    }));
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const [depts, catRes] = await Promise.all([
          departmentService.getAll(),
          alumniService.getDocumentCategories(),
        ]);
        setDepartments(depts || []);
        setDocCategories(catRes.categories || []);
        setMaxDocuments(catRes.maxDocuments || 20);
      } catch {
        toast.error('Failed to load registration form. Please refresh.');
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  const setField = (key: keyof typeof initialForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isCustomCategory = useMemo(
    () => docCategories.find((c) => c.key === selectedCategory)?.isCustom ?? false,
    [docCategories, selectedCategory],
  );

  const addDocument = () => {
    if (!selectedCategory || !pendingFile) {
      toast.error('Select a category and choose a file.');
      return;
    }
    if (isCustomCategory && !customName.trim()) {
      toast.error('Enter a name for the custom document.');
      return;
    }
    if (documents.length >= maxDocuments) {
      toast.error(`You can upload up to ${maxDocuments} documents.`);
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
    const input = document.getElementById('alumni-reg-file') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const removeDocument = (id: string) => setDocuments((prev) => prev.filter((d) => d.id !== id));

  const buildPayload = () => {
    const semesterResults = Object.entries(semesterGpas)
      .filter(([, gpa]) => gpa !== '' && gpa != null)
      .map(([semester, gpa]) => ({ semester: Number(semester), gpa: Number(gpa), resultType: 'gpa' }));

    return {
      fullNameEnglish: form.fullNameEnglish.trim(),
      fullNameBangla: form.fullNameBangla,
      fatherName: form.fatherName,
      motherName: form.motherName,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      mobileStudent: form.mobileStudent,
      email: form.email,
      presentAddress: (form.division || form.presentDistrict)
        ? { division: form.division, district: form.presentDistrict }
        : {},
      department: form.department,
      session: form.session,
      graduationYear: form.graduationYear,
      currentPosition: form.positionTitle || form.organizationName
        ? { positionType: 'job', positionTitle: form.positionTitle, organizationName: form.organizationName, isCurrent: true }
        : null,
      bio: form.bio,
      linkedinUrl: form.linkedinUrl,
      semesterResults,
    };
  };

  const handleSubmit = async () => {
    if (!form.fullNameEnglish.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!form.department) {
      toast.error('Please select your department.');
      return;
    }
    setSubmitting(true);
    try {
      const uploads: AlumniDocUpload[] = documents.map((d) => ({
        file: d.file,
        category: d.category,
        customName: d.customName,
      }));
      const result = await alumniService.selfRegister(buildPayload(), uploads);
      const errs = result.documents?.errors || [];
      if (errs.length) {
        toast.warning('Submitted, but some documents had issues: ' + errs.join(' • '));
      } else {
        toast.success('Your alumni information was submitted for verification.');
      }
      await refreshUser();
      navigate('/dashboard/alumni-profile');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 shadow-lg shadow-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Alumni Registration</h1>
        </div>
        <p className="text-blue-50 text-sm">
          Welcome back! Share whatever information you have — only your name and department are required.
          An administrator will verify your details after you submit.
        </p>
      </motion.div>

      <Section icon={User} title="Personal Information">
        <Grid>
          <Field label="Full Name (English)" required>
            <Input value={form.fullNameEnglish} onChange={(e) => setField('fullNameEnglish', e.target.value)} />
          </Field>
          <Field label="Full Name (Bangla)">
            <Input value={form.fullNameBangla} onChange={(e) => setField('fullNameBangla', e.target.value)} />
          </Field>
          <Field label="Father's Name">
            <Input value={form.fatherName} onChange={(e) => setField('fatherName', e.target.value)} />
          </Field>
          <Field label="Mother's Name">
            <Input value={form.motherName} onChange={(e) => setField('motherName', e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setField('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section icon={Phone} title="Contact">
        <Grid>
          <Field label="Mobile Number">
            <Input value={form.mobileStudent} onChange={(e) => setField('mobileStudent', e.target.value)} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          </Field>
          <Field label="Division">
            <Select
              value={form.division}
              onValueChange={(v) => setForm((prev) => ({ ...prev, division: v, presentDistrict: '' }))}
            >
              <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
              <SelectContent>{divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Present District">
            <Select
              value={form.presentDistrict}
              onValueChange={(v) => setField('presentDistrict', v)}
              disabled={!form.division}
            >
              <SelectTrigger><SelectValue placeholder={form.division ? 'Select district' : 'Select division first'} /></SelectTrigger>
              <SelectContent>
                {getDistricts(form.division).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section icon={BookOpen} title="Academic">
        <Grid>
          <Field label="Department" required>
            <Select value={form.department} onValueChange={(v) => setField('department', v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Session">
            <Select value={form.session} onValueChange={(v) => setField('session', v)}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>{SESSION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Graduation Year">
            <Select value={form.graduationYear} onValueChange={(v) => setField('graduationYear', v)}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>{YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </Grid>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Semester GPA (optional)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <div key={sem} className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sem {sem}</Label>
                <Input type="number" step="0.01" min="0" max="4" placeholder="—"
                  value={semesterGpas[sem] ?? ''}
                  onChange={(e) => setSemesterGpas((prev) => ({ ...prev, [sem]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section icon={Briefcase} title="Career (optional)">
        <Grid>
          <Field label="Current Position">
            <Input value={form.positionTitle} onChange={(e) => setField('positionTitle', e.target.value)} placeholder="e.g. Software Engineer" />
          </Field>
          <Field label="Organization">
            <Input value={form.organizationName} onChange={(e) => setField('organizationName', e.target.value)} placeholder="e.g. Google" />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={form.linkedinUrl} onChange={(e) => setField('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </Field>
        </Grid>
        <div className="mt-4 space-y-1.5">
          <Label className="text-sm">Short Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setField('bio', e.target.value)} rows={3} />
        </div>
      </Section>

      <Section icon={FileText} title={`Documents (${documents.length}/${maxDocuments})`}>
        <p className="text-sm text-muted-foreground mb-3">
          Add certificates, transcripts, photo, or any other document. Choose "Custom Document" to name your own.
        </p>
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{docCategories.map((c) => <SelectItem key={c.key} value={c.key}>{c.display}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isCustomCategory && (
              <div className="space-y-1">
                <Label className="text-xs">Custom Name</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Award Letter" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">File</Label>
              <Input id="alumni-reg-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <Button type="button" onClick={addDocument} disabled={documents.length >= maxDocuments} className="self-start bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-1" /> Add Document
          </Button>
        </div>
        {documents.length > 0 && (
          <div className="mt-3 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-500/15 shrink-0"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{doc.categoryDisplay}</p>
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
      </Section>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[200px] h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5 mr-2" /> Submit Registration</>
          )}
        </Button>
      </div>
    </div>
  );
}

/* helpers */
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
