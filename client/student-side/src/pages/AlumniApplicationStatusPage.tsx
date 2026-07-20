import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, XCircle, ArrowRightLeft, Settings, GraduationCap, ShieldCheck, Mail, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SwitchAccountDialog, canSwitchAccount } from '@/components/account/SwitchAccountDialog';

/**
 * Holding screen for self-registered alumni whose application has been
 * submitted but not yet approved (or was rejected). Until an admin approves
 * the application the account has no alumni privileges — from here the user
 * can switch back to a General Student account or manage their account from
 * Settings (where the account can also be deleted).
 */
export default function AlumniApplicationStatusPage() {
  const { user } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);

  const rejected = user?.alumniReviewStatus === 'rejected';
  const switchable = canSwitchAccount(user);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Status hero */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-6 text-white shadow-lg ${
          rejected
            ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/20'
            : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/20'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            {rejected ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold">
            {rejected ? 'Application Not Approved' : 'Application Pending Review'}
          </h1>
        </div>
        <p className="text-white/90 text-sm">
          {rejected
            ? 'Unfortunately your alumni application was not approved. You can edit your details and reapply, contact the administration for more information, or switch this account back to a General Student account.'
            : 'Thanks for submitting your alumni information! An administrator will review your application shortly. You will get full access to the alumni portal once it is approved.'}
        </p>

        {rejected && (
          <Button
            asChild
            className="mt-4 bg-white text-red-600 hover:bg-white/90 font-semibold shadow-sm"
          >
            <Link to="/dashboard/alumni-registration">
              <Pencil className="w-4 h-4 mr-2" /> Edit &amp; Reapply
            </Link>
          </Button>
        )}
      </motion.div>

      {/* What happens next */}
      {!rejected && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-card border border-border shadow-sm p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> What happens next?
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              An administrator verifies the information and documents you submitted.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              You'll receive a notification once a decision is made.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              After approval, your full alumni profile, the alumni directory and all alumni features unlock automatically.
            </li>
          </ol>
        </motion.div>
      )}

      {/* Account options */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl bg-card border border-border shadow-sm p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Account options
        </h2>

        {switchable && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-muted/50 p-4">
            <div>
              <p className="font-medium text-foreground">Created the wrong account type?</p>
              <p className="text-sm text-muted-foreground">
                Switch back to a General Student account (requires email verification).
              </p>
            </div>
            <Button onClick={() => setSwitchOpen(true)} className="shrink-0">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Switch Account
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-muted/50 p-4">
          <div>
            <p className="font-medium text-foreground">Account settings</p>
            <p className="text-sm text-muted-foreground">
              Update your details, change your password, or delete this account.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/dashboard/settings">
              <Settings className="w-4 h-4 mr-2" /> Open Settings
            </Link>
          </Button>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
          <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>Questions about your application? Contact the institute administration office.</p>
        </div>
      </motion.div>

      <SwitchAccountDialog open={switchOpen} onOpenChange={setSwitchOpen} />
    </div>
  );
}
