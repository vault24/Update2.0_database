import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Edit, Download, User, Phone, MapPin, GraduationCap, BookOpen, 
  Mail, Briefcase, Building2, Calendar, TrendingUp, Heart, HeartHandshake,
  ShieldCheck, Plus, X, Star, Target, CheckCircle, FileText, ExternalLink,
  Code, Globe, Zap, Users, Loader2, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { alumniService, Alumni as AlumniType } from '@/services/alumniService';
import { getErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface CareerEntry {
  id: string;
  type: 'job' | 'higherStudies' | 'business' | 'other';
  position: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements?: string[];
  // Job specific
  salary?: string;
  // Higher studies specific
  degree?: string;
  field?: string;
  institution?: string;
  // Business specific
  businessName?: string;
  businessType?: string;
  // Other specific
  otherType?: string;
}

interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'other';
  proficiency: number; // 1-100
}

interface CareerHighlight {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'achievement' | 'milestone' | 'award' | 'project';
}

interface AlumniData {
  id: number;
  name: string;
  roll: string;
  department: string;
  graduationYear: string;
  email: string;
  phone: string;
  currentJob: string;
  company: string;
  location: string;
  gpa: number;
  avatar: string;
  category: string;
  supportStatus: 'needSupport' | 'needExtraSupport' | 'noSupportNeeded';
  higherStudiesInstitute?: string;
  businessName?: string;
  careers: CareerEntry[];
  skills: Skill[];
  highlights: CareerHighlight[];
  bio?: string;
  linkedin?: string;
  portfolio?: string;
}

// Transform API data to display format
const transformAlumniData = (apiData: AlumniType): AlumniData => {
  return {
    id: parseInt(apiData.student?.id || '0') || 0,
    name: apiData.student?.fullNameEnglish || 'Unknown',
    roll: apiData.student?.currentRollNumber || 'N/A',
    department: apiData.student?.department?.name || 'Unknown',
    graduationYear: apiData.graduationYear?.toString() || 'N/A',
    // Extract contact information from student record or alumni data
    email: apiData.student?.email || 'N/A',
    phone: apiData.student?.mobileStudent || 'N/A',
    currentJob: apiData.currentPosition?.positionTitle || 'Not specified',
    company: apiData.currentPosition?.organizationName || 'Not specified',
    location: apiData.student?.presentAddress?.district || apiData.currentPosition?.location || 'N/A',
    // Extract GPA from student record (using the highest exam GPA)
    gpa: apiData.student?.gpa || 0,
    avatar: apiData.student?.profilePhoto || '',
    category: apiData.alumniType,
    supportStatus: apiData.currentSupportCategory === 'receiving_support' ? 'needSupport' :
                   apiData.currentSupportCategory === 'needs_extra_support' ? 'needExtraSupport' :
                   'noSupportNeeded',
    // Enhanced profile data
    bio: apiData.bio || apiData.currentPosition?.description || '',
    linkedin: apiData.linkedinUrl || '',
    portfolio: apiData.portfolioUrl || '',
    // Enhanced career transformation with type-specific fields
    careers: transformCareerHistory(apiData.careerHistory || []),
    // Initialize skills and highlights (to be populated from API)
    skills: (apiData.skills || []).map((skill, index) => ({
      id: skill.id || index.toString(),
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency
    })),
    highlights: (apiData.highlights || []).map((highlight, index) => ({
      id: highlight.id || index.toString(),
      title: highlight.title,
      description: highlight.description,
      date: highlight.date,
      type: highlight.type
    })),
  };
};

// Enhanced career transformation function
const transformCareerHistory = (careers: any[]): CareerEntry[] => {
  return careers.map((career, index) => {
    const baseCareer: CareerEntry = {
      id: career.id || index.toString(),
      type: career.positionType as CareerEntry['type'] || 'job',
      position: career.positionTitle || 'Unknown Position',
      company: career.organizationName || 'Unknown Company',
      location: career.location || 'N/A',
      startDate: career.startDate || '',
      endDate: career.endDate,
      current: career.isCurrent || false,
      description: career.description || '',
      achievements: career.achievements || [],
    };
    
    // Add type-specific fields based on career type
    switch (career.positionType) {
      case 'job':
        return {
          ...baseCareer,
          salary: career.salary || '',
        };
      case 'higherStudies':
        return {
          ...baseCareer,
          degree: career.degree || career.positionTitle || '',
          field: career.field || '',
          institution: career.organizationName || '',
          position: career.degree && career.field ? `${career.degree} in ${career.field}` : career.positionTitle || 'Unknown Degree',
          company: career.organizationName || 'Unknown Institution',
        };
      case 'business':
        return {
          ...baseCareer,
          businessName: career.businessName || career.positionTitle || '',
          businessType: career.businessType || career.organizationName || '',
          position: career.businessName || career.positionTitle || 'Unknown Business',
          company: career.businessType || career.organizationName || 'Business',
        };
      case 'other':
        return {
          ...baseCareer,
          otherType: career.otherType || career.positionTitle || '',
          position: career.otherType || career.positionTitle || 'Other Activity',
          company: 'Other',
        };
      default:
        return baseCareer;
    }
  });
};

