/**
 * Document Generator Service
 * Manages document generation workflow and operations
 */

import { 
  DocumentStudentData, 
  GeneratedDocument, 
  GenerationRequest, 
  BatchGenerationRequest, 
  BatchResult, 
  DocumentPreview 
} from '@/types/template';
import { TemplateService } from './templateService';
import { DocumentStudentService } from './documentStudentService';
import { TemplateEngine } from '@/utils/templateEngine';
import { PDFExportService } from './pdfExportService';

export class DocumentGenerator {
  private static generatedDocuments: Map<string, GeneratedDocument> = new Map();

  /**
   * Generate a single document
   */
  static async generateDocument(request: GenerationRequest): Promise<GeneratedDocument> {
    try {
      // Validate generation request first
      const requestValidation = this.validateGenerationRequest(request);
      if (!requestValidation.isValid) {
        throw new Error(`Invalid generation request: ${requestValidation.errors.join(', ')}`);
      }

      // Get template
      const template = await TemplateService.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Template not found: ${request.templateId}`);
      }

      // Validate template content
      const templateValidation = TemplateEngine.validateTemplate(template.htmlContent);
      if (!templateValidation.isValid) {
        throw new Error(`Invalid template: ${templateValidation.errors.join(', ')}`);
      }

      // Get student data
      const studentData = await DocumentStudentService.getStudentForDocument(request.studentId);
      
      // Merge with custom data if provided
      const mergedData = request.customData 
        ? { ...studentData, ...request.customData }
        : studentData;

      // Format data for document type
      const formattedData = DocumentStudentService.formatForDocumentType(
        mergedData, 
        template.category
      );

      // Validate student data
      const validation = DocumentStudentService.validateStudentData(formattedData);
      if (!validation.isValid) {
        console.warn('Student data validation warnings:', validation.missingFields);
        // Continue with generation but log warnings
      }

      // Generate HTML content
      const htmlContent = TemplateEngine.populateTemplate(template.htmlContent, formattedData);

      // Validate that content was properly populated
      if (!htmlContent || htmlContent.trim() === '') {
        throw new Error('Failed to populate template - generated content is empty');
      }

      // Create generated document
      const generatedDocument: GeneratedDocument = {
        id: this.generateDocumentId(),
        templateId: request.templateId,
        studentId: request.studentId,
        htmlContent,
        generatedAt: new Date(),
        customData: request.customData,
        status: 'final'
      };

      // Store generated document
      this.generatedDocuments.set(generatedDocument.id, generatedDocument);

      return generatedDocument;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Document generation failed:', error);
      throw new Error(`Document generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate document preview
   */
  static async previewDocument(templateId: string, studentData: DocumentStudentData): Promise<DocumentPreview> {
    try {
      // Get template
      const template = await TemplateService.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Format data for document type
      const formattedData = DocumentStudentService.formatForDocumentType(
        studentData, 
        template.category
      );

      // Generate preview
      return TemplateEngine.generatePreview(template.htmlContent, formattedData);

    } catch (error) {
      throw new Error(`Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch generate documents
   */
  static async batchGenerate(request: BatchGenerationRequest): Promise<BatchResult> {
    const successful: GeneratedDocument[] = [];
    const failed: { templateId: string; error: string }[] = [];

    // Get student data once
    let studentData: DocumentStudentData;
    try {
      studentData = await DocumentStudentService.getStudentForDocument(request.studentId);
      
      // Merge with custom data if provided
      if (request.customData) {
        studentData = { ...studentData, ...request.customData };
      }
    } catch (error) {
      // If we can't get student data, all generations will fail
      const errorMessage = `Failed to fetch student data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const allFailed = request.templateIds.map(templateId => ({
        templateId,
        error: errorMessage
      }));

      return {
        successful: [],
        failed: allFailed,
        summary: {
          total: request.templateIds.length,
          successful: 0,
          failed: request.templateIds.length
        }
      };
    }

    // Process each template
    for (const templateId of request.templateIds) {
      try {
        const generationRequest: GenerationRequest = {
          templateId,
          studentId: request.studentId,
          customData: request.customData,
          outputFormat: request.outputFormat
        };

        const document = await this.generateDocument(generationRequest);
        successful.push(document);

      } catch (error) {
        failed.push({
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: request.templateIds.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  /**
   * Get generated document by ID
   */
  static getGeneratedDocument(documentId: string): GeneratedDocument | null {
    return this.generatedDocuments.get(documentId) || null;
  }

  /**
   * Get all generated documents for a student
   */
  static getStudentDocuments(studentId: string): GeneratedDocument[] {
    return Array.from(this.generatedDocuments.values())
      .filter(doc => doc.studentId === studentId);
  }

  /**
   * Update generated document
   */
  static updateGeneratedDocument(
    documentId: string, 
    updates: Partial<GeneratedDocument>
  ): GeneratedDocument | null {
    const document = this.generatedDocuments.get(documentId);
    if (!document) return null;

    const updatedDocument = { ...document, ...updates };
    this.generatedDocuments.set(documentId, updatedDocument);
    return updatedDocument;
  }

  /**
   * Delete generated document
   */
  static deleteGeneratedDocument(documentId: string): boolean {
    return this.generatedDocuments.delete(documentId);
  }

  /**
   * Regenerate document with updated data
   */
  static async regenerateDocument(
    documentId: string, 
    customData?: Partial<DocumentStudentData>
  ): Promise<GeneratedDocument> {
    const existingDocument = this.generatedDocuments.get(documentId);
    if (!existingDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const request: GenerationRequest = {
      templateId: existingDocument.templateId,
      studentId: existingDocument.studentId,
      customData: customData || existingDocument.customData,
      outputFormat: 'html'
    };

    const newDocument = await this.generateDocument(request);
    
    // Replace the old document
    this.generatedDocuments.delete(documentId);
    this.generatedDocuments.set(newDocument.id, newDocument);

    return newDocument;
  }

  /**
   * Validate generation request
   */
  static validateGenerationRequest(request: GenerationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.templateId) {
      errors.push('Template ID is required');
    }

    if (!request.studentId) {
      errors.push('Student ID is required');
    }

    if (!['html', 'pdf'].includes(request.outputFormat)) {
      errors.push('Output format must be either "html" or "pdf"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get generation statistics
   */
  static getGenerationStats(): {
    totalGenerated: number;
    byTemplate: Record<string, number>;
    byStudent: Record<string, number>;
    recentGenerations: GeneratedDocument[];
  } {
    const documents = Array.from(this.generatedDocuments.values());
    
    const byTemplate: Record<string, number> = {};
    const byStudent: Record<string, number> = {};

    documents.forEach(doc => {
      byTemplate[doc.templateId] = (byTemplate[doc.templateId] || 0) + 1;
      byStudent[doc.studentId] = (byStudent[doc.studentId] || 0) + 1;
    });

    const recentGenerations = documents
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, 10);

    return {
      totalGenerated: documents.length,
      byTemplate,
      byStudent,
      recentGenerations
    };
  }

  /**
   * Clear all generated documents (for cleanup)
   */
  static clearGeneratedDocuments(): void {
    this.generatedDocuments.clear();
  }

  /**
   * Generate unique document ID
   */
  private static generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate generation time based on template complexity
   */
  static estimateGenerationTime(templateContent: string): number {
    // Simple estimation based on content length and complexity
    const baseTime = 500; // 500ms base time
    const contentFactor = Math.min(templateContent.length / 1000, 5); // Max 5x multiplier
    const complexityFactor = (templateContent.match(/\{\{|\[|\<span/g) || []).length / 10;
    
    return Math.round(baseTime + (contentFactor * 200) + (complexityFactor * 100));
  }

  /**
   * Check if template and student are compatible
   */
  static async checkCompatibility(templateId: string, studentId: string): Promise<{
    compatible: boolean;
    missingFields: string[];
    warnings: string[];
  }> {
    try {
      const template = await TemplateService.getTemplate(templateId);
      const studentData = await DocumentStudentService.getStudentForDocument(studentId);

      if (!template || !studentData) {
        return {
          compatible: false,
          missingFields: [],
          warnings: ['Template or student data not found']
        };
      }

      const preview = TemplateEngine.generatePreview(template.htmlContent, studentData);
      const validation = DocumentStudentService.validateStudentData(studentData);

      return {
        compatible: validation.isValid && preview.missingFields.length === 0,
        missingFields: [...validation.missingFields, ...preview.missingFields],
        warnings: validation.warnings
      };

    } catch (error) {
      return {
        compatible: false,
        missingFields: [],
        warnings: [`Compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Generate PDF from document
   */
  static async generatePDF(documentId: string, studentName?: string, documentType?: string): Promise<Blob> {
    try {
      const document = this.generatedDocuments.get(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Get student and template info for filename
      let finalStudentName = studentName;
      let finalDocumentType = documentType;

      if (!finalStudentName || !finalDocumentType) {
        try {
          const studentData = await DocumentStudentService.getStudentForDocument(document.studentId);
          const template = await TemplateService.getTemplate(document.templateId);
          
          finalStudentName = finalStudentName || studentData.name;
          finalDocumentType = finalDocumentType || template?.name || 'document';
        } catch (error) {
          // Use fallback values if data retrieval fails
          finalStudentName = finalStudentName || 'student';
          finalDocumentType = finalDocumentType || 'document';
        }
      }

      // Get PDF options based on document type
      const pdfOptions = PDFExportService.getDocumentTypeOptions(finalDocumentType);

      // Generate PDF
      const pdfBlob = await PDFExportService.generatePDF(document.htmlContent, pdfOptions);
      
      return pdfBlob;

    } catch (error) {
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download document as PDF
   */
  static async downloadDocumentPDF(documentId: string, studentName?: string, documentType?: string): Promise<void> {
    try {
      const pdfBlob = await this.generatePDF(documentId, studentName, documentType);
      
      // Generate filename
      const document = this.generatedDocuments.get(documentId);
      let finalStudentName = studentName;
      let finalDocumentType = documentType;

      if (!finalStudentName || !finalDocumentType) {
        try {
          const studentData = await DocumentStudentService.getStudentForDocument(document!.studentId);
          const template = await TemplateService.getTemplate(document!.templateId);
          
          finalStudentName = finalStudentName || studentData.name;
          finalDocumentType = finalDocumentType || template?.name || 'document';
        } catch (error) {
          finalStudentName = finalStudentName || 'student';
          finalDocumentType = finalDocumentType || 'document';
        }
      }

      const filename = PDFExportService.generateFilename(finalStudentName, finalDocumentType);
      
      // Download file
      PDFExportService.downloadFile(pdfBlob, filename);

    } catch (error) {
      throw new Error(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare document for printing
   */
  static preparePrintDocument(documentId: string): string {
    const document = this.generatedDocuments.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return PDFExportService.preparePrintView(document.htmlContent);
  }

  /**
   * Enhanced batch generation with progress tracking
   */
  static async batchGenerateWithProgress(
    request: BatchGenerationRequest,
    onProgress?: (progress: { completed: number; total: number; current?: string }) => void
  ): Promise<BatchResult> {
    const successful: GeneratedDocument[] = [];
    const failed: { templateId: string; error: string }[] = [];
    const total = request.templateIds.length;

    // Get student data once with error handling
    let studentData: DocumentStudentData;
    try {
      studentData = await DocumentStudentService.getStudentForDocument(request.studentId, {
        maxRetries: 3,
        fallbackToCache: true,
        useDefaults: true
      });
      
      // Merge with custom data if provided
      if (request.customData) {
        studentData = { ...studentData, ...request.customData };
      }
    } catch (error) {
      // If we can't get student data, all generations will fail
      const errorMessage = `Failed to fetch student data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const allFailed = request.templateIds.map(templateId => ({
        templateId,
        error: errorMessage
      }));

      return {
        successful: [],
        failed: allFailed,
        summary: {
          total: request.templateIds.length,
          successful: 0,
          failed: request.templateIds.length
        }
      };
    }

    // Process each template with progress reporting
    for (let i = 0; i < request.templateIds.length; i++) {
      const templateId = request.templateIds[i];
      
      try {
        // Report progress
        onProgress?.({ 
          completed: i, 
          total, 
          current: `Generating document ${i + 1} of ${total}` 
        });

        const generationRequest: GenerationRequest = {
          templateId,
          studentId: request.studentId,
          customData: request.customData,
          outputFormat: request.outputFormat
        };

        const document = await this.generateDocument(generationRequest);
        successful.push(document);

      } catch (error) {
        failed.push({
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay to prevent overwhelming the system
      if (i < request.templateIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final progress update
    onProgress?.({ completed: total, total });

    return {
      successful,
      failed,
      summary: {
        total: request.templateIds.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  /**
   * Batch download documents as individual PDFs
   */
  static async batchDownloadPDF(
    documentIds: string[],
    onProgress?: (progress: { completed: number; total: number; current?: string }) => void
  ): Promise<{ successful: number; failed: Array<{ documentId: string; error: string }> }> {
    const failed: Array<{ documentId: string; error: string }> = [];
    let successful = 0;

    for (let i = 0; i < documentIds.length; i++) {
      const documentId = documentIds[i];
      
      try {
        onProgress?.({ 
          completed: i, 
          total: documentIds.length, 
          current: `Downloading document ${i + 1} of ${documentIds.length}` 
        });

        await this.downloadDocumentPDF(documentId);
        successful++;
        
        // Add delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error) {
        failed.push({
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    onProgress?.({ completed: documentIds.length, total: documentIds.length });

    return { successful, failed };
  }

  /**
   * Create ZIP archive of multiple documents (requires JSZip)
   */
  static async createDocumentZip(
    documentIds: string[],
    zipName?: string
  ): Promise<Blob> {
    // This would require JSZip library to be installed
    // For now, throw an error indicating the feature needs implementation
    throw new Error('ZIP archive creation requires JSZip library. Please use individual downloads for now.');
    
    /* Implementation would look like this with JSZip:
    
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    for (const documentId of documentIds) {
      try {
        const document = this.getGeneratedDocument(documentId);
        if (document) {
          const pdfBlob = await this.generatePDF(documentId);
          const filename = `${document.templateId}_${document.studentId}.pdf`;
          zip.file(filename, pdfBlob);
        }
      } catch (error) {
        console.error(`Failed to add document ${documentId} to ZIP:`, error);
      }
    }
    
    return await zip.generateAsync({ type: 'blob' });
    */
  }

  /**
   * Batch generate documents for multiple students
   */
  static async batchGenerateForStudents(
    templateId: string,
    studentIds: string[],
    customDataMap?: Record<string, Partial<DocumentStudentData>>,
    onProgress?: (progress: { completed: number; total: number; current?: string }) => void
  ): Promise<{
    successful: GeneratedDocument[];
    failed: Array<{ studentId: string; error: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    const successful: GeneratedDocument[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      
      try {
        onProgress?.({ 
          completed: i, 
          total: studentIds.length, 
          current: `Generating for student ${i + 1} of ${studentIds.length}` 
        });

        const customData = customDataMap?.[studentId];
        const generationRequest: GenerationRequest = {
          templateId,
          studentId,
          customData,
          outputFormat: 'html'
        };

        const document = await this.generateDocument(generationRequest);
        successful.push(document);

      } catch (error) {
        failed.push({
          studentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay between generations
      if (i < studentIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    onProgress?.({ completed: studentIds.length, total: studentIds.length });

    return {
      successful,
      failed,
      summary: {
        total: studentIds.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  /**
   * Get batch generation statistics
   */
  static getBatchStats(): {
    totalBatches: number;
    averageBatchSize: number;
    successRate: number;
    commonFailureReasons: Array<{ reason: string; count: number }>;
  } {
    // This would require tracking batch operations
    // For now, return placeholder data
    return {
      totalBatches: 0,
      averageBatchSize: 0,
      successRate: 100,
      commonFailureReasons: []
    };
  }

  /**
   * Validate batch generation request
   */
  static validateBatchRequest(request: BatchGenerationRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.studentId) {
      errors.push('Student ID is required for batch generation');
    }

    if (!request.templateIds || request.templateIds.length === 0) {
      errors.push('At least one template ID is required');
    }

    if (request.templateIds && request.templateIds.length > 10) {
      warnings.push('Large batch size may take significant time to process');
    }

    // Check for duplicate template IDs
    if (request.templateIds) {
      const uniqueIds = new Set(request.templateIds);
      if (uniqueIds.size !== request.templateIds.length) {
        warnings.push('Duplicate template IDs detected in batch request');
      }
    }

    if (!['html', 'pdf'].includes(request.outputFormat)) {
      errors.push('Output format must be either "html" or "pdf"');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate document generation workflow
   */
  static async validateWorkflow(templateId: string, studentId: string, customData?: Partial<DocumentStudentData>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check template exists and is valid
      const template = await TemplateService.getTemplate(templateId);
      if (!template) {
        errors.push('Template not found');
        return { isValid: false, errors, warnings };
      }

      const templateValidation = TemplateEngine.validateTemplate(template.htmlContent);
      if (!templateValidation.isValid) {
        errors.push(...templateValidation.errors);
      }
      warnings.push(...templateValidation.warnings);

      // Check student data
      const studentData = await DocumentStudentService.getStudentForDocument(studentId);
      const mergedData = customData ? { ...studentData, ...customData } : studentData;
      
      const dataValidation = DocumentStudentService.validateStudentData(mergedData);
      if (!dataValidation.isValid) {
        errors.push(...dataValidation.missingFields.map(field => `Missing required field: ${field}`));
      }
      warnings.push(...dataValidation.warnings);

      // Check compatibility
      const compatibility = await this.checkCompatibility(templateId, studentId);
      if (!compatibility.compatible) {
        warnings.push(...compatibility.warnings);
        if (compatibility.missingFields.length > 0) {
          warnings.push(`Template has unmapped fields: ${compatibility.missingFields.join(', ')}`);
        }
      }

      // Check PDF generation compatibility
      const pdfCompatibility = PDFExportService.checkBrowserCompatibility();
      if (!pdfCompatibility.compatible) {
        warnings.push(`PDF generation may not work: ${pdfCompatibility.issues.join(', ')}`);
      }

    } catch (error) {
      errors.push(`Workflow validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}