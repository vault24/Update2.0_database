import { User, MapPin, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AdmissionFormState } from '../types';
import { Department } from '@/services/departmentService';
import { semesterOptions, admissionTypeOptions } from '../stepConfig';

interface Props {
  formData: AdmissionFormState;
  departments?: Department[];
  isDeclarationChecked: boolean;
  onDeclarationChange: (checked: boolean) => void;
}

const titleCase = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const labelFor = (opts: { value: string; label: string }[], v?: string) =>
  opts.find((o) => o.value === v)?.label || titleCase(v);

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/40 py-1.5 last:border-0 sm:flex-row sm:items-center sm:gap-2">
      <span className="min-w-[8.5rem] text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

function ReviewCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 md:p-5">
      <h4 className="mb-2 flex items-center gap-2 font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h4>
      <div className="grid gap-x-6 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function StepReview({ formData, departments = [], isDeclarationChecked, onDeclarationChange }: Props) {
  const departmentName = departments.find((d) => String(d.id) === String(formData.department))?.name || formData.department;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold md:text-xl">Review &amp; Submit</h3>
        <p className="text-sm text-muted-foreground">Please check everything carefully before you submit.</p>
      </div>

      <div className="space-y-4">
        <ReviewCard icon={User} title="Personal Information">
          <Row label="Name (English)" value={formData.fullNameEnglish} />
          <Row label="Name (Bangla)" value={formData.fullNameBangla} />
          <Row label="Father" value={formData.fatherName} />
          <Row label="Mother" value={formData.motherName} />
          <Row label="Date of Birth" value={formData.dateOfBirth} />
          <Row label="Gender" value={titleCase(formData.gender)} />
          <Row label="Religion" value={titleCase(formData.religion)} />
          <Row label="Marital Status" value={titleCase(formData.maritalStatus)} />
        </ReviewCard>

        <ReviewCard icon={MapPin} title="Contact & Address">
          <Row label="Mobile" value={formData.mobile} />
          <Row label="Email" value={formData.email} />
          <Row label="Guardian Mobile" value={formData.guardianMobile} />
          <Row label="Division" value={titleCase(formData.presentDivision)} />
          <Row label="District" value={formData.presentDistrict} />
          <Row label="Upazila" value={formData.presentUpazila} />
        </ReviewCard>

        <ReviewCard icon={GraduationCap} title="Educational Background">
          <Row label="Board" value={titleCase(formData.sscBoard)} />
          <Row label="Roll" value={formData.sscRoll} />
          <Row label="Passing Year" value={formData.sscYear} />
          <Row label="GPA" value={formData.sscGPA} />
          <Row label="Group" value={titleCase(formData.sscGroup)} />
          <Row label="Institution" value={formData.sscInstitution} />
        </ReviewCard>

        <ReviewCard icon={BookOpen} title="Academic Information">
          <Row label="Department" value={departmentName} />
          <Row label="Shift" value={formData.shift} />
          <Row label="Session" value={formData.session} />
          <Row label="Semester" value={labelFor(semesterOptions, formData.semester)} />
          <Row label="Admission Type" value={labelFor(admissionTypeOptions, formData.admissionType)} />
        </ReviewCard>
      </div>

      <label
        htmlFor="confirm"
        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <Checkbox
          id="confirm"
          checked={isDeclarationChecked}
          onCheckedChange={(c) => onDeclarationChange(!!c)}
          className="mt-0.5 h-5 w-5 border-amber-500 data-[state=checked]:border-amber-600 data-[state=checked]:bg-amber-600"
        />
        <span className="flex items-start gap-2 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          I declare that all the information provided above is true and correct to the best of my knowledge.
          I understand that any false information may result in cancellation of my admission.
        </span>
      </label>
    </div>
  );
}
