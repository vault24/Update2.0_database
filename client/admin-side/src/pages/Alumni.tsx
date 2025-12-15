import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, GraduationCap, Briefcase, MapPin, Calendar, Users, TrendingUp, Building2, BookOpen, Heart, HeartHandshake, ShieldCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { alumniService, Alumni as AlumniType } from '@/services/alumniService';
import { getErrorMessage } from '@/lib/api';

type AlumniCategory = 'all' | 'recent' | 'established' | 'receiving_support' | 'needs_extra_support' | 'no_support_needed';

interface DisplayAlumni {
  id: string;
  name: string;
  roll: string;
  department: string;
  graduationYear: string;
  currentJob: string;
  company: string;
  location: string;
  avatar: string;
  category: 'recent' | 'established';
  supportStatus: 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
}

const categories = [
  { value: 'all', label: 'All Alumni', icon: Users },
  { value: 'recent', label: 'Recent Alumni', icon: Calendar },
  { value: 'established', label: 'Established', icon: TrendingUp },
  { value: 'receiving_support', label: 'Receiving Support', icon: Heart },
  { value: 'needs_extra_support', label: 'Needs Extra Support', icon: HeartHandshake },
  { value: 'no_support_needed', label: 'No Support Needed', icon: ShieldCheck },
];

export default function Alumni() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [year, setYear] = useState('all');
  const [category, setCategory] = useState<AlumniCategory>('all');
  
  // API state
  const [alumniData, setAlumniData] = useState<DisplayAlumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [stats, setStats] = useState({
    all: 0,
    recent: 0,
    established: 0,
    receiving_support: 0,
    needs_extra_support: 0,
    no_support_needed: 0,
  });

  // Fetch alumni data
  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await alumniService.getAlumni({ page_size: 1000 });
      
      // Transform API data to display format
      const transformedData: DisplayAlumni[] = response.results.map((alumni: AlumniType) => ({
        id: alumni.student.id,
        name: alumni.student.fullNameEnglish || 'Unknown',
        roll: alumni.student.currentRollNumber || 'N/A',
        department: alumni.student.department?.name || 'Unknown',
        graduationYear: alumni.graduationYear?.toString() || 'N/A',
        currentJob: alumni.currentPosition?.positionTitle || 'Not specified',
        company: alumni.currentPosition?.organizationName || 'Not specified',
        location: 'N/A', // Not available in API
        avatar: '',
        category: alumni.alumniType,
        supportStatus: alumni.currentSupportCategory,
      }));
      
      setAlumniData(transformedData);
      
      // Extract unique departments and years
      const uniqueDepts = Array.from(new Set(transformedData.map(a => a.department).filter(Boolean)));
      const uniqueYears = Array.from(new Set(transformedData.map(a => a.graduationYear).filter(Boolean))).sort().reverse();
      
      setDepartments(uniqueDepts);
      setYears(uniqueYears);
      
      // Calculate stats
      setStats({
        all: transformedData.length,
        recent: transformedData.filter(a => a.category === 'recent').length,
        established: transformedData.filter(a => a.category === 'established').length,
        receiving_support: transformedData.filter(a => a.supportStatus === 'receiving_support').length,
        needs_extra_support: transformedData.filter(a => a.supportStatus === 'needs_extra_support').length,
        no_support_needed: transformedData.filter(a => a.supportStatus === 'no_support_needed').length,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlumni = alumniData.filter(a => {
    const matchesSearch = search === '' || 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.roll.includes(search) || 
      a.company.toLowerCase().includes(search.toLowerCase());
    const matchesDept = department === 'all' || a.department === department;
    const matchesYear = year === 'all' || a.graduationYear === year;
    let matchesCategory = false;
    if (category === 'all') {
      matchesCategory = true;
    } else if (['receiving_support', 'needs_extra_support', 'no_support_needed'].includes(category)) {
      matchesCategory = a.supportStatus === category;
    } else {
      matchesCategory = a.category === category;
    }
    return matchesSearch && matchesDept && matchesYear && matchesCategory;
  });

  const getCategoryStats = (cat: AlumniCategory) => {
    return stats[cat] || 0;
  };

  const getCategoryColor = (cat: 'recent' | 'established') => {
    switch (cat) {
      case 'recent': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'established': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getSupportColor = (status: 'receiving_support' | 'needs_extra_support' | 'no_support_needed') => {
    switch (status) {
      case 'receiving_support': return 'bg-orange-500 text-white';
      case 'needs_extra_support': return 'bg-red-500 text-white';
      case 'no_support_needed': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const openDetail = (alumni: DisplayAlumni) => {
    navigate(`/alumni/${alumni.id}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alumni data...</p>
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
            <h3 className="text-lg font-semibold mb-2">Error Loading Alumni</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAlumni}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Alumni Network
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">Manage alumni records and track graduates' career progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
            <GraduationCap className="w-4 h-4 mr-2" />
            {stats.all} Alumni
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAlumni}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat, index) => (
          <motion.div 
            key={cat.value}
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card 
              className={`glass-card cursor-pointer transition-all duration-300 ${
                category === cat.value 
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/20 bg-primary/5' 
                  : 'hover:bg-muted/50 hover:shadow-md'
              }`}
              onClick={() => setCategory(cat.value as AlumniCategory)}
            >
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg mb-2 ${
                  category === cat.value 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <p className="text-xl font-bold text-foreground mb-1">{getCategoryStats(cat.value as AlumniCategory)}</p>
                <p className="text-[11px] text-muted-foreground truncate font-medium">{cat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card border-2 border-border/50">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, roll, or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 h-11 text-base"
                />
              </div>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full sm:w-[200px] h-11">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-full sm:w-[160px] h-11">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{`Class of ${y}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alumni Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredAlumni.map((alumni, index) => (
          <motion.div
            key={alumni.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -5 }}
          >
            <Card className="glass-card hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-border/50 hover:border-primary/30 overflow-hidden" onClick={() => openDetail(alumni)}>
              <CardContent className="p-5">
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-20 h-20 mx-auto border-3 border-primary/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <AvatarImage src={alumni.avatar} />
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xl font-bold">
                        {alumni.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      {alumni.supportStatus === 'receiving_support' && (
                        <Badge className={`${getSupportColor(alumni.supportStatus)} border-2 border-background`}>
                          <Heart className="w-3 h-3 mr-1" />
                        </Badge>
                      )}
                      {alumni.supportStatus === 'needs_extra_support' && (
                        <Badge className={`${getSupportColor(alumni.supportStatus)} border-2 border-background`}>
                          <HeartHandshake className="w-3 h-3 mr-1" />
                        </Badge>
                      )}
                      {alumni.supportStatus === 'no_support_needed' && (
                        <Badge className={`${getSupportColor(alumni.supportStatus)} border-2 border-background`}>
                          <ShieldCheck className="w-3 h-3 mr-1" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-foreground mt-3 truncate group-hover:text-primary transition-colors">{alumni.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Class of {alumni.graduationYear}</p>
                  <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {alumni.department}
                    </Badge>
                    <Badge variant="outline" className={`text-xs font-semibold ${getCategoryColor(alumni.category)}`}>
                      {alumni.category === 'recent' ? 'Recent' : 'Established'}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-primary truncate">{alumni.currentJob}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{alumni.company}</p>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{alumni.location}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="text-xs group-hover:text-primary">
                      View Details <Eye className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredAlumni.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="glass-card border-2 border-dashed border-border">
            <CardContent className="p-12 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <GraduationCap className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Alumni Found</h3>
              <p className="text-muted-foreground">No alumni found matching your criteria. Try adjusting your filters.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
