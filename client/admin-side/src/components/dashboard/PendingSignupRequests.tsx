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
      setRequests(response.results || response.signup_requests || []);
      setPendingCount(response.count || 0);
    } catch (error) {
      console.error('Failed to fetch pending signup requests:', error);
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
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Pending Signup Requests
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
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Pending Signup Requests
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              {pendingCount} Pending
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {request.first_name} {request.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{request.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {request.requested_role.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(request.created_at)}
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
