import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skill, SkillCategory } from '@/services/alumniService';

interface EditAlumniSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill?: Skill | null;
  onSave: (skill: Omit<Skill, 'id'> | Skill) => void;
}

export function EditAlumniSkillDialog({ open, onOpenChange, skill, onSave }: EditAlumniSkillDialogProps) {
  const [formData, setFormData] = useState<Omit<Skill, 'id'>>({
    name: '',
    category: 'technical',
    proficiency: 50,
  });

  useEffect(() => {
    if (open) {
      if (skill) {
        setFormData({
          name: skill.name,
          category: skill.category,
          proficiency: skill.proficiency,
        });
      } else {
        setFormData({
          name: '',
          category: 'technical',
          proficiency: 50,
        });
      }
    }
  }, [open, skill]);

  const handleSave = () => {
    if (!formData.name.trim()) return;
    
    if (skill) {
      onSave({ ...formData, id: skill.id });
    } else {
      onSave(formData);
    }
    onOpenChange(false);
  };

  const isEditing = !!skill;

  const categoryLabels: Record<SkillCategory, string> = {
    technical: 'Technical Skills',
    soft: 'Soft Skills',
    language: 'Languages',
    other: 'Other Skills',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Skill Name */}
          <div className="space-y-2">
            <Label>Skill Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., React.js, Communication, English"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: SkillCategory) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryLabels) as SkillCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proficiency */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Proficiency Level</Label>
              <span className="text-sm text-muted-foreground">{formData.proficiency}%</span>
            </div>
            <Slider
              value={[formData.proficiency]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, proficiency: value }))}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Expert</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.name.trim()}>
            {isEditing ? 'Save Changes' : 'Add Skill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
