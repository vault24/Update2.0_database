import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlumniProfile, SupportStatus } from '@/services/alumniService';

interface EditAlumniProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alumni: AlumniProfile;
  onSave: (data: Partial<AlumniProfile>) => void;
}

export function EditAlumniProfileDialog({ open, onOpenChange, alumni, onSave }: EditAlumniProfileDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentJob: '',
    company: '',
    location: '',
    bio: '',
    linkedin: '',
    portfolio: '',
    supportStatus: 'noSupportNeeded' as SupportStatus,
    higherStudiesInstitute: '',
    businessName: '',
  });

  useEffect(() => {
    if (open && alumni) {
      setFormData({
        name: alumni.name || '',
        email: alumni.email || '',
        phone: alumni.phone || '',
        currentJob: alumni.currentJob || '',
        company: alumni.company || '',
        location: alumni.location || '',
        bio: alumni.bio || '',
        linkedin: alumni.linkedin || '',
        portfolio: alumni.portfolio || '',
        supportStatus: alumni.supportStatus || 'noSupportNeeded',
        higherStudiesInstitute: alumni.higherStudiesInstitute || '',
        businessName: alumni.businessName || '',
      });
    }
  }, [open, alumni]);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) return;
    
    onSave(formData);
    onOpenChange(false);
  };

  const supportStatusLabels: Record<SupportStatus, string> = {
    noSupportNeeded: 'No Support Needed',
    needSupport: 'Need Support',
    needExtraSupport: 'Need Extra Support',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Alumni Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter current location"
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentJob">Current Job Title</Label>
              <Input
                id="currentJob"
                value={formData.currentJob}
                onChange={(e) => setFormData(prev => ({ ...prev, currentJob: e.target.value }))}
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="e.g., Tech Solutions Ltd."
              />
            </div>
          </div>

          {/* Support Status */}
          <div className="space-y-2">
            <Label>Support Status</Label>
            <Select
              value={formData.supportStatus}
              onValueChange={(value: SupportStatus) => setFormData(prev => ({ ...prev, supportStatus: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(supportStatusLabels) as SupportStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {supportStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="higherStudiesInstitute">Higher Studies Institute</Label>
              <Input
                id="higherStudiesInstitute"
                value={formData.higherStudiesInstitute}
                onChange={(e) => setFormData(prev => ({ ...prev, higherStudiesInstitute: e.target.value }))}
                placeholder="If pursuing higher studies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="If running a business"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <Input
                id="linkedin"
                value={formData.linkedin}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio Website</Label>
              <Input
                id="portfolio"
                value={formData.portfolio}
                onChange={(e) => setFormData(prev => ({ ...prev, portfolio: e.target.value }))}
                placeholder="https://yourportfolio.com"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself, your journey, and achievements..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!formData.name.trim() || !formData.email.trim()}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}