import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsService } from '@/services/settingsService';
import { getErrorMessage } from '@/lib/api';
import { 
  Settings, Bell, Lock, Palette, Globe, Monitor, Moon, Sun,
  Smartphone, Mail, MessageSquare, Shield,
  Key, Eye, EyeOff, Loader2, Check, UserCog, LogOut, Link2,
  Facebook, Twitter, Linkedin, Github, Instagram, Globe2, Plus, Trash2,
  ArrowRightLeft, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: React.ElementType;
}

const platformOptions = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'website', label: 'Personal Website', icon: Globe2 },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    classReminders: true,
    assignmentAlerts: true,
    examNotices: true,
    announcements: true,
    messages: true
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showAttendance: false,
    showMarks: false
  });

  // Language
  const [language, setLanguage] = useState('en');

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Account settings
  const [accountData, setAccountData] = useState({
    email: user?.email || '',
    username: user?.name || ''
  });
  const [savingAccount, setSavingAccount] = useState(false);

  // Update accountData when user changes
  useEffect(() => {
    if (user) {
      setAccountData({
        email: user.email || '',
        username: user.name || ''
      });
    }
  }, [user]);

  // Role switch request
  const [roleRequestReason, setRoleRequestReason] = useState('');
  const [requestedRole, setRequestedRole] = useState<string>('');
  const [submittingRoleRequest, setSubmittingRoleRequest] = useState(false);
  const [roleRequestDialogOpen, setRoleRequestDialogOpen] = useState(false);

  // Logout from all devices
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await settingsService.getPreferences();
        setNotifications(prefs.notifications);
        setPrivacy(prefs.privacy);
        setLanguage(prefs.language);
        
        const links = await settingsService.getSocialLinks();
        // Add icons to loaded links
        const linksWithIcons = links.map(link => {
          const platform = platformOptions.find(p => p.value === link.platform);
          return {
            ...link,
            icon: platform?.icon || Globe2
          };
        });
        
        setSocialLinks(linksWithIcons.length > 0 ? linksWithIcons : [
          { id: '1', platform: 'facebook', url: '', icon: Facebook },
        ]);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };
    
    loadPreferences();
  }, []);

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    
    try {
      await settingsService.updatePreferences({ notifications: newNotifications });
      toast.success('Notification preference updated');
    } catch (error) {
      toast.error('Failed to update preference');
      // Revert on error
      setNotifications(notifications);
    }
  };

  const handlePrivacyChange = async (key: keyof typeof privacy) => {
    const newPrivacy = { ...privacy, [key]: !privacy[key] };
    setPrivacy(newPrivacy);
    
    try {
      await settingsService.updatePreferences({ privacy: newPrivacy });
      toast.success('Privacy setting updated');
    } catch (error) {
      toast.error('Failed to update setting');
      // Revert on error
      setPrivacy(privacy);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await settingsService.changePassword({
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      });
      
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (error: any) {
      // Handle specific error messages from backend
      if (error?.old_password) {
        toast.error(Array.isArray(error.old_password) ? error.old_password[0] : error.old_password);
      } else if (error?.new_password) {
        toast.error(Array.isArray(error.new_password) ? error.new_password[0] : error.new_password);
      } else if (error?.confirm_password) {
        toast.error(Array.isArray(error.confirm_password) ? error.confirm_password[0] : error.confirm_password);
      } else {
        const errorMsg = getErrorMessage(error);
        toast.error(errorMsg || 'Failed to change password');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAccountUpdate = async () => {
    if (!accountData.email || !accountData.username) {
      toast.error('Email and username are required');
      return;
    }

    setSavingAccount(true);
    try {
      const nameParts = accountData.username.trim().split(' ');
      const response = await settingsService.updateAccount({
        email: accountData.email,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
      });
      
      toast.success('Account details updated successfully. Please refresh the page to see changes.');
      
      // Reload after a short delay to allow the toast to be seen
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      // Handle specific error messages from backend
      if (error?.email) {
        toast.error(Array.isArray(error.email) ? error.email[0] : error.email);
      } else if (error?.first_name) {
        toast.error(Array.isArray(error.first_name) ? error.first_name[0] : error.first_name);
      } else if (error?.last_name) {
        toast.error(Array.isArray(error.last_name) ? error.last_name[0] : error.last_name);
      } else {
        const errorMsg = getErrorMessage(error);
        toast.error(errorMsg || 'Failed to update account');
      }
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRoleRequest = async () => {
    if (!requestedRole || !roleRequestReason.trim()) {
      toast.error('Please select a role and provide a reason');
      return;
    }

    setSubmittingRoleRequest(true);
    try {
      await settingsService.submitRoleRequest({
        requested_role: requestedRole,
        reason: roleRequestReason,
      });
      
      toast.success('Role switch request submitted for admin approval');
      setRoleRequestDialogOpen(false);
      setRoleRequestReason('');
      setRequestedRole('');
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg || 'Failed to submit request');
    } finally {
      setSubmittingRoleRequest(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true);
    try {
      await settingsService.logoutAllDevices();
      toast.success('Logged out from all devices');
      logout();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg || 'Failed to logout');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const addSocialLink = () => {
    if (!newLinkPlatform || !newLinkUrl) {
      toast.error('Please select a platform and enter URL');
      return;
    }
    const platform = platformOptions.find(p => p.value === newLinkPlatform);
    if (!platform) return;

    setSocialLinks(prev => [...prev, {
      id: Date.now().toString(),
      platform: newLinkPlatform,
      url: newLinkUrl,
      icon: platform.icon
    }]);
    setNewLinkPlatform('');
    setNewLinkUrl('');
    toast.success('Social link added');
  };

  const removeSocialLink = (id: string) => {
    setSocialLinks(prev => prev.filter(link => link.id !== id));
    toast.success('Social link removed');
  };

  const saveSocialLinks = async () => {
    setSavingSocialLinks(true);
    try {
      // Remove icon property before saving (can't serialize React components)
      const linksToSave = socialLinks.map(({ icon, ...link }) => link);
      await settingsService.updateSocialLinks(linksToSave);
      toast.success('Social links saved');
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg || 'Failed to save links');
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'teacher': return 'Teacher';
      case 'captain': return 'Class Captain';
      default: return 'Student';
    }
  };

  const getAvailableRoles = () => {
    const currentRole = user?.role || 'student';
    const roles = [
      { value: 'student', label: 'Student' },
      { value: 'captain', label: 'Class Captain' },
    ];
    return roles.filter(r => r.value !== currentRole);
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your preferences as {getRoleLabel()}
        </p>
      </motion.div>

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Account</h3>
              <p className="text-sm text-muted-foreground">Manage your account details</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={accountData.email}
                onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                value={accountData.username}
                onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Your display name"
              />
            </div>

            <Button 
              onClick={handleAccountUpdate}
              disabled={savingAccount}
              className="w-full sm:w-auto"
            >
              {savingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Role Switch Request Section */}
        {user?.role !== 'teacher' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Account Type</h3>
                <p className="text-sm text-muted-foreground">Request to switch your account role</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Current Role</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {getRoleLabel()}
                    </Badge>
                  </div>
                </div>

                <Dialog open={roleRequestDialogOpen} onOpenChange={setRoleRequestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Request Switch
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Role Switch</DialogTitle>
                      <DialogDescription>
                        Submit a request to change your account type. This requires admin approval.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Switch to</Label>
                        <Select value={requestedRole} onValueChange={setRequestedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select new role" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableRoles().map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reason for request</Label>
                        <Textarea
                          value={roleRequestReason}
                          onChange={(e) => setRoleRequestReason(e.target.value)}
                          placeholder="Explain why you need this role change..."
                          rows={3}
                        />
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Role switch requests are reviewed by administrators. You'll be notified once your request is processed.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRoleRequestDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleRoleRequest}
                        disabled={submittingRoleRequest || !requestedRole || !roleRequestReason.trim()}
                      >
                        {submittingRoleRequest ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>
        )}

        {/* Social Links Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Social Links</h3>
              <p className="text-sm text-muted-foreground">Add your social media profiles</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {/* Existing Links */}
            {socialLinks.map((link) => {
              const platform = platformOptions.find(p => p.value === link.platform);
              const Icon = platform?.icon || Globe2;
              return (
                <div key={link.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    value={link.url}
                    onChange={(e) => {
                      setSocialLinks(prev => prev.map(l => 
                        l.id === link.id ? { ...l, url: e.target.value } : l
                      ));
                    }}
                    placeholder={`Enter your ${platform?.label || 'profile'} URL`}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocialLink(link.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            {/* Add New Link */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
              <Select value={newLinkPlatform} onValueChange={setNewLinkPlatform}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map(platform => (
                    <SelectItem key={platform.value} value={platform.value}>
                      <div className="flex items-center gap-2">
                        <platform.icon className="w-4 h-4" />
                        {platform.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="Profile URL"
                className="flex-1"
              />
              <Button variant="outline" onClick={addSocialLink}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            <Button 
              onClick={saveSocialLinks}
              disabled={savingSocialLinks}
              className="w-full sm:w-auto"
            >
              {savingSocialLinks ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Links
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-sm text-muted-foreground">Customize how the app looks</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Select your preferred theme</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className="gap-2"
                >
                  <Sun className="w-4 h-4" />
                  <span className="hidden sm:inline">Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => theme === 'light' && toggleTheme()}
                  className="gap-2"
                >
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline">Dark</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Manage notification preferences</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {/* Notification Channels */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Channels</p>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.email} 
                  onCheckedChange={() => handleNotificationChange('email')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.push} 
                  onCheckedChange={() => handleNotificationChange('push')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive SMS for urgent updates</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.sms} 
                  onCheckedChange={() => handleNotificationChange('sms')}
                />
              </div>
            </div>

            <Separator />

            {/* Notification Types */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Alert Types</p>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Class Reminders</span>
                  <Switch 
                    checked={notifications.classReminders} 
                    onCheckedChange={() => handleNotificationChange('classReminders')}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Assignment Alerts</span>
                  <Switch 
                    checked={notifications.assignmentAlerts} 
                    onCheckedChange={() => handleNotificationChange('assignmentAlerts')}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Exam Notices</span>
                  <Switch 
                    checked={notifications.examNotices} 
                    onCheckedChange={() => handleNotificationChange('examNotices')}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Announcements</span>
                  <Switch 
                    checked={notifications.announcements} 
                    onCheckedChange={() => handleNotificationChange('announcements')}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Direct Messages</span>
                  <Switch 
                    checked={notifications.messages} 
                    onCheckedChange={() => handleNotificationChange('messages')}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Privacy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Privacy</h3>
              <p className="text-sm text-muted-foreground">Control your privacy settings</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Show Profile to Others</p>
                <p className="text-sm text-muted-foreground">Allow classmates to view your profile</p>
              </div>
              <Switch 
                checked={privacy.showProfile} 
                onCheckedChange={() => handlePrivacyChange('showProfile')}
              />
            </div>

            {user?.role !== 'teacher' && (
              <>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Show Attendance</p>
                    <p className="text-sm text-muted-foreground">Display attendance on profile</p>
                  </div>
                  <Switch 
                    checked={privacy.showAttendance} 
                    onCheckedChange={() => handlePrivacyChange('showAttendance')}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Show Marks</p>
                    <p className="text-sm text-muted-foreground">Display marks on profile</p>
                  </div>
                  <Switch 
                    checked={privacy.showMarks} 
                    onCheckedChange={() => handlePrivacyChange('showMarks')}
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">Manage your account security</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {/* Change Password */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your account password</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? 'Cancel' : 'Change'}
              </Button>
            </div>

            {showPasswordSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-border"
              >
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handlePasswordChange}
                  disabled={savingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="w-full sm:w-auto"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            <Separator />

            {/* Logout from All Devices */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Logout from All Devices</p>
                  <p className="text-sm text-muted-foreground">Sign out from all active sessions</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Logout All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out from all devices including this one. You'll need to login again on each device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogoutAllDevices}
                      disabled={loggingOutAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loggingOutAll ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging out...
                        </>
                      ) : (
                        'Logout All Devices'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </motion.div>

        {/* Language Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Language</h3>
              <p className="text-sm text-muted-foreground">Choose your preferred language</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium">Display Language</p>
              <p className="text-sm text-muted-foreground">Select the language for the interface</p>
            </div>
            <Select value={language} onValueChange={async (value) => {
              setLanguage(value);
              try {
                await settingsService.updatePreferences({ language: value });
                toast.success('Language updated');
              } catch (error) {
                toast.error('Failed to update language');
                setLanguage(language); // Revert on error
              }
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
