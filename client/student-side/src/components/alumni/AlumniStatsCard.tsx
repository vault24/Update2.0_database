import { motion } from 'framer-motion';
import { 
  GraduationCap, Briefcase, TrendingUp, Calendar
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AlumniProfile } from '@/services/alumniService';

interface AlumniStatsCardProps {
  alumni: AlumniProfile;
}

export function AlumniStatsCard({ alumni }: AlumniStatsCardProps) {
  const currentYear = new Date().getFullYear();
  const yearsAfterGraduation = currentYear - parseInt(alumni.graduationYear);
  const totalPositions = alumni.careers.length;
  const totalSkills = alumni.skills.length;
  const totalHighlights = alumni.highlights.length;

  const stats = [
    {
      icon: Calendar,
      label: 'Years Since Graduation',
      value: yearsAfterGraduation > 0 ? `${yearsAfterGraduation}+` : 'This Year',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Briefcase,
      label: 'Career Positions',
      value: totalPositions.toString(),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Skills & Expertise',
      value: totalSkills.toString(),
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: GraduationCap,
      label: 'CGPA',
      value: alumni.gpa.toFixed(2),
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-4 rounded-xl bg-muted/50"
            >
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
