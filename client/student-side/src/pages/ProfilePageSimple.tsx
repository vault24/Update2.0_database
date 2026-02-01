import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProfilePageSimple() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
      setDebugInfo({
        user: user,
        timestamp: new Date().toISOString(),
        userRole: user?.role,
        relatedProfileId: user?.relatedProfileId,
        userName: user?.name,
        userEmail: user?.email
      });
    }
  }, [authLoading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Profile Error</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Profile Page</h1>
            <p className="text-muted-foreground">
              Welcome to your profile, {user?.name || 'User'}!
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-lg">{user?.name || 'Not available'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{user?.email || 'Not available'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Role</label>
            <p className="text-lg capitalize">{user?.role || 'Not available'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Student ID</label>
            <p className="text-lg">{user?.studentId || 'Not available'}</p>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 font-bold">✓</span>
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Profile Route Working!</h3>
            <p className="text-green-700">
              The profile route is accessible and rendering correctly. 
              The original ProfilePage component may have an error.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePageSimple;