import { AdmissionWizard } from '@/components/admission/AdmissionWizard';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdmissionPage() {
  const { user } = useAuth();

  if (user?.admissionStatus === 'approved') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center py-12"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
          <FileText className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Admission Completed</h2>
        <p className="text-muted-foreground mb-6">Your admission has already been approved. You can view your details in your profile.</p>
        <Button variant="gradient">View Profile</Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {user?.admissionStatus === 'pending' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Complete Your Admission Form</p>
            <p className="text-sm text-muted-foreground">Please fill out all required information to complete your admission process.</p>
          </div>
        </motion.div>
      )}

      <AdmissionWizard />
    </div>
  );
}

export default AdmissionPage;
