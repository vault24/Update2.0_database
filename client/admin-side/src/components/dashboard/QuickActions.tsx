import { Link } from 'react-router-dom';
import { Users, GraduationCap, Inbox, UserX, Plus, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { icon: Plus, label: 'Add Notice', path: '/notices', tint: 'bg-primary/10 text-primary' },
  { icon: Users, label: 'View Students', path: '/students', tint: 'bg-info/10 text-info' },
  { icon: GraduationCap, label: 'Admissions', path: '/admissions', tint: 'bg-success/10 text-success' },
  { icon: Inbox, label: 'Applications', path: '/applications', tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { icon: UserX, label: 'Discontinued', path: '/discontinued-students', tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
];

export function QuickActions() {
  return (
    <div className="surface p-5">
      <h3 className="text-[15px] font-semibold text-foreground mb-4">Quick actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:border-primary/40"
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', action.tint)}>
              <action.icon className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[13px] font-medium text-foreground leading-tight">{action.label}</span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors ml-auto shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
