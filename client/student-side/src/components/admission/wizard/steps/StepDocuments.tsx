import { Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AdmissionFormState } from '../types';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
}

export function StepDocuments({ formData, onChange }: Props) {
  const fileInput = (
    id: keyof AdmissionFormState,
    label: string,
    accept: string,
    helper?: string,
    required?: boolean
  ) => (
    <div className="space-y-2">
      <Label>
        {label} {required ? '*' : ''}
      </Label>
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <input
          type="file"
          className="hidden"
          id={String(id)}
          accept={accept}
          onChange={(e) => onChange(id, e.target.files?.[0] || null)}
          multiple={id === 'extraCertificates'}
        />
        <label htmlFor={String(id)} className="cursor-pointer">
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Click to upload</p>
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1">Documents Upload</h3>
        <p className="text-sm text-muted-foreground">Upload required documents (PDF, JPG, PNG)</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {fileInput('photo', 'Passport-size Photo', 'image/*', '300x300px, max 500KB', true)}
        {fileInput('sscMarksheet', 'SSC Marksheet', '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('sscCertificate', 'SSC Certificate (Optional)', '.pdf,image/*')}
        {fileInput('birthCertificateDoc', 'Birth Certificate', '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('studentNIDCopy', 'Student NID Copy (Optional)', '.pdf,image/*')}
        {fileInput('fatherNIDFront', "Father's NID (Front)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('fatherNIDBack', "Father's NID (Back)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('motherNIDFront', "Mother's NID (Front)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('motherNIDBack', "Mother's NID (Back)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('testimonial', 'Testimonial (Optional)', '.pdf,image/*', 'PDF or Image')}
        {fileInput('medicalCertificate', 'Medical Certificate (Optional)', '.pdf,image/*', 'PDF or Image')}
        {fileInput('quotaDocument', 'Quota Document (Optional)', '.pdf,image/*', 'PDF or Image')}
        {fileInput('extraCertificates', 'Extra Certificates (Optional)', '.pdf,image/*', 'PDF or Image')}
      </div>
    </div>
  );
}

