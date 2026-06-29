import { BookOpen, Building2 } from 'lucide-react';
import { AdmissionFormState } from '../types';
import { Department } from '@/services/departmentService';
import { groups, shiftOptions, semesterOptions, admissionTypeOptions, getSessions } from '../stepConfig';
import { FieldErrors } from '../validation';
import { SelectField, SectionCard, StepIntro } from '../fields';

interface Props {
  formData: AdmissionFormState;
  departments: Department[];
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors?: FieldErrors;
}

const sessionOptions = getSessions(8);

export function StepAcademic({ formData, departments, onChange, errors = {} }: Props) {
  const departmentOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));

  return (
    <div className="space-y-6">
      <StepIntro icon={BookOpen} title="Current Academic Information" description="Choose your programme and session." />

      <SectionCard icon={Building2} title="Programme">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Department" required
            placeholder={departments.length ? 'Select department' : 'Loading departments…'}
            value={formData.department}
            onChange={(v) => onChange('department', v)}
            options={departmentOptions}
            error={errors.department}
          />
          <SelectField
            label="Shift" required placeholder="Select shift"
            value={formData.shift}
            onChange={(v) => onChange('shift', v)}
            options={shiftOptions}
            error={errors.shift}
          />
        </div>
      </SectionCard>

      <SectionCard icon={BookOpen} title="Session & Type">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Session" required placeholder="Select session"
              value={formData.session}
              onChange={(v) => onChange('session', v)}
              options={sessionOptions}
              error={errors.session}
            />
            <SelectField
              label="Semester" required placeholder="Select semester"
              value={formData.semester}
              onChange={(v) => onChange('semester', v)}
              options={semesterOptions}
              error={errors.semester}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Admission Type" required placeholder="Select admission type"
              value={formData.admissionType}
              onChange={(v) => onChange('admissionType', v)}
              options={admissionTypeOptions}
              error={errors.admissionType}
            />
            <SelectField
              label="Group" placeholder="Select group"
              helper="Optional."
              value={formData.group}
              onChange={(v) => onChange('group', v)}
              options={groups.map((g) => ({ value: g.toLowerCase(), label: g }))}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
