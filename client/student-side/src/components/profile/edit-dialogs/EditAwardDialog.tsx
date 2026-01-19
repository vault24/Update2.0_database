import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface Award {
  title: string;
  issuer: string;
  year: string;
}

interface EditAwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  award?: Award;
  onSave: (award: Award) => void;
  isNew?: boolean;
}

const emptyAward: Award = {
  title: '',
  issuer: '',
  year: '',
};

export function EditAwardDialog({ open, onOpenChange, award, onSave, isNew = false }: EditAwardDialogProps) {
  const [form, setForm] = useState<Award>(award || emptyAward);

  useEffect(() => {
    if (open) {
      setForm(award || emptyAward);
    }
  }, [open, award]);

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Award' : 'Edit Award'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Award Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Best Teacher Award"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer">Issuing Organization *</Label>
            <Input
              id="issuer"
              value={form.issuer}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
              placeholder="e.g., Ministry of Education"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year *</Label>
            <Input
              id="year"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="e.g., 2023"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title || !form.issuer || !form.year}>
            {isNew ? 'Add' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
