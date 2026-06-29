import { GraduationCap, ScrollText } from 'lucide-react';
import { AdmissionFormState } from '../types';
import { sscBoards, sscGroups, getPassingYears } from '../stepConfig';
import { FieldErrors } from '../validation';
import { TextField, SelectField, SectionCard, StepIntro } from '../fields';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors?: FieldErrors;
}

const passingYears = getPassingYears(20);

export function StepEducation({ formData, onChange, errors = {} }: Props) {
  return (
    <div className="space-y-6">
      <StepIntro icon={GraduationCap} title="Educational Background" description="Your SSC or equivalent exam details." />

      <SectionCard icon={ScrollText} title="SSC / Equivalent" description="Enter results exactly as printed on your marksheet.">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Board" required placeholder="Select board"
              value={formData.sscBoard}
              onChange={(v) => onChange('sscBoard', v)}
              options={sscBoards}
              error={errors.sscBoard}
            />
            <TextField
              label="Roll Number" required numeric
              placeholder="Enter roll number"
              value={formData.sscRoll}
              onChange={(v) => onChange('sscRoll', v)}
              error={errors.sscRoll}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Passing Year" required placeholder="Select year"
              value={formData.sscYear}
              onChange={(v) => onChange('sscYear', v)}
              options={passingYears}
              error={errors.sscYear}
            />
            <TextField
              label="GPA" required
              placeholder="e.g. 4.50" inputMode="decimal"
              helper="Out of 5.00"
              value={formData.sscGPA}
              onChange={(v) => onChange('sscGPA', v)}
              error={errors.sscGPA}
            />
            <SelectField
              label="Group" required placeholder="Select group"
              value={formData.sscGroup}
              onChange={(v) => onChange('sscGroup', v)}
              options={sscGroups}
              error={errors.sscGroup}
            />
          </div>

          <TextField
            label="Institution Name" required
            placeholder="Enter your school / institution name"
            value={formData.sscInstitution}
            onChange={(v) => onChange('sscInstitution', v)}
            error={errors.sscInstitution}
          />
        </div>
      </SectionCard>
    </div>
  );
}
