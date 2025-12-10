import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Save, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { admissionService, DRAFT_STORAGE_KEY, type AdmissionFormData } from '@/services/admissionService';
import { departmentService, type Department } from '@/services/departmentService';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AdmissionSuccess } from './AdmissionSuccess';
import { steps } from './wizard/stepConfig';
import { AdmissionFormState } from './wizard/types';
import { defaultFormData } from './wizard/formDefaults';
import { StepPersonal } from './wizard/steps/StepPersonal';
import { StepContactAddress } from './wizard/steps/StepContactAddress';
import { StepEducation } from './wizard/steps/StepEducation';
import { StepAcademic } from './wizard/steps/StepAcademic';
import { StepDocuments } from './wizard/steps/StepDocuments';
import { StepReview } from './wizard/steps/StepReview';
import { generateAdmissionPDF } from './wizard/pdf';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const STORAGE_KEY = DRAFT_STORAGE_KEY;
const SUBMISSION_STORAGE_KEY = 'admission_submission_state';
const DRAFT_DEBOUNCE_MS = 1000;
const DRAFT_SAVE_RETRIES = 3;

export function AdmissionWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownDraftToastRef = useRef(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      const depts = await departmentService.getAll();
      setDepartments(depts);
    };
    fetchDepartments();
  }, []);

  const loadSubmissionState = () => {
    try {
      const saved = localStorage.getItem(SUBMISSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) as { isSubmitted?: boolean; applicationId?: string } : null;
    } catch (error) {
      console.error('Unable to parse submission state', error);
      return null;
    }
  };

  const persistSubmissionState = (id: string) => {
    localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify({
      isSubmitted: true,
      applicationId: id,
    }));
  };

  const loadLocalDraft = (showToast: boolean = true) => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData((prev) => ({ ...prev, ...parsed.formData }));
        setCurrentStep(parsed.currentStep || 1);
        if (showToast) {
          toast.info('Draft loaded', {
            description: 'Your previously saved progress has been restored.'
          });
        }
        return true;
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return false;
  };

  // Restore submission state quickly for offline refreshes
  useEffect(() => {
    const stored = loadSubmissionState();
    if (stored?.isSubmitted) {
      setIsSubmitted(true);
      setApplicationId(stored.applicationId || '');
      setCurrentStep(7);
    }
  }, []);

  // Check for existing admission and load draft on mount
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsDraftLoading(true);
      setIsCheckingExisting(true);

      try {
        const existing = await admissionService.checkExistingAdmission();
        if (cancelled) return;

        if (existing.hasAdmission) {
          setApplicationId(existing.admissionId || '');
          setIsSubmitted(true);
          setCurrentStep(7); // Move to success page
          persistSubmissionState(existing.admissionId || '');
          await admissionService.clearDraft();
          localStorage.removeItem(STORAGE_KEY);
          toast.success('Application already submitted', {
            description: 'We found your existing admission and loaded it.'
          });
          setInitialised(true);
          setIsDraftLoading(false);
          setIsCheckingExisting(false);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error checking admission:', error);
          toast.error('Unable to verify admission status', {
            description: getErrorMessage(error)
          });
        }
      } finally {
        if (!cancelled) {
          setIsCheckingExisting(false);
        }
      }

      try {
        const draft = await admissionService.getDraft();
        if (cancelled) return;

        if (draft?.draft_data) {
          setFormData(prev => ({ ...prev, ...draft.draft_data }));
          setCurrentStep(draft.current_step || 1);
          setLastSavedAt(draft.saved_at || null);
          toast.info('Draft loaded', {
            description: 'Your progress was restored from the server.'
          });
        } else {
          loadLocalDraft(false);
        }
      } catch (error) {
        if (!cancelled) {
          const loaded = loadLocalDraft();
          if (!loaded) {
            setDraftError(getErrorMessage(error));
          }
          setUsingLocalFallback(true);
          toast.warning('Working offline', {
            description: 'We could not reach the server. Drafts are saved locally.'
          });
        }
      } finally {
        if (!cancelled) {
          setIsDraftLoading(false);
          setInitialised(true);
        }
      }
    };

    if (user) {
      bootstrap();
    } else {
      setInitialised(true);
      setIsDraftLoading(false);
      setIsCheckingExisting(false);
    }

    return () => {
      cancelled = true;
      if (draftSaveTimer.current) {
        clearTimeout(draftSaveTimer.current);
      }
    };
  }, [user]);

  const [formData, setFormData] = useState<AdmissionFormState>(defaultFormData);

  const handleInputChange = (field: keyof AdmissionFormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveDraftWithRetry = async (showToast: boolean = false) => {
    if (!initialised || isSubmitted) return;
    setIsDraftSaving(true);
    setDraftError(null);

    let lastError: unknown = null;

    for (let attempt = 0; attempt < DRAFT_SAVE_RETRIES; attempt++) {
      try {
        const saved = await admissionService.saveDraft(formData, currentStep);
        setLastSavedAt(saved?.saved_at || new Date().toISOString());
        setUsingLocalFallback(false);

        if (showToast || !hasShownDraftToastRef.current) {
          toast.success('Draft saved', {
            description: saved?.saved_at
              ? `Saved at ${new Date(saved.saved_at).toLocaleTimeString()}`
              : 'Draft synced to server.'
          });
          hasShownDraftToastRef.current = true;
        }

        setIsDraftSaving(false);
        return;
      } catch (error) {
        lastError = error;
        setDraftError(getErrorMessage(error));
        const delay = Math.pow(2, attempt) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed - rely on localStorage fallback inside service
    if (showToast || !hasShownDraftToastRef.current) {
      toast.warning('Draft saved locally', {
        description: 'Network issue detected. Your progress is stored on this device.',
        action: {
          label: 'Retry sync',
          onClick: () => saveDraftWithRetry(true)
        }
      });
      hasShownDraftToastRef.current = true;
    }
    setUsingLocalFallback(true);
    setIsDraftSaving(false);
    if (lastError) {
      console.error('Unable to sync draft to server:', lastError);
    }
  };

  // Debounced draft saving to reduce API calls
  useEffect(() => {
    if (!initialised || isSubmitted) return;
    if (draftSaveTimer.current) {
      clearTimeout(draftSaveTimer.current);
    }
    draftSaveTimer.current = setTimeout(() => {
      saveDraftWithRetry();
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (draftSaveTimer.current) {
        clearTimeout(draftSaveTimer.current);
      }
    };
  }, [formData, currentStep, isSubmitted, initialised]);

  const handleSaveProgress = () => {
    saveDraftWithRetry(true);
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Capitalize gender (Male/Female/Other)
      const capitalizeGender = (gender: string) => {
        if (!gender) return '';
        return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      };

      // Capitalize shift (Morning/Day/Evening)
      const capitalizeShift = (shift: string) => {
        if (!shift) return '';
        // Handle "1st" -> "Morning", "2nd" -> "Day"
        if (shift === '1st') return 'Morning';
        if (shift === '2nd') return 'Day';
        return shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
      };

      // Build address objects
      const presentAddressObj = {
        village: formData.presentVillageNeighborhood || '',
        postOffice: formData.presentPostOffice || '',
        upazila: formData.presentUpazila || '',
        district: formData.presentDistrict || '',
        division: formData.presentDivision || '',
        policeStation: formData.presentPoliceStation || '',
        municipality: formData.presentMunicipalityUnion || '',
        ward: formData.presentWard || '',
        fullAddress: formData.presentAddress || ''
      };

      const permanentAddressObj = formData.sameAsPresent ? presentAddressObj : {
        village: formData.permanentVillageNeighborhood || '',
        postOffice: formData.permanentPostOffice || '',
        upazila: formData.permanentUpazila || '',
        district: formData.permanentDistrict || '',
        division: formData.permanentDivision || '',
        policeStation: formData.permanentPoliceStation || '',
        municipality: formData.permanentMunicipalityUnion || '',
        ward: formData.permanentWard || '',
        fullAddress: formData.permanentAddress || ''
      };
      
      // Map form data to API format
      const admissionData: AdmissionFormData = {
        // Personal Information
        full_name_bangla: formData.fullNameBangla,
        full_name_english: formData.fullNameEnglish,
        father_name: formData.fatherName,
        father_nid: formData.fatherNID,
        mother_name: formData.motherName,
        mother_nid: formData.motherNID,
        date_of_birth: formData.dateOfBirth,
        birth_certificate_no: formData.birthCertificate,
        gender: capitalizeGender(formData.gender),
        religion: formData.religion,
        blood_group: formData.bloodGroup,
        
        // Contact Information
        mobile_student: formData.mobile,
        guardian_mobile: formData.guardianMobile,
        email: formData.email,
        emergency_contact: formData.guardianMobile, // Use guardian mobile as emergency contact
        present_address: presentAddressObj,
        permanent_address: permanentAddressObj,
        
        // Educational Background
        highest_exam: 'SSC',
        board: formData.sscBoard,
        group: formData.sscGroup,
        roll_number: formData.sscRoll,
        registration_number: formData.sscRoll, // Use roll as registration if not separate
        passing_year: formData.sscYear,
        gpa: formData.sscGPA,
        institution_name: formData.sscInstitution,
        
        // Admission Details
        desired_department: formData.department,
        desired_shift: capitalizeShift(formData.shift),
        session: formData.session,
      };
      
      const admission = await admissionService.submitApplication(admissionData);

      // Clear drafts from server and local storage
      await admissionService.clearDraft();
      localStorage.removeItem(STORAGE_KEY);

      // Set application ID and submitted state
      setApplicationId(admission.id);
      setIsSubmitted(true);
      setCurrentStep(7); // Move to success page
      persistSubmissionState(admission.id);
      setUsingLocalFallback(false);

      const submissionToast = admission.alreadySubmitted ? toast.info : toast.success;
      submissionToast(
        admission.alreadySubmitted ? 'Application already submitted' : 'Application submitted successfully!',
        {
          description: admission.alreadySubmitted
            ? 'We found your existing submission and loaded it.'
            : 'Your admission application is now pending review by the administration.'
        }
      );
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      
      // Special handling for "already submitted" error
      if (error?.response?.data?.error === 'Admission already submitted') {
        // Try to fetch the existing admission
        try {
          const existingAdmission = await admissionService.getMyAdmission();
          setApplicationId(existingAdmission.id);
          setIsSubmitted(true);
          setCurrentStep(7); // Move to success page
          await admissionService.clearDraft();
          localStorage.removeItem(STORAGE_KEY);
          persistSubmissionState(existingAdmission.id);
          toast.info('Application already submitted', {
            description: 'Your admission application was already submitted. Here is your application ID.'
          });
          return;
        } catch (fetchError) {
          console.error('Error fetching existing admission:', fetchError);
        }
      }
      
      toast.error('Failed to submit application', {
        description: errorMsg
      });
      console.error('Admission submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePDF = () => generateAdmissionPDF(formData, applicationId);

  if (isDraftLoading && !initialised) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
        <p className="text-sm text-muted-foreground">Loading your admission data...</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <AdmissionSuccess
        applicationId={applicationId}
        onGeneratePdf={generatePDF}
        onGoDashboard={() => navigate('/dashboard')}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {(isDraftLoading || isDraftSaving || isCheckingExisting) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className={`w-4 h-4 ${isDraftLoading || isDraftSaving ? 'animate-spin' : ''}`} />
            <span>
              {isDraftLoading
                ? 'Loading draft...'
                : isCheckingExisting
                ? 'Checking for existing submission...'
                : usingLocalFallback
                ? 'Saving locally (offline)'
                : 'Saving draft...'}
            </span>
          </div>
        )}
        {usingLocalFallback && (
          <div className="text-xs bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-md">
            Offline mode: changes are stored on this device
          </div>
        )}
        {draftError && (
          <div className="text-xs text-destructive">
            {draftError}
          </div>
        )}
        {lastSavedAt && (
          <div className="text-xs text-muted-foreground">
            Last saved at {new Date(lastSavedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Step Tracker */}
      <div className="mb-6 md:mb-8 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-4">
        <div className="flex items-center min-w-max">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? 'gradient-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/10 text-primary border-2 border-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 md:w-6 md:h-6" />
                    ) : (
                      <StepIcon className="w-4 h-4 md:w-6 md:h-6" />
                    )}
                  </div>
                  <span className={`mt-1.5 md:mt-2 text-[10px] md:text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    <span className="hidden sm:inline">{step.title}</span>
                    <span className="sm:hidden">{step.title.split(' ')[0]}</span>
                  </span>
                </motion.div>
                
                {index < steps.length - 1 && (
                  <div className={`w-6 md:w-16 h-0.5 mx-1 md:mx-2 transition-colors ${
                    currentStep > step.id ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 lg:p-8 shadow-card"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && <StepPersonal formData={formData} onChange={handleInputChange} />}
            {currentStep === 2 && <StepContactAddress formData={formData} onChange={handleInputChange} />}
            {currentStep === 3 && <StepEducation formData={formData} onChange={handleInputChange} />}
            {currentStep === 4 && <StepAcademic formData={formData} onChange={handleInputChange} departments={departments} />}
            {currentStep === 5 && <StepDocuments formData={formData} onChange={handleInputChange} />}
            {currentStep === 6 && <StepReview formData={formData} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || isDraftLoading}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            variant="ghost"
            className="gap-2"
            onClick={handleSaveProgress}
            disabled={isDraftSaving || isDraftLoading}
          >
            {isDraftSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Progress
              </>
            )}
          </Button>

          {currentStep < 6 ? (
            <Button
              variant="gradient"
              onClick={handleNext}
              className="gap-2"
              disabled={isDraftLoading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              variant="hero" 
              onClick={handleSubmit} 
              className="gap-2"
              disabled={isSubmitting || isDraftSaving}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
