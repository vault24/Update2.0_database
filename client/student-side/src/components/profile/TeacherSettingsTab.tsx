import { motion } from 'framer-motion';
import { 
  Bell, Moon, Sun, Globe, Lock, Shield, 
  Mail, Phone, Smartphone, Monitor, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface SettingSection {
  title: string;
  description: string;
  icon: typeof Bell;
  settings: {
    id: string;
    label: string;
    description: string;
    type: 'switch' | 'input';
    value?: boolean | string;
  }[];
}

const settingSections: SettingSection[] = [
  {
    title: 'Notifications',
    description: 'Configure how you receive notifications',
    icon: Bell,
    settings: [
      { id: 'email_notifications', label: 'Email Notifications', description: 'Receive updates via email', type: 'switch', value: true },
      { id: 'push_notifications', label: 'Push Notifications', description: 'Receive push notifications', type: 'switch', value: true },
      { id: 'sms_notifications', label: 'SMS Alerts', description: 'Important alerts via SMS', type: 'switch', value: false },
      { id: 'assignment_reminders', label: 'Assignment Reminders', description: 'Get reminded about pending assignments', type: 'switch', value: true },
    ],
  },
  {
    title: 'Privacy & Security',
    description: 'Manage your privacy and security settings',
    icon: Shield,
    settings: [
      { id: 'profile_visibility', label: 'Public Profile', description: 'Allow students to view your profile', type: 'switch', value: true },
      { id: 'show_email', label: 'Show Email', description: 'Display email on your profile', type: 'switch', value: true },
      { id: 'show_phone', label: 'Show Phone Number', description: 'Display phone on your profile', type: 'switch', value: false },
      { id: 'two_factor', label: 'Two-Factor Auth', description: 'Extra security for your account', type: 'switch', value: false },
    ],
  },
];

export function TeacherSettingsTab() {
  const [settings, setSettings] = useState<Record<string, boolean>>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    assignment_reminders: true,
    profile_visibility: true,
    show_email: true,
    show_phone: false,
    two_factor: false,
  });

  const handleToggle = (id: string) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Phone className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold">Contact Information</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">Update your contact details</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs md:text-sm">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                defaultValue="teacher@spi.edu.bd" 
                className="pl-10 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs md:text-sm">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="phone" 
                type="tel" 
                defaultValue="+880 1XXX-XXXXXX" 
                className="pl-10 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="office" className="text-xs md:text-sm">Office Location</Label>
            <Input 
              id="office" 
              type="text" 
              defaultValue="Room 301, Main Building" 
              className="text-sm"
            />
          </div>
        </div>

        <Button className="mt-4 gap-2" size="sm">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </motion.div>

      {/* Setting Sections */}
      {settingSections.map((section, sectionIndex) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * (sectionIndex + 1) }}
          className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <section.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold">{section.title}</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">{section.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {section.settings.map((setting, index) => (
              <div
                key={setting.id}
                className={cn(
                  "flex items-center justify-between py-3",
                  index !== section.settings.length - 1 && "border-b border-border"
                )}
              >
                <div>
                  <p className="text-xs md:text-sm font-medium">{setting.label}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{setting.description}</p>
                </div>
                <Switch
                  checked={settings[setting.id]}
                  onCheckedChange={() => handleToggle(setting.id)}
                />
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold">Appearance</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">Customize the app appearance</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button className="p-4 rounded-xl border-2 border-primary bg-card flex flex-col items-center gap-2 transition-all hover:bg-muted">
            <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">System</span>
          </button>
          <button className="p-4 rounded-xl border border-border bg-card flex flex-col items-center gap-2 transition-all hover:bg-muted">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs font-medium">Light</span>
          </button>
          <button className="p-4 rounded-xl border border-border bg-card flex flex-col items-center gap-2 transition-all hover:bg-muted">
            <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
              <Moon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium">Dark</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
