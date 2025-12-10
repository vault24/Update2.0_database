import { User, MapPin, GraduationCap, BookOpen } from 'lucide-react';
import { AdmissionFormState } from '../types';

interface Props {
  formData: AdmissionFormState;
}

export function StepReview({ formData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">Please review your information before submitting</p>
      </div>

      <div className="space-y-4">
        <div className="bg-secondary/50 rounded-xl p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> Personal Information
          </h4>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {formData.fullNameEnglish || 'Not provided'}</p>
            <p><span className="text-muted-foreground">Father:</span> {formData.fatherName || 'Not provided'}</p>
            <p><span className="text-muted-foreground">Mother:</span> {formData.motherName || 'Not provided'}</p>
            <p><span className="text-muted-foreground">DOB:</span> {formData.dateOfBirth || 'Not provided'}</p>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Contact & Address
          </h4>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Mobile:</span> {formData.mobile || 'Not provided'}</p>
            <p><span className="text-muted-foreground">Email:</span> {formData.email || 'Not provided'}</p>
            <p><span className="text-muted-foreground">District:</span> {formData.presentDistrict || 'Not provided'}</p>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Educational Background
          </h4>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Board:</span> {formData.sscBoard || 'Not provided'}</p>
            <p><span className="text-muted-foreground">GPA:</span> {formData.sscGPA || 'Not provided'}</p>
            <p><span className="text-muted-foreground">Year:</span> {formData.sscYear || 'Not provided'}</p>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Academic Information
          </h4>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Department:</span> {formData.department || 'Not provided'}</p>
            <p><span className="text-muted-foreground">Shift:</span> {formData.shift || 'Not provided'}</p>
            <p><span className="text-muted-foreground">Session:</span> {formData.session || 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-xl border border-warning/20">
        <input type="checkbox" className="mt-1" id="confirm" />
        <label htmlFor="confirm" className="text-sm">
          I hereby declare that all the information provided above is true and correct to the best of my knowledge. I understand that any false information may result in cancellation of my admission.
        </label>
      </div>
    </div>
  );
}

