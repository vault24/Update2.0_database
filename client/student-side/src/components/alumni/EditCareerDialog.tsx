import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { CareerEntry, CareerType } from '@/services/alumniService';

interface EditCareerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  career?: CareerEntry | null;
  onSave: (career: Omit<CareerEntry, 'id'> | CareerEntry) => void;
}

const toMonthInputValue = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  return value;
};

export function EditCareerDialog({ open, onOpenChange, career, onSave }: EditCareerDialogProps) {
  const [formData, setFormData] = useState<Omit<CareerEntry, 'id'>>({
    type: 'job',
    position: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    achievements: [],
    salary: '',
    degree: '',
    field: '',
    institution: '',
    businessName: '',
    businessType: '',
    otherType: '',
  });
  const [newAchievement, setNewAchievement] = useState('');

  useEffect(() => {
    if (open) {
      if (career) {
        setFormData({
          type: career.type,
          position: career.position,
          company: career.company,
          location: career.location,
          startDate: toMonthInputValue(career.startDate),
          endDate: toMonthInputValue(career.endDate),
          current: career.current,
          description: career.description,
          achievements: career.achievements || [],
          salary: career.salary || '',
          degree: career.degree || '',
          field: career.field || '',
          institution: career.institution || '',
          businessName: career.businessName || '',
          businessType: career.businessType || '',
          otherType: career.otherType || '',
        });
      } else {
        setFormData({
          type: 'job',
          position: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
          achievements: [],
          salary: '',
          degree: '',
          field: '',
          institution: '',
          businessName: '',
          businessType: '',
          otherType: '',
        });
      }
      setNewAchievement('');
    }
  }, [open, career]);

  const handleAddAchievement = () => {
    if (newAchievement.trim()) {
      setFormData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), newAchievement.trim()],
      }));
      setNewAchievement('');
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSave = () => {
    if (!formData.position.trim() || !formData.company.trim() || !formData.startDate) {
      return;
    }

    if (career) {
      onSave({ ...formData, id: career.id });
    } else {
      onSave(formData);
    }
    onOpenChange(false);
  };

  const isEditing = !!career;
  const isFormValid = !!formData.position.trim() && !!formData.company.trim() && !!formData.startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Career Entry' : 'Add Career Entry'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Career Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: CareerType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job">Employment</SelectItem>
                <SelectItem value="higherStudies">Higher Studies</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position/Title */}
          <div className="space-y-2">
            <Label>{formData.type === 'higherStudies' ? 'Degree/Program' : 'Position/Title'} *</Label>
            <Input
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder={formData.type === 'higherStudies' ? 'e.g., BSc in Computer Science' : 'e.g., Software Engineer'}
              required
            />
          </div>

          {/* Company/Institution */}
          <div className="space-y-2">
            <Label>{formData.type === 'higherStudies' ? 'Institution' : 'Company/Organization'} *</Label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              placeholder={formData.type === 'higherStudies' ? 'e.g., National University' : 'e.g., Tech Solutions Ltd.'}
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Dhaka, Bangladesh"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="month"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="month"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={formData.current}
              />
            </div>
          </div>

          {/* Current Position */}
          <div className="flex items-center justify-between">
            <Label>Currently Active</Label>
            <Switch
              checked={formData.current}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, current: checked, endDate: checked ? '' : prev.endDate }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your role and responsibilities..."
              rows={3}
            />
          </div>

          {/* Salary (for jobs) */}
          {formData.type === 'job' && (
            <div className="space-y-2">
              <Label>Salary (optional)</Label>
              <Input
                value={formData.salary}
                onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                placeholder="e.g., 50,000 BDT"
              />
            </div>
          )}

          {/* Achievements */}
          <div className="space-y-2">
            <Label>Achievements</Label>
            <div className="flex gap-2">
              <Input
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="Add an achievement"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAchievement())}
              />
              <Button type="button" size="icon" onClick={handleAddAchievement}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.achievements?.map((achievement, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  {achievement}
                  <button
                    onClick={() => handleRemoveAchievement(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {isEditing ? 'Save Changes' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
