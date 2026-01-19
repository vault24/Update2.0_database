import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Grid3X3, List, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialFilters } from '@/components/study-materials/MaterialFilters';
import { MaterialCard } from '@/components/study-materials/MaterialCard';
import { DepartmentFolder } from '@/components/study-materials/DepartmentFolder';
import { mockMaterials, departments } from '@/data/mockStudyMaterials';

type ViewMode = 'grid' | 'list' | 'folder';

interface FilterState {
  search: string;
  department: string;
  shift: string;
  semester: string;
  subject: string;
  type: string;
}

export default function StudyMaterialsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department: '',
    shift: '',
    semester: '',
    subject: '',
    type: '',
  });

  const filteredMaterials = useMemo(() => {
    return mockMaterials.filter((material) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          material.title.toLowerCase().includes(searchLower) ||
          material.subject.toLowerCase().includes(searchLower) ||
          material.uploadedBy.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Department filter
      if (filters.department && filters.department !== 'all' && material.department !== filters.department) {
        return false;
      }

      // Shift filter
      if (filters.shift && filters.shift !== 'all' && material.shift !== filters.shift) {
        return false;
      }

      // Semester filter
      if (filters.semester && filters.semester !== 'all' && material.semester !== filters.semester) {
        return false;
      }

      // Subject filter
      if (filters.subject && filters.subject !== 'all' && material.subject !== filters.subject) {
        return false;
      }

      // Type filter
      if (filters.type && filters.type !== 'all' && material.type !== filters.type) {
        return false;
      }

      return true;
    });
  }, [filters]);

  // Group by department for folder view
  const materialsByDepartment = useMemo(() => {
    return departments.reduce((acc, dept) => {
      const deptMaterials = filteredMaterials.filter(m => m.department === dept);
      if (deptMaterials.length > 0) {
        acc[dept] = deptMaterials;
      }
      return acc;
    }, {} as Record<string, typeof filteredMaterials>);
  }, [filteredMaterials]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-full overflow-x-hidden"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            Study Materials
          </h1>
          <p className="text-muted-foreground mt-1">
            Access lecture notes, videos, and study resources
          </p>
        </div>

        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="grid" className="gap-1.5">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
            <TabsTrigger value="folder" className="gap-1.5">
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">Folders</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <MaterialFilters filters={filters} onFilterChange={setFilters} />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredMaterials.length}</span> materials
        </p>
      </div>

      {/* Content */}
      {viewMode === 'folder' ? (
        <div className="space-y-4">
          {Object.keys(materialsByDepartment).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No materials found matching your filters
            </div>
          ) : (
            Object.entries(materialsByDepartment).map(([dept, materials], idx) => (
              <DepartmentFolder
                key={dept}
                department={dept}
                materials={materials}
                defaultOpen={idx === 0}
              />
            ))
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        }>
          {filteredMaterials.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No materials found matching your filters
            </div>
          ) : (
            filteredMaterials.map((material, idx) => (
              <MaterialCard key={material.id} material={material} index={idx} />
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
