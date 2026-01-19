import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface ProfileHeaderData {
  name: string;
  headline: string;
  designation: string;
  department: string;
  university: string;
  officeLocation: string;
  email: string;
  phone: string;
  employeeId: string;
}

interface EditProfileHeaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProfileHeaderData;
  onSave: (data: ProfileHeaderData) => void;
}

export function EditProfileHeaderDialog({ open, onOpenChange, data, onSave }: EditProfileHeaderDialogProps) {
  const [form, setForm] = useState<ProfileHeaderData>(data);

  useEffect(() => {
    if (open) {
      setForm(data);
    }
  }, [open, data]);

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dr. Mohammad Rahman"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Textarea
              id="headline"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="Senior Lecturer | PhD in AI..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Senior Lecturer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                placeholder="TCH-2024-001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Computer Science & Engineering"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="university">University/Institute</Label>
            <Input
              id="university"
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              placeholder="Sylhet Polytechnic Institute"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officeLocation">Office Location</Label>
            <Input
              id="officeLocation"
              value={form.officeLocation}
              onChange={(e) => setForm({ ...form, officeLocation: e.target.value })}
              placeholder="Room 301, CSE Building"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@university.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+880 1712-345678"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.email}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
