import { Upload, File, X, CheckCircle, AlertCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { AdmissionFormState } from '../types';

interface Props {
  formData: AdmissionFormState;
  onChange: (field: keyof AdmissionFormState, value: any) => void;
}

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
  retryCount: number;
}

export function StepDocuments({ formData, onChange }: Props) {
  const [uploadStates, setUploadStates] = useState<Record<string, FileUploadState>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [globalUploadProgress, setGlobalUploadProgress] = useState(0);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored', {
        description: 'You can now upload documents'
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost', {
        description: 'Document uploads will be queued until connection is restored'
      });
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
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only PDF, JPG, JPEG, and PNG files are allowed' };
    }
    
    return { valid: true };
  };

  // Simulate file processing with progress
  const processFileWithProgress = async (field: string, file: File): Promise<void> => {
    const fieldKey = String(field);
    
    // Set initial upload state
    setUploadStates(prev => ({
      ...prev,
      [fieldKey]: {
        isUploading: true,
        progress: 0,
        retryCount: 0
      }
    }));

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
        
        setUploadStates(prev => ({
          ...prev,
          [fieldKey]: {
            ...prev[fieldKey],
            progress
          }
        }));
      }

      // Simulate potential network failure
      if (!isOnline && Math.random() < 0.3) {
        throw new Error('Network connection lost');
      }

      // Success - file is processed
      setUploadStates(prev => ({
        ...prev,
        [fieldKey]: {
          isUploading: false,
          progress: 100,
          retryCount: 0
        }
      }));

      onChange(field as keyof AdmissionFormState, file);
      
      toast.success('File processed', {
        description: `${file.name} is ready for submission`
      });

    } catch (error) {
      const currentState = uploadStates[fieldKey] || { retryCount: 0 };
      const newRetryCount = currentState.retryCount + 1;
      
      setUploadStates(prev => ({
        ...prev,
        [fieldKey]: {
          isUploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed',
          retryCount: newRetryCount
        }
      }));

      toast.error('Upload failed', {
        description: `${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: newRetryCount < 3 ? {
          label: 'Retry',
          onClick: () => retryUpload(field, file)
        } : undefined
      });
    }
  };

  // Retry upload functionality
  const retryUpload = async (field: string, file: File) => {
    const fieldKey = String(field);
    const currentState = uploadStates[fieldKey];
    
    if (currentState && currentState.retryCount >= 3) {
      toast.error('Max retries reached', {
        description: 'Please check your connection and try again later'
      });
      return;
    }

    await processFileWithProgress(field, file);
  };

  const handleFileChange = async (field: keyof AdmissionFormState, file: File | null) => {
    const fieldKey = String(field);
    
    if (!file) {
      onChange(field, null);
      // Clear upload state
      setUploadStates(prev => {
        const newState = { ...prev };
        delete newState[fieldKey];
        return newState;
      });
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error('Invalid file', {
        description: validation.error
      });
      return;
    }

    // Check network status
    if (!isOnline) {
      toast.warning('Offline mode', {
        description: 'File will be processed when connection is restored'
      });
      onChange(field, file);
      return;
    }

    // Process file with progress tracking
    await processFileWithProgress(fieldKey, file);
  };

  const fileInput = (
    id: keyof AdmissionFormState,
    label: string,
    accept: string,
    helper?: string,
    required?: boolean
  ) => {
    const file = formData[id] as File | null;
    const hasFile = !!file;
    const fieldKey = String(id);
    const uploadState = uploadStates[fieldKey];
    const isUploading = uploadState?.isUploading || false;
    const hasError = uploadState?.error;
    const progress = uploadState?.progress || 0;

    return (
      <div className="space-y-2">
        <Label>
          {label} {required ? '*' : ''}
          {!isOnline && (
            <span className="ml-2 text-xs text-orange-600 flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </span>
          )}
        </Label>
        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          hasError
            ? 'border-red-300 bg-red-50 cursor-pointer hover:border-red-400'
            : isUploading
            ? 'border-blue-300 bg-blue-50'
            : hasFile 
            ? 'border-green-300 bg-green-50 hover:border-green-400 cursor-pointer' 
            : 'border-border hover:border-primary/50 cursor-pointer'
        }`}>
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
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">Processing...</p>
                <p className="text-xs text-blue-600 mb-2">{progress}% complete</p>
                <Progress value={progress} className="w-full h-2" />
              </div>
            </div>
          ) : hasError ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Upload Failed</p>
                <p className="text-xs text-red-600">{hasError}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => file && retryUpload(fieldKey, file)}
                  disabled={!file || (uploadState?.retryCount || 0) >= 3}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry ({(uploadState?.retryCount || 0)}/3)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(String(id))?.click()}
                >
                  Choose Different File
                </Button>
              </div>
            </div>
          ) : hasFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">{file.name}</p>
                <p className="text-xs text-green-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(String(id))?.click()}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileChange(id, null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <label htmlFor={String(id)} className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload</p>
              {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG • Max 10MB
              </p>
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-semibold">Documents Upload</h3>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Wifi className="w-4 h-4" />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-600 text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload required documents (PDF, JPG, PNG)
          {!isOnline && ' • Files will be processed when connection is restored'}
        </p>
        
        {/* Global upload progress */}
        {Object.values(uploadStates).some(state => state.isUploading) && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing documents...</span>
            </div>
            <Progress 
              value={
                Object.values(uploadStates).reduce((acc, state) => acc + (state.progress || 0), 0) / 
                Math.max(Object.values(uploadStates).length, 1)
              } 
              className="w-full h-2" 
            />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {fileInput('photo', 'Passport-size Photo', 'image/*', '300x300px, max 500KB', true)}
        {fileInput('sscMarksheet', 'SSC Marksheet', '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('sscCertificate', 'SSC Certificate (Optional)', '.pdf,image/*')}
        {fileInput('birthCertificateDoc', 'Birth Certificate', '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('studentNIDCopy', 'Student NID Copy (Optional)', '.pdf,image/*')}
        {fileInput('fatherNIDFront', "Father's NID (Front)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('fatherNIDBack', "Father's NID (Back)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('motherNIDFront', "Mother's NID (Front)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('motherNIDBack', "Mother's NID (Back)", '.pdf,image/*', 'PDF or Image', true)}
        {fileInput('testimonial', 'Testimonial (Optional)', '.pdf,image/*', 'PDF or Image')}
        {fileInput('medicalCertificate', 'Medical Certificate (Optional)', '.pdf,image/*', 'PDF or Image')}
        {fileInput('quotaDocument', 'Quota Document (Optional)', '.pdf,image/*', 'PDF or Image')}
        {fileInput('extraCertificates', 'Extra Certificates (Optional)', '.pdf,image/*', 'PDF or Image')}
      </div>

      {/* Upload Summary */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <File className="w-4 h-4" />
          Upload Summary
        </h4>
        
        {(() => {
          const requiredFields = ['photo', 'sscMarksheet', 'birthCertificateDoc', 'fatherNIDFront', 'fatherNIDBack', 'motherNIDFront', 'motherNIDBack'];
          const optionalFields = ['sscCertificate', 'studentNIDCopy', 'testimonial', 'medicalCertificate', 'quotaDocument', 'extraCertificates'];
          
          const uploadedRequired = requiredFields.filter(field => formData[field as keyof AdmissionFormState]);
          const uploadedOptional = optionalFields.filter(field => formData[field as keyof AdmissionFormState]);
          const totalUploaded = uploadedRequired.length + uploadedOptional.length;
          
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Required documents:</span>
                <span className={uploadedRequired.length === requiredFields.length ? 'text-green-600 font-medium' : 'text-orange-600'}>
                  {uploadedRequired.length}/{requiredFields.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Optional documents:</span>
                <span className="text-muted-foreground">
                  {uploadedOptional.length}/{optionalFields.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
                <span>Total uploaded:</span>
                <span className="text-primary">
                  {totalUploaded}/{requiredFields.length + optionalFields.length}
                </span>
              </div>
              
              {uploadedRequired.length < requiredFields.length && (
                <div className="flex items-center gap-2 text-sm text-orange-600 mt-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>Please upload all required documents before submitting</span>
                </div>
              )}
              
              {/* Show upload errors summary */}
              {(() => {
                const errorFields = Object.entries(uploadStates)
                  .filter(([_, state]) => state.error)
                  .map(([field, _]) => field);
                
                if (errorFields.length > 0) {
                  return (
                    <div className="flex items-center gap-2 text-sm text-red-600 mt-3">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errorFields.length} document(s) failed to upload. Please retry.</span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Show uploading status */}
              {(() => {
                const uploadingFields = Object.entries(uploadStates)
                  .filter(([_, state]) => state.isUploading)
                  .map(([field, _]) => field);
                
                if (uploadingFields.length > 0) {
                  return (
                    <div className="flex items-center gap-2 text-sm text-blue-600 mt-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing {uploadingFields.length} document(s)...</span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Network status warning */}
              {!isOnline && (
                <div className="flex items-center gap-2 text-sm text-orange-600 mt-3">
                  <WifiOff className="w-4 h-4" />
                  <span>Offline mode - uploads will resume when connection is restored</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

