import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Upload, Eye, Download, FileText, File, Image, FileSpreadsheet, Trash2, Award, CreditCard, GraduationCap, FileCheck, Users, Loader2, AlertCircle, Plus, Layers, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { documentService, type Document, type DocumentCategory } from '@/services/documentService';
import { studentService, type Student } from '@/services/studentService';
import { DocumentGenerator } from '@/services/documentGenerator';
import { TemplateService } from '@/services/templateService';
import { PDFExportService } from '@/services/pdfExportService';
import { type DocumentTemplate } from '@/types/template';
import { getErrorMessage } from '@/lib/api';
import DocumentGeneratorComponent from '@/components/documents/DocumentGenerator';
import BatchDocumentGenerator from '@/components/documents/BatchDocumentGenerator';
import { GeneratedDocument } from '@/types/template';



const documentTypes = ['All Types', 'Certificate', 'NID', 'Birth Certificate', 'Marksheet', 'Testimonial', 'Photo', 'Other'];
const sourceTypes = ['All Sources', 'Admission Upload', 'Manual Upload'];

const getFileIcon = (format: string) => {
  switch (format) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'jpg':
    case 'png':
      return <Image className="w-8 h-8 text-blue-500" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    default:
      return <File className="w-8 h-8 text-muted-foreground" />;
  }
};

