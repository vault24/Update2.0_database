import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, Mail, Phone, MapPin, Building, Edit, Award, Calendar, 
  BookOpen, Users, Globe, ExternalLink, Copy, Check, Share2,
  FileText, Briefcase, Star, MessageSquare, Clock, Target,
  TrendingUp, Lightbulb, Presentation, FlaskConical, Plus, Trash2, Pencil, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EditAboutDialog } from './edit-dialogs/EditAboutDialog';
import { EditExperienceDialog, type Experience } from './edit-dialogs/EditExperienceDialog';
import { EditEducationDialog, type Education } from './edit-dialogs/EditEducationDialog';
import { EditPublicationDialog, type Publication } from './edit-dialogs/EditPublicationDialog';
import { EditResearchDialog, type Research } from './edit-dialogs/EditResearchDialog';
import { EditAwardDialog, type Award as AwardType } from './edit-dialogs/EditAwardDialog';
import { EditSkillsDialog } from './edit-dialogs/EditSkillsDialog';
import { EditProfileHeaderDialog, type ProfileHeaderData } from './edit-dialogs/EditProfileHeaderDialog';
import { ConfirmDeleteDialog } from './edit-dialogs/ConfirmDeleteDialog';

interface TeacherProfileData {
  id: string;
  name: string;
  headline: string;
  department: string;
  designation: string;
  email: string;
  phone?: string;
  employeeId?: string;
  joiningDate?: string;
  officeLocation?: string;
  university: string;
  profileImage?: string;
  coverImage?: string;
  about: string;
  specializations: string[];
  skills: string[];
  connections: number;
  profileViews: number;
  experience: Experience[];
  education: Education[];
  publications: Publication[];
  research: Research[];
  awards: AwardType[];
  courses: {
    name: string;
    code: string;
    semester: number;
    students: number;
  }[];
}

