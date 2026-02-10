import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CareerHighlight, HighlightType } from '@/services/alumniService';

interface EditHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight?: CareerHighlight | null;
  onSave: (highlight: Omit<CareerHighlight, 'id'> | CareerHighlight) => void;
}

export function EditHighlightDialog({ open, onOpenChange, highlight, onSave }: EditHighlightDialogProps) {
  const [formData, setFormData] = useState<Omit<CareerHighlight, 'id'>>({
    title: '',
    description: '',
    date: '',
    type: 'achievement',
  });

  useEffect(() => {
    if (open) {
      if (highlight) {
        setFormData({
          title: highlight.title,
          description: highlight.description,
          date: highlight.date,
          type: highlight.type,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          date: '',
          type: 'achievement',
        });
      }
    }
  }, [open, highlight]);

  const handleSave = () => {
    if (!formData.title.trim()) return;
    
    if (highlight) {
      onSave({ ...formData, id: highlight.id });
    } else {
      onSave(formData);
    }
    onOpenChange(false);
  };

  const isEditing = !!highlight;

  const typeLabels: Record<HighlightType, string> = {
    achievement: 'Achievement',
    milestone: 'Milestone',
    award: 'Award',
    project: 'Project',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Highlight' : 'Add Highlight'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Best Graduate Award"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: HighlightType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(typeLabels) as HighlightType[]).map((type) => (
                  <SelectItem key={type} value={type}>{typeLabels[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="month"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your achievement..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.title.trim()}>
            {isEditing ? 'Save Changes' : 'Add Highlight'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
