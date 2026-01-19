import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface Education {
  degree: string;
  institution: string;
  year: string;
  field: string;
}

interface EditEducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  education?: Education;
  onSave: (education: Education) => void;
  isNew?: boolean;
}

const emptyEducation: Education = {
  degree: '',
  institution: '',
  year: '',
  field: '',
};

export function EditEducationDialog({ open, onOpenChange, education, onSave, isNew = false }: EditEducationDialogProps) {
  const [form, setForm] = useState<Education>(education || emptyEducation);

  useEffect(() => {
    if (open) {
      setForm(education || emptyEducation);
    }
  }, [open, education]);

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Education' : 'Edit Education'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="degree">Degree *</Label>
            <Input
              id="degree"
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              placeholder="e.g., Ph.D. in Computer Science"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution">Institution *</Label>
            <Input
              id="institution"
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              placeholder="e.g., University of Dhaka"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="field">Field of Study</Label>
            <Input
              id="field"
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
              placeholder="e.g., Artificial Intelligence"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Graduation Year *</Label>
            <Input
              id="year"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="e.g., 2020"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.degree || !form.institution || !form.year}>
            {isNew ? 'Add' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
