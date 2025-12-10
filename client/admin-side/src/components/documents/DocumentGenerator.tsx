/**
 * Document Generator Component
 * Main component for document generation workflow
 */

import React, { useState, useEffect } from 'react';
import { DocumentStudentData, DocumentTemplate, GeneratedDocument, DocumentPreview } from '@/types/template';
import { DocumentGenerator as DocumentGeneratorService } from '@/services/documentGenerator';
import { DocumentStudentService, StudentSearchResult } from '@/services/documentStudentService';
import { TemplateService } from '@/services/templateService';
import { PDFExportService } from '@/services/pdfExportService';
import TemplateEngineComponent from '@/components/templates/TemplateEngine';
import TemplatePreview from '@/components/templates/TemplatePreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  FileText, 
  User, 
  Download, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentGeneratorProps {
  onDocumentGenerated?: (document: GeneratedDocument) => void;
  onClose?: () => void;
  preselectedTemplateId?: string;
  preselectedStudentId?: string;
  className?: string;
}

export const DocumentGeneratorComponent: React.FC<DocumentGeneratorProps> = ({
  onDocumentGenerated,
  onClose,
  preselectedTemplateId,
  preselectedStudentId,
  className = ''
}) => {
  // State
  const [currentStep, setCurrentStep] = useState<'template' | 'student' | 'customize' | 'generate'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [studentData, setStudentData] = useState<DocumentStudentData | null>(null);
  const [customData, setCustomData] = useState<Partial<DocumentStudentData>>({});
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  
  // Data
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Handle preselected values
  useEffect(() => {
    if (preselectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === preselectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        setCurrentStep('student');
      }
    }
  }, [preselectedTemplateId, templates]);

  useEffect(() => {
    if (preselectedStudentId) {
      loadPreselectedStudent(preselectedStudentId);
    }
  }, [preselectedStudentId]);

  // Load templates
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const loadedTemplates = await TemplateService.getTemplates();
      setTemplates(loadedTemplates);
    } catch (err) {
      setError('Failed to load templates');
      toast({
        title: 'Error',
        description: 'Failed to load document templates',
        variant: 'destructive'
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Load preselected student with enhanced handling
  const loadPreselectedStudent = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await DocumentStudentService.getStudentForDocument(studentId);
      
      // Validate and sanitize the data
      const validation = DocumentStudentService.validateStudentData(data);
      const sanitizedData = DocumentStudentService.sanitizeStudentData(data);
      
      if (!validation.isValid) {
        console.warn('Preselected student data validation issues:', validation.missingFields);
        toast({
          title: 'Student Data Issues',
          description: `Some required fields are missing for ${data.name}. You may need to edit them manually.`,
          variant: 'default'
        });
      }
      
      setStudentData(sanitizedData);
      setSelectedStudent({
        id: sanitizedData.id,
        name: sanitizedData.name,
        rollNumber: sanitizedData.rollNumber,
        department: sanitizedData.department,
        semester: sanitizedData.semester,
        session: sanitizedData.session,
        status: sanitizedData.currentStatus
      });
      setCurrentStep('customize');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load student data';
      setError(errorMessage);
      console.error('Preselected student loading error:', err);
      
      toast({
        title: 'Error',
        description: `Failed to load student data: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Search students with enhanced filtering and error recovery
  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setStudentSearchResults([]);
      return;
    }

    if (query.trim().length < 2) {
      toast({
        title: 'Search Query Too Short',
        description: 'Please enter at least 2 characters to search',
        variant: 'default'
      });
      return;
    }

    try {
      setStudentSearchLoading(true);
      
      // Use enhanced search with error recovery
      const results = await DocumentStudentService.searchStudentsForDocumentsWithRecovery(query, {
        limit: 20, // Limit results for better performance
        status: 'active' // Only show active students by default
      }, {
        maxRetries: 2,
        retryDelay: 500
      });
      
      setStudentSearchResults(results);
      
      if (results.length === 0 && query.trim().length >= 2) {
        toast({
          title: 'No Results',
          description: 'No students found matching your search criteria',
          variant: 'default'
        });
      }
      
    } catch (err) {
      console.error('Student search error:', err);
      
      // Check service health for better error messaging
      const serviceHealth = DocumentStudentService.getServiceHealth();
      let description = 'Failed to search students';
      
      if (!serviceHealth.isHealthy) {
        description = 'Search service is experiencing issues. Please try again later.';
      }
      
      toast({
        title: 'Search Error',
        description,
        variant: 'destructive'
      });
      
      setStudentSearchResults([]); // Clear results on error
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // Handle student selection with enhanced error handling
  const handleStudentSelect = async (student: StudentSearchResult) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedStudent(student);
      
      // Use enhanced error recovery options
      const data = await DocumentStudentService.getStudentForDocument(student.id, {
        maxRetries: 3,
        retryDelay: 1000,
        fallbackToCache: true,
        useDefaults: true
      });
      
      // Validate and repair the student data
      const repairResult = DocumentStudentService.validateAndRepairStudentData(
        data,
        selectedTemplate?.category
      );

      if (repairResult.repairs.length > 0) {
        console.log('Applied data repairs:', repairResult.repairs);
        toast({
          title: 'Data Repaired',
          description: `Applied ${repairResult.repairs.length} automatic fixes to student data`,
          variant: 'default'
        });
      }

      if (!repairResult.validation.isValid) {
        console.warn('Student data validation issues:', repairResult.validation.missingFields);
        toast({
          title: 'Data Incomplete',
          description: `Some required fields are missing: ${repairResult.validation.missingFields.slice(0, 3).join(', ')}${repairResult.validation.missingFields.length > 3 ? '...' : ''}`,
          variant: 'default'
        });
      }

      if (repairResult.validation.warnings.length > 0) {
        console.warn('Student data warnings:', repairResult.validation.warnings);
      }

      // Use the repaired and sanitized data
      const finalData = DocumentStudentService.sanitizeStudentData(repairResult.repaired);
      setStudentData(finalData);
      setCurrentStep('customize');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load student data';
      setError(errorMessage);
      console.error('Student selection error:', err);
      
      // Check service health and provide appropriate feedback
      const serviceHealth = DocumentStudentService.getServiceHealth();
      let description = errorMessage;
      
      if (!serviceHealth.isHealthy) {
        description = 'Service is experiencing issues. Please try again later or contact support.';
      }
      
      toast({
        title: 'Error',
        description,
        variant: 'destructive'
      });
      
      // Reset selection on error
      setSelectedStudent(null);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  // Generate document
  const handleGenerate = async () => {
    if (!selectedTemplate || !studentData) {
      setError('Template and student data are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate the complete workflow
      const workflowValidation = await DocumentGeneratorService.validateWorkflow(
        selectedTemplate.id,
        studentData.id,
        Object.keys(customData).length > 0 ? customData : undefined
      );
      
      if (!workflowValidation.isValid) {
        throw new Error(`Validation failed: ${workflowValidation.errors.join(', ')}`);
      }
      
      if (workflowValidation.warnings.length > 0) {
        console.warn('Workflow validation warnings:', workflowValidation.warnings);
        // Show warnings to user but continue
        toast({
          title: 'Validation Warnings',
          description: `${workflowValidation.warnings.slice(0, 2).join(', ')}${workflowValidation.warnings.length > 2 ? '...' : ''}`,
          variant: 'default'
        });
      }

      const document = await DocumentGeneratorService.generateDocument({
        templateId: selectedTemplate.id,
        studentId: studentData.id,
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        outputFormat: 'html'
      });

      if (!document || !document.htmlContent) {
        throw new Error('Document generation returned empty result');
      }

      setGeneratedDocument(document);
      setCurrentStep('generate');
      onDocumentGenerated?.(document);

      toast({
        title: 'Success',
        description: 'Document generated successfully',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate document';
      setError(errorMessage);
      console.error('Document generation error:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    if (!generatedDocument || !selectedTemplate) {
      toast({
        title: 'Error',
        description: 'No document available for printing',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Prepare print view with only document content
      const printContent = PDFExportService.preparePrintView(generatedDocument.htmlContent);
      
      // Open print dialog in new window with proper sizing
      const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please check your browser popup settings.');
      }

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

      toast({
        title: 'Print Dialog Opened',
        description: 'Document prepared for printing',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare document for printing';
      console.error('Print preparation error:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Handle download PDF
  const handleDownload = async () => {
    if (!generatedDocument || !selectedStudent || !selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Missing document data for PDF generation',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      await DocumentGeneratorService.downloadDocumentPDF(
        generatedDocument.id,
        selectedStudent.name,
        selectedTemplate.name
      );

      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF';
      console.error('PDF download error:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset generator
  const handleReset = () => {
    setCurrentStep('template');
    setSelectedTemplate(null);
    setSelectedStudent(null);
    setStudentData(null);
    setCustomData({});
    setPreview(null);
    setGeneratedDocument(null);
    setError(null);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
  };

  if (templatesLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading templates...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 min-h-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Generator</h2>
          <p className="text-muted-foreground">Generate documents with real student data</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {[
          { key: 'template', label: 'Template', icon: FileText },
          { key: 'student', label: 'Student', icon: User },
          { key: 'customize', label: 'Customize', icon: Settings },
          { key: 'generate', label: 'Generate', icon: Download }
        ].map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = ['template', 'student', 'customize', 'generate'].indexOf(currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isActive ? 'border-primary bg-primary text-primary-foreground' :
                isCompleted ? 'border-green-500 bg-green-500 text-white' :
                'border-border bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-primary' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
              {index < 3 && <div className="w-8 h-px bg-border mx-4" />}
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Tabs value={currentStep} onValueChange={(value) => {
        // Allow navigation to previous steps or next step if prerequisites are met
        const stepOrder = ['template', 'student', 'customize', 'generate'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const targetIndex = stepOrder.indexOf(value as typeof currentStep);
        
        // Allow going back or forward if prerequisites are met
        if (targetIndex <= currentIndex || 
            (value === 'student' && selectedTemplate) ||
            (value === 'customize' && selectedTemplate && studentData) ||
            (value === 'generate' && generatedDocument)) {
          setCurrentStep(value as typeof currentStep);
        }
      }} className="space-y-6">
        {/* Template Selection */}
        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Document Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCurrentStep('student');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Selection */}
        <TabsContent value="student" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    searchStudents(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              {studentSearchLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Searching...</span>
                </div>
              )}

              {studentSearchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {studentSearchResults.map((student) => (
                    <Card 
                      key={student.id}
                      className={`cursor-pointer transition-all hover:bg-muted/50 ${
                        selectedStudent?.id === student.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleStudentSelect(student)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback>
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.rollNumber} • {student.department} • {student.session}
                          </p>
                        </div>
                        <Badge variant="outline">{student.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customize */}
        <TabsContent value="customize" className="space-y-4">
          {selectedTemplate && studentData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <TemplateEngineComponent
                  templateContent={selectedTemplate.htmlContent}
                  studentData={studentData}
                  onPreviewUpdate={setPreview}
                  onCustomDataChange={setCustomData}
                  editable={true}
                />
                
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleGenerate} disabled={loading}>
                    {loading ? (
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
                </div>
              </div>

              <div>
                {preview && (
                  <TemplatePreview
                    templateContent={selectedTemplate.htmlContent}
                    studentData={studentData}
                    customData={customData}
                  />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Generate */}
        <TabsContent value="generate" className="space-y-4">
          {generatedDocument && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Document Generated Successfully
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm overflow-auto"
                  style={{ maxHeight: '70vh' }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: generatedDocument.htmlContent }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: '400px'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentGeneratorComponent;