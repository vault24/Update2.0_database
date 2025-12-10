import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Home, Printer } from 'lucide-react';

interface AdmissionSuccessProps {
  applicationId: string;
  onGeneratePdf: () => void;
  onGoDashboard: () => void;
}

export function AdmissionSuccess({
  applicationId,
  onGeneratePdf,
  onGoDashboard,
}: AdmissionSuccessProps) {
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
        className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full bg-success/10 flex items-center justify-center"
      >
        <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-success" />
      </motion.div>

      <h2 className="text-xl md:text-2xl font-display font-bold mb-2">Application Submitted!</h2>
      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 px-4">Your admission application has been submitted successfully.</p>

      <div className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 mb-4 md:mb-6 mx-4 md:mx-0">
        <p className="text-xs md:text-sm text-muted-foreground mb-2">Your Application ID</p>
        <p className="text-2xl md:text-3xl font-bold font-mono text-primary break-all">{applicationId}</p>
        <p className="text-xs text-muted-foreground mt-2">Please save this ID for future reference</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center px-4 md:px-0">
        <Button variant="outline" onClick={onGeneratePdf} className="gap-2 text-sm md:text-base">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={onGeneratePdf} className="gap-2 text-sm md:text-base">
          <Printer className="w-4 h-4" />
          Print Application
        </Button>
        <Button variant="gradient" onClick={onGoDashboard} className="gap-2 text-sm md:text-base">
          <Home className="w-4 h-4" />
          Go to Dashboard
        </Button>
      </div>

      <div className="mt-6 md:mt-8 p-3 md:p-4 bg-primary/5 rounded-lg mx-4 md:mx-0">
        <p className="text-xs md:text-sm text-muted-foreground">
          <strong>Note:</strong> You have already submitted your admission application. 
          You cannot submit another application. Please contact the administration office if you need to make any changes.
        </p>
      </div>
    </motion.div>
  );
}

export default AdmissionSuccess;

