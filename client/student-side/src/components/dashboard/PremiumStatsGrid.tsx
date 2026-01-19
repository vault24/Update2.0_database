import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

interface PremiumStatsGridProps {
  stats: StatItem[];
}

export function PremiumStatsGrid({ stats }: PremiumStatsGridProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      }
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          variants={itemVariants}
          whileHover={{ 
            scale: 1.02, 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 20 }
          }}
          className={cn(
            "relative overflow-hidden bg-card rounded-2xl border border-border p-4 md:p-5",
            "shadow-card hover:shadow-elevated transition-all duration-300",
            "group cursor-pointer"
          )}
        >
          {/* Gradient overlay on hover */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300",
            `bg-gradient-to-br ${stat.color}`
          )} />
          
          {/* Icon with gradient background */}
          <div className="flex items-start justify-between mb-3">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                `bg-gradient-to-br ${stat.color}`,
                "shadow-lg group-hover:shadow-xl transition-shadow"
              )}
            >
              <stat.icon className="w-6 h-6 text-white" />
            </motion.div>
            
            {stat.trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                stat.trend.isPositive 
                  ? "bg-success/10 text-success" 
                  : "bg-destructive/10 text-destructive"
              )}>
                <span>{stat.trend.isPositive ? '↑' : '↓'}</span>
                <span>{stat.trend.value}%</span>
              </div>
            )}
          </div>

          {/* Value */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="text-2xl md:text-3xl font-bold text-foreground mb-1"
          >
            {stat.value}
          </motion.p>

          {/* Label */}
          <p className="text-sm text-muted-foreground font-medium">
            {stat.label}
          </p>

          {/* Description */}
          {stat.description && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              {stat.description}
            </p>
          )}

          {/* Bottom accent line */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity",
            `bg-gradient-to-r ${stat.color}`
          )} />
        </motion.div>
      ))}
    </motion.div>
  );
}
