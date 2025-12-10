import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdmissionFormState } from '../types';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
}

export function StepEducation({ formData, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1">Educational Background</h3>
        <p className="text-sm text-muted-foreground">Enter your SSC/equivalent exam details</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Board</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.sscBoard}
            onChange={(e) => onChange('sscBoard', e.target.value)}
          >
            <option value="">Select Board</option>
            <option value="dhaka">Dhaka</option>
            <option value="rajshahi">Rajshahi</option>
            <option value="comilla">Comilla</option>
            <option value="chittagong">Chittagong</option>
            <option value="jessore">Jessore</option>
            <option value="barisal">Barisal</option>
            <option value="sylhet">Sylhet</option>
            <option value="dinajpur">Dinajpur</option>
            <option value="madrasah">Madrasah</option>
            <option value="technical">Technical</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Roll Number</Label>
          <Input 
            placeholder="Enter roll number"
            value={formData.sscRoll}
            onChange={(e) => onChange('sscRoll', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Passing Year</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.sscYear}
            onChange={(e) => onChange('sscYear', e.target.value)}
          >
            <option value="">Select Year</option>
            {[2024, 2023, 2022, 2021, 2020, 2019].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>GPA</Label>
          <Input 
            placeholder="e.g., 4.50"
            value={formData.sscGPA}
            onChange={(e) => onChange('sscGPA', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Group</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.sscGroup}
            onChange={(e) => onChange('sscGroup', e.target.value)}
          >
            <option value="">Select Group</option>
            <option value="science">Science</option>
            <option value="commerce">Commerce</option>
            <option value="arts">Arts</option>
            <option value="vocational">Vocational</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Institution Name</Label>
        <Input 
          placeholder="Enter your school/institution name"
          value={formData.sscInstitution}
          onChange={(e) => onChange('sscInstitution', e.target.value)}
        />
      </div>
    </div>
  );
}

