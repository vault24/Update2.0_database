import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  error, 
  title = 'Something went wrong',
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center space-y-4 max-w-md">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
