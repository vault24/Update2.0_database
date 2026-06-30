import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCog, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import signupRequestService, { SignupRequest } from '@/services/signupRequestService';

export function PendingSignupRequests() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await signupRequestService.getSignupRequests({
        status: 'pending',
        page_size: 5,
      });
      // Backend returns { signup_requests: [...], count: X }
      const requestsData = response.results || response.signup_requests || [];
      // Filter out any invalid requests
      const validRequests = requestsData.filter((req: SignupRequest) => 
        req && req.id && req.first_name && req.last_name && req.email
      );
      setRequests(validRequests);
      setPendingCount(response.count || 0);
    } catch (error: any) {
      console.error('Failed to fetch pending signup requests:', error);
      // If 403, user doesn't have permission - just show empty state
      if (error?.response?.status === 403) {
        console.log('User does not have permission to view signup requests');
      }
      setRequests([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <UserCog className="w-[18px] h-[18px] text-muted-foreground" />
            Pending signup requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <UserCog className="w-[18px] h-[18px] text-muted-foreground" />
            Pending signup requests
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <UserCog className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pending signup requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {request.first_name} {request.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{request.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {request.requested_role?.replace('_', ' ') || 'N/A'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {request.created_at ? formatDate(request.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {pendingCount > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{pendingCount - 5} more pending request{pendingCount - 5 !== 1 ? 's' : ''}
              </p>
            )}

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/signup-requests')}
            >
              View All Requests
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
