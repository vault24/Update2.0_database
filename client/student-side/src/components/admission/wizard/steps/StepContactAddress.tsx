import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdmissionFormState } from '../types';
import { divisions } from '../stepConfig';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
}

export function StepContactAddress({ formData, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1">Contact & Address</h3>
        <p className="text-sm text-muted-foreground">Enter your contact details and addresses</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Mobile Number</Label>
          <Input 
            placeholder="01XXXXXXXXX"
            value={formData.mobile}
            onChange={(e) => onChange('mobile', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email Address</Label>
          <Input 
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Guardian's Mobile</Label>
          <Input 
            placeholder="01XXXXXXXXX"
            value={formData.guardianMobile}
            onChange={(e) => onChange('guardianMobile', e.target.value)}
          />
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h4 className="font-medium mb-4">Present Address</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea 
              placeholder="Enter your present address"
              value={formData.presentAddress}
              onChange={(e) => onChange('presentAddress', e.target.value)}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Division</Label>
              <select 
                className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
                value={formData.presentDivision}
                onChange={(e) => onChange('presentDivision', e.target.value)}
              >
                <option value="">Select Division</option>
                {divisions.map(d => (
                  <option key={d} value={d.toLowerCase()}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Input 
                placeholder="Enter district"
                value={formData.presentDistrict}
                onChange={(e) => onChange('presentDistrict', e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Upazila</Label>
              <Input 
                placeholder="Enter upazila"
                value={formData.presentUpazila}
                onChange={(e) => onChange('presentUpazila', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Police Station</Label>
              <Input 
                placeholder="Enter police station"
                value={formData.presentPoliceStation}
                onChange={(e) => onChange('presentPoliceStation', e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Post Office</Label>
              <Input 
                placeholder="Enter post office"
                value={formData.presentPostOffice}
                onChange={(e) => onChange('presentPostOffice', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Municipality/Union</Label>
              <Input 
                placeholder="Enter municipality/union"
                value={formData.presentMunicipalityUnion}
                onChange={(e) => onChange('presentMunicipalityUnion', e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Village/Neighborhood</Label>
              <Input 
                placeholder="Enter village/neighborhood"
                value={formData.presentVillageNeighborhood}
                onChange={(e) => onChange('presentVillageNeighborhood', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ward</Label>
              <Input 
                placeholder="Enter ward"
                value={formData.presentWard}
                onChange={(e) => onChange('presentWard', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Permanent Address</h4>
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox"
              checked={formData.sameAsPresent}
              onChange={(e) => onChange('sameAsPresent', e.target.checked)}
              className="rounded"
            />
            Same as present address
          </label>
        </div>
        {!formData.sameAsPresent && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea 
                placeholder="Enter your permanent address"
                value={formData.permanentAddress}
                onChange={(e) => onChange('permanentAddress', e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Division</Label>
                <select 
                  className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm"
                  value={formData.permanentDivision}
                  onChange={(e) => onChange('permanentDivision', e.target.value)}
                >
                  <option value="">Select Division</option>
                  {divisions.map(d => (
                    <option key={d} value={d.toLowerCase()}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Input 
                  placeholder="Enter district"
                  value={formData.permanentDistrict}
                  onChange={(e) => onChange('permanentDistrict', e.target.value)}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Upazila</Label>
                <Input 
                  placeholder="Enter upazila"
                  value={formData.permanentUpazila}
                  onChange={(e) => onChange('permanentUpazila', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Police Station</Label>
                <Input 
                  placeholder="Enter police station"
                  value={formData.permanentPoliceStation}
                  onChange={(e) => onChange('permanentPoliceStation', e.target.value)}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Post Office</Label>
                <Input 
                  placeholder="Enter post office"
                  value={formData.permanentPostOffice}
                  onChange={(e) => onChange('permanentPostOffice', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Municipality/Union</Label>
                <Input 
                  placeholder="Enter municipality/union"
                  value={formData.permanentMunicipalityUnion}
                  onChange={(e) => onChange('permanentMunicipalityUnion', e.target.value)}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Village/Neighborhood</Label>
                <Input 
                  placeholder="Enter village/neighborhood"
                  value={formData.permanentVillageNeighborhood}
                  onChange={(e) => onChange('permanentVillageNeighborhood', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ward</Label>
                <Input 
                  placeholder="Enter ward"
                  value={formData.permanentWard}
                  onChange={(e) => onChange('permanentWard', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

