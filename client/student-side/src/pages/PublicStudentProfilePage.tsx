import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, Mail, Phone, MapPin, Building, Award, Calendar, 
  BookOpen, Copy, Check, Share2, FileText, Star, Clock, Target,
  TrendingUp, User, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// Mock student data
const mockStudentData = {
  id: 'STU-2024-001',
  name: 'Md. Abdullah Al Mamun',
  headline: 'Computer Science Student | Web Developer | Tech Enthusiast',
  department: 'Computer Science & Engineering',
  semester: 6,
  session: '2021-22',
  rollNumber: 'CSE-2021-045',
  email: 'abdullah.mamun@student.spi.edu.bd',
  phone: '+880 1812-345678',
  location: 'Sylhet, Bangladesh',
  university: 'Sylhet Polytechnic Institute',
  about: `Passionate computer science student with a strong interest in web development and artificial intelligence. Currently in my 6th semester, I'm focused on building practical skills through projects and internships.

I believe in continuous learning and regularly participate in coding competitions and hackathons. My goal is to become a full-stack developer and contribute to innovative tech solutions.`,
  skills: ['JavaScript', 'React', 'Python', 'HTML/CSS', 'Git', 'MySQL', 'Node.js', 'Tailwind CSS'],
  interests: ['Web Development', 'Machine Learning', 'Mobile Apps', 'UI/UX Design'],
  cgpa: 3.75,
  attendanceRate: 92,
  completedCourses: 28,
  currentCourses: [
    { name: 'Database Management Systems', code: 'CSE-401', grade: 'A' },
    { name: 'Software Engineering', code: 'CSE-501', grade: 'A-' },
    { name: 'Web Development', code: 'CSE-601', grade: 'A' },
  ],
  achievements: [
    { title: 'Dean\'s List', issuer: 'Sylhet Polytechnic Institute', year: '2023' },
    { title: '1st Place - Inter-College Hackathon', issuer: 'Tech Fest 2023', year: '2023' },
    { title: 'Best Project Award', issuer: 'CSE Department', year: '2022' },
  ],
  projects: [
    { title: 'E-Learning Platform', description: 'Built a full-stack e-learning platform using React and Node.js', year: '2023' },
    { title: 'Inventory Management System', description: 'Developed an inventory system for local businesses', year: '2022' },
  ],
};

export default function PublicStudentProfilePage() {
  const { studentId } = useParams();
  const [copied, setCopied] = useState(false);
  const student = mockStudentData;

  const publicProfileUrl = `${window.location.origin}/student/${student.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    toast.success('Profile link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-semibold text-sm">Sylhet Polytechnic Institute</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
        >
        {/* Cover Banner */}
        <div className="h-28 sm:h-32 md:h-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
        </div>

        <div className="px-4 md:px-6 pb-5">
          {/* Avatar - positioned to overlap banner */}
          <div className="-mt-12 sm:-mt-14 md:-mt-16 mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-bold text-white border-4 border-card shadow-xl">
              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>

          {/* Name and Info - separated from avatar to prevent cutoff */}
          <div className="space-y-3">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words">{student.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">{student.headline}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{student.department}</Badge>
              <span className="hidden sm:inline">•</span>
              <span>Semester {student.semester}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Roll: {student.rollNumber}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-primary truncate">{student.university}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <Button size="sm" className="gap-1.5 text-xs sm:text-sm">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Contact
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={handleCopyLink}>
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Share Profile</span>
              <span className="sm:hidden">Share</span>
            </Button>
          </div>
        </div>
      </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2 sm:gap-3"
        >
          {[
            { icon: BarChart3, label: 'CGPA', value: student.cgpa.toFixed(2), color: 'text-emerald-500 bg-emerald-500/10' },
            { icon: Clock, label: 'Attendance', value: `${student.attendanceRate}%`, color: 'text-blue-500 bg-blue-500/10' },
            { icon: BookOpen, label: 'Courses', value: student.completedCourses, color: 'text-violet-500 bg-violet-500/10' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-lg sm:rounded-xl border border-border p-2 sm:p-3 md:p-4 shadow-card flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-center sm:text-left">
              <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0", stat.color)}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-sm sm:text-lg md:text-xl font-bold">{stat.value}</p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card"
        >
          <h2 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            About
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{student.about}</p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-lg sm:rounded-xl p-1 mb-3 sm:mb-4 overflow-x-auto">
            <TabsTrigger value="courses" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Courses</span>
              <span className="xs:hidden">📚</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3">
              <Award className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Achievements</span>
              <span className="xs:hidden">🏆</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Projects</span>
              <span className="xs:hidden">📁</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Current Courses
              </h3>
              {student.currentCourses.map((course, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <div>
                    <h4 className="font-medium text-sm">{course.name}</h4>
                    <p className="text-xs text-muted-foreground">{course.code}</p>
                  </div>
                  <Badge variant="secondary">{course.grade}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Achievements
              </h3>
              {student.achievements.map((ach, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{ach.title}</h4>
                    <p className="text-xs text-muted-foreground">{ach.issuer} • {ach.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Projects
              </h3>
              {student.projects.map((proj, i) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium">{proj.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{proj.year}</p>
                  <p className="text-sm text-muted-foreground mt-2">{proj.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Skills & Interests */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {student.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {student.interests.map((interest, i) => (
                <Badge key={i} variant="outline" className="text-xs">{interest}</Badge>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card rounded-lg sm:rounded-xl border border-border p-3 sm:p-4 md:p-6 shadow-card">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Email</p>
                <p className="text-xs sm:text-sm font-medium truncate">{student.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Phone</p>
                <p className="text-xs sm:text-sm font-medium truncate">{student.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Location</p>
                <p className="text-xs sm:text-sm font-medium truncate">{student.location}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sylhet Polytechnic Institute. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
