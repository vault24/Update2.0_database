import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Course } from '@/services/alumniService';

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSave: (course: Omit<Course, 'id'> | Course) => void;
}

export function EditCourseDialog({ open, onOpenChange, course, onSave }: EditCourseDialogProps) {
  const [formData, setFormData] = useState<Omit<Course, 'id'>>({
    name: '',
    provider: '',
    status: 'completed',
    completionDate: '',
    certificateId: '',
    certificateUrl: '',
    description: '',
  });

  useEffect(() => {
    if (open) {
      if (course) {
        setFormData({
          name: course.name,
          provider: course.provider,
          status: course.status,
          completionDate: course.completionDate || '',
          certificateId: course.certificateId || '',
          certificateUrl: course.certificateUrl || '',
          description: course.description || '',
        });
      } else {
        setFormData({
          name: '',
          provider: '',
          status: 'completed',
          completionDate: '',
          certificateId: '',
          certificateUrl: '',
          description: '',
        });
      }
    }
  }, [open, course]);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.provider.trim()) return;
    
    if (course) {
      onSave({ ...formData, id: course.id });
    } else {
      onSave(formData);
    }
    onOpenChange(false);
  };

  const isEditing = !!course;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Course' : 'Add Course'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Course Name */}
          <div className="space-y-2">
            <Label>Course Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., AWS Solutions Architect"
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider / Platform</Label>
            <Input
              value={formData.provider}
              onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
              placeholder="e.g., Coursera, Udemy, AWS"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Course['status']) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Completion Date */}
          <div className="space-y-2">
            <Label>Completion Date</Label>
            <Input
              type="month"
              value={formData.completionDate}
              onChange={(e) => setFormData(prev => ({ ...prev, completionDate: e.target.value }))}
            />
          </div>

          {/* Certificate ID */}
          <div className="space-y-2">
            <Label>Certificate ID (optional)</Label>
            <Input
              value={formData.certificateId}
              onChange={(e) => setFormData(prev => ({ ...prev, certificateId: e.target.value }))}
              placeholder="e.g., CERT-12345"
            />
          </div>

          {/* Certificate URL */}
          <div className="space-y-2">
            <Label>Certificate URL (optional)</Label>
            <Input
              value={formData.certificateUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, certificateUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what you learned..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.name.trim() || !formData.provider.trim()}>
            {isEditing ? 'Save Changes' : 'Add Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
