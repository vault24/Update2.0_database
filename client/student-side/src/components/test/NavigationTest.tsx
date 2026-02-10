import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, User } from 'lucide-react';

export function NavigationTest() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Navigation Logic Test</CardTitle>
        <CardDescription>Testing semester-based navigation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p><strong>User:</strong> {user.name}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Semester:</strong> {user.semester || 'N/A'}</p>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Navigation Logic:</h4>
          {user.semester === 8 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <GraduationCap className="w-4 h-4" />
                <span>Shows "Alumni Profile" in navigation</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <User className="w-4 h-4" />
                <span>Provides button to view main profile</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>Shows regular "Profile" in navigation</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {user.semester === 8 
              ? "✅ Semester 8 student - Alumni profile navigation active"
              : "ℹ️ Regular student - Standard profile navigation"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}