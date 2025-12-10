import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdmissionFormState } from '../types';
import { maritalStatuses, divisions } from '../stepConfig';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
}

export function StepPersonal({ formData, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1">Personal Information</h3>
        <p className="text-sm text-muted-foreground">Enter your personal details</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name (Bangla)</Label>
          <Input 
            placeholder="সম্পূর্ণ নাম লিখুন"
            value={formData.fullNameBangla}
            onChange={(e) => onChange('fullNameBangla', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Full Name (English)</Label>
          <Input 
            placeholder="Enter full name"
            value={formData.fullNameEnglish}
            onChange={(e) => onChange('fullNameEnglish', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Father's Name</Label>
          <Input 
            placeholder="Enter father's name"
            value={formData.fatherName}
            onChange={(e) => onChange('fatherName', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Father's NID</Label>
          <Input 
            placeholder="Enter NID number"
            value={formData.fatherNID}
            onChange={(e) => onChange('fatherNID', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mother's Name</Label>
          <Input 
            placeholder="Enter mother's name"
            value={formData.motherName}
            onChange={(e) => onChange('motherName', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Mother's NID</Label>
          <Input 
            placeholder="Enter NID number"
            value={formData.motherNID}
            onChange={(e) => onChange('motherNID', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input 
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.gender}
            onChange={(e) => onChange('gender', e.target.value)}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Blood Group</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.bloodGroup}
            onChange={(e) => onChange('bloodGroup', e.target.value)}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>NID Number</Label>
          <Input 
            placeholder="Enter NID number"
            value={formData.nid}
            onChange={(e) => onChange('nid', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Birth Certificate No.</Label>
          <Input 
            placeholder="Enter birth certificate number"
            value={formData.birthCertificate}
            onChange={(e) => onChange('birthCertificate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Religion</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.religion}
            onChange={(e) => onChange('religion', e.target.value)}
          >
            <option value="">Select Religion</option>
            <option value="islam">Islam</option>
            <option value="hinduism">Hinduism</option>
            <option value="christianity">Christianity</option>
            <option value="buddhism">Buddhism</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Nationality</Label>
          <Input 
            placeholder="Enter nationality"
            value={formData.nationality}
            onChange={(e) => onChange('nationality', e.target.value)}
            defaultValue="Bangladeshi"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Marital Status</Label>
        <select 
          className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
          value={formData.maritalStatus}
          onChange={(e) => onChange('maritalStatus', e.target.value)}
        >
          <option value="">Select Marital Status</option>
          {maritalStatuses.map(ms => (
            <option key={ms} value={ms.toLowerCase()}>{ms}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

