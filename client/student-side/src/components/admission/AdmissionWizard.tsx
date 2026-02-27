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
import { AdmissionRejected } from './AdmissionRejected';
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
const SUBMITTED_FORM_DATA_KEY = 'admission_submitted_form_data';
const REAPPLY_EDITING_KEY = 'admission_reapply_editing';
const DRAFT_DEBOUNCE_MS = 1000;
const DRAFT_SAVE_RETRIES = 3;

export function AdmissionWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [applicationId, setApplicationId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false);
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
    if (!user?.id) return null;
    
    try {
      const userSpecificKey = `${SUBMISSION_STORAGE_KEY}_${user.id}`;
      const saved = localStorage.getItem(userSpecificKey);
      return saved ? JSON.parse(saved) as { isSubmitted?: boolean; applicationId?: string } : null;
    } catch (error) {
      console.error('Unable to parse submission state', error);
      return null;
    }
  };

  const persistSubmissionState = (id: string, formDataToSave: AdmissionFormState) => {
    if (!user?.id) return;
    
    const userSpecificKey = `${SUBMISSION_STORAGE_KEY}_${user.id}`;
    localStorage.setItem(userSpecificKey, JSON.stringify({
      isSubmitted: true,
      applicationId: id,
    }));
    
    // Also persist the form data for PDF generation
    const formDataKey = `${SUBMITTED_FORM_DATA_KEY}_${user.id}`;
    localStorage.setItem(formDataKey, JSON.stringify(formDataToSave));
  };

  const loadSubmittedFormData = (): AdmissionFormState | null => {
    if (!user?.id) return null;
    
    try {
      const formDataKey = `${SUBMITTED_FORM_DATA_KEY}_${user.id}`;
      const saved = localStorage.getItem(formDataKey);
      return saved ? JSON.parse(saved) as AdmissionFormState : null;
    } catch (error) {
      console.error('Unable to parse submitted form data', error);
      return null;
    }
  };

  const clearSubmissionState = () => {
    if (!user?.id) return;
    
    const userSpecificKey = `${SUBMISSION_STORAGE_KEY}_${user.id}`;
    localStorage.removeItem(userSpecificKey);
    
    const formDataKey = `${SUBMITTED_FORM_DATA_KEY}_${user.id}`;
    localStorage.removeItem(formDataKey);
  };

  const setReapplyEditingFlag = (isEditing: boolean) => {
    if (!user?.id) return;
    
    const reapplyKey = `${REAPPLY_EDITING_KEY}_${user.id}`;
    if (isEditing) {
      localStorage.setItem(reapplyKey, 'true');
    } else {
      localStorage.removeItem(reapplyKey);
    }
  };

  const isReapplyEditing = (): boolean => {
    if (!user?.id) return false;
    
    const reapplyKey = `${REAPPLY_EDITING_KEY}_${user.id}`;
    return localStorage.getItem(reapplyKey) === 'true';
  };

  const cleanupOldSubmissionStates = () => {
    // Clean up old submission states from localStorage to prevent bloat
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(SUBMISSION_STORAGE_KEY) || key.startsWith(SUBMITTED_FORM_DATA_KEY) || key.startsWith(REAPPLY_EDITING_KEY)) && !key.endsWith(`_${user?.id}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error cleaning up old submission states:', error);
    }
  };

  const cleanupOldDraftStates = () => {
    // Clean up old draft states from localStorage to prevent bloat
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY) && !key.endsWith(`_${user?.id}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error cleaning up old draft states:', error);
    }
  };

  const loadLocalDraft = (showToast: boolean = true) => {
    if (!user?.id) return false;
    
    try {
      const userSpecificKey = `${STORAGE_KEY}_${user.id}`;
      const savedData = localStorage.getItem(userSpecificKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData((prev) => ({ ...prev, ...parsed.formData }));
        setCurrentStep(validateStep(parsed.currentStep || 1));
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
    if (!user?.id) return;
    
    const stored = loadSubmissionState();
    if (stored?.isSubmitted) {
      setIsSubmitted(true);
      setApplicationId(stored.applicationId || '');
      setCurrentStep(7);
      
      // Restore the submitted form data for PDF generation
      const savedFormData = loadSubmittedFormData();
      if (savedFormData) {
        setFormData(savedFormData);
      }
    }
  }, [user?.id]);

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
          // Check if admission is rejected - show rejection screen
          if (existing.status === 'rejected') {
            setIsRejected(true);
            setIsSubmitted(false);
            setApplicationId(existing.application_id || existing.admissionId || '');
            
            // Try to load the rejected admission data
            try {
              const rejectedAdmission = await admissionService.getMyAdmission();
              if (rejectedAdmission) {
                setRejectionReason(rejectedAdmission.review_notes || 'No reason provided');
                // Convert admission data back to form format for editing
                const formDataFromAdmission = convertAdmissionToFormData(rejectedAdmission);
                setFormData(formDataFromAdmission);
              }
            } catch (error) {
              console.error('Error loading rejected admission:', error);
            }
            
            setInitialised(true);
            setIsDraftLoading(false);
            setIsCheckingExisting(false);
            return;
          }
          
          // For approved or pending, check if user is actively editing after reapply
          if (existing.status === 'pending' && isReapplyEditing()) {
            // User is editing a reapplied admission, don't show as submitted
            setApplicationId(existing.application_id || existing.admissionId || '');
            setIsSubmitted(false);
            setIsRejected(false);
            setCurrentStep(1); // Start from first step
            
            // Load the admission data for editing
            try {
              const pendingAdmission = await admissionService.getMyAdmission();
              if (pendingAdmission) {
                const formDataFromAdmission = convertAdmissionToFormData(pendingAdmission);
                setFormData(formDataFromAdmission);
              }
            } catch (error) {
              console.error('Error loading pending admission:', error);
            }
            
            setInitialised(true);
            setIsDraftLoading(false);
            setIsCheckingExisting(false);
            return;
          }
          
          // For approved or fully submitted pending, show success/status page
          setApplicationId(existing.application_id || existing.admissionId || '');
          setIsSubmitted(true);
          setIsRejected(false);
          setCurrentStep(7); // Move to success page
          
          // Try to load saved form data for PDF generation
          const savedFormData = loadSubmittedFormData();
          if (savedFormData) {
            setFormData(savedFormData);
          } else {
            // If no saved form data, persist empty state to avoid errors
            persistSubmissionState(existing.application_id || existing.admissionId || '', defaultFormData);
          }
          
          await admissionService.clearDraft();
          if (user?.id) {
            localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
          }
          toast.success('Application already submitted', {
            description: 'We found your existing admission and loaded it.'
          });
          setInitialised(true);
          setIsDraftLoading(false);
          setIsCheckingExisting(false);
          return;
        } else {
          // No admission found, clear any stale submission state
          clearSubmissionState();
          setIsSubmitted(false);
          setApplicationId('');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error checking admission:', error);
          // Clear any stale submission state if server says no admission exists
          clearSubmissionState();
          setIsSubmitted(false);
          setApplicationId('');
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
          setCurrentStep(validateStep(draft.current_step || 1));
          setLastSavedAt(draft.saved_at || null);
          toast.info('Draft loaded', {
            description: 'Your progress was restored from the server.'
          });
        } else {
          const localLoaded = loadLocalDraft(false);
          if (!localLoaded) {
            // No draft found anywhere, ensure we start fresh
            setCurrentStep(1);
            setFormData(defaultFormData);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const loaded = loadLocalDraft();
          if (!loaded) {
            setDraftError(getErrorMessage(error));
            // No draft found anywhere, ensure we start fresh
            setCurrentStep(1);
            setFormData(defaultFormData);
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
      cleanupOldSubmissionStates();
      cleanupOldDraftStates();
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
  // Store uploaded files separately to prevent them from being lost during draft saves
  // File objects cannot be serialized to JSON, so we keep them in memory
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  // Helper function to merge uploaded files back into form data
  const getCompleteFormData = (): AdmissionFormState => {
    return {
      ...formData,
      ...uploadedFiles
    } as AdmissionFormState;
  };

  // Helper function to convert admission data back to form format
  const convertAdmissionToFormData = (admission: any): AdmissionFormState => {
    // Helper to convert marital status to lowercase
    const normalizeMaritalStatus = (status: string) => {
      if (!status) return '';
      // Handle various formats: "Single", "SINGLE", "single" -> "single"
      const normalized = status.trim().toLowerCase();
      console.log('Normalizing marital status:', status, '->', normalized);
      return normalized;
    };

    // Helper to convert shift to match form options
    const normalizeShift = (shift: string) => {
      if (!shift) return '';
      const normalized = shift.toLowerCase();
      // Map common variations
      if (normalized === 'morning' || normalized === '1st') return 'Morning';
      if (normalized === 'day' || normalized === '2nd') return 'Day';
      if (normalized === 'evening') return 'Evening';
      // Return capitalized version
      return shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
    };

    console.log('Converting admission to form data:', {
      marital_status: admission.marital_status,
      desired_shift: admission.desired_shift
    });

    return {
      fullNameBangla: admission.full_name_bangla || '',
      fullNameEnglish: admission.full_name_english || '',
      fatherName: admission.father_name || '',
      fatherNID: admission.father_nid || '',
      motherName: admission.mother_name || '',
      motherNID: admission.mother_nid || '',
      dateOfBirth: admission.date_of_birth || '',
      gender: admission.gender?.toLowerCase() || '',
      religion: admission.religion || '',
      nationality: admission.nationality || 'Bangladeshi',
      nid: admission.nid || '',
      birthCertificate: admission.birth_certificate_no || '',
      bloodGroup: admission.blood_group || '',
      maritalStatus: normalizeMaritalStatus(admission.marital_status),
      
      mobile: admission.mobile_student || '',
      email: admission.email || '',
      guardianMobile: admission.guardian_mobile || '',
      presentAddress: admission.present_address?.fullAddress || '',
      presentDivision: admission.present_address?.division || '',
      presentDistrict: admission.present_address?.district || '',
      presentUpazila: admission.present_address?.upazila || '',
      presentPoliceStation: admission.present_address?.policeStation || '',
      presentPostOffice: admission.present_address?.postOffice || '',
      presentMunicipalityUnion: admission.present_address?.municipality || '',
      presentVillageNeighborhood: admission.present_address?.village || '',
      presentWard: admission.present_address?.ward || '',
      permanentAddress: admission.permanent_address?.fullAddress || '',
      permanentDivision: admission.permanent_address?.division || '',
      permanentDistrict: admission.permanent_address?.district || '',
      permanentUpazila: admission.permanent_address?.upazila || '',
      permanentPoliceStation: admission.permanent_address?.policeStation || '',
      permanentPostOffice: admission.permanent_address?.postOffice || '',
      permanentMunicipalityUnion: admission.permanent_address?.municipality || '',
      permanentVillageNeighborhood: admission.permanent_address?.village || '',
      permanentWard: admission.permanent_address?.ward || '',
      sameAsPresent: false,
      
      sscBoard: admission.board || '',
      sscRoll: admission.roll_number || '',
      sscYear: admission.passing_year?.toString() || '',
      sscGPA: admission.gpa?.toString() || '',
      sscGroup: admission.group || '',
      sscInstitution: admission.institution_name || '',
      
      department: admission.desired_department?.id || admission.desired_department || '',
      shift: normalizeShift(admission.desired_shift),
      session: admission.session || '',
      semester: '1st',
      admissionType: 'regular',
      group: admission.group || '',
      
      photo: null,
      signature: null,
      sscMarksheet: null,
      sscCertificate: null,
      birthCertificateDoc: null,
      studentNIDCopy: null,
      fatherNIDFront: null,
      fatherNIDBack: null,
      motherNIDFront: null,
      motherNIDBack: null,
      testimonial: null,
      medicalCertificate: null,
      quotaDocument: null,
      extraCertificates: null,
    };
  };

  const handleInputChange = (field: keyof AdmissionFormState, value: any) => {
    // If it's a File object, store it separately
    if (value instanceof File) {
      setUploadedFiles(prev => ({ ...prev, [field]: value }));
      // Also update formData for validation purposes
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateStep = (step: number): number => {
    // Ensure step is within valid range (1-6)
    if (step < 1) return 1;
    if (step > 6) return 1; // Reset to step 1 if invalid
    return step;
  };

  const saveLocalDraft = (data: any, step: number) => {
    if (!user?.id) return;
    
    const validStep = validateStep(step);
    const userSpecificKey = `${STORAGE_KEY}_${user.id}`;
    localStorage.setItem(userSpecificKey, JSON.stringify({
      formData: data,
      currentStep: validStep,
      savedAt: new Date().toISOString()
    }));
  };

  const saveDraftWithRetry = async (showToast: boolean = false) => {
    if (!initialised || isSubmitted) return;
    
    // Don't save drafts to server if there's an existing non-draft admission (e.g., after reapply)
    // The user is editing their actual admission, not a draft
    if (applicationId && !isRejected) {
      // Still save locally for form persistence
      saveLocalDraft(formData, currentStep);
      return;
    }
    
    setIsDraftSaving(true);
    setDraftError(null);

    let lastError: unknown = null;

    for (let attempt = 0; attempt < DRAFT_SAVE_RETRIES; attempt++) {
      try {
        const saved = await admissionService.saveDraft(formData, currentStep);
        setLastSavedAt(saved?.saved_at || new Date().toISOString());
        setUsingLocalFallback(false);
        
        // Also save locally with user-specific key
        saveLocalDraft(formData, currentStep);

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

    // All retries failed - save locally with user-specific key
    saveLocalDraft(formData, currentStep);
    
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

  const validateCurrentStep = (): boolean => {
    const completeFormData = getCompleteFormData();
    
    switch (currentStep) {
      case 1: // Personal Information
        return !!(
          completeFormData.fullNameBangla &&
          completeFormData.fullNameEnglish &&
          completeFormData.fatherName &&
          completeFormData.fatherNID &&
          completeFormData.motherName &&
          completeFormData.motherNID &&
          completeFormData.dateOfBirth &&
          completeFormData.gender &&
          completeFormData.birthCertificate &&
          completeFormData.religion &&
          completeFormData.nationality &&
          completeFormData.maritalStatus
        );
      case 2: // Contact & Address
        return !!(
          completeFormData.mobile &&
          completeFormData.email &&
          completeFormData.guardianMobile &&
          completeFormData.presentAddress &&
          completeFormData.presentDivision &&
          completeFormData.presentDistrict &&
          completeFormData.presentUpazila &&
          completeFormData.presentPoliceStation &&
          completeFormData.presentPostOffice &&
          completeFormData.presentWard
        );
      case 3: // Education
        return !!(
          completeFormData.sscBoard &&
          completeFormData.sscRoll &&
          completeFormData.sscYear &&
          completeFormData.sscGPA &&
          completeFormData.sscGroup &&
          completeFormData.sscInstitution
        );
      case 4: // Academic
        return !!(
          completeFormData.department &&
          completeFormData.shift &&
          completeFormData.session &&
          completeFormData.semester &&
          completeFormData.admissionType
        );
      case 5: // Documents
        return !!(
          completeFormData.photo &&
          completeFormData.sscMarksheet &&
          completeFormData.birthCertificateDoc &&
          completeFormData.fatherNIDFront &&
          completeFormData.fatherNIDBack &&
          completeFormData.motherNIDFront &&
          completeFormData.motherNIDBack
        );
      case 6: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('Please fill all required fields', {
        description: 'All fields marked with * are required to proceed.'
      });
      return;
    }
    if (currentStep < 6) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Get complete form data including uploaded files
      const completeFormData = getCompleteFormData();
      
      // Capitalize gender (Male/Female)
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
        full_name_bangla: completeFormData.fullNameBangla,
        full_name_english: completeFormData.fullNameEnglish,
        father_name: completeFormData.fatherName,
        father_nid: completeFormData.fatherNID,
        mother_name: completeFormData.motherName,
        mother_nid: completeFormData.motherNID,
        date_of_birth: completeFormData.dateOfBirth,
        birth_certificate_no: completeFormData.birthCertificate,
        gender: capitalizeGender(completeFormData.gender),
        religion: completeFormData.religion,
        blood_group: completeFormData.bloodGroup,
        nationality: completeFormData.nationality || 'Bangladeshi',
        
        // Contact Information
        mobile_student: completeFormData.mobile,
        guardian_mobile: completeFormData.guardianMobile,
        email: completeFormData.email,
        emergency_contact: completeFormData.guardianMobile, // Use guardian mobile as emergency contact
        present_address: presentAddressObj,
        permanent_address: permanentAddressObj,
        
        // Educational Background
        highest_exam: 'SSC',
        board: completeFormData.sscBoard,
        group: completeFormData.sscGroup,
        roll_number: completeFormData.sscRoll,
        registration_number: completeFormData.sscRoll, // Use roll as registration if not separate
        passing_year: completeFormData.sscYear,
        gpa: completeFormData.sscGPA,
        institution_name: completeFormData.sscInstitution,
        
        // Admission Details
        desired_department: completeFormData.department,
        desired_shift: capitalizeShift(completeFormData.shift),
        session: completeFormData.session,
      };

      // Collect documents from form data
      const documents: Record<string, File> = {};
      
      // Map form document fields to API field names
      const documentFieldMapping = {
        photo: 'photo',
        sscMarksheet: 'sscMarksheet',
        sscCertificate: 'sscCertificate',
        birthCertificateDoc: 'birthCertificateDoc',
        studentNIDCopy: 'studentNIDCopy',
        fatherNIDFront: 'fatherNIDFront',
        fatherNIDBack: 'fatherNIDBack',
        motherNIDFront: 'motherNIDFront',
        motherNIDBack: 'motherNIDBack',
        testimonial: 'testimonial',
        medicalCertificate: 'medicalCertificate',
        quotaDocument: 'quotaDocument',
        extraCertificates: 'extraCertificates'
      };

      // Add files to documents object if they exist
      Object.entries(documentFieldMapping).forEach(([formField, apiField]) => {
        const file = completeFormData[formField as keyof AdmissionFormState] as File | null;
        if (file) {
          console.log(`Found document in form: ${formField} -> ${apiField}`, file.name, file.size);
          documents[apiField] = file;
        } else {
          console.log(`No document found for: ${formField}`);
        }
      });

      console.log(`Total documents to upload: ${Object.keys(documents).length}`, Object.keys(documents));

      // Submit application with documents
      let admission;
      if (Object.keys(documents).length > 0) {
        setIsUploadingDocuments(true);
        setUploadProgress(`Uploading ${Object.keys(documents).length} document(s)...`);
        
        // Show progress toast for document upload
        toast.info('Uploading documents...', {
          description: `Processing ${Object.keys(documents).length} document(s)`
        });
        
        try {
          admission = await admissionService.submitApplicationWithDocuments(admissionData, documents);
          
          toast.success('Documents uploaded successfully!', {
            description: 'All documents have been processed and saved.'
          });
        } catch (error: any) {
          // Handle document upload specific errors
          if (error.message && error.message.includes('document upload failed')) {
            toast.warning('Partial success', {
              description: error.message,
              action: {
                label: 'Continue',
                onClick: () => {
                  // User can continue to dashboard and retry document upload later
                }
              }
            });
            // Still try to get the admission that was created
            try {
              admission = await admissionService.getMyAdmission();
            } catch (fetchError) {
              throw error; // Re-throw original error if we can't fetch admission
            }
          } else {
            throw error; // Re-throw for other types of errors
          }
        } finally {
          setIsUploadingDocuments(false);
          setUploadProgress('');
        }
      } else {
        admission = await admissionService.submitApplication(admissionData);
      }

      // Clear drafts from server and local storage
      await admissionService.clearDraft();
      if (user?.id) {
        localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
      }

      // Set application ID and submitted state
      setApplicationId(admission.id);
      setIsSubmitted(true);
      setCurrentStep(7); // Move to success page
      persistSubmissionState(admission.id, formData);
      setUsingLocalFallback(false);
      
      // Clear the reapply editing flag since submission is complete
      setReapplyEditingFlag(false);

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
          if (user?.id) {
            localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
          }
          persistSubmissionState(existingAdmission.id, formData);
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

  const generatePDF = () => generateAdmissionPDF(formData, applicationId, departments);

  const handleReapply = async () => {
    try {
      toast.info('Processing reapplication...', {
        description: 'Resetting your application status'
      });
      
      await admissionService.reapply();
      
      // Set the reapply editing flag
      setReapplyEditingFlag(true);
      
      // Reset states to allow editing
      setIsRejected(false);
      setIsSubmitted(false);
      setRejectionReason('');
      setCurrentStep(1); // Start from first step for review
      
      toast.success('Ready to reapply!', {
        description: 'You can now review and edit your application before resubmitting.'
      });
    } catch (error) {
      toast.error('Failed to process reapplication', {
        description: getErrorMessage(error)
      });
      console.error('Reapply error:', error);
    }
  };

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

  if (isRejected) {
    return (
      <AdmissionRejected
        applicationId={applicationId}
        rejectionReason={rejectionReason}
        onReapply={handleReapply}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {(isDraftLoading || isDraftSaving || isCheckingExisting || isUploadingDocuments) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className={`w-4 h-4 ${isDraftLoading || isDraftSaving || isUploadingDocuments ? 'animate-spin' : ''}`} />
            <span>
              {isDraftLoading
                ? 'Loading draft...'
                : isCheckingExisting
                ? 'Checking for existing submission...'
                : isUploadingDocuments
                ? uploadProgress
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
            {currentStep === 6 && <StepReview formData={formData} isDeclarationChecked={isDeclarationChecked} onDeclarationChange={setIsDeclarationChecked} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            onClick={handlePrev}
            disabled={currentStep === 1 || isDraftLoading}
            className="gap-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:-translate-x-6">
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </div>
            <span className="relative z-10">Previous</span>
          </Button>

          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              className="gap-3 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 text-white font-semibold px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDraftLoading || !validateCurrentStep()}
            >
              <span className="relative z-10">Next</span>
              <div className="relative z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-6">
                <ChevronRight className={`w-5 h-5 text-gray-800 transition-transform duration-300 ${!validateCurrentStep() ? '-rotate-90' : ''}`} />
              </div>
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              className="gap-3 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-semibold px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isDraftSaving || !isDeclarationChecked}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isUploadingDocuments ? 'Uploading Documents...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <span className="relative z-10">Submit Application</span>
                  <div className="relative z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-6">
                    <Send className="w-5 h-5 text-gray-800" />
                  </div>
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
