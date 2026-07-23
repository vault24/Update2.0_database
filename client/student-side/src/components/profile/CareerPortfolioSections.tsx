/**
 * CareerPortfolioSections — the alumni "Career Journey / Courses &
 * Certifications / Skills & Expertise / Career Highlights" sections, reused on
 * the STUDENT profile page.
 *
 * Students can fill these in before graduating: the data is stored on the same
 * alumni table (as a 'student_prefill' record the backend creates on first
 * write), so when the student becomes an alumnus the alumni profile picks up
 * exactly the same records — nothing is re-entered.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { CareerTimeline } from '@/components/alumni/CareerTimeline';
import { SkillsCard } from '@/components/alumni/SkillsCard';
import { HighlightsCard } from '@/components/alumni/HighlightsCard';
import { CoursesCard } from '@/components/alumni/CoursesCard';
import { EditCareerDialog } from '@/components/alumni/EditCareerDialog';
import { EditAlumniSkillDialog } from '@/components/alumni/EditAlumniSkillDialog';
import { EditHighlightDialog } from '@/components/alumni/EditHighlightDialog';
import { EditCourseDialog } from '@/components/alumni/EditCourseDialog';
import {
  alumniService,
  CareerEntry,
  Skill,
  CareerHighlight,
  Course,
} from '@/services/alumniService';

interface PortfolioData {
  careers: CareerEntry[];
  skills: Skill[];
  highlights: CareerHighlight[];
  courses: Course[];
}

const EMPTY: PortfolioData = { careers: [], skills: [], highlights: [], courses: [] };

export function CareerPortfolioSections() {
  const [data, setData] = useState<PortfolioData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // Dialog states
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<CareerEntry | null>(null);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<CareerHighlight | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await alumniService.getProfile();
        if (active) {
          setData({
            careers: profile.careers || [],
            skills: profile.skills || [],
            highlights: profile.highlights || [],
            courses: profile.courses || [],
          });
        }
      } catch {
        // 404 = nothing filled in yet — start with empty sections. The backend
        // creates the record automatically on the first add.
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── Career handlers ────────────────────────────────────────────────────────
  const handleSaveCareer = async (careerData: Omit<CareerEntry, 'id'> | CareerEntry) => {
    try {
      if ('id' in careerData) {
        await alumniService.updateCareer(careerData);
        setData(d => ({ ...d, careers: d.careers.map(c => (c.id === careerData.id ? careerData : c)) }));
        toast.success('Career entry updated');
      } else {
        const newCareer = await alumniService.addCareer(careerData);
        setData(d => ({ ...d, careers: [...d.careers, newCareer] }));
        toast.success('Career entry added');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save career entry');
    }
  };

  const handleDeleteCareer = async (careerId: string) => {
    try {
      await alumniService.deleteCareer(careerId);
      setData(d => ({ ...d, careers: d.careers.filter(c => c.id !== careerId) }));
      toast.success('Career entry deleted');
    } catch {
      toast.error('Failed to delete career entry');
    }
  };

  // ── Skill handlers ─────────────────────────────────────────────────────────
  const handleSaveSkill = async (skillData: Omit<Skill, 'id'> | Skill) => {
    try {
      if ('id' in skillData) {
        await alumniService.updateSkill(skillData);
        setData(d => ({ ...d, skills: d.skills.map(s => (s.id === skillData.id ? skillData : s)) }));
        toast.success('Skill updated');
      } else {
        const newSkill = await alumniService.addSkill(skillData);
        setData(d => ({ ...d, skills: [...d.skills, newSkill] }));
        toast.success('Skill added');
      }
    } catch {
      toast.error('Failed to save skill');
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      await alumniService.deleteSkill(skillId);
      setData(d => ({ ...d, skills: d.skills.filter(s => s.id !== skillId) }));
      toast.success('Skill deleted');
    } catch {
      toast.error('Failed to delete skill');
    }
  };

  // ── Highlight handlers ─────────────────────────────────────────────────────
  const handleSaveHighlight = async (highlightData: Omit<CareerHighlight, 'id'> | CareerHighlight) => {
    try {
      if ('id' in highlightData) {
        await alumniService.updateHighlight(highlightData);
        setData(d => ({ ...d, highlights: d.highlights.map(h => (h.id === highlightData.id ? highlightData : h)) }));
        toast.success('Highlight updated');
      } else {
        const newHighlight = await alumniService.addHighlight(highlightData);
        setData(d => ({ ...d, highlights: [...d.highlights, newHighlight] }));
        toast.success('Highlight added');
      }
    } catch {
      toast.error('Failed to save highlight');
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      await alumniService.deleteHighlight(highlightId);
      setData(d => ({ ...d, highlights: d.highlights.filter(h => h.id !== highlightId) }));
      toast.success('Highlight deleted');
    } catch {
      toast.error('Failed to delete highlight');
    }
  };

  // ── Course handlers ────────────────────────────────────────────────────────
  const handleSaveCourse = async (courseData: Omit<Course, 'id'> | Course) => {
    try {
      if ('id' in courseData) {
        await alumniService.updateCourse(courseData);
        setData(d => ({ ...d, courses: d.courses.map(c => (c.id === courseData.id ? courseData : c)) }));
        toast.success('Course updated');
      } else {
        const newCourse = await alumniService.addCourse(courseData);
        setData(d => ({ ...d, courses: [...d.courses, newCourse] }));
        toast.success('Course added');
      }
    } catch {
      toast.error('Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await alumniService.deleteCourse(courseId);
      setData(d => ({ ...d, courses: d.courses.filter(c => c.id !== courseId) }));
      toast.success('Course deleted');
    } catch {
      toast.error('Failed to delete course');
    }
  };

  if (!loaded) return null;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Section intro */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Career &amp; Portfolio</h3>
          <p className="text-sm text-muted-foreground">
            Build your professional profile now — everything you add here carries
            straight into your alumni profile after graduation.
          </p>
        </div>
      </div>

      {/* Career Journey */}
      <CareerTimeline
        careers={data.careers}
        onAdd={() => { setEditingCareer(null); setCareerDialogOpen(true); }}
        onEdit={(c) => { setEditingCareer(c); setCareerDialogOpen(true); }}
        onDelete={handleDeleteCareer}
      />

      {/* Courses & Certifications */}
      <CoursesCard
        courses={data.courses}
        onAdd={() => { setEditingCourse(null); setCourseDialogOpen(true); }}
        onEdit={(c) => { setEditingCourse(c); setCourseDialogOpen(true); }}
        onDelete={handleDeleteCourse}
      />

      {/* Skills & Expertise + Career Highlights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkillsCard
          skills={data.skills}
          onAdd={() => { setEditingSkill(null); setSkillDialogOpen(true); }}
          onEdit={(s) => { setEditingSkill(s); setSkillDialogOpen(true); }}
          onDelete={handleDeleteSkill}
        />
        <HighlightsCard
          highlights={data.highlights}
          onAdd={() => { setEditingHighlight(null); setHighlightDialogOpen(true); }}
          onEdit={(h) => { setEditingHighlight(h); setHighlightDialogOpen(true); }}
          onDelete={handleDeleteHighlight}
        />
      </div>

      {/* Dialogs */}
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

export default CareerPortfolioSections;
