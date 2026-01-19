import { motion } from 'framer-motion';
import { 
  User, GraduationCap, Award, MapPin, Phone, Mail, Calendar,
  Briefcase, Heart, Globe, Star, TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StudentOverviewTabProps {
  personalInfo: {
    fullName: string;
    fullNameBangla?: string;
    rollNumber: string;
    email: string;
    mobile?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    nationality?: string;
  };
  academicInfo: {
    department: string;
    session?: string;
    semester: number | string;
    shift?: string;
    status?: string;
    admissionDate?: string;
    boardRoll?: string;
    boardRegistration?: string;
  };
  performanceMetrics: {
    cgpa: number | string;
    attendancePercentage: number;
    subjectsCount: number;
    rank?: number | string;
  };
  parentInfo?: {
    fatherName?: string;
    fatherMobile?: string;
    motherName?: string;
    motherMobile?: string;
  };
  address?: {
    present?: string;
    permanent?: string;
  };
}

export function StudentOverviewTab({
  personalInfo,
  academicInfo,
  performanceMetrics,
  parentInfo,
  address
}: StudentOverviewTabProps) {
  const InfoRow = ({ label, value, className }: { label: string; value: string | number | undefined; className?: string }) => (
    <div className={cn("flex justify-between items-center py-2 border-b border-border/50 last:border-0", className)}>
      <span className="text-muted-foreground text-xs md:text-sm">{label}</span>
      <span className="font-medium text-xs md:text-sm text-right">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          Personal Information
        </h3>
        <div className="space-y-0">
          <InfoRow label="Full Name (English)" value={personalInfo.fullName} />
          <InfoRow label="Full Name (Bangla)" value={personalInfo.fullNameBangla} />
          <InfoRow label="Roll Number" value={personalInfo.rollNumber} />
          <InfoRow label="Email" value={personalInfo.email} />
          <InfoRow label="Mobile" value={personalInfo.mobile} />
          {personalInfo.dateOfBirth && (
            <InfoRow label="Date of Birth" value={personalInfo.dateOfBirth} />
          )}
          {personalInfo.gender && (
            <InfoRow label="Gender" value={personalInfo.gender} />
          )}
          {personalInfo.bloodGroup && (
            <InfoRow label="Blood Group" value={personalInfo.bloodGroup} />
          )}
        </div>
      </motion.div>

      {/* Academic Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-violet-500" />
          </div>
          Academic Information
        </h3>
        <div className="space-y-0">
          <InfoRow label="Department" value={academicInfo.department} />
          <InfoRow label="Session" value={academicInfo.session} />
          <InfoRow label="Semester" value={`${academicInfo.semester}${getSemesterSuffix(Number(academicInfo.semester))} Semester`} />
          <InfoRow label="Shift" value={academicInfo.shift} />
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground text-xs md:text-sm">Status</span>
            <Badge className={cn(
              "text-xs",
              academicInfo.status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            )}>
              {academicInfo.status || 'N/A'}
            </Badge>
          </div>
          {academicInfo.boardRoll && (
            <InfoRow label="Board Roll" value={academicInfo.boardRoll} />
          )}
          {academicInfo.boardRegistration && (
            <InfoRow label="Board Registration" value={academicInfo.boardRegistration} />
          )}
        </div>
      </motion.div>

      {/* Academic Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card md:col-span-2"
      >
        <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          Academic Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <PerformanceCard 
            value={performanceMetrics.cgpa} 
            label="Current CGPA"
            color="from-emerald-500 to-teal-600"
            iconColor="text-emerald-500"
          />
          <PerformanceCard 
            value={`${performanceMetrics.attendancePercentage}%`} 
            label="Attendance"
            color="from-blue-500 to-indigo-600"
            iconColor="text-blue-500"
          />
          <PerformanceCard 
            value={performanceMetrics.rank || '-'} 
            label="Class Rank"
            color="from-amber-500 to-orange-600"
            iconColor="text-amber-500"
          />
          <PerformanceCard 
            value={performanceMetrics.subjectsCount} 
            label="Subjects"
            color="from-violet-500 to-purple-600"
            iconColor="text-violet-500"
          />
        </div>
      </motion.div>

      {/* Parent/Guardian Information */}
      {parentInfo && (parentInfo.fatherName || parentInfo.motherName) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card"
        >
          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-pink-500" />
            </div>
            Parent/Guardian
          </h3>
          <div className="space-y-0">
            {parentInfo.fatherName && (
              <InfoRow label="Father's Name" value={parentInfo.fatherName} />
            )}
            {parentInfo.fatherMobile && (
              <InfoRow label="Father's Mobile" value={parentInfo.fatherMobile} />
            )}
            {parentInfo.motherName && (
              <InfoRow label="Mother's Name" value={parentInfo.motherName} />
            )}
            {parentInfo.motherMobile && (
              <InfoRow label="Mother's Mobile" value={parentInfo.motherMobile} />
            )}
          </div>
        </motion.div>
      )}

      {/* Address Information */}
      {address && (address.present || address.permanent) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card"
        >
          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-cyan-500" />
            </div>
            Address
          </h3>
          <div className="space-y-3">
            {address.present && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Present Address</p>
                <p className="text-sm">{address.present}</p>
              </div>
            )}
            {address.permanent && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Permanent Address</p>
                <p className="text-sm">{address.permanent}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PerformanceCard({ 
  value, 
  label, 
  color, 
  iconColor 
}: { 
  value: number | string; 
  label: string; 
  color: string; 
  iconColor: string;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-secondary/50 to-secondary rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity",
        color
      )} />
      <p className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
        {typeof value === 'number' && !isNaN(value) ? (label.includes('CGPA') ? value.toFixed(2) : value) : value}
      </p>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function getSemesterSuffix(semester: number): string {
  if (semester === 1) return 'st';
  if (semester === 2) return 'nd';
  if (semester === 3) return 'rd';
  return 'th';
}
