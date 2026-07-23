import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap, Loader2, FileText, User, Phone, BookOpen,
  Briefcase, CheckCircle2, Award, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { SwitchAccountDialog, canSwitchAccount } from '@/components/account/SwitchAccountDialog';
import { alumniService, AlumniDocCategory, AlumniDocUpload } from '@/services/alumniService';
import departmentService, { Department } from '@/services/departmentService';
import { divisions, getDistricts } from '@/components/admission/wizard/stepConfig';
import { AlumniDocumentUpload, type AlumniDoc } from '@/components/alumni/AlumniDocumentUpload';
import { cn } from '@/lib/utils';

// Sessions / graduation years from 2000 up to the current year (newest first).
const currentYear = new Date().getFullYear();
const SESSION_OPTIONS = Array.from({ length: currentYear - 1999 }, (_, i) => {
  const y = currentYear - i;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
});
const YEAR_OPTIONS = Array.from({ length: currentYear - 1999 }, (_, i) => String(currentYear - i));

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
  portfolioUrl: '',
};

const STEPS = [
  { id: 1, label: 'Personal & Academic', icon: User },
  { id: 2, label: 'Alumni Info & Documents', icon: GraduationCap },
];

export default function AlumniRegistrationPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesterGpas, setSemesterGpas] = useState<Record<number, string>>({});
  const [docCategories, setDocCategories] = useState<AlumniDocCategory[]>([]);
  const [maxDocuments, setMaxDocuments] = useState(20);
  const [documents, setDocuments] = useState<AlumniDoc[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [switchOpen, setSwitchOpen] = useState(false);

  // Reapply mode: the account already submitted an alumni application that is
  // not yet approved (i.e. rejected or pending). We pre-fill the form with the
  // previous data and update the existing record instead of creating a new one.
  const reapplyMode = !!user?.isAlumni && user?.alumniReviewStatus !== 'approved';
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    // On a fresh registration, prefill only name & email from the account.
    if (reapplyMode) return;
    setForm((prev) => ({
      ...prev,
      fullNameEnglish: prev.fullNameEnglish || user?.name || '',
      email: prev.email || user?.email || '',
    }));
  }, [user, reapplyMode]);

  useEffect(() => {
    // Reapply: load the previous application and pre-fill every field.
    if (!reapplyMode) return;
    let cancelled = false;
    (async () => {
      try {
        const pre = await alumniService.getMyApplicationForm();
        if (cancelled) return;
        setForm((prev) => ({ ...prev, ...pre.form }));
        if (Object.keys(pre.semesterGpas).length) setSemesterGpas(pre.semesterGpas);
      } catch {
        toast.error('Could not load your previous application. You can still fill it in again.');
      } finally {
        if (!cancelled) setPrefilled(true);
      }
    })();
    return () => { cancelled = true; };
  }, [reapplyMode]);

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

  const validateStep1 = (): boolean => {
    if (!form.fullNameEnglish.trim()) {
      toast.error('Please enter your full name.');
      return false;
    }
    if (!form.department) {
      toast.error('Please select your department.');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(2, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      portfolioUrl: form.portfolioUrl,
      semesterResults,
    };
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const uploads: AlumniDocUpload[] = documents.map((d) => ({
        file: d.file,
        category: d.category,
        customName: d.customName,
      }));
      const result = reapplyMode
        ? await alumniService.resubmitApplication(buildPayload(), uploads)
        : await alumniService.selfRegister(buildPayload(), uploads);
      const errs = result.documents?.errors || [];
      if (errs.length) {
        toast.warning('Submitted, but some documents had issues: ' + errs.join(' • '));
      } else {
        toast.success(reapplyMode
          ? 'Your updated application was resubmitted for verification.'
          : 'Your alumni information was submitted for verification.');
      }
      await refreshUser();
      // The application starts as "pending" — the status page explains the
      // review process and offers account switching until approval.
      navigate('/dashboard/alumni-application-status');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta || (reapplyMode && !prefilled)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
      {/* Header */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white p-6 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">{reapplyMode ? 'Edit & Reapply' : 'Alumni Registration'}</h1>
        </div>
        <p className="text-emerald-50 text-sm">
          {reapplyMode
            ? 'Your previous details are pre-filled below. Update anything that needs correcting and resubmit — an administrator will review your application again.'
            : 'Welcome back! Share whatever information you have — only your name and department are required. An administrator will verify your details after you submit.'}
        </p>
      </motion.div>

      {/* Wrong account type? Switch before filling anything in. */}
      {canSwitchAccount(user) && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Not an alumnus?</span> If you created this account by mistake,
            you can switch to a General Student account instead.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSwitchOpen(true)}
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/20"
          >
            Switch Account
          </Button>
        </motion.div>
      )}
      <SwitchAccountDialog open={switchOpen} onOpenChange={setSwitchOpen} />

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                  active ? 'bg-emerald-600 text-white' : done ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                </div>
                <span className={cn('text-sm font-medium hidden sm:block', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('w-8 sm:w-12 h-0.5 rounded', done ? 'bg-success' : 'bg-border')} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
      {step === 1 && (
      <motion.div key="step1" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
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

      {/* Step 1 navigation */}
      <div className="flex justify-end">
        <Button onClick={goNext} className="min-w-[160px] h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2">
          Next: Alumni Info <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      </motion.div>
      )}

      {step === 2 && (
      <motion.div key="step2" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <Section icon={Briefcase} title="Alumni Information">
        <Grid>
          <Field label="Graduation Year">
            <Select value={form.graduationYear} onValueChange={(v) => setField('graduationYear', v)}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>{YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
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
        </Grid>
        <div className="mt-4 space-y-1.5">
          <Label className="text-sm">Short Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setField('bio', e.target.value)} rows={3} placeholder="Short biography..." />
        </div>
      </Section>

      <Section icon={FileText} title="Documents">
        {reapplyMode && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
            Documents you uploaded previously are kept — you only need to add new ones here if something changed.
          </p>
        )}
        <AlumniDocumentUpload
          docCategories={docCategories}
          maxDocuments={maxDocuments}
          documents={documents}
          onChange={setDocuments}
        />
      </Section>

      {/* Step 2 navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={goBack} disabled={submitting} className="h-12 rounded-2xl gap-2">
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[200px] h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5 mr-2" /> {reapplyMode ? 'Resubmit Application' : 'Submit Registration'}</>
          )}
        </Button>
      </div>
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

/* helpers */
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