// Mock teacher data
const initialTeacherData: TeacherProfileData = {
  id: 'TCH-2024-001',
  name: 'Dr. Mohammad Rahman',
  headline: 'Senior Lecturer in Computer Science | PhD in AI & Machine Learning | Researcher & Educator',
  department: 'Computer Science & Engineering',
  designation: 'Senior Lecturer',
  email: 'rahman.cse@university.edu.bd',
  phone: '+880 1712-345678',
  employeeId: 'TCH-2024-001',
  joiningDate: 'January 2016',
  officeLocation: 'Room 301, CSE Building',
  university: 'Sylhet Polytechnic Institute',
  about: `Passionate educator with over 8 years of experience in teaching computer science and software engineering. My research focuses on artificial intelligence, machine learning, and their applications in education technology.

I believe in nurturing the next generation of tech leaders through innovative teaching methodologies and hands-on project-based learning. My teaching philosophy centers around making complex concepts accessible and engaging for students of all levels.

Currently leading research initiatives in AI-powered educational tools and smart campus solutions. I actively mentor students in their final year projects and guide them towards industry-ready skills.`,
  specializations: [
    'Artificial Intelligence',
    'Machine Learning',
    'Database Systems',
    'Software Engineering',
    'Web Development',
    'Cloud Computing'
  ],
  skills: [
    'Python', 'Java', 'SQL', 'TensorFlow', 'React', 'Node.js', 
    'Data Analysis', 'Research Methods', 'Academic Writing', 'Mentoring'
  ],
  connections: 542,
  profileViews: 1289,
  experience: [
    {
      title: 'Senior Lecturer',
      institution: 'Sylhet Polytechnic Institute',
      location: 'Sylhet, Bangladesh',
      startDate: 'Jan 2020',
      current: true,
      description: 'Teaching undergraduate courses in Computer Science. Leading curriculum development for AI and ML courses. Supervising student research projects and thesis work.'
    },
    {
      title: 'Lecturer',
      institution: 'Sylhet Polytechnic Institute',
      location: 'Sylhet, Bangladesh',
      startDate: 'Jan 2016',
      endDate: 'Dec 2019',
      current: false,
      description: 'Taught core programming courses and database systems. Developed online learning materials and practical lab exercises.'
    },
    {
      title: 'Software Developer',
      institution: 'TechSolutions Ltd.',
      location: 'Dhaka, Bangladesh',
      startDate: 'Jun 2014',
      endDate: 'Dec 2015',
      current: false,
      description: 'Developed enterprise web applications using Java and Spring framework. Worked on database optimization and system architecture.'
    }
  ],
  education: [
    {
      degree: 'Ph.D. in Computer Science',
      institution: 'University of Dhaka',
      year: '2020',
      field: 'Artificial Intelligence & Machine Learning'
    },
    {
      degree: 'M.Sc. in Computer Science',
      institution: 'Shahjalal University of Science & Technology',
      year: '2014',
      field: 'Software Engineering'
    },
    {
      degree: 'B.Sc. in Computer Science & Engineering',
      institution: 'Shahjalal University of Science & Technology',
      year: '2012',
      field: 'Computer Science'
    }
  ],
  publications: [
    {
      title: 'Deep Learning Approaches for Student Performance Prediction in E-Learning Platforms',
      journal: 'Journal of Educational Technology',
      year: '2023',
      citations: 45,
      link: '#'
    },
    {
      title: 'A Comprehensive Survey on Smart Campus Technologies',
      journal: 'IEEE Access',
      year: '2022',
      citations: 78,
      link: '#'
    },
    {
      title: 'Machine Learning-based Attendance System Using Facial Recognition',
      journal: 'International Conference on AI',
      year: '2021',
      citations: 32,
      link: '#'
    }
  ],
  research: [
    {
      title: 'AI-Powered Personalized Learning Platform',
      status: 'ongoing',
      year: '2023-Present',
      description: 'Developing an intelligent tutoring system that adapts to individual student learning patterns.'
    },
    {
      title: 'Smart Classroom IoT Integration',
      status: 'completed',
      year: '2022',
      description: 'Implemented IoT-based attendance and environment monitoring system for classrooms.'
    }
  ],
  awards: [
    {
      title: 'Best Teacher Award',
      issuer: 'Sylhet Polytechnic Institute',
      year: '2023'
    },
    {
      title: 'Outstanding Research Contribution',
      issuer: 'Bangladesh Computer Society',
      year: '2022'
    },
    {
      title: 'Innovation in Teaching Award',
      issuer: 'Ministry of Education',
      year: '2021'
    }
  ],
  courses: [
    { name: 'Database Management Systems', code: 'CSE-401', semester: 4, students: 65 },
    { name: 'Software Engineering', code: 'CSE-501', semester: 5, students: 58 },
    { name: 'Web Development', code: 'CSE-601', semester: 6, students: 42 },
    { name: 'Artificial Intelligence', code: 'CSE-701', semester: 7, students: 35 }
  ]
};

interface LinkedInTeacherProfileProps {
  isPublicView?: boolean;
  teacherId?: string;
}

