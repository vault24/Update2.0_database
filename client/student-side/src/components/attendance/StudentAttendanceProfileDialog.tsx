import { useEffect, useState } from 'react';
import {
  User, Loader2, AlertCircle, CalendarCheck2, CalendarX2, Timer, Plane, Percent, BookOpen,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { attendanceService, type StudentAttendanceProfile } from '@/services/attendanceService';
import { getErrorMessage } from '@/lib/api';

interface Props {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pctColor = (pct: number) =>
  pct >= 75 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive';

const pctBar = (pct: number) =>
  pct >= 75 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-destructive';

export function StudentAttendanceProfileDialog({ studentId, open, onOpenChange }: Props) {
  const [profile, setProfile] = useState<StudentAttendanceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !studentId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await attendanceService.getStudentProfile(studentId);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, studentId]);

  const summaryItems = profile ? [
    { icon: BookOpen, label: 'Total Classes', value: profile.summary.totalClasses, color: 'text-primary bg-primary/10' },
    { icon: CalendarCheck2, label: 'Present', value: profile.summary.present, color: 'text-success bg-success/10' },
    { icon: CalendarX2, label: 'Absent', value: profile.summary.absent, color: 'text-destructive bg-destructive/10' },
    { icon: Timer, label: 'Late', value: profile.summary.late, color: 'text-warning bg-warning/10' },
    { icon: Plane, label: 'Leave', value: profile.summary.leave, color: 'text-blue-500 bg-blue-500/10' },
    { icon: Percent, label: 'Attendance', value: `${profile.summary.percentage}%`, color: 'text-primary bg-primary/10' },
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Student Attendance Profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : profile ? (
          <div className="space-y-5">
            {/* Student header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.student.profilePhoto ? (
                  <img src={profile.student.profilePhoto} alt={profile.student.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {profile.student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base truncate">{profile.student.name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <Badge variant="secondary">Roll: {profile.student.roll}</Badge>
                  <Badge variant="outline">{profile.student.department}</Badge>
                  <Badge variant="outline">Sem {profile.student.semester}</Badge>
                  <Badge variant="outline">{profile.student.shift}</Badge>
                  {profile.student.session && <Badge variant="outline">{profile.student.session}</Badge>}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className={cn('text-3xl font-bold', pctColor(profile.summary.percentage))}>
                  {profile.summary.percentage}%
                </p>
                <p className="text-xs text-muted-foreground">Overall</p>
              </div>
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {summaryItems.map(item => (
                <div key={item.label} className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className={cn('w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-1.5', item.color)}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold leading-none">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Monthly chart */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-sm mb-3">Monthly Statistics</p>
              {profile.monthly.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No attendance data yet</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profile.monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} />
                      <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="present" name="Present" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="absent" name="Absent" stackId="a" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Subject-wise */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <p className="font-semibold text-sm p-4 pb-2">Subject-wise Attendance</p>
              {profile.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center pb-6">No subjects recorded yet</p>
              ) : (
                <div className="divide-y divide-border">
                  {profile.subjects.map(subject => (
                    <div key={subject.subject_code} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{subject.subject_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subject.subject_code} · {subject.present}/{subject.total} present
                            {subject.late > 0 && ` · ${subject.late} late`}
                            {subject.leave > 0 && ` · ${subject.leave} leave`}
                          </p>
                        </div>
                        <span className={cn('font-bold text-sm flex-shrink-0', pctColor(subject.percentage))}>
                          {subject.percentage}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all', pctBar(subject.percentage))}
                          style={{ width: `${Math.min(subject.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
