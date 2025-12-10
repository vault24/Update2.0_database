import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { semester: 'Sem 1', attendance: 92 },
  { semester: 'Sem 2', attendance: 88 },
  { semester: 'Sem 3', attendance: 85 },
  { semester: 'Sem 4', attendance: 90 },
  { semester: 'Sem 5', attendance: 87 },
  { semester: 'Sem 6', attendance: 91 },
  { semester: 'Sem 7', attendance: 89 },
  { semester: 'Sem 8', attendance: 94 },
];

export function AttendanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Average Attendance by Semester</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="semester"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              domain={[80, 100]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="attendance"
              stroke="hsl(187, 92%, 35%)"
              strokeWidth={3}
              dot={{ fill: 'hsl(187, 92%, 35%)', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(187, 92%, 35%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
