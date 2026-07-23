import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlumniProfileHeader } from '@/components/alumni/AlumniProfileHeader';
import { AlumniStatsCard } from '@/components/alumni/AlumniStatsCard';
import { CareerTimeline } from '@/components/alumni/CareerTimeline';
import { SkillsCard } from '@/components/alumni/SkillsCard';
import { HighlightsCard } from '@/components/alumni/HighlightsCard';
import { CoursesCard } from '@/components/alumni/CoursesCard';
import { EditCareerDialog } from '@/components/alumni/EditCareerDialog';
import { EditAlumniSkillDialog } from '@/components/alumni/EditAlumniSkillDialog';
import { EditHighlightDialog } from '@/components/alumni/EditHighlightDialog';
import { EditCourseDialog } from '@/components/alumni/EditCourseDialog';
import { EditAlumniProfileDialog } from '@/components/alumni/EditAlumniProfileDialog';
import {
  alumniService,
  AlumniProfile,
  CareerEntry,
  Skill,
  CareerHighlight,
  Course,
  getProfileCompletion,
} from '@/services/alumniService';
import { Sparkles, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

export default function AlumniProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alumni, setAlumni] = useState<AlumniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<CareerEntry | null>(null);
  
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<CareerHighlight | null>(null);
  
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchAlumniData();
  }, [user]);

  const fetchAlumniData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await alumniService.getProfile();
      setAlumni(data);
    } catch (err: any) {
      console.error('Failed to fetch alumni data:', err);
      
      // Set appropriate error message
      if (err.message?.includes('not found')) {
        setError('Alumni profile not found. You may not have an alumni profile yet. Please contact administration.');
      } else if (err.error) {
        setError(err.error);
      } else {
        setError('Failed to load profile data. Please try again.');
      }
      
      // Don't fallback to demo data for real users
      setAlumni(null);
    } finally {
      setLoading(false);
    }
  };

  // Profile handlers
  const handleEditProfile = () => {
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async (profileData: Partial<AlumniProfile>) => {
    if (!alumni) return;
    
    try {
      const updatedProfile = await alumniService.updateProfile(profileData);
      setAlumni(updatedProfile);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to update profile');
    }
  };

  // Career handlers
  const handleAddCareer = () => {
    setEditingCareer(null);
    setCareerDialogOpen(true);
  };

  const handleEditCareer = (career: CareerEntry) => {
    setEditingCareer(career);
    setCareerDialogOpen(true);
  };

  const handleSaveCareer = async (careerData: Omit<CareerEntry, 'id'> | CareerEntry) => {
    if (!alumni) return;
    
    try {
      if ('id' in careerData) {
        // Update existing
        await alumniService.updateCareer(careerData);
        setAlumni({
          ...alumni,
          careers: alumni.careers.map(c => c.id === careerData.id ? careerData : c),
        });
        toast.success('Career entry updated');
      } else {
        // Add new
        const newCareer = await alumniService.addCareer(careerData);
        setAlumni({
          ...alumni,
          careers: [...alumni.careers, newCareer],
        });
        toast.success('Career entry added');
      }
    } catch (err: any) {
      console.error('Failed to save career:', err);
      const errorMessage = err.message || 'Failed to save career entry';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCareer = async (careerId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteCareer(careerId);
      setAlumni({
        ...alumni,
        careers: alumni.careers.filter(c => c.id !== careerId),
      });
      toast.success('Career entry deleted');
    } catch (err) {
      console.error('Failed to delete career:', err);
      toast.error('Failed to delete career entry');
    }
  };

  // Skill handlers
  const handleAddSkill = () => {
    setEditingSkill(null);
    setSkillDialogOpen(true);
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillDialogOpen(true);
  };

  const handleSaveSkill = async (skillData: Omit<Skill, 'id'> | Skill) => {
    if (!alumni) return;
    
    try {
      if ('id' in skillData) {
        await alumniService.updateSkill(skillData);
        setAlumni({
          ...alumni,
          skills: alumni.skills.map(s => s.id === skillData.id ? skillData : s),
        });
        toast.success('Skill updated');
      } else {
        const newSkill = await alumniService.addSkill(skillData);
        setAlumni({
          ...alumni,
          skills: [...alumni.skills, newSkill],
        });
        toast.success('Skill added');
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
      toast.error('Failed to save skill');
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteSkill(skillId);
      setAlumni({
        ...alumni,
        skills: alumni.skills.filter(s => s.id !== skillId),
      });
      toast.success('Skill deleted');
    } catch (err) {
      console.error('Failed to delete skill:', err);
      toast.error('Failed to delete skill');
    }
  };

  // Highlight handlers
  const handleAddHighlight = () => {
    setEditingHighlight(null);
    setHighlightDialogOpen(true);
  };

  const handleEditHighlight = (highlight: CareerHighlight) => {
    setEditingHighlight(highlight);
    setHighlightDialogOpen(true);
  };

  const handleSaveHighlight = async (highlightData: Omit<CareerHighlight, 'id'> | CareerHighlight) => {
    if (!alumni) return;
    
    try {
      if ('id' in highlightData) {
        await alumniService.updateHighlight(highlightData);
        setAlumni({
          ...alumni,
          highlights: alumni.highlights.map(h => h.id === highlightData.id ? highlightData : h),
        });
        toast.success('Highlight updated');
      } else {
        const newHighlight = await alumniService.addHighlight(highlightData);
        setAlumni({
          ...alumni,
          highlights: [...alumni.highlights, newHighlight],
        });
        toast.success('Highlight added');
      }
    } catch (err) {
      console.error('Failed to save highlight:', err);
      toast.error('Failed to save highlight');
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteHighlight(highlightId);
      setAlumni({
        ...alumni,
        highlights: alumni.highlights.filter(h => h.id !== highlightId),
      });
      toast.success('Highlight deleted');
    } catch (err) {
      console.error('Failed to delete highlight:', err);
      toast.error('Failed to delete highlight');
    }
  };

  // Course handlers
  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseDialogOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async (courseData: Omit<Course, 'id'> | Course) => {
    if (!alumni) return;
    
    try {
      if ('id' in courseData) {
        await alumniService.updateCourse(courseData);
        setAlumni({
          ...alumni,
          courses: alumni.courses.map(c => c.id === courseData.id ? courseData : c),
        });
        toast.success('Course updated');
      } else {
        const newCourse = await alumniService.addCourse(courseData);
        setAlumni({
          ...alumni,
          courses: [...alumni.courses, newCourse],
        });
        toast.success('Course added');
      }
    } catch (err) {
      console.error('Failed to save course:', err);
      toast.error('Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteCourse(courseId);
      setAlumni({
        ...alumni,
        courses: alumni.courses.filter(c => c.id !== courseId),
      });
      toast.success('Course deleted');
    } catch (err) {
      console.error('Failed to delete course:', err);
      toast.error('Failed to delete course');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !alumni) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Failed to Load Profile</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchAlumniData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!alumni) return null;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-8"
    >
      {/* Navigation Button for Alumni */}
      {user?.isAlumni && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/profile')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            View Main Profile
          </Button>
        </div>
      )}

      {/* Profile Header */}
      <AlumniProfileHeader
        alumni={alumni}
        onEdit={handleEditProfile}
        onPhotoChange={fetchAlumniData}
      />

      {/* Profile completion — shares the same scoring the dashboard uses */}
      {(() => {
        const completion = getProfileCompletion(alumni);
        if (completion.percentage >= 100) return null;
        return (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="14" className="stroke-muted" />
                    <circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="14" strokeLinecap="round"
                      className="stroke-amber-500"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - completion.percentage / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                    {completion.percentage}%
                  </div>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Complete your profile
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {completion.nextSteps.map((s) => (
                      <span key={s.key} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/50" /> {s.label}
                      </span>
                    ))}
                    {completion.nextSteps.length === 0 && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Almost there!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button onClick={handleEditProfile} variant="outline" className="shrink-0 gap-2 self-start sm:self-center">
                Update details <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );
      })()}

      {/* Stats */}
      <AlumniStatsCard alumni={alumni} />

      {/* Career Journey Section - Contains Timeline */}
      <div className="space-y-6">
        <CareerTimeline
          careers={alumni.careers}
          onAdd={handleAddCareer}
          onEdit={handleEditCareer}
          onDelete={handleDeleteCareer}
        />
      </div>

      {/* Courses & Certifications Section */}
      <CoursesCard
        courses={alumni.courses}
        onAdd={handleAddCourse}
        onEdit={handleEditCourse}
        onDelete={handleDeleteCourse}
      />

      {/* Skills & Expertise and Career Highlights Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkillsCard
          skills={alumni.skills}
          onAdd={handleAddSkill}
          onEdit={handleEditSkill}
          onDelete={handleDeleteSkill}
        />

        <HighlightsCard
          highlights={alumni.highlights}
          onAdd={handleAddHighlight}
          onEdit={handleEditHighlight}
          onDelete={handleDeleteHighlight}
        />
      </div>

      {/* Dialogs */}
      <EditAlumniProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        alumni={alumni}
        onSave={handleSaveProfile}
      />

      <EditCareerDialog
        open={careerDialogOpen}
        onOpenChange={setCareerDialogOpen}
        career={editingCareer}
        onSave={handleSaveCareer}
      />

      <EditAlumniSkillDialog
        open={skillDialogOpen}
        onOpenChange={setSkillDialogOpen}
        skill={editingSkill}
        onSave={handleSaveSkill}
      />

      <EditHighlightDialog
        open={highlightDialogOpen}
        onOpenChange={setHighlightDialogOpen}
        highlight={editingHighlight}
        onSave={handleSaveHighlight}
      />

      <EditCourseDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        course={editingCourse}
        onSave={handleSaveCourse}
      />
    </motion.div>
  );
}