export default function Documents() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchedStudents, setSearchedStudents] = useState<Student[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    fileName: '',
    category: '' as DocumentCategory | '',
    studentId: '',
    file: null as File | null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isBatchGeneratorOpen, setIsBatchGeneratorOpen] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false);
  const [quickGeneratedDocument, setQuickGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [isGeneratingQuick, setIsGeneratingQuick] = useState(false);
  const { toast } = useToast();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // API state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch documents
  useEffect(() => {
    fetchDocuments();
  }, [search, typeFilter, sourceFilter]);

  // Load templates for quick generate + display
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        setTemplateError(null);
        const loaded = await TemplateService.getTemplates();
        setTemplates(loaded);
      } catch (err) {
        const msg = getErrorMessage(err);
        setTemplateError(msg);
        toast({
          title: 'Error',
          description: `Failed to load templates: ${msg}`,
          variant: 'destructive',
        });
      } finally {
        setTemplatesLoading(false);
      }
    };
    loadTemplates();
  }, [toast]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {
        page_size: 100,
      };
      
      if (typeFilter !== 'All Types') {
        filters.category = typeFilter as DocumentCategory;
      }
      
      if (sourceFilter !== 'All Sources') {
        filters.source_type = sourceFilter === 'Admission Upload' ? 'admission' : 'manual';
      }
      
      const response = await documentService.getDocuments(filters);
      
      // Client-side search filtering
      let filteredResults = response.results;
      if (search) {
        filteredResults = filteredResults.filter(d =>
          d.fileName.toLowerCase().includes(search.toLowerCase()) ||
          d.studentName?.toLowerCase().includes(search.toLowerCase()) ||
          d.studentRoll?.includes(search)
        );
      }
      
      setDocuments(filteredResults);
      setTotalCount(response.count);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Search students function
  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchedStudents([]);
      return;
    }

    try {
      setStudentSearchLoading(true);
      const students = await studentService.searchStudents(query);
      setSearchedStudents(students);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: `Failed to search students: ${errorMsg}`,
        variant: 'destructive',
      });
      setSearchedStudents([]);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchStudents(studentSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [studentSearch]);

  const handleUpload = async () => {
    if (!uploadFormData.file || !uploadFormData.category || !uploadFormData.studentId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields and select a file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      
      await documentService.uploadDocument({
        student: uploadFormData.studentId,
        category: uploadFormData.category as DocumentCategory,
        file: uploadFormData.file
      });

      toast({
        title: "Document Uploaded",
        description: "The document has been uploaded successfully.",
      });
      
      // Reset form and close dialog
      setUploadFormData({
        fileName: '',
        category: '',
        studentId: '',
        file: null
      });
      setSelectedStudent(null);
      setIsUploadOpen(false);
      
      // Refresh documents list
      fetchDocuments();
      
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: `Failed to upload document: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFormData(prev => ({
        ...prev,
        file,
        fileName: file.name
      }));
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setUploadFormData(prev => ({
      ...prev,
      studentId: student.id
    }));
    setStudentSearch('');
    setSearchedStudents([]);
  };

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await documentService.deleteDocument(id);
      toast({
        title: "Document Deleted",
        description: "The document has been deleted successfully.",
      });
      fetchDocuments(); // Refresh the list
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc: Document) => {
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
      
      toast({
        title: "Download Started",
        description: "Your document is being downloaded.",
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };

  const openTemplateDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setStudentSearch('');
    setSelectedStudent(null);
    setSearchedStudents([]);
    setIsTemplateDialogOpen(true);
  };

  const handleGenerateDocument = async () => {
    if (!selectedStudent || !selectedTemplate) return;
    
    try {
      setIsGeneratingQuick(true);
      setError(null);

      const generated = await DocumentGenerator.generateDocument({
        templateId: selectedTemplate.id,
        studentId: selectedStudent.id,
        outputFormat: 'html',
      });

      setQuickGeneratedDocument(generated);
      setIsTemplateDialogOpen(false);
      setIsQuickPreviewOpen(true);
      
      toast({
        title: "Document Generated",
        description: "Document has been generated successfully and is ready for preview.",
      });
      
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      toast({
        title: 'Error',
        description: `Failed to generate document: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingQuick(false);
    }
  };

  const handleDocumentGenerated = (document: GeneratedDocument) => {
    setGeneratedDocuments(prev => [...prev, document]);
    toast({
      title: "Document Generated",
      description: "Document has been generated successfully and is ready for download.",
    });
  };

  const handleBatchComplete = (results: { successful: GeneratedDocument[]; failed: any[] }) => {
    setGeneratedDocuments(prev => [...prev, ...results.successful]);
    toast({
      title: "Batch Generation Complete",
      description: `Generated ${results.successful.length} documents successfully${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">Manage student documents and generate certificates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBatchGeneratorOpen(true)}>
            <Layers className="w-4 h-4 mr-2" />
            Batch Generate
          </Button>
          <Button variant="outline" onClick={() => setIsGeneratorOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Document
          </Button>
          <Button className="gradient-primary text-primary-foreground" onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      <Tabs defaultValue="generated" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generated">Generate Documents ({generatedDocuments.length})</TabsTrigger>
          <TabsTrigger value="submitted">Student Submitted Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="submitted" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Total Documents</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{documents.filter(d => d.source_type === 'admission').length}</p>
                  <p className="text-xs text-muted-foreground">Admission Docs</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-success">{documents.filter(d => d.source_type === 'manual').length}</p>
                  <p className="text-xs text-muted-foreground">Manual Uploads</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent-foreground">
                    {(documents.reduce((sum, d) => sum + d.fileSize, 0) / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <p className="text-xs text-muted-foreground">Total Size</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search & Filters */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by document name or student..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceTypes.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card className="glass-card relative">
            {loading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                </div>
              </div>
            )}
            
            {error && !loading && (
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchDocuments}>Try Again</Button>
              </CardContent>
            )}
            
            {!loading && !error && documents.length === 0 && (
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No documents found</p>
              </CardContent>
            )}
            
            {!loading && !error && documents.length > 0 && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Document</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Student</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Size</th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc, index) => (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-muted/50"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {getFileIcon(doc.fileType)}
                              <div>
                                <p className="font-medium text-foreground">{doc.fileName}</p>
                                <p className="text-xs text-muted-foreground uppercase">{doc.fileType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{doc.category}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={doc.source_type === 'admission' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {doc.source_type === 'admission' ? (
                                  <>
                                    <Users className="w-3 h-3 mr-1" />
                                    Admission
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Manual
                                  </>
                                )}
                              </Badge>
                              {doc.source_type === 'admission' && doc.original_field_name && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.original_field_name}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm font-medium">{doc.studentName || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">Roll: {doc.studentRoll || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {(doc.fileSize / 1024).toFixed(0)} KB
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleView(doc)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(doc.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>



        <TabsContent value="generated" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Generate Documents</CardTitle>
                  <p className="text-sm text-muted-foreground">Create documents using templates with student data</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setIsBatchGeneratorOpen(true)}>
                    <Layers className="w-4 h-4 mr-2" />
                    Batch Generate
                  </Button>
                  <Button onClick={() => setIsGeneratorOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Document Templates Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Document Templates</h3>
              {templatesLoading ? (
                <div className="text-sm text-muted-foreground">Loading templates...</div>
              ) : templateError ? (
                <div className="text-sm text-destructive">Failed to load templates: {templateError}</div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-muted-foreground">No templates available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="glass-card hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => openTemplateDialog(template)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Layers className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{template.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">Quick Generate</Badge>
                                <Badge variant="outline" className="text-xs capitalize">{template.category}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Need more control?</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use the Advanced Generator for custom field editing, real-time preview, and enhanced validation.
                      </p>
                      <Button variant="link" className="p-0 h-auto text-xs mt-2" onClick={() => setIsGeneratorOpen(true)}>
                        Open Advanced Generator →
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Documents Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recently Generated Documents</h3>
                {generatedDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No Generated Documents</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by generating documents using templates with real student data
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" onClick={() => setIsBatchGeneratorOpen(true)}>
                        <Layers className="w-4 h-4 mr-2" />
                        Batch Generate
                      </Button>
                      <Button onClick={() => setIsGeneratorOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedDocuments.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium">Document {doc.id.slice(-8)}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Template: {doc.templateId} • Student: {doc.studentId}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Generated: {new Date(doc.generatedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={doc.status === 'final' ? 'default' : 'secondary'}>
                                  {doc.status}
                                </Badge>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document for a student. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="studentSearch">Student *</Label>
              {selectedStudent ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {selectedStudent.fullNameEnglish?.split(' ').map(n => n[0]).join('') || 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedStudent.fullNameEnglish}</p>
                    <p className="text-xs text-muted-foreground">Roll: {selectedStudent.currentRollNumber}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStudent(null);
                      setUploadFormData(prev => ({ ...prev, studentId: '' }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="studentSearch"
                    placeholder="Search by name or roll number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  {studentSearchLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  )}
                  {searchedStudents.length > 0 && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto">
                      {searchedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0"
                          onClick={() => handleStudentSelect(student)}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {student.fullNameEnglish?.split(' ').map(n => n[0]).join('') || 'ST'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{student.fullNameEnglish}</p>
                            <p className="text-xs text-muted-foreground">Roll: {student.currentRollNumber}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Document Category */}
            <div className="space-y-2">
              <Label htmlFor="docType">Document Category *</Label>
              <Select 
                value={uploadFormData.category} 
                onValueChange={(value) => setUploadFormData(prev => ({ ...prev, category: value as DocumentCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.filter(t => t !== 'All Types').map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload File *</Label>
              {uploadFormData.file ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  {getFileIcon(uploadFormData.file.name.split('.').pop() || '')}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{uploadFormData.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFormData.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadFormData(prev => ({ ...prev, file: null, fileName: '' }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    id="fileUpload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="fileUpload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUploadOpen(false);
                setUploadFormData({ fileName: '', category: '', studentId: '', file: null });
                setSelectedStudent(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              className="gradient-primary text-primary-foreground" 
              onClick={handleUpload}
              disabled={isUploading || !uploadFormData.file || !uploadFormData.category || !uploadFormData.studentId}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {getFileIcon(selectedDoc.fileType)}
                  {selectedDoc.fileName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                    <p className="text-sm text-muted-foreground">Student</p>
                    <p className="font-medium">{selectedDoc.studentName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{selectedDoc.studentRoll || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Upload Date</p>
                    <p className="font-medium">{new Date(selectedDoc.uploadDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">File Size</p>
                    <p className="font-medium">{(selectedDoc.fileSize / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Document Preview</p>
                  <p className="text-xs text-muted-foreground mt-1">(Preview not available)</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={() => handleDownload(selectedDoc)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Generation Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </div>
                  Generate {selectedTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  Search and select a student to generate this document
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Search Student</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by name or roll number..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {studentSearch && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentSearchLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Searching students...</p>
                      </div>
                    ) : (
                      <>
                        {searchedStudents.map(student => {
                          const departmentName = typeof student.department === 'string' 
                            ? student.departmentName || student.department 
                            : student.department?.name || 'Unknown Department';
                          
                          return (
                            <Card 
                              key={student.id} 
                              className={`cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                              onClick={() => setSelectedStudent(student)}
                            >
                              <CardContent className="p-3 flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={student.profilePhoto} />
                                  <AvatarFallback className="gradient-primary text-primary-foreground text-sm">
                                    {student.fullNameEnglish.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{student.fullNameEnglish}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Roll: {student.currentRollNumber} • {departmentName}
                                  </p>
                                </div>
                                {selectedStudent?.id === student.id && (
                                  <Badge className="gradient-primary text-primary-foreground">Selected</Badge>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                        {searchedStudents.length === 0 && !studentSearchLoading && (
                          <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedStudent && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">Selected Student:</p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={selectedStudent.profilePhoto} />
                          <AvatarFallback className="gradient-primary text-primary-foreground">
                            {selectedStudent.fullNameEnglish.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedStudent.fullNameEnglish}</p>
                          <p className="text-sm text-muted-foreground">
                            Roll: {selectedStudent.currentRollNumber} • Semester {selectedStudent.semester}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleGenerateDocument} 
                  className="gradient-primary text-primary-foreground"
                  disabled={!selectedStudent || isGeneratingQuick}
                >
                  {isGeneratingQuick ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Document
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Generator Dialog */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
            <DialogTitle>Advanced Document Generator</DialogTitle>
            <DialogDescription>
              Generate documents with real student data, custom field editing, and real-time preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <DocumentGeneratorComponent
              onDocumentGenerated={handleDocumentGenerated}
              onClose={() => setIsGeneratorOpen(false)}
              preselectedTemplateId={selectedTemplate?.id}
              preselectedStudentId={selectedStudent?.id}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Document Generator Dialog */}
      <Dialog open={isBatchGeneratorOpen} onOpenChange={setIsBatchGeneratorOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Batch Document Generator</DialogTitle>
            <DialogDescription>
              Generate multiple documents efficiently for multiple templates or students
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <BatchDocumentGenerator
              onBatchComplete={handleBatchComplete}
              onClose={() => setIsBatchGeneratorOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Preview Dialog */}
      <Dialog open={isQuickPreviewOpen} onOpenChange={setIsQuickPreviewOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              Document Preview
              {selectedTemplate && selectedStudent && (
                <Badge variant="outline" className="ml-2">
                  {selectedTemplate.name} - {selectedStudent.fullNameEnglish}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Preview your generated document. You can download as PDF or print directly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {quickGeneratedDocument ? (
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Ready for Download</Badge>
                    <span className="text-sm text-muted-foreground">
                      Generated on {new Date(quickGeneratedDocument.generatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (quickGeneratedDocument?.htmlContent) {
                          try {
                            const printContent = PDFExportService.preparePrintView(quickGeneratedDocument.htmlContent);
                            const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
                            if (printWindow) {
                              printWindow.document.write(printContent);
                              printWindow.document.close();
                              
                              // Wait for content to load before printing
                              printWindow.onload = () => {
                                setTimeout(() => {
                                  printWindow.print();
                                }, 1000);
                              };
                              
                              // Fallback if onload doesn't fire
                              setTimeout(() => {
                                if (printWindow.document.readyState === 'complete') {
                                  printWindow.print();
                                }
                              }, 1500);
                            }
                          } catch (error) {
                            const errorMsg = getErrorMessage(error);
                            toast({
                              title: 'Error',
                              description: `Failed to open print dialog: ${errorMsg}`,
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!quickGeneratedDocument || !selectedStudent || !selectedTemplate) {
                          toast({
                            title: 'Error',
                            description: 'Missing document data for PDF generation',
                            variant: 'destructive',
                          });
                          return;
                        }

                        try {
                          setLoading(true);
                          await DocumentGenerator.downloadDocumentPDF(
                            quickGeneratedDocument.id,
                            selectedStudent.fullNameEnglish,
                            selectedTemplate.name
                          );
                          toast({
                            title: 'Success',
                            description: 'PDF downloaded successfully',
                          });
                        } catch (error) {
                          const errorMsg = getErrorMessage(error);
                          toast({
                            title: 'Error',
                            description: `Failed to download PDF: ${errorMsg}`,
                            variant: 'destructive',
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="gradient-primary text-primary-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* Document Preview */}
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                  <div className="p-4 bg-muted/30 dark:bg-muted/50 border-b">
                    <h3 className="font-medium text-foreground">Document Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      This is how your document will appear when printed or downloaded
                    </p>
                  </div>
                  <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                    <div 
                      className="document-preview prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: quickGeneratedDocument.htmlContent }}
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: '1.6',
                        color: '#000',
                        backgroundColor: '#fff',
                        padding: '20px',
                        minHeight: '400px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No Document Generated</h3>
                <p className="text-muted-foreground">
                  Please generate a document first to see the preview.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 flex-shrink-0 border-t">
            <Button variant="outline" onClick={() => setIsQuickPreviewOpen(false)}>
              Close Preview
            </Button>
            {quickGeneratedDocument && (
              <Button
                onClick={() => {
                  // Add to generated documents list
                  setGeneratedDocuments(prev => [...prev, quickGeneratedDocument]);
                  setIsQuickPreviewOpen(false);
                  setQuickGeneratedDocument(null);
                  toast({
                    title: "Document Saved",
                    description: "Document has been added to your generated documents list.",
                  });
                }}
                className="gradient-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save to Generated Documents
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
