import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, Download, Loader2, AlertCircle, FolderOpen, 
  GraduationCap, Upload, Filter, Badge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { documentService, type Document, type DocumentCategory } from '@/services/documentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.relatedProfileId) {
      fetchDocuments();
    }
  }, [user?.relatedProfileId]);

  const fetchDocuments = async () => {
    if (!user?.relatedProfileId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await documentService.getMyDocuments(user.relatedProfileId);
      setDocuments(response.documents || []);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load documents', {
        description: errorMsg
      });
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Documents</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchDocuments}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
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
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base truncate mb-1">
                      {doc.fileName}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {doc.category}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-4 gap-2"
                  size="sm"
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
                      toast.success('Document downloaded successfully');
                    } catch (err) {
                      toast.error('Failed to download document', {
                        description: getErrorMessage(err)
                      });
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default DocumentsPage;