export default function AlumniDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // API state
  const [alumni, setAlumni] = useState<AlumniData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch alumni data
  useEffect(() => {
    if (id) {
      fetchAlumniData();
    }
  }, [id]);

  // Update editProfile when alumni data is loaded
  useEffect(() => {
    if (alumni) {
      setEditProfile({
        name: alumni.name,
        email: alumni.email,
        phone: alumni.phone,
        location: alumni.location,
        bio: alumni.bio || '',
        linkedin: alumni.linkedin || '',
        portfolio: alumni.portfolio || ''
      });
    }
  }, [alumni]);

  const fetchAlumniData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const apiData = await alumniService.getAlumniById(id);
      const transformedData = transformAlumniData(apiData);
      setAlumni(transformedData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  
  const [isAddCareerOpen, setIsAddCareerOpen] = useState(false);
  const [isUpdateSupportOpen, setIsUpdateSupportOpen] = useState(false);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [isAddHighlightOpen, setIsAddHighlightOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditCareerOpen, setIsEditCareerOpen] = useState(false);
  const [isEditSkillOpen, setIsEditSkillOpen] = useState(false);
  const [isEditHighlightOpen, setIsEditHighlightOpen] = useState(false);
  const [isViewCareerOpen, setIsViewCareerOpen] = useState(false);
  const [viewingCareerId, setViewingCareerId] = useState<string | null>(null);
  
  const [careerTypeSelection, setCareerTypeSelection] = useState<'job' | 'higherStudies' | 'business' | 'other' | null>(null);
  const [editingCareerId, setEditingCareerId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  
  const [newCareer, setNewCareer] = useState({
    type: 'job' as 'job' | 'higherStudies' | 'business' | 'other',
    position: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    achievements: [''],
    salary: '',
    degree: '',
    field: '',
    institution: '',
    businessName: '',
    businessType: '',
    otherType: ''
  });
  
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'technical' as 'technical' | 'soft' | 'language' | 'other',
    proficiency: 50
  });
  
  const [newHighlight, setNewHighlight] = useState({
    title: '',
    description: '',
    date: '',
    type: 'achievement' as 'achievement' | 'milestone' | 'award' | 'project'
  });

  const [editProfile, setEditProfile] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    linkedin: '',
    portfolio: ''
  });

  const getSupportStatusColor = (status: string) => {
    switch (status) {
      case 'needSupport': return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30';
      case 'needExtraSupport': return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
      case 'noSupportNeeded': return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getSupportStatusIcon = (status: string) => {
    switch (status) {
      case 'needSupport': return Heart;
      case 'needExtraSupport': return HeartHandshake;
      case 'noSupportNeeded': return ShieldCheck;
      default: return ShieldCheck;
    }
  };

  const getSupportStatusLabel = (status: string) => {
    switch (status) {
      case 'needSupport': return 'Need Support';
      case 'needExtraSupport': return 'Need Extra Support';
      case 'noSupportNeeded': return 'No Support Needed';
      default: return 'Unknown';
    }
  };

  const getSkillCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return Code;
      case 'soft': return Users;
      case 'language': return Globe;
      default: return Zap;
    }
  };

  const getHighlightTypeColor = (type: string) => {
    switch (type) {
      case 'achievement': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'milestone': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'award': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'project': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const handleAddCareer = () => {
    if (!careerTypeSelection) {
      toast({
        title: 'Validation Error',
        description: 'Please select a position type',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'job' && (!newCareer.position || !newCareer.company || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'higherStudies' && (!newCareer.degree || !newCareer.field || !newCareer.institution || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'business' && (!newCareer.businessName || !newCareer.businessType || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'other' && (!newCareer.otherType || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Set position field based on type for display purposes
    if (careerTypeSelection === 'higherStudies') {
      newCareer.position = `${newCareer.degree} in ${newCareer.field}`;
      newCareer.company = newCareer.institution || '';
    } else if (careerTypeSelection === 'business') {
      newCareer.position = newCareer.businessName || '';
      newCareer.company = newCareer.businessType || '';
    } else if (careerTypeSelection === 'other') {
      newCareer.position = newCareer.otherType || '';
      newCareer.company = 'Other';
    }

    // Call API to add career position
    handleAddCareerAPI();
  };

  const handleAddCareerAPI = async () => {
    if (!id) return;
    
    try {
      // Prepare data for API call with type-specific fields
      const careerData = {
        positionType: careerTypeSelection || 'job',
        organizationName: careerTypeSelection === 'higherStudies' ? newCareer.institution : 
                         careerTypeSelection === 'business' ? newCareer.businessType :
                         careerTypeSelection === 'other' ? 'Other' : newCareer.company,
        positionTitle: careerTypeSelection === 'higherStudies' ? `${newCareer.degree} in ${newCareer.field}` :
                      careerTypeSelection === 'business' ? newCareer.businessName :
                      careerTypeSelection === 'other' ? newCareer.otherType : newCareer.position,
        startDate: newCareer.startDate,
        endDate: newCareer.current ? undefined : newCareer.endDate,
        isCurrent: newCareer.current,
        description: newCareer.description,
        location: newCareer.location,
        
        // Type-specific fields
        ...(careerTypeSelection === 'job' && { salary: newCareer.salary }),
        ...(careerTypeSelection === 'higherStudies' && { 
          degree: newCareer.degree, 
          field: newCareer.field,
          institution: newCareer.institution
        }),
        ...(careerTypeSelection === 'business' && { 
          businessName: newCareer.businessName, 
          businessType: newCareer.businessType 
        }),
        ...(careerTypeSelection === 'other' && { otherType: newCareer.otherType })
      };

      // Call the API to add career position
      await alumniService.addCareerPosition(id, careerData);
      
      // Refresh alumni data to show the new career position
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Career entry added successfully!'
      });
      
      setIsAddCareerOpen(false);
      setCareerTypeSelection(null);
      setNewCareer({
        type: 'job',
        position: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        achievements: [''],
        salary: '',
        degree: '',
        field: '',
        institution: '',
        businessName: '',
        businessType: '',
        otherType: ''
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleViewCareer = (careerId: string) => {
    setViewingCareerId(careerId);
    setIsViewCareerOpen(true);
  };

  const handleEditCareer = (careerId: string) => {
    if (!alumni) return;
    const career = alumni.careers.find(c => c.id === careerId);
    if (career) {
      setEditingCareerId(careerId);
      setCareerTypeSelection(career.type);
      setNewCareer({
        type: career.type,
        position: career.position,
        company: career.company,
        location: career.location,
        startDate: career.startDate,
        endDate: career.endDate || '',
        current: career.current,
        description: career.description,
        achievements: career.achievements || [''],
        salary: career.salary || '',
        degree: career.degree || '',
        field: career.field || '',
        institution: career.institution || '',
        businessName: career.businessName || '',
        businessType: career.businessType || '',
        otherType: career.otherType || ''
      });
      setIsEditCareerOpen(true);
    }
  };

  const handleUpdateCareer = async () => {
    if (!id || !editingCareerId) return;
    
    // Perform the same validation as handleAddCareer
    if (!careerTypeSelection) {
      toast({
        title: 'Validation Error',
        description: 'Please select a position type',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'job' && (!newCareer.position || !newCareer.company || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'higherStudies' && (!newCareer.degree || !newCareer.field || !newCareer.institution || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'business' && (!newCareer.businessName || !newCareer.businessType || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (careerTypeSelection === 'other' && (!newCareer.otherType || !newCareer.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Prepare career data with type-specific fields
      const careerData = {
        positionType: careerTypeSelection,
        organizationName: careerTypeSelection === 'higherStudies' ? newCareer.institution : 
                         careerTypeSelection === 'business' ? newCareer.businessType :
                         careerTypeSelection === 'other' ? 'Other' : newCareer.company,
        positionTitle: careerTypeSelection === 'higherStudies' ? `${newCareer.degree} in ${newCareer.field}` :
                      careerTypeSelection === 'business' ? newCareer.businessName :
                      careerTypeSelection === 'other' ? newCareer.otherType : newCareer.position,
        startDate: newCareer.startDate,
        endDate: newCareer.current ? undefined : newCareer.endDate,
        isCurrent: newCareer.current,
        description: newCareer.description,
        // Type-specific fields
        ...(careerTypeSelection === 'job' && { salary: newCareer.salary }),
        ...(careerTypeSelection === 'higherStudies' && { 
          degree: newCareer.degree, 
          field: newCareer.field,
          institution: newCareer.institution
        }),
        ...(careerTypeSelection === 'business' && { 
          businessName: newCareer.businessName, 
          businessType: newCareer.businessType 
        }),
        ...(careerTypeSelection === 'other' && { otherType: newCareer.otherType }),
        location: newCareer.location
      };

      // Use update API if available, otherwise fall back to add
      try {
        await alumniService.updateCareerPosition(id, editingCareerId, careerData);
      } catch (updateError) {
        // If update endpoint doesn't exist, use add (temporary fallback)
        await alumniService.addCareerPosition(id, careerData);
      }
      
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Career entry updated successfully!'
      });
      
      setEditingCareerId(null);
      setIsEditCareerOpen(false);
      setCareerTypeSelection(null);
      setNewCareer({
        type: 'job',
        position: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        achievements: [''],
        salary: '',
        degree: '',
        field: '',
        institution: '',
        businessName: '',
        businessType: '',
        otherType: ''
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleEditSkill = (skillId: string) => {
    if (!alumni) return;
    const skill = alumni.skills.find(s => s.id === skillId);
    if (skill) {
      setEditingSkillId(skillId);
      setNewSkill({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency
      });
      setIsEditSkillOpen(true);
    }
  };

  const handleUpdateSkill = async () => {
    if (!newSkill.name) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a skill name',
        variant: 'destructive'
      });
      return;
    }

    if (!id || !editingSkillId) return;

    try {
      await alumniService.updateSkill(id, editingSkillId, newSkill);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Skill updated successfully!'
      });
      
      setIsEditSkillOpen(false);
      setEditingSkillId(null);
      setNewSkill({ name: '', category: 'technical', proficiency: 50 });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleEditHighlight = (highlightId: string) => {
    if (!alumni) return;
    const highlight = alumni.highlights.find(h => h.id === highlightId);
    if (highlight) {
      setEditingHighlightId(highlightId);
      setNewHighlight({
        title: highlight.title,
        description: highlight.description,
        date: highlight.date,
        type: highlight.type
      });
      setIsEditHighlightOpen(true);
    }
  };

  const handleUpdateHighlight = async () => {
    if (!newHighlight.title || !newHighlight.description || !newHighlight.date) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!id || !editingHighlightId) return;

    try {
      await alumniService.updateHighlight(id, editingHighlightId, newHighlight);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Career highlight updated successfully!'
      });
      
      setIsEditHighlightOpen(false);
      setEditingHighlightId(null);
      setNewHighlight({ title: '', description: '', date: '', type: 'achievement' });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!id) return;

    try {
      await alumniService.deleteSkill(id, skillId);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Skill deleted successfully!'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!id) return;

    try {
      await alumniService.deleteHighlight(id, highlightId);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Career highlight deleted successfully!'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCareer = async (careerId: string) => {
    if (!id) return;

    try {
      await alumniService.deleteCareerPosition(id, careerId);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Career entry deleted successfully!'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  // Helper function to render skill cards
  const renderSkillCard = (skill: Skill) => {
    const SkillIcon = getSkillCategoryIcon(skill.category);
    return (
      <Card key={skill.id} className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <SkillIcon className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{skill.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {skill.proficiency}%
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditSkill(skill.id)}
                className="h-6 w-6 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSkill(skill.id)}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Progress value={skill.proficiency} className="h-2" />
        </CardContent>
      </Card>
    );
  };

  const handleUpdateProfile = async () => {
    if (!editProfile.name || !editProfile.email || !editProfile.phone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (Name, Email, Phone)',
        variant: 'destructive'
      });
      return;
    }

    if (!id) return;

    try {
      await alumniService.updateProfile(id, editProfile);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully!'
      });
      
      setIsEditProfileOpen(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleUpdateSupport = async (status: 'needSupport' | 'needExtraSupport' | 'noSupportNeeded') => {
    if (!id) return;

    try {
      // Convert UI status to API format
      const apiStatus = status === 'needSupport' ? 'receiving_support' :
                       status === 'needExtraSupport' ? 'needs_extra_support' :
                       'no_support_needed';

      await alumniService.updateSupportCategory(id, { 
        category: apiStatus,
        notes: `Support status updated to ${getSupportStatusLabel(status)}` 
      });
      
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: `Support status updated to ${getSupportStatusLabel(status)}`
      });
      
      setIsUpdateSupportOpen(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.name) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a skill name',
        variant: 'destructive'
      });
      return;
    }

    if (!id) return;

    try {
      await alumniService.addSkill(id, newSkill);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Skill added successfully!'
      });
      
      setIsAddSkillOpen(false);
      setNewSkill({ name: '', category: 'technical', proficiency: 50 });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  const handleAddHighlight = async () => {
    if (!newHighlight.title || !newHighlight.description || !newHighlight.date) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!id) return;

    try {
      await alumniService.addHighlight(id, newHighlight);
      await fetchAlumniData();
      
      toast({
        title: 'Success',
        description: 'Career highlight added successfully!'
      });
      
      setIsAddHighlightOpen(false);
      setNewHighlight({ title: '', description: '', date: '', type: 'achievement' });
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive'
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alumni details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Alumni Details</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchAlumniData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/alumni')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Alumni
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!alumni) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Alumni Not Found</h3>
            <p className="text-muted-foreground mb-4">The requested alumni record could not be found.</p>
            <Button onClick={() => navigate('/alumni')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Alumni
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SupportIcon = getSupportStatusIcon(alumni?.supportStatus || 'noSupportNeeded');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/alumni')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Alumni Details</h1>
          <p className="text-muted-foreground">Complete profile and career information</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/students/${id}`)}>
          <FileText className="w-4 h-4 mr-2" />
          View Full Profile
        </Button>
      </div>

      {/* Hero Section - Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card overflow-hidden border-2 border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Profile Photo */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-primary/20 ring-4 ring-primary/10">
                    <AvatarImage src={alumni.avatar} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-3xl">
                      {alumni.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge 
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${getSupportStatusColor(alumni.supportStatus)}`}
                  >
                    <SupportIcon className="w-3 h-3 mr-1" />
                    {getSupportStatusLabel(alumni.supportStatus)}
                  </Badge>
                </div>
              </div>

              {/* Names & Info */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-foreground mb-1">{alumni.name}</h2>
                <p className="text-lg text-muted-foreground font-medium mb-2">{alumni.currentJob} at {alumni.company}</p>
                <p className="text-sm text-muted-foreground mb-4">{alumni.department} • Class of {alumni.graduationYear} • Roll: {alumni.roll}</p>
                
                {alumni.bio && (
                  <p className="text-sm text-foreground/80 mb-4 max-w-2xl">{alumni.bio}</p>
                )}

                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Final GPA</p>
                      <p className="text-xl font-bold text-primary">{alumni.gpa}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Careers</p>
                      <p className="text-xl font-bold text-foreground">{alumni.careers.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Skills</p>
                      <p className="text-xl font-bold text-foreground">{alumni.skills.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Highlights</p>
                      <p className="text-xl font-bold text-foreground">{alumni.highlights.length}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row lg:flex-col gap-2 justify-center">
                <Button onClick={() => setIsUpdateSupportOpen(true)} className="gradient-primary text-primary-foreground">
                  <Heart className="w-4 h-4 mr-2" />
                  Update Support
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => setIsEditProfileOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{alumni.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{alumni.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{alumni.location}</span>
              </div>
              {alumni.linkedin && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  <a href={alumni.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    LinkedIn Profile
                  </a>
                </div>
              )}
              {alumni.portfolio && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a href={alumni.portfolio} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Portfolio Website
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Academic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Department</span>
                <span className="text-sm font-medium">{alumni.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Graduation Year</span>
                <span className="text-sm font-medium">{alumni.graduationYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Roll Number</span>
                <span className="text-sm font-medium">{alumni.roll}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Final GPA</span>
                <Badge className="gradient-primary text-primary-foreground">{alumni.gpa}</Badge>
              </div>
              {alumni.higherStudiesInstitute && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Higher Studies</span>
                  <span className="text-sm font-medium">{alumni.higherStudiesInstitute}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Career Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Career Progress
              </CardTitle>
              <Button size="sm" onClick={() => setIsAddCareerOpen(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Career
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {alumni.careers.map((career, index) => (
                <div key={career.id} className="relative">
                  {/* Timeline */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      {index < alumni.careers.length - 1 && (
                        <div className="w-0.5 h-full min-h-[100px] bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <Card className="bg-muted/30 border-2 border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-foreground">
                                {career.type === 'job' ? career.position : 
                                 career.type === 'higherStudies' ? `${career.degree} in ${career.field}` :
                                 career.type === 'business' ? career.businessName :
                                 career.otherType}
                              </h3>
                              <p className="text-sm font-medium text-primary">
                                {career.type === 'job' ? career.company :
                                 career.type === 'higherStudies' ? career.institution :
                                 career.type === 'business' ? career.businessType :
                                 career.type}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{career.location}</span>
                                <span className="text-muted-foreground">•</span>
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(career.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {
                                    career.current ? 'Present' : new Date(career.endDate!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                  }
                                </span>
                                {career.current && (
                                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewCareer(career.id)}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCareer(career.id)}
                                title="Edit Career"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCareer(career.id)}
                                className="text-destructive hover:text-destructive"
                                title="Delete Career"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-foreground/80 mb-3">{career.description}</p>
                          {career.achievements && career.achievements.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Key Achievements:</p>
                              <ul className="space-y-1">
                                {career.achievements.map((achievement, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                                    <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>{achievement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ))}
              {alumni.careers.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-foreground font-medium mb-2">No Career Entries</p>
                  <p className="text-sm text-muted-foreground mb-4">Add career entries to track professional progress</p>
                  <Button size="sm" onClick={() => setIsAddCareerOpen(true)} className="gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Career
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Skills Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code className="w-4 h-4" />
                Skills
              </CardTitle>
              <Button size="sm" onClick={() => setIsAddSkillOpen(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="soft">Soft Skills</TabsTrigger>
                <TabsTrigger value="language">Languages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alumni.skills.map(renderSkillCard)}
                </div>
              </TabsContent>
              <TabsContent value="technical" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alumni.skills.filter(s => s.category === 'technical').map(renderSkillCard)}
                </div>
              </TabsContent>
              <TabsContent value="soft" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alumni.skills.filter(s => s.category === 'soft').map(renderSkillCard)}
                </div>
              </TabsContent>
              <TabsContent value="language" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alumni.skills.filter(s => s.category === 'language').map(renderSkillCard)}
                </div>
              </TabsContent>
            </Tabs>
            {alumni.skills.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg mt-4">
                <Code className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Skills Added</p>
                <p className="text-sm text-muted-foreground mb-4">Add skills to showcase expertise</p>
                <Button size="sm" onClick={() => setIsAddSkillOpen(true)} className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Career Highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4" />
                Career Highlights
              </CardTitle>
              <Button size="sm" onClick={() => setIsAddHighlightOpen(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Highlight
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alumni.highlights.map((highlight) => (
                <Card key={highlight.id} className="bg-muted/30 border-2 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className={getHighlightTypeColor(highlight.type)}>
                        {highlight.type}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditHighlight(highlight.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHighlight(highlight.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{highlight.title}</h3>
                    <p className="text-sm text-foreground/80 mb-2">{highlight.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(highlight.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {alumni.highlights.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg mt-4">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Career Highlights</p>
                <p className="text-sm text-muted-foreground mb-4">Add important career milestones and achievements</p>
                <Button size="sm" onClick={() => setIsAddHighlightOpen(true)} className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Highlight
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Career Dialog */}
      <Dialog open={isAddCareerOpen || isEditCareerOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddCareerOpen(false);
          setIsEditCareerOpen(false);
          setCareerTypeSelection(null);
          setEditingCareerId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditCareerOpen ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {isEditCareerOpen ? 'Edit Career Entry' : 'Add Career Entry'}
            </DialogTitle>
            <DialogDescription>
              {!careerTypeSelection ? 'Select the type of position first' : 'Fill in the details for this career entry'}
            </DialogDescription>
          </DialogHeader>
          {!careerTypeSelection ? (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setCareerTypeSelection('job');
                  setNewCareer({ ...newCareer, type: 'job' });
                }}
              >
                <Briefcase className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Job Holder</div>
                  <div className="text-sm text-muted-foreground">Employment position at a company</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setCareerTypeSelection('higherStudies');
                  setNewCareer({ ...newCareer, type: 'higherStudies' });
                }}
              >
                <BookOpen className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Higher Studies</div>
                  <div className="text-sm text-muted-foreground">Pursuing further education</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setCareerTypeSelection('business');
                  setNewCareer({ ...newCareer, type: 'business' });
                }}
              >
                <Building2 className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Business</div>
                  <div className="text-sm text-muted-foreground">Running own business or startup</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setCareerTypeSelection('other');
                  setNewCareer({ ...newCareer, type: 'other' });
                }}
              >
                <Target className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Other</div>
                  <div className="text-sm text-muted-foreground">Freelancing, consulting, or other activities</div>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {careerTypeSelection === 'job' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position *</Label>
                      <Input
                        id="position"
                        placeholder="e.g., Software Engineer"
                        value={newCareer.position}
                        onChange={(e) => setNewCareer({ ...newCareer, position: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company *</Label>
                      <Input
                        id="company"
                        placeholder="e.g., Google"
                        value={newCareer.company}
                        onChange={(e) => setNewCareer({ ...newCareer, company: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Dhaka, Bangladesh"
                        value={newCareer.location}
                        onChange={(e) => setNewCareer({ ...newCareer, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary (Optional)</Label>
                      <Input
                        id="salary"
                        placeholder="e.g., 150000 BDT"
                        value={newCareer.salary}
                        onChange={(e) => setNewCareer({ ...newCareer, salary: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {careerTypeSelection === 'higherStudies' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="degree">Degree *</Label>
                      <Input
                        id="degree"
                        placeholder="e.g., Master's, PhD"
                        value={newCareer.degree}
                        onChange={(e) => setNewCareer({ ...newCareer, degree: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field">Field of Study *</Label>
                      <Input
                        id="field"
                        placeholder="e.g., Computer Science"
                        value={newCareer.field}
                        onChange={(e) => setNewCareer({ ...newCareer, field: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution *</Label>
                    <Input
                      id="institution"
                      placeholder="e.g., University of Tokyo"
                      value={newCareer.institution}
                      onChange={(e) => setNewCareer({ ...newCareer, institution: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Tokyo, Japan"
                      value={newCareer.location}
                      onChange={(e) => setNewCareer({ ...newCareer, location: e.target.value })}
                    />
                  </div>
                </>
              )}

              {careerTypeSelection === 'business' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        placeholder="e.g., Tech Solutions Ltd"
                        value={newCareer.businessName}
                        onChange={(e) => setNewCareer({ ...newCareer, businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type *</Label>
                      <Input
                        id="businessType"
                        placeholder="e.g., IT Services, E-commerce"
                        value={newCareer.businessType}
                        onChange={(e) => setNewCareer({ ...newCareer, businessType: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Dhaka, Bangladesh"
                      value={newCareer.location}
                      onChange={(e) => setNewCareer({ ...newCareer, location: e.target.value })}
                    />
                  </div>
                </>
              )}

              {careerTypeSelection === 'other' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otherType">Activity Type *</Label>
                    <Input
                      id="otherType"
                      placeholder="e.g., Freelancer, Consultant"
                      value={newCareer.otherType}
                      onChange={(e) => setNewCareer({ ...newCareer, otherType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Remote, Dhaka"
                      value={newCareer.location}
                      onChange={(e) => setNewCareer({ ...newCareer, location: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newCareer.startDate}
                    onChange={(e) => setNewCareer({ ...newCareer, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newCareer.endDate}
                    onChange={(e) => setNewCareer({ ...newCareer, endDate: e.target.value })}
                    disabled={newCareer.current}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="current"
                  checked={newCareer.current}
                  onChange={(e) => setNewCareer({ ...newCareer, current: e.target.checked, endDate: e.target.checked ? '' : newCareer.endDate })}
                  className="w-4 h-4"
                />
                <Label htmlFor="current" className="cursor-pointer">Current Position</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your role and responsibilities..."
                  value={newCareer.description}
                  onChange={(e) => setNewCareer({ ...newCareer, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {careerTypeSelection && (
              <Button variant="outline" onClick={() => {
                setCareerTypeSelection(null);
                setNewCareer({
                  type: 'job',
                  position: '',
                  company: '',
                  location: '',
                  startDate: '',
                  endDate: '',
                  current: false,
                  description: '',
                  achievements: [''],
                  salary: '',
                  degree: '',
                  field: '',
                  institution: '',
                  businessName: '',
                  businessType: '',
                  otherType: ''
                });
              }}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setIsAddCareerOpen(false);
              setIsEditCareerOpen(false);
              setCareerTypeSelection(null);
              setEditingCareerId(null);
            }}>Cancel</Button>
            {careerTypeSelection && (
              <Button onClick={isEditCareerOpen ? handleUpdateCareer : handleAddCareer} className="gradient-primary text-primary-foreground">
                {isEditCareerOpen ? 'Update Career' : 'Add Career'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Support Dialog */}
      <Dialog open={isUpdateSupportOpen} onOpenChange={setIsUpdateSupportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Update Support Status
            </DialogTitle>
            <DialogDescription>
              Update the support status for this alumni member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className={`w-full justify-start ${alumni.supportStatus === 'needSupport' ? 'border-orange-500 bg-orange-500/10' : ''}`}
              onClick={() => handleUpdateSupport('needSupport')}
            >
              <Heart className="w-4 h-4 mr-2 text-orange-500" />
              Need Support
            </Button>
            <Button
              variant="outline"
              className={`w-full justify-start ${alumni.supportStatus === 'needExtraSupport' ? 'border-red-500 bg-red-500/10' : ''}`}
              onClick={() => handleUpdateSupport('needExtraSupport')}
            >
              <HeartHandshake className="w-4 h-4 mr-2 text-red-500" />
              Need Extra Support
            </Button>
            <Button
              variant="outline"
              className={`w-full justify-start ${alumni.supportStatus === 'noSupportNeeded' ? 'border-green-500 bg-green-500/10' : ''}`}
              onClick={() => handleUpdateSupport('noSupportNeeded')}
            >
              <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
              No Support Needed
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateSupportOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Skill Dialog */}
      <Dialog open={isAddSkillOpen || isEditSkillOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddSkillOpen(false);
          setIsEditSkillOpen(false);
          setEditingSkillId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditSkillOpen ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {isEditSkillOpen ? 'Edit Skill' : 'Add Skill'}
            </DialogTitle>
            <DialogDescription>
              {isEditSkillOpen ? 'Update skill information' : 'Add a new skill to the alumni profile'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skillName">Skill Name *</Label>
              <Input
                id="skillName"
                placeholder="e.g., React, Leadership, English"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skillCategory">Category</Label>
              <Select value={newSkill.category} onValueChange={(v: any) => setNewSkill({ ...newSkill, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="soft">Soft Skills</SelectItem>
                  <SelectItem value="language">Language</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proficiency">Proficiency: {newSkill.proficiency}%</Label>
              <input
                type="range"
                id="proficiency"
                min="0"
                max="100"
                value={newSkill.proficiency}
                onChange={(e) => setNewSkill({ ...newSkill, proficiency: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddSkillOpen(false);
              setIsEditSkillOpen(false);
              setEditingSkillId(null);
            }}>Cancel</Button>
            <Button onClick={isEditSkillOpen ? handleUpdateSkill : handleAddSkill} className="gradient-primary text-primary-foreground">
              {isEditSkillOpen ? 'Update Skill' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Highlight Dialog */}
      <Dialog open={isAddHighlightOpen || isEditHighlightOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddHighlightOpen(false);
          setIsEditHighlightOpen(false);
          setEditingHighlightId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditHighlightOpen ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {isEditHighlightOpen ? 'Edit Career Highlight' : 'Add Career Highlight'}
            </DialogTitle>
            <DialogDescription>
              {isEditHighlightOpen ? 'Update career highlight information' : 'Add an important career milestone or achievement'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="highlightTitle">Title *</Label>
              <Input
                id="highlightTitle"
                placeholder="e.g., Promoted to Senior Engineer"
                value={newHighlight.title}
                onChange={(e) => setNewHighlight({ ...newHighlight, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlightDescription">Description *</Label>
              <Textarea
                id="highlightDescription"
                placeholder="Describe the highlight..."
                value={newHighlight.description}
                onChange={(e) => setNewHighlight({ ...newHighlight, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="highlightDate">Date *</Label>
                <Input
                  id="highlightDate"
                  type="date"
                  value={newHighlight.date}
                  onChange={(e) => setNewHighlight({ ...newHighlight, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highlightType">Type</Label>
                <Select value={newHighlight.type} onValueChange={(v: any) => setNewHighlight({ ...newHighlight, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="award">Award</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddHighlightOpen(false);
              setIsEditHighlightOpen(false);
              setEditingHighlightId(null);
            }}>Cancel</Button>
            <Button onClick={isEditHighlightOpen ? handleUpdateHighlight : handleAddHighlight} className="gradient-primary text-primary-foreground">
              {isEditHighlightOpen ? 'Update Highlight' : 'Add Highlight'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update alumni profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Full Name *</Label>
              <Input
                id="editName"
                value={editProfile.name}
                onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editProfile.email}
                  onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone *</Label>
                <Input
                  id="editPhone"
                  value={editProfile.phone}
                  onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLocation">Location</Label>
              <Input
                id="editLocation"
                value={editProfile.location}
                onChange={(e) => setEditProfile({ ...editProfile, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBio">Bio</Label>
              <Textarea
                id="editBio"
                placeholder="Write a brief bio..."
                value={editProfile.bio}
                onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editLinkedin">LinkedIn URL</Label>
                <Input
                  id="editLinkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={editProfile.linkedin}
                  onChange={(e) => setEditProfile({ ...editProfile, linkedin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPortfolio">Portfolio URL</Label>
                <Input
                  id="editPortfolio"
                  type="url"
                  placeholder="https://..."
                  value={editProfile.portfolio}
                  onChange={(e) => setEditProfile({ ...editProfile, portfolio: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProfileOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile} className="gradient-primary text-primary-foreground">Update Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Career Dialog */}
      <Dialog open={isViewCareerOpen} onOpenChange={setIsViewCareerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Career Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this career entry
            </DialogDescription>
          </DialogHeader>
          {viewingCareerId && alumni && (() => {
            const career = alumni.careers.find(c => c.id === viewingCareerId);
            if (!career) return <div>Career not found</div>;
            
            return (
              <div className="space-y-6 py-4">
                {/* Career Type Badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {career.type === 'job' ? 'Job Position' :
                     career.type === 'higherStudies' ? 'Higher Studies' :
                     career.type === 'business' ? 'Business' :
                     'Other Activity'}
                  </Badge>
                  {career.current && (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                      Current Position
                    </Badge>
                  )}
                </div>

                {/* Main Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {career.type === 'job' ? career.position : 
                       career.type === 'higherStudies' ? `${career.degree} in ${career.field}` :
                       career.type === 'business' ? career.businessName :
                       career.otherType}
                    </h3>
                    <p className="text-lg font-medium text-primary">
                      {career.type === 'job' ? career.company :
                       career.type === 'higherStudies' ? career.institution :
                       career.type === 'business' ? career.businessType :
                       'Other'}
                    </p>
                  </div>

                  {/* Duration and Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Duration</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(career.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - {
                            career.current ? 'Present' : new Date(career.endDate!).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          }
                        </span>
                      </div>
                    </div>
                    {career.location && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground">Location</Label>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{career.location}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Type-specific Information */}
                  {career.type === 'job' && career.salary && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Salary</Label>
                      <p className="text-sm font-medium">{career.salary}</p>
                    </div>
                  )}

                  {career.type === 'higherStudies' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {career.degree && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">Degree</Label>
                          <p className="text-sm font-medium">{career.degree}</p>
                        </div>
                      )}
                      {career.field && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">Field of Study</Label>
                          <p className="text-sm font-medium">{career.field}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {career.type === 'business' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {career.businessName && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">Business Name</Label>
                          <p className="text-sm font-medium">{career.businessName}</p>
                        </div>
                      )}
                      {career.businessType && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">Business Type</Label>
                          <p className="text-sm font-medium">{career.businessType}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {career.type === 'other' && career.otherType && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Activity Type</Label>
                      <p className="text-sm font-medium">{career.otherType}</p>
                    </div>
                  )}

                  {/* Description */}
                  {career.description && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Description</Label>
                      <p className="text-sm text-foreground/80 leading-relaxed">{career.description}</p>
                    </div>
                  )}

                  {/* Achievements */}
                  {career.achievements && career.achievements.length > 0 && career.achievements[0] !== '' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Key Achievements</Label>
                      <ul className="space-y-2">
                        {career.achievements.map((achievement, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewCareerOpen(false)}>Close</Button>
            <Button 
              onClick={() => {
                setIsViewCareerOpen(false);
                if (viewingCareerId) {
                  handleEditCareer(viewingCareerId);
                }
              }} 
              className="gradient-primary text-primary-foreground"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Career
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

