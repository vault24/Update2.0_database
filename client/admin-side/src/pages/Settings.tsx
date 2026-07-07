import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Building, GraduationCap, Calendar, Users, Save, Plus, Trash2, Upload, 
  Loader2, AlertCircle, User, Lock, Bell, Palette, Shield, Eye, EyeOff, Moon, Sun, Monitor,
  Mail, Phone, Camera, Key, Smartphone, Globe, Database, Server, Clock, CheckCircle2, XCircle,
  Heart, MessageSquare, Megaphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useInterfaceMode } from '@/contexts/InterfaceModeContext';
import { getRoleLabel, resolveAdminRole } from '@/config/permissions';
import { Sparkles, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { settingsService, type SystemSettings } from '@/services/settingsService';
import departmentService from '@/services/departmentService';
import { getErrorMessage } from '@/lib/api';
import { apiClient } from '@/lib/api';

// Local-only preference keys (settings without backend persistence are stored here)
const NOTIF_PREFS_KEY = 'admin_notification_prefs';
const SYSTEM_PREFS_KEY = 'admin_system_prefs';

function loadLocalPrefs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

// Department interface
interface Department {
  id: string;
  name: string;
  code: string;
  studentCount?: number;
  teacherCount?: number;
}

// Admin profile interface
interface AdminProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  /** Shift managed by a Department Head ('1st_shift' | '2nd_shift' | ''). */
  shift?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth(); // Get user from AuthContext
  const {
    mode, isAdvanced, toggleMode, isSaving: modeSaving,
    alumniVisible, setAlumniVisible, isSavingAlumni,
  } = useInterfaceMode();
  
  // Profile state
  const [profile, setProfile] = useState<AdminProfile>({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    role: '',
    lastLogin: '',
    createdAt: ''
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Avatar / logo / signature upload + security-action state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  
  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    newAdmission: true,
    newApplication: true,
    correctionRequest: true,
    systemAlerts: true,
    dailyDigest: false,
    weeklyReport: true
  });
  
  // System settings
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    maintenanceNoticeEnabled: false,
    maintenanceNoticeText: '',
    allowRegistration: true,
    allowAdmission: true,
    autoBackup: true,
    twoFactorAuth: false,
    sessionTimeout: '30',
    language: 'en',
    timezone: 'Asia/Dhaka',
    dateFormat: 'DD/MM/YYYY'
  });
  
  // Institute settings
  const [instituteName, setInstituteName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', code: '' });

  // API state
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsSaving, setDepartmentsSaving] = useState(false);

  // Fetch settings and departments on mount, and initialize profile from AuthContext
  useEffect(() => {
    fetchSettings();
    fetchDepartments();
    
    // Initialize profile from AuthContext user
    if (user) {
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || user.username || 'User';
      
      // Map role to display name (Principal / Department Head / Registrar)
      const roleDisplay = getRoleLabel(resolveAdminRole(user));

      setProfile({
        id: user.id || '',
        fullName: fullName,
        email: user.email || '',
        phone: '', // Will be fetched from API
        role: roleDisplay,
        department: (user.department as string) || '',
        shift: user.shift || '',
        lastLogin: '',
        createdAt: ''
      });
    }
    
    // Fetch additional profile data from API
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await apiClient.get<any>('auth/me/');

      // The response has user data nested in a 'user' property
      const userData = response.user || response;
      
      // Build full name from first_name and last_name
      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || userData.username || 'User';
      
      // Map role to display name (Principal / Department Head / Registrar)
      const roleDisplay = getRoleLabel(resolveAdminRole(userData));

      setProfile({
        id: userData.id || '',
        fullName: fullName,
        email: userData.email || '',
        phone: userData.mobile_number || '',
        role: roleDisplay,
        department: userData.department || '',
        shift: userData.shift || '',
        avatar: userData.profile_photo_url || undefined,
        lastLogin: userData.last_login || '',
        createdAt: userData.date_joined || ''
      });
      setTwoFactorEnabled(!!userData.two_factor_enabled);
      setSignatureUrl(userData.signature_url || null);
      // Per-user email preference (controls ALL non-OTP emails for this account)
      if (typeof userData.email_notifications_enabled === 'boolean') {
        setNotifications((prev) => ({ ...prev, emailNotifications: userData.email_notifications_enabled }));
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      // Don't show error toast if we already have user data from AuthContext
      if (!user) {
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getSettings();
      setSettings(data);

      // Populate institute form fields
      setInstituteName(data.institute_name || '');
      setEmail(data.institute_email || '');
      setPhone(data.institute_phone || '');
      setAddress(data.institute_address || '');
      setLogoUrl(data.institute_logo || null);

      // Populate access-control / maintenance from backend (merge with local-only prefs)
      setSystemSettings((prev) => ({
        ...prev,
        ...loadLocalPrefs(SYSTEM_PREFS_KEY, {}),
        allowRegistration: data.allow_student_registration ?? prev.allowRegistration,
        allowAdmission: data.allow_admission_submission ?? prev.allowAdmission,
        maintenanceMode: data.maintenance_mode ?? prev.maintenanceMode,
        maintenanceNoticeEnabled: data.maintenance_notice_enabled ?? prev.maintenanceNoticeEnabled,
        maintenanceNoticeText: data.maintenance_notice_text ?? prev.maintenanceNoticeText,
      }));

      // Populate notification channels from backend (merge with local-only
      // prefs). Email is a per-user preference loaded from the profile, so it
      // must never be overwritten by stale local values here.
      setNotifications((prev) => {
        const { emailNotifications: _ignored, ...localPrefs } = loadLocalPrefs(NOTIF_PREFS_KEY, {}) as any;
        return {
          ...prev,
          ...localPrefs,
          smsNotifications: data.enable_sms_notifications ?? prev.smsNotifications,
        };
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      // Backend unreachable — fall back to any locally saved preferences
      setSystemSettings((prev) => ({ ...prev, ...loadLocalPrefs(SYSTEM_PREFS_KEY, {}) }));
      setNotifications((prev) => {
        const { emailNotifications: _ignored, ...localPrefs } = loadLocalPrefs(NOTIF_PREFS_KEY, {}) as any;
        return { ...prev, ...localPrefs };
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const response = await departmentService.getDepartments({ page_size: 100 });
      const mapped: Department[] = (response.results || []).map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code || d.short_name || '',
        studentCount: d.total_students,
      }));
      setDepartments(mapped);
    } catch (err) {
      // Leave the list empty on failure rather than showing fake departments
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Split full name into first and last name
      const nameParts = (profile.fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const payload: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        email: profile.email,
        mobile_number: profile.phone,
      };
      // Department Heads can set/update the department + shift they manage
      if (user?.role === 'department_head') {
        payload.department = profile.department || '';
        payload.shift = profile.shift || '';
      }
      await apiClient.put('auth/profile/', payload);

      setEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }
    if (passwords.new.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      await apiClient.post('auth/change-password/', {
        old_password: passwords.current,
        new_password: passwords.new,
      });
      
      setPasswords({ current: '', new: '', confirm: '' });
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInstitute = async () => {
    try {
      setSaving(true);
      await settingsService.updateSettings({
        institute_name: instituteName,
        institute_email: email,
        institute_phone: phone,
        institute_address: address,
      });
      
      toast({
        title: "Settings Saved",
        description: "Institute information has been updated successfully.",
      });
      
      await fetchSettings();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: "Error",
        description: errorMsg || "Failed to save institute information.",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      // Email is a per-user preference: disabling it stops ALL non-OTP emails
      // for this account (OTP / security emails are always delivered).
      await apiClient.put('auth/profile/', {
        email_notifications_enabled: notifications.emailNotifications,
      });
      // Persist the remaining channels backed by the API; keep the rest locally
      await settingsService.updateSettings({
        enable_sms_notifications: notifications.smsNotifications,
      });
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(notifications));
      toast({
        title: "Notifications Updated",
        description: notifications.emailNotifications
          ? "Your notification preferences have been saved."
          : "Email notifications disabled — OTP emails will still be sent.",
      });
      await fetchSettings();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg || 'Failed to save notification settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    try {
      setSaving(true);
      // Persist the fields the backend supports; keep UI-only prefs locally
      await settingsService.updateSettings({
        allow_student_registration: systemSettings.allowRegistration,
        allow_admission_submission: systemSettings.allowAdmission,
        maintenance_mode: systemSettings.maintenanceMode,
        maintenance_notice_enabled: systemSettings.maintenanceNoticeEnabled,
        maintenance_notice_text: systemSettings.maintenanceNoticeText,
      });
      localStorage.setItem(SYSTEM_PREFS_KEY, JSON.stringify(systemSettings));
      toast({
        title: "System Settings Updated",
        description: "System settings have been saved successfully.",
      });
      await fetchSettings();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg || 'Failed to save system settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.name || !newDepartment.code) {
      toast({
        title: "Validation Error",
        description: "Please provide both department name and code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDepartmentsSaving(true);
      await departmentService.createDepartment({
        name: newDepartment.name.trim(),
        code: newDepartment.code.trim().toUpperCase(),
        short_name: newDepartment.code.trim().toUpperCase(),
      });
      setNewDepartment({ name: '', code: '' });
      toast({
        title: "Department Added",
        description: `${newDepartment.name} has been added successfully.`,
      });
      await fetchDepartments();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error adding department',
        description: errorMsg || 'Failed to add department',
        variant: 'destructive',
      });
    } finally {
      setDepartmentsSaving(false);
    }
  };

  const handleRemoveDepartment = async (id: string) => {
    try {
      setDepartmentsSaving(true);
      await departmentService.deleteDepartment(id);
      toast({
        title: "Department Removed",
        description: "Department has been removed successfully.",
      });
      await fetchDepartments();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error removing department',
        description: errorMsg || 'Failed to remove department. It may have students or classes attached.',
        variant: 'destructive',
      });
    } finally {
      setDepartmentsSaving(false);
    }
  };

  const handleToggleMode = async () => {
    try {
      await toggleMode();
      toast({
        title: 'Interface Mode Updated',
        description: `Switched to ${isAdvanced ? 'Simple' : 'Advanced'} Mode.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update interface mode. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAlumni = async (visible: boolean) => {
    try {
      await setAlumniVisible(visible);
      toast({
        title: 'Alumni Visibility Updated',
        description: visible
          ? 'Alumni pages are now shown in the sidebar.'
          : 'Alumni pages are now hidden from the sidebar.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update alumni visibility. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be 5MB or smaller.', variant: 'destructive' });
      return;
    }
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('profile_photo', file);
      const res = await apiClient.post<any>('auth/profile/photo/', formData);
      const url = res?.user?.profile_photo_url || null;
      setProfile((prev) => ({ ...prev, avatar: url || undefined }));
      toast({ title: 'Photo Updated', description: 'Your profile photo has been updated.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: getErrorMessage(err) || 'Could not upload photo.', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be 5MB or smaller.', variant: 'destructive' });
      return;
    }
    try {
      setLogoUploading(true);
      const updated = await settingsService.uploadLogo(file);
      setLogoUrl(updated.institute_logo || null);
      toast({ title: 'Logo Updated', description: 'The institute logo has been updated.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: getErrorMessage(err) || 'Could not upload logo.', variant: 'destructive' });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSignatureSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Signature image must be 5MB or smaller.', variant: 'destructive' });
      return;
    }
    try {
      setSignatureUploading(true);
      const formData = new FormData();
      formData.append('signature', file);
      const res = await apiClient.post<any>('auth/profile/signature/', formData);
      setSignatureUrl(res?.user?.signature_url || null);
      toast({ title: 'Signature Updated', description: 'Your signature will appear on documents you approve.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: getErrorMessage(err) || 'Could not upload signature.', variant: 'destructive' });
    } finally {
      setSignatureUploading(false);
    }
  };

  const handleToggle2FA = async (checked: boolean) => {
    const previous = twoFactorEnabled;
    setTwoFactorEnabled(checked); // optimistic
    try {
      setTwoFactorSaving(true);
      await apiClient.post('auth/2fa/toggle/', { enabled: checked });
      toast({
        title: checked ? 'Two-Factor Enabled' : 'Two-Factor Disabled',
        description: checked
          ? 'You will be asked for an email code at your next login.'
          : 'Two-factor authentication has been turned off.',
      });
    } catch (err) {
      setTwoFactorEnabled(previous); // rollback
      toast({ title: 'Error', description: getErrorMessage(err) || 'Failed to update 2FA setting.', variant: 'destructive' });
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleRevokeSessions = async () => {
    try {
      setRevokingSessions(true);
      const res = await apiClient.post<{ count: number; message: string }>('auth/sessions/revoke-others/', {});
      toast({
        title: 'Sessions Signed Out',
        description: res?.message || 'Other sessions have been signed out.',
      });
    } catch (err) {
      toast({ title: 'Error', description: getErrorMessage(err) || 'Failed to sign out other sessions.', variant: 'destructive' });
    } finally {
      setRevokingSessions(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  // Loading state
  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and system preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="institute" className="gap-2">
            <Building className="w-4 h-4" />
            <span className="hidden sm:inline">Institute</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information and profile photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-primary/20">
                      <AvatarImage src={profile.avatar} alt={profile.fullName || 'User'} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {(profile.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelected}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 bg-background"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      title="Change profile photo"
                    >
                      {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{profile.fullName || 'User'}</h3>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {profile.role || 'Admin'}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Last login: {profile.lastLogin && profile.lastLogin !== 'null' ? new Date(profile.lastLogin).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profile.fullName || ''}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      disabled={!editingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profileEmail"
                        type="email"
                        value={profile.email || ''}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        disabled={!editingProfile}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profilePhone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profilePhone"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        disabled={!editingProfile}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile.role || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  {user?.role === 'department_head' && (
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={profile.department || ''}
                        onValueChange={(value) => setProfile({ ...profile, department: value })}
                        disabled={!editingProfile}
                      >
                        <SelectTrigger id="department" className={!editingProfile ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Select your department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}{dept.code ? ` (${dept.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {user?.role === 'department_head' && (
                    <div className="space-y-2">
                      <Label htmlFor="head-shift">Shift</Label>
                      <Select
                        value={profile.shift || ''}
                        onValueChange={(value) => setProfile({ ...profile, shift: value })}
                        disabled={!editingProfile}
                      >
                        <SelectTrigger id="head-shift" className={!editingProfile ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Select your shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1st_shift">1st Shift (Morning)</SelectItem>
                          <SelectItem value="2nd_shift">2nd Shift (Day)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Used to route captain requests and default the departments view to your shift.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  {editingProfile ? (
                    <>
                      <Button variant="outline" onClick={() => setEditingProfile(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="gradient-primary text-primary-foreground" 
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditingProfile(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Change Password */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    className="gradient-primary text-primary-foreground" 
                    onClick={handleChangePassword}
                    disabled={saving || !passwords.current || !passwords.new || !passwords.confirm}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Signature */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Approval Signature
                </CardTitle>
                <CardDescription>
                  This signature is composited onto documents you approve in the application workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSignatureSelected}
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-48 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                    {signatureUploading ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : signatureUrl ? (
                      <img src={signatureUrl} alt="Your signature" className="w-full h-full object-contain p-2" />
                    ) : (
                      <p className="text-xs text-muted-foreground">No signature uploaded</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" onClick={() => signatureInputRef.current?.click()} disabled={signatureUploading}>
                      <Upload className="w-4 h-4 mr-2" />
                      {signatureUrl ? 'Replace Signature' : 'Upload Signature'}
                    </Button>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Use a transparent PNG of your handwritten signature for best results.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Enable 2FA</p>
                    <p className="text-sm text-muted-foreground">
                      Require an emailed verification code when logging in
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={handleToggle2FA}
                    disabled={twoFactorSaving}
                    aria-label="Toggle two-factor authentication"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Manage your active login sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/20 rounded-full">
                      <Monitor className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-muted-foreground">Chrome on Windows • Sirajganj, BD</p>
                    </div>
                  </div>
                  <Badge className="bg-success text-success-foreground">Active</Badge>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={handleRevokeSessions}
                  disabled={revokingSessions}
                >
                  {revokingSessions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Sign Out All Other Sessions
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Interface Mode */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {isAdvanced ? (
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Layers className="w-5 h-5 text-primary" />
                  )}
                  Interface Mode
                </CardTitle>
                <CardDescription>
                  Choose how much functionality you want to see in the Admin Panel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                  isAdvanced
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isAdvanced
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                        : 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground'
                    }`}>
                      {isAdvanced ? <Sparkles className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {isAdvanced ? 'Advanced Mode' : 'Simple Mode'}
                        </p>
                        <Badge variant="outline" className="bg-background/60">
                          {getRoleLabel(resolveAdminRole(user))}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {isAdvanced
                          ? 'Showing every feature available for your role.'
                          : 'A clean, distraction-free view with only the essentials.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-medium ${!isAdvanced ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Simple
                    </span>
                    <Switch
                      checked={isAdvanced}
                      onCheckedChange={handleToggleMode}
                      disabled={modeSaving}
                      aria-label="Toggle interface mode"
                    />
                    <span className={`text-sm font-medium ${isAdvanced ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Advanced
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Advanced Mode never grants access beyond your role — it only reveals the
                  additional features your role already permits.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alumni sidebar visibility */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="glass-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Alumni
                </CardTitle>
                <CardDescription>
                  Show or hide the Alumni module in the sidebar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                  alumniVisible
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      alumniVisible
                        ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {alumniVisible ? 'Alumni Pages Visible' : 'Alumni Pages Hidden'}
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {alumniVisible
                          ? 'Alumni Directory and Alumni Requests are shown in the sidebar.'
                          : 'Alumni Directory and Alumni Requests are hidden from the sidebar.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={alumniVisible}
                      onCheckedChange={handleToggleAlumni}
                      disabled={isSavingAlumni}
                      aria-label="Toggle alumni pages visibility"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  This only controls sidebar visibility — alumni features keep working and their
                  pages stay reachable by direct link.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Theme Settings
                </CardTitle>
                <CardDescription>Customize the appearance of your dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Mode */}
                <div className="space-y-4">
                  <Label>Theme Mode</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          theme === option.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <option.icon className={`w-8 h-8 mx-auto mb-2 ${
                          theme === option.value ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <p className={`text-sm font-medium ${
                          theme === option.value ? 'text-primary' : 'text-foreground'
                        }`}>{option.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Color Preview */}
                <div className="space-y-4">
                  <Label>Color Palette Preview</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-primary" />
                      <p className="text-xs text-center text-muted-foreground">Primary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-secondary" />
                      <p className="text-xs text-center text-muted-foreground">Secondary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-success" />
                      <p className="text-xs text-center text-muted-foreground">Success</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-warning" />
                      <p className="text-xs text-center text-muted-foreground">Warning</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Interface Options */}
                <div className="space-y-4">
                  <Label>Interface Options</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Compact Mode</p>
                        <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Animations</p>
                        <p className="text-sm text-muted-foreground">Enable smooth transitions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Sidebar Collapsed</p>
                        <p className="text-sm text-muted-foreground">Start with sidebar minimized</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Notification Channels */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Channels
                </CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Notices, updates and announcements by email. Security (OTP) emails are always sent.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.smsNotifications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, smsNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Types */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Notification Types</CardTitle>
                <CardDescription>Select which events trigger notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'newAdmission', label: 'New Admissions', desc: 'When a new admission is submitted' },
                  { key: 'newApplication', label: 'New Applications', desc: 'When a new application is received' },
                  { key: 'correctionRequest', label: 'Correction Requests', desc: 'When students request corrections' },
                  { key: 'systemAlerts', label: 'System Alerts', desc: 'Important system notifications' },
                  { key: 'dailyDigest', label: 'Daily Digest', desc: 'Daily summary of activities' },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly analytics report' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications] as boolean}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Motivation Management */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Student Motivation
                </CardTitle>
                <CardDescription>Manage motivational quotes displayed in student welcome cards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Manage Motivational Section</p>
                      <p className="text-sm text-muted-foreground">Control inspirational quotes shown to students on their dashboard</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate('/motivation-management')}
                    className="gradient-primary text-primary-foreground"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">4</p>
                    <p className="text-xs text-muted-foreground">Active Messages</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">793</p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                className="gradient-primary text-primary-foreground" 
                onClick={handleSaveNotifications}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Institute Settings */}
        <TabsContent value="institute" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Institute Information
                </CardTitle>
                <CardDescription>Basic information about your institute</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="space-y-2">
                    <Label>Institute Logo</Label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelected}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !logoUploading && logoInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === 'Enter') logoInputRef.current?.click(); }}
                      className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors overflow-hidden"
                    >
                      {logoUploading ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      ) : logoUrl ? (
                        <img src={logoUrl} alt="Institute logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Upload Logo</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="instituteName">Institute Name</Label>
                      <Input
                        id="instituteName"
                        value={instituteName}
                        onChange={(e) => setInstituteName(e.target.value)}
                        placeholder="Sirajganj Polytechnic Institute"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instituteEmail">Email</Label>
                      <Input
                        id="instituteEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="info@sirajganjipi.edu.bd"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institutePhone">Phone</Label>
                      <Input
                        id="institutePhone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 751-000000"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="instituteAddress">Address</Label>
                      <Input
                        id="instituteAddress"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Sirajganj, Bangladesh"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    className="gradient-primary text-primary-foreground" 
                    onClick={handleSaveInstitute}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Departments */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Departments
                </CardTitle>
                <CardDescription>Manage academic departments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Department */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
                  <Input
                    placeholder="Department Name"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Code (e.g., CT)"
                    value={newDepartment.code}
                    onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value })}
                    className="w-full sm:w-32"
                  />
                  <Button onClick={handleAddDepartment} disabled={departmentsSaving}>
                    {departmentsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add
                  </Button>
                </div>

                {/* Department List */}
                <div className="space-y-2">
                  {departmentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : departments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No departments found. Add your first department above.
                    </div>
                  ) : (
                    departments.map((dept, index) => (
                      <motion.div
                        key={dept.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {dept.code}
                          </Badge>
                          <span className="font-medium">{dept.name}</span>
                          {dept.studentCount !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              ({dept.studentCount} students)
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveDepartment(dept.id)}
                          disabled={departmentsSaving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* General System Settings */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  System Configuration
                </CardTitle>
                <CardDescription>General system settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={systemSettings.language} onValueChange={(v) => setSystemSettings({ ...systemSettings, language: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={systemSettings.timezone} onValueChange={(v) => setSystemSettings({ ...systemSettings, timezone: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={systemSettings.dateFormat} onValueChange={(v) => setSystemSettings({ ...systemSettings, dateFormat: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Select value={systemSettings.sessionTimeout} onValueChange={(v) => setSystemSettings({ ...systemSettings, sessionTimeout: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access Control */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Access Control
                </CardTitle>
                <CardDescription>Manage registration and access settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Allow Student Registration</p>
                    <p className="text-sm text-muted-foreground">Enable student self-registration</p>
                  </div>
                  <Switch
                    checked={systemSettings.allowRegistration}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, allowRegistration: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Allow Admission Submission</p>
                    <p className="text-sm text-muted-foreground">Enable new admission applications</p>
                  </div>
                  <Switch
                    checked={systemSettings.allowAdmission}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, allowAdmission: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">Automatically backup data daily</p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, autoBackup: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Mode */}
            <Card className={`glass-card ${systemSettings.maintenanceMode ? 'border-warning/50' : ''}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className={`w-5 h-5 ${systemSettings.maintenanceMode ? 'text-warning' : 'text-primary'}`} />
                  Maintenance Mode
                </CardTitle>
                <CardDescription>Take the system offline for maintenance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <p className="font-medium">Enable Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Users will see a maintenance message</p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, maintenanceMode: checked })}
                  />
                </div>
                {systemSettings.maintenanceMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-warning/5 rounded-lg border border-warning/20"
                  >
                    <div className="flex items-center gap-2 text-warning mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">System is in maintenance mode</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The system is currently offline. Only administrators can access the dashboard.
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Maintenance Notice Banner (scrolling notice, site stays online) */}
            <Card className={`glass-card ${systemSettings.maintenanceNoticeEnabled ? 'border-primary/40' : ''}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Megaphone className={`w-5 h-5 ${systemSettings.maintenanceNoticeEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  Maintenance Notice Banner
                </CardTitle>
                <CardDescription>
                  Show a scrolling notice under the top bar for every user (the site stays fully usable).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/15">
                  <div>
                    <p className="font-medium">Show Notice Banner</p>
                    <p className="text-sm text-muted-foreground">All users will see your message scrolling under the top bar.</p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceNoticeEnabled}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, maintenanceNoticeEnabled: checked })}
                  />
                </div>

                {systemSettings.maintenanceNoticeEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="maintenanceNoticeText">Notice Message</Label>
                      <Textarea
                        id="maintenanceNoticeText"
                        rows={3}
                        maxLength={500}
                        placeholder="e.g. Our site is under maintenance — some features may be temporarily unavailable. Thank you for your patience."
                        value={systemSettings.maintenanceNoticeText}
                        onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceNoticeText: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {systemSettings.maintenanceNoticeText.length}/500
                      </p>
                    </div>

                    {/* Live preview of the scrolling banner */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Preview</p>
                      <div className="relative overflow-hidden rounded-lg bg-amber-500/15 border border-amber-500/30 py-2">
                        <div className="flex items-center gap-2 px-3 text-amber-700 dark:text-amber-400">
                          <Megaphone className="w-4 h-4 shrink-0" />
                          <div className="overflow-hidden flex-1">
                            <div className="whitespace-nowrap text-sm font-medium animate-[marquee_18s_linear_infinite]">
                              {systemSettings.maintenanceNoticeText || 'Your notice message will scroll here…'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                className="gradient-primary text-primary-foreground" 
                onClick={handleSaveSystem}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save System Settings
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
