import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LinkedInTeacherProfile } from '@/components/profile/LinkedInTeacherProfile';
import { Building, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { settingsService } from '@/services/settingsService';

export default function PublicTeacherProfilePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const [instituteName, setInstituteName] = useState('Sylhet Polytechnic Institute');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await settingsService.getSystemSettings();
        if (settings.institute_name) {
          setInstituteName(settings.institute_name);
        }
      } catch (error) {
        console.warn('Could not fetch system settings:', error);
        // Keep default institute name
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Public Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Building className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold">Faculty Profile</p>
                  <p className="text-[10px] text-muted-foreground">{instituteName}</p>
                </div>
              </motion.div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="py-6 px-4">
        <LinkedInTeacherProfile isPublicView={true} teacherId={teacherId} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {instituteName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Faculty Profile • Public View
          </p>
        </div>
      </footer>
    </div>
  );
}
