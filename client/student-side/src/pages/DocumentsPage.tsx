import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, Download, Loader2, AlertCircle, FolderOpen, 
  GraduationCap, Upload, Filter, Badge, Eye, User, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { documentService, type Document, type DocumentCategory } from '@/services/documentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { debugAuthState, ensureAuthentication } from '@/utils/authHelper';

export function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    if (user?.relatedProfileId) {
      // Debug authentication state
      debugAuthState();
      
      // Ensure authentication before fetching documents
      ensureAuthentication().then(isAuthenticated => {
        if (isAuthenticated) {
          fetchDocuments();
        } else {
          setError('Please log in to access your documents');
          setLoading(false);
        }
      });
    }
  }, [user?.relatedProfileId]);

  const fetchDocuments = async () => {
    if (!user?.relatedProfileId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching documents for student:', user.relatedProfileId);
      console.log('User object:', user);
      
      const response = await documentService.getMyDocuments(user.relatedProfileId);
      console.log('Documents response:', response);
      
      setDocuments(response.documents || []);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      console.error('Documents fetch error:', err);
      console.error('Error details:', {
        status_code: err.status_code,
        error: err.error,
        details: err.details
      });
      
      // Handle authentication errors gracefully for demo users
      if (err.status_code === 401 && localStorage.getItem('demoRole')) {
        setError('Demo mode: Limited document functionality. Log in with a real account for full access.');
        setDocuments([]); // Show empty state instead of error
      } else if (err.status_code === 404) {
        setError('Document service is currently unavailable. Please try again later.');
        setDocuments([]);
      } else {
        setError(errorMsg);
        toast.error('Failed to load documents', {
          description: errorMsg
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle document preview
  const handleViewDocument = (doc: Document) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  // Handle setting photo as profile picture
  const handleSetAsProfilePicture = async (doc: Document) => {
    if (doc.category !== 'Photo') {
      toast.error('Only photo documents can be set as profile picture');
      return;
    }

    try {
      await documentService.setAsProfilePicture(doc.id);
      toast.success('Profile picture updated successfully', {
        description: `${doc.fileName} is now your profile picture`
      });
    } catch (err: any) {
      console.error('Set profile picture error:', err);
      toast.error('Failed to set profile picture', {
        description: getErrorMessage(err)
      });
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-6 h-6 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="w-6 h-6 text-green-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isDemoError = error.includes('Demo mode') || error.includes('Authentication required');
    
    return (
      <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold">My Documents</h1>
              <p className="text-sm text-muted-foreground">
                Access and download your academic documents
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error/Demo State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-8 md:p-12 shadow-card text-center">
            {isDemoError ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Demo Mode Active</h3>
                <p className="text-muted-foreground mb-4">
                  You're currently using demo mode. Document functionality is limited in demo mode.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  To access your real documents, please log in with your actual student account.
                </p>
                <Button onClick={() => window.location.href = '/login'} variant="outline">
                  Go to Login
                </Button>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to Load Documents</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchDocuments}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold">My Documents</h1>
            <p className="text-sm text-muted-foreground">
              Access and download your academic documents
            </p>
          </div>
        </div>
      </motion.div>

      {/* Documents Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {documents.length === 0 ? (
          <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-8 md:p-12 shadow-card text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Available</h3>
            <p className="text-muted-foreground">
              Your academic documents will appear here once they are uploaded by the administration.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm md:text-base truncate">
                        {doc.fileName}
                      </h3>
                      {doc.id.startsWith('demo-') && (
                        <Badge variant="outline" className="text-xs">
                          Demo
                        </Badge>
                      )}
                      {doc.category === 'Photo' && (
                        <Badge variant="secondary" className="text-xs">
                          Photo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {doc.category}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={async () => {
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
                        
                        // Show different message for demo vs real downloads
                        if (doc.id.startsWith('demo-')) {
                          toast.success('Demo document downloaded', {
                            description: 'This is a sample document for demonstration purposes.'
                          });
                        } else {
                          toast.success('Document downloaded successfully');
                        }
                      } catch (err: any) {
                        console.error('Download error:', err);
                        const errorMsg = getErrorMessage(err);
                        
                        if (errorMsg.includes('Authentication required')) {
                          toast.error('Login Required', {
                            description: 'Please log in with your student account to download documents.'
                          });
                        } else {
                          toast.error('Failed to download document', {
                            description: errorMsg
                          });
                        }
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  
                  {/* Profile Picture Button for Photos */}
                  {doc.category === 'Photo' && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetAsProfilePicture(doc)}
                      title="Set as profile picture"
                    >
                      <User className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Document Preview Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          {selectedDoc && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="flex items-center gap-3">
                  {getFileIcon(selectedDoc.fileType)}
                  {selectedDoc.fileName}
                </DialogTitle>
                <DialogDescription>
                  {selectedDoc.category} • {formatFileSize(selectedDoc.fileSize)} • {selectedDoc.fileType.toUpperCase()}
                </DialogDescription>
              </DialogHeader>
              
              {/* Scrollable Content Area */}
              <div 
                className="flex-1 overflow-auto px-6 pb-6"
                style={{
                  maxHeight: 'calc(90vh - 140px)',
                  overflowY: 'scroll'
                }}
              >
                {/* Enhanced Scrollbar Styling */}
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .student-dialog-scroll-container {
                      scrollbar-width: auto !important;
                      scrollbar-color: #9ca3af #f3f4f6 !important;
                    }
                    
                    .student-dialog-scroll-container::-webkit-scrollbar {
                      width: 14px !important;
                    }
                    
                    .student-dialog-scroll-container::-webkit-scrollbar-track {
                      background: #f3f4f6 !important;
                      border-radius: 7px !important;
                    }
                    
                    .student-dialog-scroll-container::-webkit-scrollbar-thumb {
                      background: #9ca3af !important;
                      border-radius: 7px !important;
                      border: 2px solid #f3f4f6 !important;
                    }
                    
                    .student-dialog-scroll-container::-webkit-scrollbar-thumb:hover {
                      background: #6b7280 !important;
                    }
                    
                    .dark .student-dialog-scroll-container {
                      scrollbar-color: #6b7280 #374151 !important;
                    }
                    
                    .dark .student-dialog-scroll-container::-webkit-scrollbar-track {
                      background: #374151 !important;
                    }
                    
                    .dark .student-dialog-scroll-container::-webkit-scrollbar-thumb {
                      background: #6b7280 !important;
                      border: 2px solid #374151 !important;
                    }
                  `
                }} />
                
                <div className="student-dialog-scroll-container space-y-6">
                  {/* Document Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{selectedDoc.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Format</p>
                      <p className="font-medium uppercase">{selectedDoc.fileType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">File Size</p>
                      <p className="font-medium">{formatFileSize(selectedDoc.fileSize)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Upload Date</p>
                      <p className="font-medium">{new Date(selectedDoc.uploadDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <div className="p-4 bg-muted/30 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">Document Preview</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedDoc.fileType === 'pdf' ? 'PDF Document' : 
                             ['jpg', 'jpeg', 'png', 'gif'].includes(selectedDoc.fileType.toLowerCase()) ? 'Image File' : 
                             'Document File'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Student document</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <span>↕</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Document Content */}
                    <div className="bg-white dark:bg-gray-900 p-4">
                      {selectedDoc.fileType === 'pdf' ? (
                        <div className="w-full">
                          <iframe
                            src={documentService.getDocumentPreviewUrl(selectedDoc.id)}
                            className="w-full border-0 rounded"
                            title={`Preview of ${selectedDoc.fileName}`}
                            style={{ 
                              height: '600px',
                              minHeight: '600px',
                              width: '100%'
                            }}
                          />
                        </div>
                      ) : ['jpg', 'jpeg', 'png', 'gif'].includes(selectedDoc.fileType.toLowerCase()) ? (
                        <div className="text-center">
                          <div className="relative inline-block">
                            <img
                              src={documentService.getDocumentPreviewUrl(selectedDoc.id)}
                              alt={selectedDoc.fileName}
                              className="max-w-full h-auto object-contain rounded shadow-lg cursor-zoom-in"
                              style={{ 
                                maxHeight: '500px',
                                minHeight: '200px'
                              }}
                              onClick={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (img.style.transform === 'scale(1.5)') {
                                  img.style.transform = 'scale(1)';
                                  img.style.cursor = 'zoom-in';
                                } else {
                                  img.style.transform = 'scale(1.5)';
                                  img.style.cursor = 'zoom-out';
                                  img.style.transformOrigin = 'center';
                                  img.style.transition = 'transform 0.3s ease';
                                }
                              }}
                            />
                          </div>
                          
                          {/* Image Controls */}
                          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-3 py-2 inline-flex">
                            <span>Click to zoom</span>
                            <span>•</span>
                            <span>Right-click to save</span>
                          </div>
                          
                          {/* Profile Picture Option for Photos */}
                          {selectedDoc.category === 'Photo' && (
                            <div className="mt-4">
                              <Button 
                                variant="outline" 
                                onClick={() => handleSetAsProfilePicture(selectedDoc)}
                                className="gap-2"
                              >
                                <User className="w-4 h-4" />
                                Set as Profile Picture
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center py-12">
                          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            File type: {selectedDoc.fileType.toUpperCase()}
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={async () => {
                              try {
                                const blob = await documentService.downloadDocument(selectedDoc.id);
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = selectedDoc.fileName;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                toast.success('Document downloaded successfully');
                              } catch (err: any) {
                                toast.error('Failed to download document', {
                                  description: getErrorMessage(err)
                                });
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download to View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Document Information */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Document Information</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Uploaded to your student profile</p>
                      <p>• Category: {selectedDoc.category}</p>
                      <p>• File integrity: Verified</p>
                      {selectedDoc.category === 'Photo' && (
                        <p>• Can be used as profile picture</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="px-6 py-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    window.open(documentService.getDocumentPreviewUrl(selectedDoc.id), '_blank');
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90" 
                  onClick={async () => {
                    try {
                      const blob = await documentService.downloadDocument(selectedDoc.id);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedDoc.fileName;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast.success('Document downloaded successfully');
                    } catch (err: any) {
                      toast.error('Failed to download document', {
                        description: getErrorMessage(err)
                      });
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocumentsPage;