import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, AlertTriangle, Info, Megaphone, Loader2, Eye, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { noticeService, Notice } from '@/services/noticeService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

const priorityConfig = {
  high: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'High Priority' },
  normal: { icon: Info, color: 'text-accent', bg: 'bg-accent/10', label: 'Normal' },
  low: { icon: Megaphone, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'Low Priority' },
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readStatusFilter, setReadStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedNotices, setSelectedNotices] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    loadNotices();
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

  const handleMarkAsRead = async (noticeId: number) => {
    try {
      await noticeService.markAsRead(noticeId);
      setNotices(notices.map(notice => 
        notice.id === noticeId 
          ? { ...notice, is_read: true }
          : notice
      ));
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotices.size === 0) return;
    
    try {
      setBulkActionLoading(true);
      const noticeIds = Array.from(selectedNotices);
      await noticeService.bulkMarkAsRead(noticeIds);
      
      // Update notices state
      setNotices(notices.map(notice => 
        selectedNotices.has(notice.id) 
          ? { ...notice, is_read: true }
          : notice
      ));
      
      // Clear selection
      setSelectedNotices(new Set());
    } catch (err) {
      console.error('Error bulk marking notices as read:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectNotice = (noticeId: number) => {
    const newSelected = new Set(selectedNotices);
    if (newSelected.has(noticeId)) {
      newSelected.delete(noticeId);
    } else {
      newSelected.add(noticeId);
    }
    setSelectedNotices(newSelected);
  };

  const handleSelectAll = () => {
    const unreadNotices = filteredNotices.filter(n => !n.is_read);
    if (selectedNotices.size === unreadNotices.length) {
      setSelectedNotices(new Set());
    } else {
      setSelectedNotices(new Set(unreadNotices.map(n => n.id)));
    }
  };

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || notice.priority === priorityFilter;
    const matchesReadStatus = readStatusFilter === 'all' || 
                             (readStatusFilter === 'read' && notice.is_read) ||
                             (readStatusFilter === 'unread' && !notice.is_read);
    
    return matchesSearch && matchesPriority && matchesReadStatus;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadNotices} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notices & Updates</h1>
          <p className="text-muted-foreground">Stay updated with important announcements</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {notices.filter(n => !n.is_read).length} unread
          </Badge>
          <Badge variant="outline">
            {notices.length} total
          </Badge>
          {selectedNotices.size > 0 && (
            <Button 
              onClick={handleBulkMarkAsRead}
              disabled={bulkActionLoading}
              size="sm"
              className="gap-2"
            >
              {bulkActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Mark {selectedNotices.size} as Read
            </Button>
          )}
        </div>
      </div>

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
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readStatusFilter} onValueChange={setReadStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            {filteredNotices.some(n => !n.is_read) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="gap-2"
              >
                {selectedNotices.size === filteredNotices.filter(n => !n.is_read).length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select All Unread
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notices List */}
      {filteredNotices.length === 0 ? (
        <EmptyState
          title="No notices found"
          message="No notices match your current filters"
          action={{
            label: "Clear Filters",
            onClick: () => {
              setSearchTerm('');
              setPriorityFilter('all');
              setReadStatusFilter('all');
            }
          }}
        />
      ) : (
        <div className="grid gap-4">
          {filteredNotices.map((notice, index) => {
            const config = priorityConfig[notice.priority];
            const TypeIcon = config.icon;
            const isExpanded = expandedId === notice.id;

            return (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`transition-all duration-200 ${
                  notice.is_read 
                    ? 'opacity-75 hover:opacity-100' 
                    : 'border-l-4 border-primary shadow-md'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {!notice.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectNotice(notice.id);
                            }}
                            className="mt-1 flex-shrink-0"
                          >
                            {selectedNotices.has(notice.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                        )}
                        <div 
                          className={`p-2 rounded-lg ${config.bg} flex-shrink-0 cursor-pointer`}
                          onClick={() => {
                            setExpandedId(isExpanded ? null : notice.id);
                            if (!notice.is_read && !isExpanded) {
                              handleMarkAsRead(notice.id);
                            }
                          }}
                        >
                          <TypeIcon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            setExpandedId(isExpanded ? null : notice.id);
                            if (!notice.is_read && !isExpanded) {
                              handleMarkAsRead(notice.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className={`text-lg ${
                              notice.is_read ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notice.title}
                            </CardTitle>
                            {!notice.is_read && (
                              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(notice.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            <span>By {notice.created_by_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bg} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                        {notice.is_read && (
                          <Badge variant="outline" className="gap-1">
                            <Eye className="w-3 h-3" />
                            Read
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <motion.div
                    initial={false}
                    animate={{ height: isExpanded ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {notice.content}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(notice.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </motion.div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}