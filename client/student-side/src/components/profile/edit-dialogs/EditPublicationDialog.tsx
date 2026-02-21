import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface Publication {
  id?: string;
  title: string;
  journal: string;
  year: string;
  citations: number;
  link?: string;
}

interface EditPublicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication?: Publication;
  onSave: (publication: Publication) => void;
  isNew?: boolean;
}

const emptyPublication: Publication = {
  title: '',
  journal: '',
  year: '',
  citations: 0,
  link: '',
};

export function EditPublicationDialog({ open, onOpenChange, publication, onSave, isNew = false }: EditPublicationDialogProps) {
  const [form, setForm] = useState<Publication>(publication || emptyPublication);

  useEffect(() => {
    if (open) {
      setForm(publication || emptyPublication);
    }
  }, [open, publication]);

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Publication' : 'Edit Publication'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Publication Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Deep Learning Approaches for..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="journal">Journal/Conference *</Label>
            <Input
              id="journal"
              value={form.journal}
              onChange={(e) => setForm({ ...form, journal: e.target.value })}
              placeholder="e.g., Journal of Educational Technology"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="e.g., 2023"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="citations">Citations</Label>
              <Input
                id="citations"
                type="number"
                value={form.citations}
                onChange={(e) => setForm({ ...form, citations: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Link (optional)</Label>
            <Input
              id="link"
              value={form.link || ''}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title || !form.journal || !form.year}>
            {isNew ? 'Add' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
