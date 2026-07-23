import { BookOpen, Building2, IdCard } from 'lucide-react';
import { AdmissionFormState } from '../types';
import { Department } from '@/services/departmentService';
import {
  groups, shiftOptions, semesterOptions, admissionTypeOptions, getSessions,
  semesterToNumber,
} from '../stepConfig';
import { FieldErrors } from '../validation';
import { SelectField, TextField, SectionCard, StepIntro } from '../fields';

interface Props {
  formData: AdmissionFormState;
  departments: Department[];
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors?: FieldErrors;
}

const sessionOptions = getSessions(8);

export function StepAcademic({ formData, departments, onChange, errors = {} }: Props) {
  const departmentOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));

  // Semester 2+ unlocks the optional "already enrolled" fields: existing
  // Roll/Registration for students who already hold college numbers.
  const semesterNo = formData.semester ? semesterToNumber(formData.semester) : 0;
  const priorSemesters = semesterNo > 1 ? semesterNo - 1 : 0;

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

      {/* Shown only when admitting into 2nd semester or above. Everything here
          is optional — a fresh 1st-semester applicant never sees it. */}
      {priorSemesters > 0 && (
        <SectionCard
          icon={IdCard}
          title="Existing Enrolment (optional)"
          description="If you already have a college Roll & Registration, enter them and we'll keep them. Leave blank to have them generated for you."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Current Roll Number"
              placeholder="Existing college roll"
              helper="Optional"
              value={formData.currentRollNumber}
              onChange={(v) => onChange('currentRollNumber', v)}
            />
            <TextField
              label="Current Registration Number"
              placeholder="Existing college registration"
              helper="Optional"
              value={formData.currentRegistrationNumber}
              onChange={(v) => onChange('currentRegistrationNumber', v)}
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
