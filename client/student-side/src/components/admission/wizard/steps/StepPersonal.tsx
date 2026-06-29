import { User, IdCard, Heart } from 'lucide-react';
import { AdmissionFormState } from '../types';
import { genderOptions, bloodGroups, religionOptions, maritalStatuses } from '../stepConfig';
import { FieldErrors } from '../validation';
import { TextField, SelectField, SectionCard, StepIntro } from '../fields';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors?: FieldErrors;
}

export function StepPersonal({ formData, onChange, errors = {} }: Props) {
  return (
    <div className="space-y-6">
      <StepIntro icon={User} title="Personal Information" description="Tell us about yourself and your parents." />

      <SectionCard icon={User} title="Name" description="As it appears on official documents.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Full Name (Bangla)" required
            placeholder="সম্পূর্ণ নাম লিখুন"
            value={formData.fullNameBangla}
            onChange={(v) => onChange('fullNameBangla', v)}
            error={errors.fullNameBangla}
          />
          <TextField
            label="Full Name (English)" required
            placeholder="Enter full name"
            value={formData.fullNameEnglish}
            onChange={(v) => onChange('fullNameEnglish', v)}
            error={errors.fullNameEnglish}
          />
        </div>
      </SectionCard>

      <SectionCard icon={Heart} title="Parents' Information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Father's Name" required
            placeholder="Enter father's name"
            value={formData.fatherName}
            onChange={(v) => onChange('fatherName', v)}
            error={errors.fatherName}
          />
          <TextField
            label="Father's NID" required numeric
            placeholder="Enter NID number"
            value={formData.fatherNID}
            onChange={(v) => onChange('fatherNID', v)}
            error={errors.fatherNID}
          />
          <TextField
            label="Mother's Name" required
            placeholder="Enter mother's name"
            value={formData.motherName}
            onChange={(v) => onChange('motherName', v)}
            error={errors.motherName}
          />
          <TextField
            label="Mother's NID" required numeric
            placeholder="Enter NID number"
            value={formData.motherNID}
            onChange={(v) => onChange('motherNID', v)}
            error={errors.motherNID}
          />
        </div>
      </SectionCard>

      <SectionCard icon={IdCard} title="Identity Details">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="Date of Birth" required type="date"
              value={formData.dateOfBirth}
              onChange={(v) => onChange('dateOfBirth', v)}
              error={errors.dateOfBirth}
            />
            <SelectField
              label="Gender" required placeholder="Select gender"
              value={formData.gender}
              onChange={(v) => onChange('gender', v)}
              options={genderOptions}
              error={errors.gender}
            />
            <SelectField
              label="Blood Group" placeholder="Select blood group"
              value={formData.bloodGroup}
              onChange={(v) => onChange('bloodGroup', v)}
              options={bloodGroups}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="NID Number" numeric
              placeholder="Enter NID number"
              helper="Optional — if you have a National ID."
              value={formData.nid}
              onChange={(v) => onChange('nid', v)}
            />
            <TextField
              label="Birth Certificate No." required numeric
              placeholder="Enter birth certificate number"
              value={formData.birthCertificate}
              onChange={(v) => onChange('birthCertificate', v)}
              error={errors.birthCertificate}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Religion" required placeholder="Select religion"
              value={formData.religion}
              onChange={(v) => onChange('religion', v)}
              options={religionOptions}
              error={errors.religion}
            />
            <TextField
              label="Nationality"
              placeholder="Enter nationality"
              value={formData.nationality || 'Bangladeshi'}
              onChange={(v) => onChange('nationality', v)}
            />
            <SelectField
              label="Marital Status" required placeholder="Select status"
              value={formData.maritalStatus}
              onChange={(v) => onChange('maritalStatus', v)}
              options={maritalStatuses.map((m) => ({ value: m.toLowerCase(), label: m }))}
              error={errors.maritalStatus}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