export function LinkedInTeacherProfile({ isPublicView = false, teacherId }: LinkedInTeacherProfileProps) {
  const [copied, setCopied] = useState(false);
  const [teacher, setTeacher] = useState<TeacherProfileData>(initialTeacherData);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editAboutOpen, setEditAboutOpen] = useState(false);
  const [editExperienceOpen, setEditExperienceOpen] = useState(false);
  const [editEducationOpen, setEditEducationOpen] = useState(false);
  const [editPublicationOpen, setEditPublicationOpen] = useState(false);
  const [editResearchOpen, setEditResearchOpen] = useState(false);
  const [editAwardOpen, setEditAwardOpen] = useState(false);
  const [editSpecializationsOpen, setEditSpecializationsOpen] = useState(false);
  const [editSkillsOpen, setEditSkillsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit item states
  const [editingExperience, setEditingExperience] = useState<{ index: number; data: Experience } | null>(null);
  const [editingEducation, setEditingEducation] = useState<{ index: number; data: Education } | null>(null);
  const [editingPublication, setEditingPublication] = useState<{ index: number; data: Publication } | null>(null);
  const [editingResearch, setEditingResearch] = useState<{ index: number; data: Research } | null>(null);
  const [editingAward, setEditingAward] = useState<{ index: number; data: AwardType } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; index: number; title: string } | null>(null);

  const publicProfileUrl = `${window.location.origin}/faculty/${teacher.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    toast.success('Profile link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${teacher.name} - ${teacher.designation}`,
        text: teacher.headline,
        url: publicProfileUrl
      });
    } else {
      handleCopyLink();
    }
  };

  // Save handlers
  const handleSaveProfile = (data: ProfileHeaderData) => {
    setTeacher({ ...teacher, ...data });
    toast.success('Profile updated successfully');
  };

  const handleSaveAbout = (about: string) => {
    setTeacher({ ...teacher, about });
    toast.success('About section updated');
  };

  const handleSaveExperience = (exp: Experience) => {
    if (editingExperience) {
      const updated = [...teacher.experience];
      updated[editingExperience.index] = exp;
      setTeacher({ ...teacher, experience: updated });
      toast.success('Experience updated');
    } else {
      setTeacher({ ...teacher, experience: [exp, ...teacher.experience] });
      toast.success('Experience added');
    }
    setEditingExperience(null);
  };

  const handleSaveEducation = (edu: Education) => {
    if (editingEducation) {
      const updated = [...teacher.education];
      updated[editingEducation.index] = edu;
      setTeacher({ ...teacher, education: updated });
      toast.success('Education updated');
    } else {
      setTeacher({ ...teacher, education: [edu, ...teacher.education] });
      toast.success('Education added');
    }
    setEditingEducation(null);
  };

  const handleSavePublication = (pub: Publication) => {
    if (editingPublication) {
      const updated = [...teacher.publications];
      updated[editingPublication.index] = pub;
      setTeacher({ ...teacher, publications: updated });
      toast.success('Publication updated');
    } else {
      setTeacher({ ...teacher, publications: [pub, ...teacher.publications] });
      toast.success('Publication added');
    }
    setEditingPublication(null);
  };

  const handleSaveResearch = (res: Research) => {
    if (editingResearch) {
      const updated = [...teacher.research];
      updated[editingResearch.index] = res;
      setTeacher({ ...teacher, research: updated });
      toast.success('Research updated');
    } else {
      setTeacher({ ...teacher, research: [res, ...teacher.research] });
      toast.success('Research added');
    }
    setEditingResearch(null);
  };

  const handleSaveAward = (award: AwardType) => {
    if (editingAward) {
      const updated = [...teacher.awards];
      updated[editingAward.index] = award;
      setTeacher({ ...teacher, awards: updated });
      toast.success('Award updated');
    } else {
      setTeacher({ ...teacher, awards: [award, ...teacher.awards] });
      toast.success('Award added');
    }
    setEditingAward(null);
  };

  const handleSaveSpecializations = (items: string[]) => {
    setTeacher({ ...teacher, specializations: items });
    toast.success('Specializations updated');
  };

  const handleSaveSkills = (items: string[]) => {
    setTeacher({ ...teacher, skills: items });
    toast.success('Skills updated');
  };

  const scrollToContact = () => {
    contactSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacher({ ...teacher, coverImage: reader.result as string });
        toast.success('Cover photo updated');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacher({ ...teacher, profileImage: reader.result as string });
        toast.success('Profile photo updated');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    switch (deleteTarget.type) {
      case 'experience':
        setTeacher({ ...teacher, experience: teacher.experience.filter((_, i) => i !== deleteTarget.index) });
        break;
      case 'education':
        setTeacher({ ...teacher, education: teacher.education.filter((_, i) => i !== deleteTarget.index) });
        break;
      case 'publication':
        setTeacher({ ...teacher, publications: teacher.publications.filter((_, i) => i !== deleteTarget.index) });
        break;
      case 'research':
        setTeacher({ ...teacher, research: teacher.research.filter((_, i) => i !== deleteTarget.index) });
        break;
      case 'award':
        setTeacher({ ...teacher, awards: teacher.awards.filter((_, i) => i !== deleteTarget.index) });
        break;
    }
    toast.success(`${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted`);
    setDeleteTarget(null);
  };

  const EditButton = ({ onClick, className = '' }: { onClick: () => void; className?: string }) => (
    !isPublicView ? (
      <Button 
        size="sm" 
        variant="ghost" 
        className={cn("gap-1 h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity", className)}
        onClick={onClick}
      >
        <Pencil className="w-3 h-3" />
        Edit
      </Button>
    ) : null
  );

  const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
    !isPublicView ? (
      <Button 
        size="sm" 
        variant="outline" 
        className="gap-1.5 h-8"
        onClick={onClick}
      >
        <Plus className="w-4 h-4" />
        {label}
      </Button>
    ) : null
  );

  const ItemActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    !isPublicView ? (
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    ) : null
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Cover & Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border overflow-hidden shadow-card group"
      >
        {/* Cover Image */}
        <div className="h-36 sm:h-44 md:h-52 relative overflow-hidden">
          {teacher.coverImage ? (
            <img 
              src={teacher.coverImage} 
              alt="Cover" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            </>
          )}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          
          {!isPublicView && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverPhotoChange}
                className="hidden"
              />
              <Button 
                size="sm" 
                variant="secondary" 
                className="absolute top-3 right-3 gap-1.5 text-xs"
                onClick={() => coverInputRef.current?.click()}
              >
                <Camera className="w-3.5 h-3.5" />
                {teacher.coverImage ? 'Change Cover' : 'Add Cover'}
              </Button>
            </>
          )}
        </div>

        <div className="px-4 sm:px-5 md:px-6 pb-5">
          {/* Avatar - positioned to overlap banner */}
          <div className="-mt-12 sm:-mt-14 md:-mt-18 mb-3 sm:mb-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative inline-block"
            >
              {teacher.profileImage ? (
                <img 
                  src={teacher.profileImage} 
                  alt={teacher.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-card shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-bold text-white border-4 border-card shadow-xl">
                  {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-emerald-500 rounded-full border-2 border-card" />
              
              {!isPublicView && (
                <>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center border-2 border-card hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
                  </button>
                </>
              )}
            </motion.div>
          </div>

          {/* Name and Info - separated from avatar to prevent cutoff */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-foreground break-words">{teacher.name}</h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-2">{teacher.headline}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs md:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate">{teacher.officeLocation}</span>
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="text-primary font-medium truncate">{teacher.university}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isPublicView && (
                  <>
                    <Button size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => setEditProfileOpen(true)}>
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Edit Profile</span>
                      <span className="xs:hidden">Edit</span>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={handleShare}>
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={handleCopyLink}>
                  {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  {copied ? 'Copied!' : <span className="hidden sm:inline">Copy Link</span>}
                  {!copied && <span className="sm:hidden">Link</span>}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <Button size="sm" className="gap-1.5 bg-primary text-xs sm:text-sm">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Message
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={scrollToContact}>
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Contact
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs sm:text-sm" onClick={() => window.open(publicProfileUrl, '_blank')}>
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">View Public Profile</span>
              <span className="sm:hidden">Public</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { icon: BookOpen, label: 'Courses Teaching', value: teacher.courses.length, color: 'text-blue-500 bg-blue-500/10' },
          { icon: Users, label: 'Total Students', value: teacher.courses.reduce((sum, c) => sum + c.students, 0), color: 'text-emerald-500 bg-emerald-500/10' },
          { icon: FileText, label: 'Publications', value: teacher.publications.length, color: 'text-violet-500 bg-violet-500/10' },
          { icon: Award, label: 'Awards', value: teacher.awards.length, color: 'text-amber-500 bg-amber-500/10' },
        ].map((stat) => (
          <div 
            key={stat.label} 
            className="bg-card rounded-xl border border-border p-3 md:p-4 shadow-card flex items-center gap-3"
          >
            <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center", stat.color)}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card group"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            About
          </h2>
          <EditButton onClick={() => setEditAboutOpen(true)} />
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {teacher.about}
        </p>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="experience" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card border border-border rounded-xl p-1 mb-4">
            <TabsTrigger value="experience" className="gap-1.5 text-xs md:text-sm">
              <Briefcase className="w-4 h-4" />
              Experience
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-1.5 text-xs md:text-sm">
              <GraduationCap className="w-4 h-4" />
              Education
            </TabsTrigger>
            <TabsTrigger value="publications" className="gap-1.5 text-xs md:text-sm">
              <FileText className="w-4 h-4" />
              Publications
            </TabsTrigger>
            <TabsTrigger value="research" className="gap-1.5 text-xs md:text-sm">
              <FlaskConical className="w-4 h-4" />
              Research
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5 text-xs md:text-sm">
              <Presentation className="w-4 h-4" />
              Courses
            </TabsTrigger>
          </TabsList>

          {/* Experience Tab */}
          <TabsContent value="experience" className="mt-0">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Experience
                </h3>
                <AddButton onClick={() => { setEditingExperience(null); setEditExperienceOpen(true); }} label="Add" />
              </div>
              <div className="space-y-6">
                {teacher.experience.map((exp, index) => (
                  <div key={index} className="flex gap-4 relative group">
                    {index < teacher.experience.length - 1 && (
                      <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm md:text-base">{exp.title}</h4>
                          <p className="text-sm text-primary">{exp.institution}</p>
                        </div>
                        <ItemActions 
                          onEdit={() => { setEditingExperience({ index, data: exp }); setEditExperienceOpen(true); }}
                          onDelete={() => { setDeleteTarget({ type: 'experience', index, title: exp.title }); setDeleteDialogOpen(true); }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                        <span>•</span>
                        <MapPin className="w-3.5 h-3.5" />
                        {exp.location}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="mt-0">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Education
                </h3>
                <AddButton onClick={() => { setEditingEducation(null); setEditEducationOpen(true); }} label="Add" />
              </div>
              <div className="space-y-4">
                {teacher.education.map((edu, index) => (
                  <div key={index} className="flex gap-4 p-3 rounded-lg bg-secondary/50 border border-border group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm md:text-base">{edu.degree}</h4>
                          <p className="text-sm text-primary">{edu.institution}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{edu.field} • {edu.year}</p>
                        </div>
                        <ItemActions 
                          onEdit={() => { setEditingEducation({ index, data: edu }); setEditEducationOpen(true); }}
                          onDelete={() => { setDeleteTarget({ type: 'education', index, title: edu.degree }); setDeleteDialogOpen(true); }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Publications Tab */}
          <TabsContent value="publications" className="mt-0">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Publications
                </h3>
                <AddButton onClick={() => { setEditingPublication(null); setEditPublicationOpen(true); }} label="Add" />
              </div>
              <div className="space-y-4">
                {teacher.publications.map((pub, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm md:text-base hover:text-primary cursor-pointer">
                          {pub.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">{pub.journal} • {pub.year}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="w-3 h-3" />
                            {pub.citations} citations
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <ItemActions 
                          onEdit={() => { setEditingPublication({ index, data: pub }); setEditPublicationOpen(true); }}
                          onDelete={() => { setDeleteTarget({ type: 'publication', index, title: pub.title }); setDeleteDialogOpen(true); }}
                        />
                        {pub.link && (
                          <Button size="sm" variant="ghost" className="gap-1">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="mt-0">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  Research Projects
                </h3>
                <AddButton onClick={() => { setEditingResearch(null); setEditResearchOpen(true); }} label="Add" />
              </div>
              <div className="space-y-4">
                {teacher.research.map((res, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm md:text-base">{res.title}</h4>
                          <Badge variant={res.status === 'ongoing' ? 'default' : 'secondary'}>
                            {res.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{res.year}</p>
                        <p className="text-sm text-muted-foreground mt-2">{res.description}</p>
                      </div>
                      <ItemActions 
                        onEdit={() => { setEditingResearch({ index, data: res }); setEditResearchOpen(true); }}
                        onDelete={() => { setDeleteTarget({ type: 'research', index, title: res.title }); setDeleteDialogOpen(true); }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-0">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Presentation className="w-5 h-5 text-primary" />
                Current Courses
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {teacher.courses.map((course, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-xl border border-border bg-gradient-to-br from-secondary/50 to-transparent hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{course.name}</h4>
                        <p className="text-xs text-primary font-medium">{course.code}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Semester {course.semester}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {course.students} students
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Skills & Specializations */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Specializations
            </h3>
            <EditButton onClick={() => setEditSpecializationsOpen(true)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {teacher.specializations.map((spec, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Skills
            </h3>
            <EditButton onClick={() => setEditSkillsOpen(true)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {teacher.skills.map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Awards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Honors & Awards
          </h3>
          <AddButton onClick={() => { setEditingAward(null); setEditAwardOpen(true); }} label="Add Award" />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {teacher.awards.map((award, index) => (
            <div 
              key={index} 
              className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 group relative"
            >
              <div className="absolute top-2 right-2">
                <ItemActions 
                  onEdit={() => { setEditingAward({ index, data: award }); setEditAwardOpen(true); }}
                  onDelete={() => { setDeleteTarget({ type: 'award', index, title: award.title }); setDeleteDialogOpen(true); }}
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs text-muted-foreground">{award.year}</span>
              </div>
              <h4 className="font-medium text-sm">{award.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{award.issuer}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Contact Info Card */}
      <motion.div
        ref={contactSectionRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card scroll-mt-4"
        id="contact-section"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Contact Information
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{teacher.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{teacher.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Office</p>
              <p className="text-sm font-medium">{teacher.officeLocation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="text-sm font-medium">{teacher.employeeId}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Dialogs */}
      <EditProfileHeaderDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        data={{
          name: teacher.name,
          headline: teacher.headline,
          designation: teacher.designation,
          department: teacher.department,
          university: teacher.university,
          officeLocation: teacher.officeLocation || '',
          email: teacher.email,
          phone: teacher.phone || '',
          employeeId: teacher.employeeId || ''
        }}
        onSave={handleSaveProfile}
      />

      <EditAboutDialog
        open={editAboutOpen}
        onOpenChange={setEditAboutOpen}
        about={teacher.about}
        onSave={handleSaveAbout}
      />

      <EditExperienceDialog
        open={editExperienceOpen}
        onOpenChange={(open) => { setEditExperienceOpen(open); if (!open) setEditingExperience(null); }}
        experience={editingExperience?.data}
        onSave={handleSaveExperience}
        isNew={!editingExperience}
      />

      <EditEducationDialog
        open={editEducationOpen}
        onOpenChange={(open) => { setEditEducationOpen(open); if (!open) setEditingEducation(null); }}
        education={editingEducation?.data}
        onSave={handleSaveEducation}
        isNew={!editingEducation}
      />

      <EditPublicationDialog
        open={editPublicationOpen}
        onOpenChange={(open) => { setEditPublicationOpen(open); if (!open) setEditingPublication(null); }}
        publication={editingPublication?.data}
        onSave={handleSavePublication}
        isNew={!editingPublication}
      />

      <EditResearchDialog
        open={editResearchOpen}
        onOpenChange={(open) => { setEditResearchOpen(open); if (!open) setEditingResearch(null); }}
        research={editingResearch?.data}
        onSave={handleSaveResearch}
        isNew={!editingResearch}
      />

      <EditAwardDialog
        open={editAwardOpen}
        onOpenChange={(open) => { setEditAwardOpen(open); if (!open) setEditingAward(null); }}
        award={editingAward?.data}
        onSave={handleSaveAward}
        isNew={!editingAward}
      />

      <EditSkillsDialog
        open={editSpecializationsOpen}
        onOpenChange={setEditSpecializationsOpen}
        items={teacher.specializations}
        onSave={handleSaveSpecializations}
        title="Specializations"
        placeholder="Add a specialization..."
      />

      <EditSkillsDialog
        open={editSkillsOpen}
        onOpenChange={setEditSkillsOpen}
        items={teacher.skills}
        onSave={handleSaveSkills}
        title="Skills"
        placeholder="Add a skill..."
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title={deleteTarget?.title || ''}
      />
    </div>
  );
}
