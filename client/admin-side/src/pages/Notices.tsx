import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Eye, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { noticeService, Notice, NoticeCreateUpdate } from '@/services/noticeService';

const priorityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  normal: 'bg-gray-100 text-gray-800 border-gray-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

const priorityLabels = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState<NoticeCreateUpdate>({
    title: '',
    content: '',
    priority: 'normal',
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [engagementSummary, setEngagementSummary] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadNotices();
    loadEngagementSummary();
  }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await noticeService.getNotices({ page_size: 50 });
      setNotices(response.results);
    } catch (err) {
      setError('Failed to load notices');
      console.error('Error loading notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementSummary = async () => {
    try {
      const summary = await noticeService.getEngagementSummary();
      setEngagementSummary(summary);
    } catch (err) {
      console.error('Error loading engagement summary:', err);
    }
  };

  const handleCreateNotice = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const newNotice = await noticeService.createNotice(formData);
      setNotices([newNotice, ...notices]);
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        is_published: true,
      });
      toast({
        title: 'Success',
        description: 'Notice created successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create notice',
        variant: 'destructive',
      });
      console.error('Error creating notice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditNotice = async () => {
    if (!editingNotice || !formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const updatedNotice = await noticeService.updateNotice(editingNotice.id, formData);
      setNotices(notices.map(n => n.id === editingNotice.id ? updatedNotice : n));
      setIsEditDialogOpen(false);
      setEditingNotice(null);
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        is_published: true,
      });
      toast({
        title: 'Success',
        description: 'Notice updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update notice',
        variant: 'destructive',
      });
      console.error('Error updating notice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (notice: Notice) => {
    if (!confirm(`Are you sure you want to delete "${notice.title}"?`)) {
      return;
    }

    try {
      await noticeService.deleteNotice(notice.id);
      setNotices(notices.filter(n => n.id !== notice.id));
      toast({
        title: 'Success',
        description: 'Notice deleted successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete notice',
        variant: 'destructive',
      });
      console.error('Error deleting notice:', err);
    }
  };

  const openEditDialog = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      is_published: notice.is_published,
    });
    setIsEditDialogOpen(true);
  };

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || notice.priority === priorityFilter;
    const matchesPublished = publishedFilter === 'all' || 
                           (publishedFilter === 'published' && notice.is_published) ||
                           (publishedFilter === 'unpublished' && !notice.is_published);
    
    return matchesSearch && matchesPriority && matchesPublished;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadNotices} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notices & Updates</h1>
          <p className="text-muted-foreground">Manage announcements and communications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Notice</DialogTitle>
              <DialogDescription>
                Create a new notice to communicate with students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter notice title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter notice content"
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNotice} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Notice'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Engagement Summary */}
      {engagementSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Engagement Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{engagementSummary.total_notices}</div>
                <div className="text-sm text-muted-foreground">Total Notices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{engagementSummary.average_engagement}%</div>
                <div className="text-sm text-muted-foreground">Avg Engagement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{engagementSummary.high_engagement_notices}</div>
                <div className="text-sm text-muted-foreground">High Engagement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{engagementSummary.low_engagement_notices}</div>
                <div className="text-sm text-muted-foreground">Low Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={publishedFilter} onValueChange={setPublishedFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notices List */}
      {filteredNotices.length === 0 ? (
        <EmptyState
          title="No notices found"
          message="Create your first notice to start communicating with students"
          action={{
            label: "Create Notice",
            onClick: () => setIsCreateDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4">
          {filteredNotices.map((notice, index) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{notice.title}</CardTitle>
                        <Badge className={priorityColors[notice.priority]}>
                          {priorityLabels[notice.priority]}
                        </Badge>
                        {!notice.is_published && (
                          <Badge variant="secondary">Unpublished</Badge>
                        )}
                        {notice.is_low_engagement && notice.is_published && (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Low Engagement
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm text-muted-foreground">
                        Created by {notice.created_by_name} • {new Date(notice.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(notice)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteNotice(notice)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {notice.content}
                  </p>
                  {notice.is_published && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span>{notice.read_count} / {notice.total_students} read</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {notice.read_percentage >= 70 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : notice.read_percentage >= 40 ? (
                            <TrendingUp className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <span>{notice.read_percentage}% engagement</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Notice</DialogTitle>
            <DialogDescription>
              Update the notice information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter notice title"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter notice content"
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label htmlFor="edit-published">Published</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditNotice} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Notice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}