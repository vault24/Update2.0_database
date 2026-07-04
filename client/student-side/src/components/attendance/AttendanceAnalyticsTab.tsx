import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, AlertCircle, TrendingUp, PieChart as PieIcon, BarChart3, RefreshCw,
  CalendarCheck2, CalendarX2, Timer, Plane, Percent, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { attendanceService, type TeacherAnalytics } from '@/services/attendanceService';
import { getErrorMessage } from '@/lib/api';

const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(0, 72%, 55%)', 'hsl(38, 92%, 50%)', 'hsl(217, 91%, 60%)'];

const pctColor = (pct: number) =>
  pct >= 75 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive';

export function AttendanceAnalyticsTab() {
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceService.getTeacherAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center py-14 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">{error || 'No analytics available'}</p>
        <Button size="sm" onClick={fetchAnalytics} className="gap-1"><RefreshCw className="w-4 h-4" />Retry</Button>
      </div>
    );
  }

  const { overall } = analytics;

  if (overall.totalRecords === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <BarChart3 className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="font-semibold mb-1">No attendance data yet</p>
        <p className="text-sm text-muted-foreground">Analytics will appear after you take attendance</p>
      </div>
    );
  }

  const pieData = [
    { name: 'Present', value: overall.present - overall.late },
    { name: 'Absent', value: overall.absent - overall.leave },
    { name: 'Late', value: overall.late },
    { name: 'Leave', value: overall.leave },
  ].filter(d => d.value > 0);

  const overviewTiles = [
    { icon: BookOpen, label: 'Total Records', value: overall.totalRecords.toLocaleString(), color: 'text-primary bg-primary/10' },
    { icon: CalendarCheck2, label: 'Present', value: overall.present.toLocaleString(), color: 'text-success bg-success/10' },
    { icon: CalendarX2, label: 'Absent', value: overall.absent.toLocaleString(), color: 'text-destructive bg-destructive/10' },
    { icon: Timer, label: 'Late', value: overall.late.toLocaleString(), color: 'text-warning bg-warning/10' },
    { icon: Plane, label: 'Leave', value: overall.leave.toLocaleString(), color: 'text-blue-500 bg-blue-500/10' },
    { icon: Percent, label: 'Attendance Rate', value: `${overall.percentage}%`, color: 'text-primary bg-primary/10' },
  ];

  return (
    <div className="space-y-4">
      {/* Overview tiles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 sm:grid-cols-6 gap-2"
      >
        {overviewTiles.map(tile => (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
            <div className={cn('w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-1.5', tile.color)}>
              <tile.icon className="w-4 h-4" />
            </div>
            <p className="text-base md:text-lg font-bold leading-none">{tile.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{tile.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-card"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />Monthly Attendance Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Attendance']} />
                <Line
                  type="monotone" dataKey="percentage" name="Attendance %"
                  stroke="hsl(217, 91%, 60%)" strokeWidth={2.5}
                  dot={{ r: 4 }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly trend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-card"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />Weekly Report
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weeklyTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={10} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="Present" stackId="a" fill="hsl(142, 71%, 45%)" />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Overall distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-card"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <PieIcon className="w-4 h-4 text-primary" />Attendance Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Semester statistics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-card"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />Semester Statistics
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.bySemester.map(s => ({ ...s, name: `Sem ${s.semester}` }))} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Attendance']} />
                <Bar dataKey="percentage" name="Attendance %" fill="hsl(262, 83%, 63%)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Department statistics */}
      {analytics.byDepartment.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-card"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />Department Statistics
          </h3>
          <div className="space-y-2.5">
            {analytics.byDepartment.map(dept => {
              const name = dept['class_routine__department__name'] || 'Unknown';
              return (
                <div key={name} className="flex items-center gap-3">
                  <p className="text-sm w-44 md:w-64 truncate flex-shrink-0">{name}</p>
                  <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn('h-full', dept.percentage >= 75 ? 'bg-success' : dept.percentage >= 60 ? 'bg-warning' : 'bg-destructive')}
                      style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-bold w-14 text-right flex-shrink-0', pctColor(dept.percentage))}>
                    {dept.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Subject statistics table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
      >
        <h3 className="font-semibold text-sm flex items-center gap-2 p-4 pb-3">
          <BookOpen className="w-4 h-4 text-primary" />Subject Statistics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Class</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classes</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Students</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.bySubject.map((subject, i) => (
                <tr key={`${subject.subject_code}-${i}`} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-3">
                    <p className="font-medium">{subject.subject_name}</p>
                    <p className="text-xs text-muted-foreground">{subject.subject_code}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                    {subject['class_routine__department__name']} · Sem {subject.semester} · {subject['class_routine__shift']}
                  </td>
                  <td className="p-3 text-center font-medium">{subject.class_days}</td>
                  <td className="p-3 text-center font-medium">{subject.students}</td>
                  <td className="p-3 text-center text-success font-semibold">{subject.present}</td>
                  <td className="p-3 text-center text-destructive font-semibold">{subject.absent}</td>
                  <td className={cn('p-3 text-center font-bold', pctColor(subject.percentage))}>{subject.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
