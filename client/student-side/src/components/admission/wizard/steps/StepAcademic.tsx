import { Label } from '@/components/ui/label';
import { AdmissionFormState } from '../types';
import { Department } from '@/services/departmentService';
import { groups } from '../stepConfig';

interface Props {
  formData: AdmissionFormState;
  departments: Department[];
  onChange: (field: keyof AdmissionFormState, value: any) => void;
}

export function StepAcademic({ formData, departments, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1">Current Academic Information</h3>
        <p className="text-sm text-muted-foreground">Select your department and session details</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.department}
            onChange={(e) => onChange('department', e.target.value)}
            required
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Shift</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.shift}
            onChange={(e) => onChange('shift', e.target.value)}
          >
            <option value="">Select Shift</option>
            <option value="1st">1st Shift</option>
            <option value="2nd">2nd Shift</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Session</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.session}
            onChange={(e) => onChange('session', e.target.value)}
          >
            <option value="">Select Session</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Semester</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.semester}
            onChange={(e) => onChange('semester', e.target.value)}
          >
            <option value="">Select Semester</option>
            <option value="1st">1st Semester</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Admission Type</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.admissionType}
            onChange={(e) => onChange('admissionType', e.target.value)}
          >
            <option value="">Select Admission Type</option>
            <option value="regular">Regular</option>
            <option value="chance">Chance</option>
            <option value="migration">Migration</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Group (Optional)</Label>
          <select 
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
            value={formData.group}
            onChange={(e) => onChange('group', e.target.value)}
          >
            <option value="">Select Group</option>
            {groups.map(g => (
              <option key={g} value={g.toLowerCase()}>{g}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

