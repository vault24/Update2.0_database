import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  gradient: 'primary' | 'accent' | 'success' | 'info' | 'warning';
  delay?: number;
}

const gradients = {
  primary: 'gradient-primary',
  accent: 'gradient-accent',
  success: 'gradient-success',
  info: 'from-info to-info/80 bg-gradient-to-br',
  warning: 'from-warning to-warning/80 bg-gradient-to-br',
};

export function KPICard({ title, value, trend, icon: Icon, gradient, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="glass-card rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
    >
      {/* Background Gradient Effect */}
      <div
        className={cn(
          'absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-20 group-hover:opacity-30 transition-opacity blur-2xl',
          gradients[gradient]
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
              gradients[gradient]
            )}
          >
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                trend.isPositive
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}%
            </div>
          )}
        </div>

        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
          className="text-3xl font-bold text-foreground mb-1"
        >
          {value.toLocaleString()}
        </motion.h3>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </motion.div>
  );
}
