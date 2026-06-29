import { Upload, File, X, CheckCircle, AlertCircle, Loader2, RefreshCw, Wifi, WifiOff, Eye, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AdmissionFormState } from '../types';
import { FieldErrors } from '../validation';
import { StepIntro } from '../fields';
import { documentService, Document } from '@/services/documentService';
import { admissionService } from '@/services/admissionService';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
  errors?: FieldErrors;
  /** Reports which document fields are already satisfied by a server-side upload
   *  (used so step validation passes on re-application without re-uploading). */
  onDocsAvailable?: (fieldKeys: string[]) => void;
}

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
  retryCount: number;
}

interface PreviousDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  file_url: string;
  original_field_name?: string;
}

export function StepDocuments({ formData, onChange, errors = {}, onDocsAvailable }: Props) {
  const [uploadStates, setUploadStates] = useState<Record<string, FileUploadState>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [previousDocuments, setPreviousDocuments] = useState<Record<string, PreviousDocument>>({});
  const [loadingPreviousDocs, setLoadingPreviousDocs] = useState(true);

  // Fetch previous documents on mount
  useEffect(() => {
    const fetchPreviousDocuments = async () => {
      try {
        setLoadingPreviousDocs(true);
        const admission = await admissionService.getMyAdmission();
        if (!admission) {
          setLoadingPreviousDocs(false);
          return;
        }
        const admissionUuid = admission.uuid || admission.id;
        const response = await documentService.getDocuments({
          source_type: 'admission',
          source_id: admissionUuid,
          page_size: 100,
        });
        const docsMap: Record<string, PreviousDocument> = {};
        (response.results || []).forEach((doc: Document) => {
          if (doc.original_field_name) {
            docsMap[doc.original_field_name] = {
              id: doc.id,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              fileType: doc.fileType,
              uploadDate: doc.uploadDate,
              file_url: doc.file_url,
              original_field_name: doc.original_field_name,
            };
          }
        });
        setPreviousDocuments(docsMap);
      } catch (error) {
        console.error('Failed to fetch previous documents:', error);
      } finally {
        setLoadingPreviousDocs(false);
      }
    };
    fetchPreviousDocuments();
  }, []);

  // Report previously-uploaded document fields up to the wizard so step
  // validation treats them as satisfied (re-application after rejection).
  useEffect(() => {
    onDocsAvailable?.(Object.keys(previousDocuments));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousDocuments]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored', { description: 'You can now upload documents' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost', { description: 'Document uploads will be queued until connection is restored' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (file.size > maxSize) return { valid: false, error: 'File size must be less than 10MB' };
    if (!allowedTypes.includes(file.type)) return { valid: false, error: 'Only PDF, JPG, JPEG, and PNG files are allowed' };
    return { valid: true };
  };

  // Process file with progress
  const processFileWithProgress = async (field: string, file: File): Promise<void> => {
    const fieldKey = String(field);
    setUploadStates((prev) => ({ ...prev, [fieldKey]: { isUploading: true, progress: 0, retryCount: 0 } }));
    try {
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        setUploadStates((prev) => ({ ...prev, [fieldKey]: { ...prev[fieldKey], progress } }));
      }
      if (!isOnline && Math.random() < 0.3) throw new Error('Network connection lost');
      setUploadStates((prev) => ({ ...prev, [fieldKey]: { isUploading: false, progress: 100, retryCount: 0 } }));
      onChange(field as keyof AdmissionFormState, file);
      toast.success('File added', { description: `${file.name} is ready for submission` });
    } catch (error) {
      const currentState = uploadStates[fieldKey] || { retryCount: 0 };
      const newRetryCount = currentState.retryCount + 1;
      setUploadStates((prev) => ({
        ...prev,
        [fieldKey]: {
          isUploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed',
          retryCount: newRetryCount,
        },
      }));
      toast.error('Upload failed', {
        description: `${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: newRetryCount < 3 ? { label: 'Retry', onClick: () => retryUpload(field, file) } : undefined,
      });
    }
  };

  const retryUpload = async (field: string, file: File) => {
    const fieldKey = String(field);
    const currentState = uploadStates[fieldKey];
    if (currentState && currentState.retryCount >= 3) {
      toast.error('Max retries reached', { description: 'Please check your connection and try again later' });
      return;
    }
    await processFileWithProgress(field, file);
  };

  const handleFileChange = async (field: keyof AdmissionFormState, file: File | null) => {
    const fieldKey = String(field);
    if (!file) {
      onChange(field, null);
      setUploadStates((prev) => {
        const newState = { ...prev };
        delete newState[fieldKey];
        return newState;
      });
      return;
    }
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error('Invalid file', { description: validation.error });
      return;
    }
    if (!isOnline) {
      toast.warning('Offline mode', { description: 'File will be processed when connection is restored' });
      onChange(field, file);
      return;
    }
    await processFileWithProgress(fieldKey, file);
  };

  const fileInput = (
    id: keyof AdmissionFormState,
    label: string,
    accept: string,
    helper?: string,
    required?: boolean,
  ) => {
    const file = formData[id] as File | null;
    const hasFile = !!file;
    const fieldKey = String(id);
    const uploadState = uploadStates[fieldKey];
    const isUploading = uploadState?.isUploading || false;
    const hasError = uploadState?.error;
    const progress = uploadState?.progress || 0;
    const previousDoc = previousDocuments[fieldKey];
    const hasPreviousDoc = !!previousDoc && !hasFile;
    const missingRequired = !!errors[id] && !hasFile && !hasPreviousDoc;

    const handleViewDocument = (doc: PreviousDocument) => {
      try {
        window.open(documentService.getDocumentPreviewUrl(doc.id), '_blank');
      } catch {
        toast.error('Failed to open document');
      }
    };

    const handleDownloadDocument = async (doc: PreviousDocument) => {
      try {
        const blob = await documentService.downloadDocument(doc.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started');
      } catch {
        toast.error('Failed to download document');
      }
    };

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          {label} {required && <span className="text-destructive">*</span>}
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs text-warning-foreground">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
        </Label>
        <div
          className={cn(
            'rounded-2xl border-2 border-dashed p-5 text-center transition-colors',
            hasError
              ? 'cursor-pointer border-destructive/50 bg-destructive/5 hover:border-destructive'
              : isUploading
              ? 'border-primary/50 bg-primary/5'
              : hasFile
              ? 'cursor-pointer border-success/50 bg-success/5 hover:border-success'
              : hasPreviousDoc
              ? 'cursor-pointer border-accent/50 bg-accent/10 hover:border-accent'
              : missingRequired
              ? 'cursor-pointer border-destructive/50 bg-destructive/5'
              : 'cursor-pointer border-border hover:border-primary/50 hover:bg-muted/40',
          )}
        >
          <input
            type="file"
            className="hidden"
            id={String(id)}
            accept={accept}
            onChange={(e) => handleFileChange(id, e.target.files?.[0] || null)}
            multiple={id === 'extraCertificates'}
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Processing… {progress}%</p>
                <Progress value={progress} className="mt-2 h-2 w-full" />
              </div>
            </div>
          ) : hasError ? (
            <div className="space-y-3">
              <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Upload failed</p>
                <p className="text-xs text-muted-foreground">{hasError}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => file && retryUpload(fieldKey, file)} disabled={!file || (uploadState?.retryCount || 0) >= 3}>
                  <RefreshCw className="mr-1 h-4 w-4" /> Retry ({uploadState?.retryCount || 0}/3)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(String(id))?.click()}>
                  Choose another
                </Button>
              </div>
            </div>
          ) : hasFile ? (
            <div className="space-y-3">
              <CheckCircle className="mx-auto h-7 w-7 text-success" />
              <div>
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(String(id))?.click()}>Replace</Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleFileChange(id, null)} aria-label="Remove file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : hasPreviousDoc ? (
            <div className="space-y-3">
              <File className="mx-auto h-7 w-7 text-accent" />
              <div>
                <p className="text-xs font-medium text-accent-foreground/80">Previously uploaded</p>
                <p className="truncate text-sm font-medium text-foreground">{previousDoc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {(previousDoc.fileSize / 1024 / 1024).toFixed(2)} MB • {previousDoc.fileType.toUpperCase()}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleViewDocument(previousDoc)}>
                  <Eye className="mr-1 h-4 w-4" /> View
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument(previousDoc)}>
                  <Download className="mr-1 h-4 w-4" /> Download
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(String(id))?.click()}>Replace</Button>
              </div>
              <p className="text-xs text-muted-foreground">This document will be used unless you upload a new one.</p>
            </div>
          ) : (
            <label htmlFor={String(id)} className="block cursor-pointer">
              <Upload className={cn('mx-auto mb-2 h-7 w-7', missingRequired ? 'text-destructive' : 'text-muted-foreground')} />
              <p className="text-sm font-medium text-foreground">Click to upload</p>
              {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG • Max 10MB</p>
            </label>
          )}
        </div>
        {missingRequired && (
          <p className="flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertCircle className="h-3 w-3" /> This document is required
          </p>
        )}
      </div>
    );
  };

  const requiredFields = ['photo', 'sscMarksheet', 'birthCertificateDoc', 'fatherNIDFront', 'fatherNIDBack', 'motherNIDFront', 'motherNIDBack'];
  const optionalFields = ['sscCertificate', 'studentNIDCopy', 'testimonial', 'medicalCertificate', 'quotaDocument', 'extraCertificates'];
  const uploadedRequired = requiredFields.filter((f) => formData[f as keyof AdmissionFormState] || previousDocuments[f]);
  const requiredProgress = Math.round((uploadedRequired.length / requiredFields.length) * 100);

  return (
    <div className="space-y-6">
      <StepIntro icon={Upload} title="Documents Upload" description="Upload clear scans or photos (PDF, JPG, PNG)." />

      {/* Required progress + status */}
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium">Required documents</span>
            <span className={cn('font-semibold', requiredProgress === 100 ? 'text-success' : 'text-muted-foreground')}>
              {uploadedRequired.length}/{requiredFields.length}
            </span>
          </div>
          <Progress value={requiredProgress} className="h-2" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          {loadingPreviousDocs ? (
            <span className="flex items-center gap-1 text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>
          ) : isOnline ? (
            <span className="flex items-center gap-1 text-success"><Wifi className="h-4 w-4" /> Online</span>
          ) : (
            <span className="flex items-center gap-1 text-warning-foreground"><WifiOff className="h-4 w-4" /> Offline</span>
          )}
        </div>
      </div>

      {!loadingPreviousDocs && Object.keys(previousDocuments).length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent-foreground">
          <File className="h-4 w-4 flex-shrink-0" />
          <span>{Object.keys(previousDocuments).length} document(s) from a previous application were found. Keep them or upload new ones.</span>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {fileInput('photo', 'Passport-size Photo', 'image/*', '300×300px, max 500KB', true)}
        {fileInput('sscMarksheet', 'SSC Marksheet', '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('sscCertificate', 'SSC Certificate', '.pdf,image/*', 'Optional')}
        {fileInput('birthCertificateDoc', 'Birth Certificate', '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('studentNIDCopy', 'Student NID Copy', '.pdf,image/*', 'Optional')}
        {fileInput('fatherNIDFront', "Father's NID (Front)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('fatherNIDBack', "Father's NID (Back)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('motherNIDFront', "Mother's NID (Front)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('motherNIDBack', "Mother's NID (Back)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('testimonial', 'Testimonial', '.pdf,image/*', 'Optional')}
        {fileInput('medicalCertificate', 'Medical Certificate', '.pdf,image/*', 'Optional')}
        {fileInput('quotaDocument', 'Quota Document', '.pdf,image/*', 'Optional')}
        {fileInput('extraCertificates', 'Extra Certificates', '.pdf,image/*', 'Optional')}
      </div>

      {uploadedRequired.length < requiredFields.length && (
        <div className="flex items-center gap-2 text-sm text-warning-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Please add all required documents before submitting.</span>
        </div>
      )}
    </div>
  );
}
