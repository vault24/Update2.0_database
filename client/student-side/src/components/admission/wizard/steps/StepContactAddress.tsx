import { Phone, MapPin, Home } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AdmissionFormState } from '../types';
import { divisions, getDistricts } from '../stepConfig';
import { FieldErrors } from '../validation';
import { TextField, SelectField, TextareaField, SectionCard, StepIntro } from '../fields';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors?: FieldErrors;
}

const divisionOptions = divisions.map((d) => ({ value: d.toLowerCase(), label: d }));

/**
 * A full address block (present or permanent). `prefix` selects which set of
 * form fields it reads/writes. The District dropdown is dependent on Division.
 */
function AddressBlock({
  prefix, formData, onChange, errors, required,
}: {
  prefix: 'present' | 'permanent';
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors: FieldErrors;
  required: boolean;
}) {
  const k = (suffix: string) => `${prefix}${suffix}` as keyof AdmissionFormState;
  const val = (suffix: string) => (formData[k(suffix)] as string) || '';
  const err = (suffix: string) => errors[k(suffix)];

  const division = val('Division');
  const districts = getDistricts(division);

  return (
    <div className="space-y-4">
      <TextareaField
        label="Full Address" required={required} rows={2}
        placeholder="House / road / area"
        value={val('Address')}
        onChange={(v) => onChange(k('Address'), v)}
        error={err('Address')}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Division" required={required} placeholder="Select division"
          value={division}
          onChange={(v) => onChange(k('Division'), v)}
          options={divisionOptions}
          error={err('Division')}
        />
        <SelectField
          label="District" required={required}
          placeholder={division ? 'Select district' : 'Select a division first'}
          value={val('District')}
          onChange={(v) => onChange(k('District'), v)}
          options={districts}
          disabled={!division}
          helper={!division ? 'Choose a division to load its districts.' : undefined}
          error={err('District')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Upazila / Thana" required={required}
          placeholder="Enter upazila"
          value={val('Upazila')}
          onChange={(v) => onChange(k('Upazila'), v)}
          error={err('Upazila')}
        />
        <TextField
          label="Police Station" required={required}
          placeholder="Enter police station"
          value={val('PoliceStation')}
          onChange={(v) => onChange(k('PoliceStation'), v)}
          error={err('PoliceStation')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Post Office" required={required}
          placeholder="Enter post office"
          value={val('PostOffice')}
          onChange={(v) => onChange(k('PostOffice'), v)}
          error={err('PostOffice')}
        />
        <TextField
          label="Municipality / Union"
          placeholder="Enter municipality / union"
          value={val('MunicipalityUnion')}
          onChange={(v) => onChange(k('MunicipalityUnion'), v)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Village / Neighborhood"
          placeholder="Enter village / neighborhood"
          value={val('VillageNeighborhood')}
          onChange={(v) => onChange(k('VillageNeighborhood'), v)}
        />
        <TextField
          label="Ward Number" required={required} numeric
          placeholder="Enter ward number"
          value={val('Ward')}
          onChange={(v) => onChange(k('Ward'), v)}
          error={err('Ward')}
        />
      </div>
    </div>
  );
}

export function StepContactAddress({ formData, onChange, errors = {} }: Props) {
  return (
    <div className="space-y-6">
      <StepIntro icon={MapPin} title="Contact & Address" description="How can we reach you, and where do you live?" />

      <SectionCard icon={Phone} title="Contact Details">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            label="Mobile Number" required
            placeholder="01XXXXXXXXX" inputMode="tel" maxLength={11}
            value={formData.mobile}
            onChange={(v) => onChange('mobile', v)}
            error={errors.mobile}
          />
          <TextField
            label="Email Address" required type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(v) => onChange('email', v)}
            error={errors.email}
          />
          <TextField
            label="Guardian's Mobile" required
            placeholder="01XXXXXXXXX" inputMode="tel" maxLength={11}
            value={formData.guardianMobile}
            onChange={(v) => onChange('guardianMobile', v)}
            error={errors.guardianMobile}
          />
        </div>
      </SectionCard>

      <SectionCard icon={MapPin} title="Present Address" description="Where you currently live.">
        <AddressBlock prefix="present" formData={formData} onChange={onChange} errors={errors} required />
      </SectionCard>

      <SectionCard
        icon={Home}
        title="Permanent Address"
        description="Required — tick the box if it is the same as your present address."
        action={
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={formData.sameAsPresent}
              onCheckedChange={(c) => onChange('sameAsPresent', !!c)}
            />
            <span className="text-muted-foreground">Same as present</span>
          </label>
        }
      >
        {formData.sameAsPresent ? (
          <p className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            Your permanent address will be the same as your present address.
          </p>
        ) : (
          <AddressBlock prefix="permanent" formData={formData} onChange={onChange} errors={errors} required />
        )}
      </SectionCard>
    </div>
  );
}
