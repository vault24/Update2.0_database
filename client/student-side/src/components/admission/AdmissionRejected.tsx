import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface AdmissionRejectedProps {
  applicationId: string;
  rejectionReason?: string;
  onReapply: () => void;
}

export function AdmissionRejected({
  applicationId,
  rejectionReason,
  onReapply,
}: AdmissionRejectedProps) {
  const [isReapplying, setIsReapplying] = useState(false);

  const handleReapply = async () => {
    setIsReapplying(true);
    try {
      await onReapply();
    } finally {
      setIsReapplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center py-8 md:py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full bg-destructive/10 flex items-center justify-center"
      >
        <XCircle className="w-10 h-10 md:w-12 md:h-12 text-destructive" />
      </motion.div>

      <h2 className="text-xl md:text-2xl font-display font-bold mb-2">Application Rejected</h2>
      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 px-4">
        Unfortunately, your admission application has been rejected by the administration.
      </p>

      <div className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 mb-4 md:mb-6 mx-4 md:mx-0">
        <p className="text-xs md:text-sm text-muted-foreground mb-2">Your Application ID</p>
        <p className="text-2xl md:text-3xl font-bold font-mono text-primary break-all mb-4">{applicationId}</p>
        
        {rejectionReason && (
          <div className="mt-4 p-3 md:p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs md:text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                <p className="text-xs md:text-sm text-muted-foreground">{rejectionReason}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center px-4 md:px-0">
        <Button 
          variant="gradient" 
          onClick={handleReapply} 
          className="gap-2 text-sm md:text-base"
          disabled={isReapplying}
        >
          {isReapplying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Edit & Reapply
            </>
          )}
        </Button>
      </div>

      <div className="mt-6 md:mt-8 p-3 md:p-4 bg-primary/5 rounded-lg mx-4 md:mx-0">
        <p className="text-xs md:text-sm text-muted-foreground">
          <strong>Note:</strong> You can review and edit your previous application information, 
          make necessary corrections, and resubmit your application for reconsideration.
        </p>
      </div>
    </motion.div>
  );
}

export default AdmissionRejected;
