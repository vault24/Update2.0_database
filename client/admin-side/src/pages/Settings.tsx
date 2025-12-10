import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Building, GraduationCap, Calendar, Users, Save, Plus, Trash2, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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

export default function Settings() {
  const [instituteName, setInstituteName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', code: '' });
  const { toast } = useToast();

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
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
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
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error loading departments',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setDepartmentsLoading(false);
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
      
      // Refresh settings
      await fetchSettings();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg,
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
      const response = await apiClient.post<Department>('departments/', {
        name: newDepartment.name,
        code: newDepartment.code.toUpperCase(),
      });
      
      setDepartments([...departments, response]);
      setNewDepartment({ name: '', code: '' });
      toast({
        title: "Department Added",
        description: `${newDepartment.name} has been added successfully.`,
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error adding department',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setDepartmentsSaving(false);
    }
  };

  const handleRemoveDepartment = async (id: string) => {
    try {
      setDepartmentsSaving(true);
      await apiClient.delete(`departments/${id}/`);
      setDepartments(departments.filter(d => d.id !== id));
      toast({
        title: "Department Removed",
        description: "Department has been removed successfully.",
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error removing department',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setDepartmentsSaving(false);
    }
  };

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

  // Error state
  if (error && !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Error Loading Settings</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
              </div>
              <Button onClick={fetchSettings} className="gradient-primary text-primary-foreground">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure system settings and preferences</p>
      </div>

      <Tabs defaultValue="institute" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="institute" className="gap-2">
            <Building className="w-4 h-4" />
            Institute
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Academic
          </TabsTrigger>
        </TabsList>

        {/* Institute Settings */}
        <TabsContent value="institute" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
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
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Academic Settings */}
        <TabsContent value="academic" className="space-y-6">
          {/* Departments */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                    {departmentsSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </>
                    )}
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
      </Tabs>
    </div>
  );
}
