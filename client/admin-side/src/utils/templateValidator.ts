/**
 * Template Validator Utility
 * Validates document templates for correctness and completeness
 */

import { TemplateValidationResult } from '@/types/template';

export class TemplateValidator {
  /**
   * Validate HTML template structure and content
   */
  static validateTemplate(htmlContent: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    try {
      // Basic HTML validation
      this.validateHTMLStructure(htmlContent, errors, warnings);
      
      // CSS validation
      this.validateCSS(htmlContent, warnings);
      
      // Print compatibility validation
      this.validatePrintCompatibility(htmlContent, warnings);
      
      // Placeholder validation
      this.validatePlaceholders(htmlContent, warnings, missingFields);
      
      // Accessibility validation
      this.validateAccessibility(htmlContent, warnings);

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingFields
    };
  }

  /**
   * Validate HTML structure
   */
  private static validateHTMLStructure(htmlContent: string, errors: string[], warnings: string[]): void {
    // Check for basic HTML structure
    if (!htmlContent.includes('<html') && !htmlContent.includes('<HTML')) {
      warnings.push('Template should include <html> tag for proper document structure');
    }

    if (!htmlContent.includes('<head') && !htmlContent.includes('<HEAD')) {
      warnings.push('Template should include <head> section for metadata and styles');
    }

    if (!htmlContent.includes('<body') && !htmlContent.includes('<BODY')) {
      warnings.push('Template should include <body> tag');
    }

    // Check for document container
    if (!htmlContent.includes('class="page"') && !htmlContent.includes('id="document-area"')) {
      warnings.push('Template should include a main document container with class="page" or id="document-area"');
    }

    // Check for malformed HTML
    const tempDiv = document.createElement('div');
    try {
      tempDiv.innerHTML = htmlContent;
    } catch (error) {
      errors.push('Invalid HTML structure detected');
    }

    // Check for unclosed tags (basic check)
    const openTags = htmlContent.match(/<[^/][^>]*>/g) || [];
    const closeTags = htmlContent.match(/<\/[^>]*>/g) || [];
    
    if (Math.abs(openTags.length - closeTags.length) > 2) { // Allow some tolerance
      warnings.push('Possible unclosed HTML tags detected');
    }
  }

  /**
   * Validate CSS styles
   */
  private static validateCSS(htmlContent: string, warnings: string[]): void {
    // Check for inline styles vs stylesheet
    const inlineStyles = (htmlContent.match(/style="/g) || []).length;
    const hasStylesheet = htmlContent.includes('<style') || htmlContent.includes('<link');
    
    if (inlineStyles > 10 && !hasStylesheet) {
      warnings.push('Consider using a stylesheet instead of many inline styles for better maintainability');
    }

    // Check for print-specific styles
    if (!htmlContent.includes('@media print') && !htmlContent.includes('@page')) {
      warnings.push('Consider adding print-specific CSS styles for better print output');
    }

    // Check for responsive design
    if (!htmlContent.includes('viewport') && !htmlContent.includes('media')) {
      warnings.push('Consider adding viewport meta tag and responsive styles');
    }
  }

  /**
   * Validate print compatibility
   */
  private static validatePrintCompatibility(htmlContent: string, warnings: string[]): void {
    // Check for A4 page size
    if (!htmlContent.includes('210mm') && !htmlContent.includes('A4')) {
      warnings.push('Template should specify A4 page dimensions (210mm x 297mm) for consistent printing');
    }

    // Check for print margins
    if (!htmlContent.includes('margin') && !htmlContent.includes('padding')) {
      warnings.push('Template should include appropriate margins for printing');
    }

    // Check for page breaks
    if (htmlContent.length > 5000 && !htmlContent.includes('page-break')) {
      warnings.push('Long templates should include page-break CSS for multi-page documents');
    }

    // Check for print-hidden elements
    if (htmlContent.includes('button') || htmlContent.includes('input')) {
      if (!htmlContent.includes('display: none') && !htmlContent.includes('@media print')) {
        warnings.push('Interactive elements should be hidden in print mode');
      }
    }
  }

  /**
   * Validate placeholders
   */
  private static validatePlaceholders(htmlContent: string, warnings: string[], missingFields: string[]): void {
    // Extract placeholders
    const placeholderPatterns = [
      /\{\{([^}]+)\}\}/g,
      /\[([^\]]+)\]/g,
      /<span[^>]*class="editable"[^>]*>([^<]*)<\/span>/g
    ];

    const foundPlaceholders = new Set<string>();
    
    placeholderPatterns.forEach(pattern => {
      const matches = htmlContent.matchAll(pattern);
      for (const match of matches) {
        foundPlaceholders.add(match[1].trim());
      }
    });

    // Check for common required fields
    const requiredFields = ['Student Name', 'Roll No', 'Department'];
    const missingRequired = requiredFields.filter(field => 
      !Array.from(foundPlaceholders).some(placeholder => 
        placeholder.toLowerCase().includes(field.toLowerCase())
      )
    );

    if (missingRequired.length > 0) {
      warnings.push(`Template missing common required fields: ${missingRequired.join(', ')}`);
      missingFields.push(...missingRequired);
    }

    // Check for placeholder consistency
    const inconsistentPlaceholders = Array.from(foundPlaceholders).filter(placeholder => {
      const variations = Array.from(foundPlaceholders).filter(p => 
        p.toLowerCase().replace(/[^a-z]/g, '') === placeholder.toLowerCase().replace(/[^a-z]/g, '')
      );
      return variations.length > 1;
    });

    if (inconsistentPlaceholders.length > 0) {
      warnings.push('Inconsistent placeholder naming detected. Use consistent naming for the same field');
    }
  }

