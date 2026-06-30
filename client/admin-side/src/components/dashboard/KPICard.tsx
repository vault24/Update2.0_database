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

// `gradient` is kept for API compatibility; it now selects a calm, tinted
// icon treatment rather than a saturated gradient fill.
const tints: Record<KPICardProps['gradient'], string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

export function KPICard({ title, value, trend, icon: Icon, gradient, delay = 0 }: KPICardProps) {
  const showTrend = trend && trend.value !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: 'easeOut' }}
      className="surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tints[gradient])}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <h3 className="text-[28px] leading-none font-semibold text-foreground tabular-nums tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        {showTrend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
              trend!.isPositive
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {trend!.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend!.value)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
