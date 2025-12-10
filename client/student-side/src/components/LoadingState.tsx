import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
  message = 'Loading...', 
  className,
  size = 'md' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center space-y-4">
        <Loader2 className={cn('animate-spin mx-auto text-primary', sizeClasses[size])} />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
