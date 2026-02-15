import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, Sparkles, Star, Plus, Edit, Trash2, Save, X, 
  Loader2, Eye, Calendar, User,
  MessageSquare, Search, RefreshCw, Globe, Clock,
  BookOpen, TrendingUp, Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  motivationService,
  type MotivationMessage,
  type CreateMotivationData,
  type MotivationStats
} from '@/services/motivationService';

const categoryConfig = {
  success: {
    icon: Star,
    label: 'Success',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200'
  },
  inspiration: {
    icon: Sparkles,
    label: 'Inspiration',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    borderColor: 'border-violet-200'
  },
  encouragement: {
    icon: Heart,
    label: 'Encouragement',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-200'
  },
  wisdom: {
    icon: Star,
    label: 'Wisdom',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200'
  },
  academic: {
    icon: BookOpen,
    label: 'Academic',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  career: {
    icon: TrendingUp,
    label: 'Career',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-200'
  },
  personal: {
    icon: User,
    label: 'Personal',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  spiritual: {
    icon: Star,
    label: 'Spiritual',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-200'
  }
};

export default function MotivationManagement() {
  const { toast } = useToast();
  
  // State
  const [motivations, setMotivations] = useState<MotivationMessage[]>([]);
  const [stats, setStats] = useState<MotivationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMotivationData>({
    title: '',
    message: '',
    author: '',
    category: 'inspiration',
    title_bn: '',
    message_bn: '',
    author_bn: '',
    title_ar: '',
    message_ar: '',
    author_ar: '',
    reference_source: '',
    reference_url: '',
    reference_date: '',
    reference_context: '',
    primary_language: 'bn',
    display_duration: 86400,
    priority: 5,
    is_active: true,
    is_featured: false,
    start_date: '',
    end_date: ''
  });

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    system_enabled: true,
    default_display_duration: 10,
    auto_rotate: true,
    rotation_interval: 45,
    enabled_categories: ['success', 'inspiration', 'encouragement', 'wisdom', 'academic', 'career', 'personal', 'spiritual'],
    schedules: [
      { start_time: '08:30', end_time: '10:00', category: 'success' },
      { start_time: '10:00', end_time: '12:00', category: 'academic' },
      { start_time: '12:00', end_time: '14:00', category: 'inspiration' },
      { start_time: '14:00', end_time: '16:00', category: 'career' },
      { start_time: '16:00', end_time: '18:00', category: 'encouragement' }
    ]
  });
  const [newSchedule, setNewSchedule] = useState({ start_time: '', end_time: '', category: 'inspiration' });

  // Fetch motivations
  const fetchMotivations = async () => {
    try {
      setLoading(true);
      const [motivationsResponse, statsResponse] = await Promise.all([
        motivationService.getAllMotivations({
          search: searchTerm || undefined,
          category: filterCategory !== 'all' ? filterCategory : undefined,
          is_active: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
          ordering: '-priority'
        }),
        motivationService.getStats()
      ]);
      
      setMotivations(motivationsResponse.results);
      setStats(statsResponse);
    } catch (error) {
      console.error('Error fetching motivations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch motivational messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save motivation
  const handleSave = async () => {
    if (!formData.message_bn?.trim() || !formData.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in Main Message (Bangla) and Category',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const normalizeDate = (value?: string) => (value && value.trim() ? value : undefined);
      const payload: CreateMotivationData = {
        ...formData,
        title: formData.title?.trim() || formData.title_bn?.trim() || formData.title_ar?.trim() || 'Motivation',
        message: formData.message?.trim() || formData.message_bn?.trim() || formData.message_ar?.trim() || '',
        author: formData.author?.trim() || formData.author_bn?.trim() || formData.author_ar?.trim() || 'Unknown',
        reference_date: normalizeDate(formData.reference_date),
        start_date: normalizeDate(formData.start_date),
        end_date: normalizeDate(formData.end_date),
      };
      
      if (editingId) {
        // Update existing
        const updated = await motivationService.updateMotivation(editingId, payload);
        setMotivations(prev => prev.map(m => 
          m.id === editingId ? updated : m
        ));
        toast({
          title: 'Success',
          description: 'Motivational message updated successfully',
        });
      } else {
        // Create new
        const newMotivation = await motivationService.createMotivation(payload);
        setMotivations(prev => [newMotivation, ...prev]);
        toast({
          title: 'Success',
          description: 'Motivational message created successfully',
        });
      }
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        author: '',
        category: 'inspiration',
        title_bn: '',
        message_bn: '',
        author_bn: '',
        title_ar: '',
        message_ar: '',
        author_ar: '',
        reference_source: '',
        reference_url: '',
        reference_date: '',
        reference_context: '',
        primary_language: 'bn',
        display_duration: 86400,
        priority: 5,
        is_active: true,
        is_featured: false,
        start_date: '',
        end_date: ''
      });
      setIsEditing(false);
      setEditingId(null);
      
      // Refresh stats
      const statsResponse = await motivationService.getStats();
      setStats(statsResponse);
    } catch (error) {
      console.error('Error saving motivation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save motivational message',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Edit motivation
  const handleEdit = (motivation: MotivationMessage) => {
    if (!motivation) return;
    
    setFormData({
      title: motivation.title || motivation.localized_title || '',
      message: motivation.message || motivation.localized_message || '',
      author: motivation.author || motivation.localized_author || '',
      category: motivation.category || 'inspiration',
      title_bn: motivation.title_bn || '',
      message_bn: motivation.message_bn || motivation.localized_message || '',
      author_bn: motivation.author_bn || '',
      title_ar: motivation.title_ar || '',
      message_ar: motivation.message_ar || '',
      author_ar: motivation.author_ar || '',
      reference_source: motivation.reference_source || '',
      reference_url: motivation.reference_url || '',
      reference_date: motivation.reference_date || '',
      reference_context: motivation.reference_context || '',
      primary_language: motivation.primary_language || 'en',
      display_duration: motivation.display_duration || 86400,
      priority: motivation.priority || 5,
      is_active: motivation.is_active !== undefined ? motivation.is_active : true,
      is_featured: motivation.is_featured !== undefined ? motivation.is_featured : false,
      start_date: motivation.start_date || '',
      end_date: motivation.end_date || ''
    });
    setEditingId(motivation.id || '');
    setIsEditing(true);
  };

  // Delete motivation
  const handleDelete = async (id?: string) => {
    if (!id) {
      toast({
        title: 'Invalid message',
        description: 'This message cannot be deleted because it has no valid ID.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await motivationService.deleteMotivation(id);
      setMotivations(prev => prev.filter(m => m.id !== id));
      toast({
        title: 'Success',
        description: 'Motivational message deleted successfully',
      });
      
      // Refresh stats
      const statsResponse = await motivationService.getStats();
      setStats(statsResponse);
    } catch (error) {
      console.error('Error deleting motivation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete motivational message',
        variant: 'destructive',
      });
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string | undefined, nextActive: boolean) => {
    if (!id) {
      toast({
        title: 'Invalid message',
        description: 'Cannot update status because message ID is missing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await motivationService.updateMotivation(id, { is_active: nextActive });
      setMotivations(prev => prev.map(m => 
        m.id === id 
          ? { ...m, is_active: nextActive, updated_at: new Date().toISOString() }
          : m
      ));
      toast({
        title: 'Success',
        description: `Message ${nextActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  // Toggle featured status
  const handleToggleFeatured = async (id?: string) => {
    if (!id) {
      toast({
        title: 'Invalid message',
        description: 'Cannot update featured status because message ID is missing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await motivationService.toggleFeatured(id);
      setMotivations(prev => prev.map(m => 
        m.id === id 
          ? { ...m, is_featured: response.is_featured, updated_at: new Date().toISOString() }
          : m
      ));
      toast({
        title: 'Success',
        description: response.message,
      });
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update featured status',
        variant: 'destructive',
      });
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      title: '',
      message: '',
      author: '',
      category: 'inspiration',
      title_bn: '',
      message_bn: '',
      author_bn: '',
      title_ar: '',
      message_ar: '',
      author_ar: '',
      reference_source: '',
      reference_url: '',
      reference_date: '',
      reference_context: '',
      primary_language: 'bn',
      display_duration: 86400,
      priority: 5,
      is_active: true,
      is_featured: false,
      start_date: '',
      end_date: ''
    });
    setIsEditing(false);
    setEditingId(null);
  };

  // Settings handlers
  const handleSaveSettings = async () => {
    try {
      await motivationService.updateSettings({
        is_enabled: settings.system_enabled,
        default_display_duration: settings.default_display_duration,
        auto_rotate: settings.auto_rotate,
        rotation_interval: settings.rotation_interval,
      });

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const handleAddSchedule = () => {
    if (!newSchedule.start_time || !newSchedule.end_time) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in start and end time',
        variant: 'destructive',
      });
      return;
    }
    setSettings({
      ...settings,
      schedules: [...settings.schedules, newSchedule]
    });
    setNewSchedule({ start_time: '', end_time: '', category: 'inspiration' });
  };

  const handleRemoveSchedule = (index: number) => {
    setSettings({
      ...settings,
      schedules: settings.schedules.filter((_, i) => i !== index)
    });
  };

  const toggleCategory = (category: string) => {
    if (settings.enabled_categories.includes(category)) {
      setSettings({
        ...settings,
        enabled_categories: settings.enabled_categories.filter(c => c !== category)
      });
    } else {
      setSettings({
        ...settings,
        enabled_categories: [...settings.enabled_categories, category]
      });
    }
  };

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const backendSettings = await motivationService.getSettings();
        setSettings(prev => ({
          ...prev,
          system_enabled: backendSettings.is_enabled,
          default_display_duration: backendSettings.default_display_duration,
          auto_rotate: backendSettings.auto_rotate,
          rotation_interval: backendSettings.rotation_interval,
        }));
      } catch (error) {
        console.error('Error loading motivation settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Filter motivations
  const filteredMotivations = motivations.filter(motivation => {
    if (!motivation) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         (motivation.title && motivation.title.toLowerCase().includes(searchLower)) ||
                         (motivation.message && motivation.message.toLowerCase().includes(searchLower)) ||
                         (motivation.author && motivation.author.toLowerCase().includes(searchLower)) ||
                         (motivation.title_bn && motivation.title_bn.toLowerCase().includes(searchLower)) ||
                         (motivation.message_bn && motivation.message_bn.toLowerCase().includes(searchLower)) ||
                         (motivation.author_bn && motivation.author_bn.toLowerCase().includes(searchLower));
    
    const matchesCategory = filterCategory === 'all' || (motivation.category && motivation.category === filterCategory);
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && motivation.is_active) ||
                         (filterStatus === 'inactive' && !motivation.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  useEffect(() => {
    fetchMotivations();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading motivational messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            Motivation Management
          </h1>
          <p className="text-muted-foreground">Manage inspirational messages for students</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button 
            onClick={() => setIsEditing(true)}
            className="gradient-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Message
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_messages || 0}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active_messages || 0}</p>
                <p className="text-xs text-muted-foreground">Active Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_views || 0}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_likes || 0}</p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="inspiration">Inspiration</SelectItem>
                <SelectItem value="encouragement">Encouragement</SelectItem>
                <SelectItem value="wisdom">Wisdom</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="career">Career</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="spiritual">Spiritual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchMotivations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMotivations.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Messages Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'No messages match your current filters.'
                  : 'Start by creating your first motivational message.'}
              </p>
              {!searchTerm && filterCategory === 'all' && filterStatus === 'all' && (
                <Button onClick={() => setIsEditing(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Message
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredMotivations.map((motivation, index) => {
            if (!motivation || !motivation.category) {
              return null;
            }
            
            const config = categoryConfig[motivation.category];
            if (!config) {
              return null;
            }
            
            const IconComponent = config.icon;
            
            return (
              <motion.div
                key={motivation.id || `${motivation.created_at || 'no-date'}-${motivation.title || 'untitled'}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "glass-card transition-all hover:shadow-lg",
                  !motivation.is_active && "opacity-60"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            config.bgColor
                          )}>
                            <IconComponent className={cn("w-4 h-4", config.color)} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {motivation.title || 'Untitled'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                config.color,
                                config.borderColor
                              )}>
                                {config.label}
                              </Badge>
                              <span>•</span>
                              <User className="w-3 h-3" />
                              <span>{motivation.author || 'Unknown'}</span>
                              <span>•</span>
                              <Calendar className="w-3 h-3" />
                              <span>{motivation.created_at ? new Date(motivation.created_at).toLocaleDateString() : 'Unknown'}</span>
                              <span>•</span>
                              <Eye className="w-3 h-3" />
                              <span>{motivation.view_count || 0} views</span>
                              <span>•</span>
                              <Heart className="w-3 h-3" />
                              <span>{motivation.like_count || 0} likes</span>
                              {motivation.is_featured && (
                                <>
                                  <span>•</span>
                                  <Star className="w-3 h-3 text-amber-500" />
                                  <span className="text-amber-600">Featured</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {motivation.message || 'No message available'}
                        </p>
                        
                        {motivation.reference_source && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <strong>Reference:</strong> {motivation.reference_source}
                            {motivation.reference_context && (
                              <span> - {motivation.reference_context}</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>{motivation.primary_language ? motivation.primary_language.toUpperCase() : 'EN'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{Math.round((motivation.display_duration || 86400) / 3600)}h display</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>Priority {motivation.priority || 1}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={motivation.is_active}
                          onCheckedChange={(checked) => handleToggleActive(motivation.id, checked)}
                          disabled={!motivation.id}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleFeatured(motivation.id)}
                          disabled={!motivation.id}
                          className={cn(
                            "h-8 w-8",
                            motivation.is_featured ? "text-amber-600" : "text-muted-foreground"
                          )}
                        >
                          <Star className={cn("w-4 h-4", motivation.is_featured && "fill-current")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(motivation)}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(motivation.id)}
                          disabled={!motivation.id}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              {editingId ? 'Edit Message' : 'Add New Message'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create or edit motivational messages for students.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Main Message (Bangla) */}
            <div className="space-y-2">
              <Label htmlFor="message_bn">Main Message (বাংলা) *</Label>
              <Textarea
                id="message_bn"
                value={formData.message_bn || ''}
                onChange={(e) => setFormData({ ...formData, message_bn: e.target.value })}
                placeholder="বাংলায় মূল বার্তা লিখুন..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {(formData.message_bn || '').length}/1000 characters
              </p>
            </div>

            {/* Main Message (Secondary Language) */}
            <div className="space-y-2">
              <Label htmlFor="message">Main Message (Secondary Language)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter message in secondary language (English/Arabic)..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.message.length}/1000 characters
              </p>
            </div>

            {/* Reference Field */}
            <div className="space-y-2">
              <Label htmlFor="reference_source">Reference (if have)</Label>
              <Input
                id="reference_source"
                value={formData.reference_source || ''}
                onChange={(e) => setFormData({ ...formData, reference_source: e.target.value })}
                placeholder="e.g., Book title, Author name, Source"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="inspiration">Inspiration</SelectItem>
                  <SelectItem value="encouragement">Encouragement</SelectItem>
                  <SelectItem value="wisdom">Wisdom</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="career">Career</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="spiritual">Spiritual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-primary-foreground"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingId ? 'Update' : 'Create'} Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Motivation System Settings
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configure system-level motivation visibility and rotation behavior.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* System Enable/Disable */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Enable Motivation System</p>
                    <p className="text-sm text-muted-foreground">
                      Turn the entire motivation system on or off
                    </p>
                  </div>
                  <Switch
                    checked={settings.system_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, system_enabled: checked })}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Display Duration */}
            <Card className="glass-card">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-medium">Message Display Duration</p>
                  <p className="text-sm text-muted-foreground">
                    How long each message stays visible on screen before disappearing
                  </p>
                </div>
                <Select 
                  value={settings.default_display_duration.toString()} 
                  onValueChange={(value) => setSettings({ ...settings, default_display_duration: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="20">20 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="1800">30 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="86400">1 day</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Auto Rotate Messages</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically switch to a different motivation message
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_rotate}
                    onCheckedChange={(checked) => setSettings({ ...settings, auto_rotate: checked })}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Label>Message Rotation Interval</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    How often to change to a different message
                  </p>
                  <Select
                    value={settings.rotation_interval.toString()}
                    onValueChange={(value) => setSettings({ ...settings, rotation_interval: parseInt(value, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="45">45 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                      <SelectItem value="7200">2 hours</SelectItem>
                      <SelectItem value="14400">4 hours</SelectItem>
                      <SelectItem value="28800">8 hours</SelectItem>
                      <SelectItem value="86400">24 hours (Daily)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Category Selection */}
            <Card className="glass-card">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-medium">Enabled Categories</p>
                  <p className="text-sm text-muted-foreground">
                    Select which categories should be shown to students
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const IconComponent = config.icon;
                    const isEnabled = settings.enabled_categories.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleCategory(key)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          isEnabled 
                            ? `${config.borderColor} ${config.bgColor}` 
                            : "border-muted bg-muted/20 opacity-50"
                        )}
                      >
                        <IconComponent className={cn("w-4 h-4", isEnabled ? config.color : "text-muted-foreground")} />
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Schedule System */}
            <Card className="glass-card">
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Schedule-Based Category Display
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Show specific categories at different times of the day
                  </p>
                </div>

                <Separator />

                {/* Existing Schedules */}
                <div className="space-y-2">
                  {settings.schedules.map((schedule, index) => {
                    const config = categoryConfig[schedule.category as keyof typeof categoryConfig];
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm font-medium">{schedule.start_time}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-sm font-medium">{schedule.end_time}</span>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className={cn(config.color, config.borderColor)}>
                            {config.label}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSchedule(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Add New Schedule */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Add New Schedule</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={newSchedule.start_time}
                        onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={newSchedule.end_time}
                        onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule_category">Category</Label>
                      <Select 
                        value={newSchedule.category} 
                        onValueChange={(value) => setNewSchedule({ ...newSchedule, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="inspiration">Inspiration</SelectItem>
                          <SelectItem value="encouragement">Encouragement</SelectItem>
                          <SelectItem value="wisdom">Wisdom</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="career">Career</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="spiritual">Spiritual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddSchedule}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings}
              className="gradient-primary text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
