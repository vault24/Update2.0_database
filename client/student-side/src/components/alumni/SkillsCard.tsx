import { motion } from 'framer-motion';
import { Code, Users, Globe, Sparkles, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skill, SkillCategory } from '@/services/alumniService';

interface SkillsCardProps {
  skills: Skill[];
  onAdd?: () => void;
  onEdit?: (skill: Skill) => void;
  onDelete?: (skillId: string) => void;
  isEditable?: boolean;
}

export function SkillsCard({ skills, onAdd, onEdit, onDelete, isEditable = true }: SkillsCardProps) {
  const getCategoryIcon = (category: SkillCategory) => {
    switch (category) {
      case 'technical':
        return Code;
      case 'soft':
        return Users;
      case 'language':
        return Globe;
      default:
        return Sparkles;
    }
  };

  const getCategoryColor = (category: SkillCategory) => {
    switch (category) {
      case 'technical':
        return 'text-blue-500';
      case 'soft':
        return 'text-purple-500';
      case 'language':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getProgressColor = (proficiency: number) => {
    if (proficiency >= 80) return 'bg-emerald-500';
    if (proficiency >= 60) return 'bg-blue-500';
    if (proficiency >= 40) return 'bg-amber-500';
    return 'bg-gray-500';
  };

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<SkillCategory, Skill[]>);

  const categoryLabels: Record<SkillCategory, string> = {
    technical: 'Technical Skills',
    soft: 'Soft Skills',
    language: 'Languages',
    other: 'Other Skills',
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" />
          Skills & Expertise
        </CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No skills added yet</p>
            {isEditable && (
              <Button variant="link" onClick={onAdd} className="mt-2">
                Add your skills
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(Object.keys(groupedSkills) as SkillCategory[]).map((category, categoryIndex) => {
              const Icon = getCategoryIcon(category);
              const iconColor = getCategoryColor(category);

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    <h4 className="font-medium text-foreground">{categoryLabels[category]}</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {groupedSkills[category].map((skill, index) => (
                      <motion.div
                        key={skill.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (categoryIndex * 0.1) + (index * 0.05) }}
                        className="group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{skill.name}</span>
                            {isEditable && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6" 
                                  onClick={() => onEdit?.(skill)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-destructive" 
                                  onClick={() => onDelete?.(skill.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{skill.proficiency}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.proficiency}%` }}
                            transition={{ delay: 0.3 + (index * 0.1), duration: 0.5 }}
                            className={`h-full rounded-full ${getProgressColor(skill.proficiency)}`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