  /**
   * Validate accessibility
   */
  private static validateAccessibility(htmlContent: string, warnings: string[]): void {
    // Check for alt text on images
    const images = htmlContent.match(/<img[^>]*>/g) || [];
    const imagesWithoutAlt = images.filter(img => !img.includes('alt='));
    
    if (imagesWithoutAlt.length > 0) {
      warnings.push('Images should include alt text for accessibility');
    }

    // Check for semantic HTML
    if (!htmlContent.includes('<header') && !htmlContent.includes('<main') && !htmlContent.includes('<section')) {
      warnings.push('Consider using semantic HTML elements (header, main, section) for better structure');
    }

    // Check for proper heading hierarchy
    const headings = htmlContent.match(/<h[1-6][^>]*>/g) || [];
    if (headings.length === 0) {
      warnings.push('Template should include proper heading structure (h1, h2, etc.)');
    }

    // Check for color contrast (basic check)
    if (htmlContent.includes('color:') && !htmlContent.includes('background')) {
      warnings.push('Ensure sufficient color contrast for text readability');
    }
  }

  /**
   * Validate template for specific document type
   */
  static validateForDocumentType(htmlContent: string, documentType: string): TemplateValidationResult {
    const baseValidation = this.validateTemplate(htmlContent);
    
    // Add document-type specific validations
    const typeSpecificWarnings: string[] = [];
    
    switch (documentType.toLowerCase()) {
      case 'id-card':
      case 'idcard':
        this.validateIDCard(htmlContent, typeSpecificWarnings);
        break;
      case 'certificate':
      case 'testimonial':
        this.validateCertificate(htmlContent, typeSpecificWarnings);
        break;
      case 'transcript':
        this.validateTranscript(htmlContent, typeSpecificWarnings);
        break;
    }

    return {
      ...baseValidation,
      warnings: [...baseValidation.warnings, ...typeSpecificWarnings]
    };
  }

  /**
   * Validate ID card specific requirements
   */
  private static validateIDCard(htmlContent: string, warnings: string[]): void {
    // Check for ID card dimensions
    if (!htmlContent.includes('85.6mm') && !htmlContent.includes('53.98mm')) {
      warnings.push('ID card should use standard credit card dimensions (85.6mm x 53.98mm)');
    }

    // Check for photo placeholder
    if (!htmlContent.includes('photo') && !htmlContent.includes('image')) {
      warnings.push('ID card should include a photo placeholder');
    }

    // Check for essential ID fields
    const essentialFields = ['name', 'roll', 'department'];
    const hasEssentialFields = essentialFields.every(field =>
      htmlContent.toLowerCase().includes(field)
    );

    if (!hasEssentialFields) {
      warnings.push('ID card should include essential fields: name, roll number, department');
    }
  }

  /**
   * Validate certificate specific requirements
   */
  private static validateCertificate(htmlContent: string, warnings: string[]): void {
    // Check for signature areas
    if (!htmlContent.includes('signature') && !htmlContent.includes('principal') && !htmlContent.includes('registrar')) {
      warnings.push('Certificate should include signature areas for officials');
    }

    // Check for official letterhead
    if (!htmlContent.includes('institute') && !htmlContent.includes('college') && !htmlContent.includes('university')) {
      warnings.push('Certificate should include institutional letterhead');
    }

    // Check for date field
    if (!htmlContent.includes('date') && !htmlContent.includes('Date')) {
      warnings.push('Certificate should include issue date');
    }
  }

  /**
   * Validate transcript specific requirements
   */
  private static validateTranscript(htmlContent: string, warnings: string[]): void {
    // Check for grade/marks table
    if (!htmlContent.includes('<table') && !htmlContent.includes('grade') && !htmlContent.includes('marks')) {
      warnings.push('Transcript should include a table for grades/marks');
    }

    // Check for GPA/CGPA
    if (!htmlContent.includes('gpa') && !htmlContent.includes('GPA') && !htmlContent.includes('cgpa')) {
      warnings.push('Transcript should include GPA or CGPA information');
    }

    // Check for semester information
    if (!htmlContent.includes('semester') && !htmlContent.includes('Semester')) {
      warnings.push('Transcript should include semester information');
    }
  }
}