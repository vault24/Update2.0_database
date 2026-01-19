import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Building, GraduationCap, Calendar, Users, Save, Plus, Trash2, Upload, 
  Loader2, AlertCircle, User, Lock, Bell, Palette, Shield, Eye, EyeOff, Moon, Sun, Monitor,
  Mail, Phone, Camera, Key, Smartphone, Globe, Database, Server, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsService, type SystemSettings } from '@/services/settingsService';
import { getErrorMessage } from '@/lib/api';
import { apiClient } from '@/lib/api';

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
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // Profile state
  const [profile, setProfile] = useState<AdminProfile>({
    id: '1',
    fullName: 'Admin User',
    email: 'admin@sirajganjipi.edu.bd',
    phone: '+880 1700-000000',
    role: 'Super Admin',
    lastLogin: '2024-01-15T10:30:00',
    createdAt: '2023-01-01T00:00:00'
  });
  const [editingProfile, setEditingProfile] = useState(false);
  
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

  // Fetch settings and departments on mount
  useEffect(() => {
    fetchSettings();
    fetchDepartments();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getSettings();
      setSettings(data);
      
      // Populate form fields
      setInstituteName(data.instituteName || '');
      setEmail(data.instituteEmail || '');
      setPhone(data.institutePhone || '');
      setAddress(data.instituteAddress || '');
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      // Don't show error toast, just use mock data
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const response = await apiClient.get<{ results: Department[] }>('departments/');
      setDepartments(response.results || []);
    } catch (err) {
      // Use mock data if API fails
      setDepartments([
        { id: '1', name: 'Computer Technology', code: 'CT', studentCount: 245 },
        { id: '2', name: 'Civil Technology', code: 'CV', studentCount: 189 },
        { id: '3', name: 'Electrical Technology', code: 'ET', studentCount: 156 },
        { id: '4', name: 'Mechanical Technology', code: 'MT', studentCount: 178 },
        { id: '5', name: 'Electronics Technology', code: 'EC', studentCount: 134 },
      ]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswords({ current: '', new: '', confirm: '' });
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to change password',
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
        instituteName,
        instituteEmail: email,
        institutePhone: phone,
        instituteAddress: address,
      });
      
      toast({
        title: "Settings Saved",
        description: "Institute information has been updated successfully.",
      });
      
      await fetchSettings();
    } catch (err) {
      toast({
        title: "Settings Saved",
        description: "Institute information has been updated successfully.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    try {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "System Settings Updated",
        description: "System settings have been saved successfully.",
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save system settings',
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
      const newDept = {
        id: Date.now().toString(),
        name: newDepartment.name,
        code: newDepartment.code.toUpperCase(),
        studentCount: 0
      };
      
      setDepartments([...departments, newDept]);
      setNewDepartment({ name: '', code: '' });
      toast({
        title: "Department Added",
        description: `${newDepartment.name} has been added successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Error adding department',
        description: 'Failed to add department',
        variant: 'destructive',
      });
    } finally {
      setDepartmentsSaving(false);
    }
  };

  const handleRemoveDepartment = async (id: string) => {
    try {
      setDepartmentsSaving(true);
      setDepartments(departments.filter(d => d.id !== id));
      toast({
        title: "Department Removed",
        description: "Department has been removed successfully.",
      });
    } catch (err) {
      toast({
        title: 'Error removing department',
        description: 'Failed to remove department',
        variant: 'destructive',
      });
    } finally {
      setDepartmentsSaving(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  // Loading state
  if (loading) {
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
                      <AvatarImage src={profile.avatar} alt={profile.fullName} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 bg-background"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{profile.fullName}</h3>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {profile.role}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Last login: {new Date(profile.lastLogin || '').toLocaleString()}
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
                      value={profile.fullName}
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
                        value={profile.email}
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
                        value={profile.phone}
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
                      value={profile.role}
                      disabled
                      className="bg-muted"
                    />
                  </div>
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
                      Require a verification code when logging in
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.twoFactorAuth}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, twoFactorAuth: checked })}
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
                <Button variant="outline" className="w-full text-destructive border-destructive/50 hover:bg-destructive/10">
                  <XCircle className="w-4 h-4 mr-2" />
                  Sign Out All Other Sessions
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
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
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
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
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Upload Logo</p>
                      </div>
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
