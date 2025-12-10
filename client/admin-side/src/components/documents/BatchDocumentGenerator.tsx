/**
 * Batch Document Generator Component
 * Handles batch generation of documents for multiple templates or students
 */

import React, { useState, useEffect } from 'react';
import { DocumentTemplate, BatchGenerationRequest, GeneratedDocument } from '@/types/template';
import { DocumentGenerator as DocumentGeneratorService } from '@/services/documentGenerator';
import { DocumentStudentService, StudentSearchResult } from '@/services/documentStudentService';
import { TemplateService } from '@/services/templateService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  FileText, 
  Users, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BatchDocumentGeneratorProps {
  onBatchComplete?: (results: { successful: GeneratedDocument[]; failed: any[] }) => void;
  onClose?: () => void;
  className?: string;
}

type BatchMode = 'multiple-templates' | 'multiple-students';

interface BatchProgress {
  completed: number;
  total: number;
  current?: string;
  isRunning: boolean;
}

export const BatchDocumentGenerator: React.FC<BatchDocumentGeneratorProps> = ({
  onBatchComplete,
  onClose,
  className = ''
}) => {
  // State
  const [batchMode, setBatchMode] = useState<BatchMode>('multiple-templates');
  const [selectedTemplates, setSelectedTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [progress, setProgress] = useState<BatchProgress>({ completed: 0, total: 0, isRunning: false });
  const [results, setResults] = useState<{ successful: GeneratedDocument[]; failed: any[] } | null>(null);
  
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

  // Search students
  const searchStudents = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }

    try {
      setStudentSearchLoading(true);
      const results = await DocumentStudentService.searchStudentsForDocumentsWithRecovery(query, {
        limit: 50,
        status: 'active'
      });
      setStudentSearchResults(results);
    } catch (err) {
      console.error('Student search error:', err);
      toast({
        title: 'Search Error',
        description: 'Failed to search students',
        variant: 'destructive'
      });
      setStudentSearchResults([]);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // Handle template selection
  const handleTemplateToggle = (template: DocumentTemplate) => {
    setSelectedTemplates(prev => {
      const isSelected = prev.some(t => t.id === template.id);
      if (isSelected) {
        return prev.filter(t => t.id !== template.id);
      } else {
        return [...prev, template];
      }
    });
  };

  // Handle student selection
  const handleStudentToggle = (student: StudentSearchResult) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // Start batch generation
  const startBatchGeneration = async () => {
    if (batchMode === 'multiple-templates' && (!selectedStudent || selectedTemplates.length === 0)) {
      toast({
        title: 'Selection Required',
        description: 'Please select a student and at least one template',
        variant: 'destructive'
      });
      return;
    }

    if (batchMode === 'multiple-students' && (!selectedTemplate || selectedStudents.length === 0)) {
      toast({
        title: 'Selection Required',
        description: 'Please select a template and at least one student',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults(null);
      setProgress({ completed: 0, total: 0, isRunning: true });

      let batchResults;

      if (batchMode === 'multiple-templates') {
        // Generate multiple templates for one student
        const request: BatchGenerationRequest = {
          studentId: selectedStudent!.id,
          templateIds: selectedTemplates.map(t => t.id),
          outputFormat: 'html'
        };

        // Validate request
        const validation = DocumentGeneratorService.validateBatchRequest(request);
        if (!validation.isValid) {
          throw new Error(`Batch validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          console.warn('Batch warnings:', validation.warnings);
        }

        batchResults = await DocumentGeneratorService.batchGenerateWithProgress(
          request,
          (progressUpdate) => {
            setProgress(prev => ({ ...prev, ...progressUpdate }));
          }
        );

        setResults({
          successful: batchResults.successful,
          failed: batchResults.failed
        });

      } else {
        // Generate one template for multiple students
        batchResults = await DocumentGeneratorService.batchGenerateForStudents(
          selectedTemplate!.id,
          selectedStudents.map(s => s.id),
          undefined, // No custom data map for now
          (progressUpdate) => {
            setProgress(prev => ({ ...prev, ...progressUpdate }));
          }
        );

        setResults({
          successful: batchResults.successful,
          failed: batchResults.failed
        });
      }

      setProgress(prev => ({ ...prev, isRunning: false }));

      toast({
        title: 'Batch Generation Complete',
        description: `Generated ${batchResults.successful.length} documents successfully${batchResults.failed.length > 0 ? `, ${batchResults.failed.length} failed` : ''}`,
      });

      onBatchComplete?.(batchResults);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch generation failed';
      setError(errorMessage);
      setProgress(prev => ({ ...prev, isRunning: false }));
      
      toast({
        title: 'Batch Generation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Download all generated documents
  const downloadAllDocuments = async () => {
    if (!results || results.successful.length === 0) return;

    try {
      setLoading(true);
      
      const downloadResults = await DocumentGeneratorService.batchDownloadPDF(
        results.successful.map(doc => doc.id),
        (progressUpdate) => {
          setProgress(prev => ({ ...prev, ...progressUpdate }));
        }
      );

      toast({
        title: 'Download Complete',
        description: `Downloaded ${downloadResults.successful} documents${downloadResults.failed.length > 0 ? `, ${downloadResults.failed.length} failed` : ''}`,
      });

    } catch (err) {
      toast({
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Failed to download documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset batch generator
  const resetBatch = () => {
    setSelectedTemplates([]);
    setSelectedStudents([]);
    setSelectedStudent(null);
    setSelectedTemplate(null);
    setResults(null);
    setProgress({ completed: 0, total: 0, isRunning: false });
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Document Generator</h2>
          <p className="text-muted-foreground">Generate multiple documents efficiently</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetBatch}>
            Reset
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Batch Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={batchMode} onValueChange={(value) => setBatchMode(value as BatchMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="multiple-templates">
                <FileText className="w-4 h-4 mr-2" />
                Multiple Templates
              </TabsTrigger>
              <TabsTrigger value="multiple-students">
                <Users className="w-4 h-4 mr-2" />
                Multiple Students
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {progress.isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {progress.current || 'Processing...'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <Progress 
                value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} 
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Configuration */}
      <Tabs value={batchMode} className="space-y-6">
        {/* Multiple Templates Mode */}
        <TabsContent value="multiple-templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Selection */}
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

                {selectedStudent && (
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedStudent.avatar} />
                        <AvatarFallback>
                          {selectedStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{selectedStudent.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Roll: {selectedStudent.rollNumber} • {selectedStudent.department}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {studentSearchLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Searching...</span>
                  </div>
                )}

                {studentSearchResults.length > 0 && !selectedStudent && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {studentSearchResults.map((student) => (
                      <Card 
                        key={student.id}
                        className="cursor-pointer transition-all hover:bg-muted/50"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback>
                              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.rollNumber} • {student.department}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Select Templates ({selectedTemplates.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedTemplates.some(t => t.id === template.id)}
                        onCheckedChange={() => handleTemplateToggle(template)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <Badge variant="outline" className="mt-1">{template.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Multiple Students Mode */}
        <TabsContent value="multiple-students" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template)}
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

            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Select Students ({selectedStudents.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students to add..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Selected Students */}
                {selectedStudents.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <Label className="text-sm font-medium">Selected Students:</Label>
                    {selectedStudents.map((student) => (
                      <div key={student.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="text-xs">
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">{student.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStudentToggle(student)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search Results */}
                {studentSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <Label className="text-sm font-medium">Search Results:</Label>
                    {studentSearchResults.map((student) => (
                      <div 
                        key={student.id}
                        className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedStudents.some(s => s.id === student.id)}
                          onCheckedChange={() => handleStudentToggle(student)}
                        />
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="text-xs">
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.rollNumber} • {student.department}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {batchMode === 'multiple-templates' 
            ? `${selectedTemplates.length} templates selected for ${selectedStudent?.name || 'no student'}`
            : `${selectedStudents.length} students selected for ${selectedTemplate?.name || 'no template'}`
          }
        </div>
        
        <div className="flex items-center gap-2">
          {results && (
            <Button variant="outline" onClick={downloadAllDocuments} disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              Download All PDFs
            </Button>
          )}
          
          <Button 
            onClick={startBatchGeneration} 
            disabled={loading || progress.isRunning}
          >
            {loading || progress.isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Start Batch Generation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Batch Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">
                  Successful ({results.successful.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.successful.map((doc) => (
                    <div key={doc.id} className="text-sm p-2 bg-green-50 rounded">
                      Document {doc.id.slice(-8)}
                    </div>
                  ))}
                </div>
              </div>
              
              {results.failed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">
                    Failed ({results.failed.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {results.failed.map((failure, index) => (
                      <div key={index} className="text-sm p-2 bg-red-50 rounded">
                        <div className="font-medium">
                          {failure.templateId || failure.studentId}
                        </div>
                        <div className="text-red-600">{failure.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchDocumentGenerator;