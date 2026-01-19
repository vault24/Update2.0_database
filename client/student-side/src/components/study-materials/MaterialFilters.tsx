import { motion } from 'framer-motion';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { departments, shifts, semesters, subjects } from '@/data/mockStudyMaterials';
import { useState } from 'react';

interface FilterState {
  search: string;
  department: string;
  shift: string;
  semester: string;
  subject: string;
  type: string;
}

interface MaterialFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function MaterialFilters({ filters, onFilterChange }: MaterialFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    // Reset subject when department changes
    if (key === 'department') {
      newFilters.subject = '';
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      department: '',
      shift: '',
      semester: '',
      subject: '',
      type: '',
    });
  };

  const activeFiltersCount = [
    filters.department,
    filters.shift,
    filters.semester,
    filters.subject,
    filters.type,
  ].filter(Boolean).length;

  const availableSubjects = filters.department ? subjects[filters.department] || [] : [];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search materials..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4"
          >
            {/* Department */}
            <Select value={filters.department} onValueChange={(v) => updateFilter('department', v)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Shift */}
            <Select value={filters.shift} onValueChange={(v) => updateFilter('shift', v)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                {shifts.map((shift) => (
                  <SelectItem key={shift} value={shift}>
                    {shift}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semester */}
            <Select value={filters.semester} onValueChange={(v) => updateFilter('semester', v)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject */}
            <Select 
              value={filters.subject} 
              onValueChange={(v) => updateFilter('subject', v)}
              disabled={!filters.department || filters.department === 'all'}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {availableSubjects.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF Notes</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="slide">Slides</SelectItem>
                <SelectItem value="ebook">E-Books</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
