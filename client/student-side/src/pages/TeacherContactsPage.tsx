import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Search, User, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { teacherService, type Teacher } from '@/services/teacherService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function TeacherContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await teacherService.getTeachers({
        page_size: 100,
        ordering: 'fullNameEnglish'
      });
      
      setTeachers(response.results);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load teachers', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    (teacher.fullNameEnglish && teacher.fullNameEnglish.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (teacher.department?.name && teacher.department.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (teacher.subjects && teacher.subjects.some(s => s && s.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Teachers</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchTeachers}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary-foreground" />
          </div>
          Teacher Contacts
        </h1>
        <p className="text-muted-foreground mt-1">Contact information for all teachers</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, department, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11"
        />
      </motion.div>

      {/* Teacher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher, index) => (
          <motion.div
            key={teacher.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 rounded-xl hover:shadow-card-hover transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center text-primary-foreground flex-shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{teacher.fullNameEnglish || 'N/A'}</h3>
                <p className="text-sm text-primary font-medium">{teacher.designation || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{teacher.department?.name || 'N/A'}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <a
                href={`tel:${teacher.mobileNumber || ''}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <span className="truncate">{teacher.mobileNumber || 'N/A'}</span>
              </a>

              <a
                href={`mailto:${teacher.email || ''}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="truncate">{teacher.email || 'N/A'}</span>
              </a>

              {teacher.officeLocation && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground truncate">{teacher.officeLocation}</span>
                </div>
              )}
            </div>

            {teacher.subjects && teacher.subjects.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {teacher.subjects.filter(subject => subject).map(subject => (
                  <span
                    key={subject}
                    className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground">No teachers found matching your search.</p>
        </motion.div>
      )}
    </div>
  );
}
