import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StudyMaterial } from '@/data/mockStudyMaterials';
import { MaterialCard } from './MaterialCard';

interface DepartmentFolderProps {
  department: string;
  materials: StudyMaterial[];
  defaultOpen?: boolean;
}

export function DepartmentFolder({ department, materials, defaultOpen = false }: DepartmentFolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Group materials by semester
  const materialsBySemester = materials.reduce((acc, material) => {
    if (!acc[material.semester]) {
      acc[material.semester] = [];
    }
    acc[material.semester].push(material);
    return acc;
  }, {} as Record<string, StudyMaterial[]>);

  const sortedSemesters = Object.keys(materialsBySemester).sort();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen && "shadow-elevated"
        )}
      >
        {/* Folder Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            isOpen ? "bg-primary/10" : "bg-secondary"
          )}>
            {isOpen ? (
              <FolderOpen className="w-5 h-5 text-primary" />
            ) : (
              <Folder className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{department}</h3>
            <p className="text-xs text-muted-foreground">
              {materials.length} materials
            </p>
          </div>
          <Badge variant="secondary">{materials.length}</Badge>
          <ChevronRight className={cn(
            "w-5 h-5 text-muted-foreground transition-transform",
            isOpen && "rotate-90"
          )} />
        </button>

        {/* Folder Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-4">
                {sortedSemesters.map((semester) => (
                  <div key={semester}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {semester}
                    </h4>
                    <div className="space-y-3 pl-4">
                      {materialsBySemester[semester].map((material, idx) => (
                        <MaterialCard 
                          key={material.id} 
                          material={material} 
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
