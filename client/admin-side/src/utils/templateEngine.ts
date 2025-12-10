/**
 * Template Engine Utility
 * Handles HTML template processing and data population
 */

import { DocumentStudentData, TemplateValidationResult, DocumentPreview, EditableField } from '@/types/template';

// Template placeholder pattern: {{fieldName}} or [Field Name]
const PLACEHOLDER_PATTERNS = [
  /\{\{([^}]+)\}\}/g,           // {{fieldName}}
  /\[([^\]]+)\]/g,              // [Field Name]
  /<span[^>]*class="editable"[^>]*>([^<]*)<\/span>/g  // <span class="editable">content</span>
];

// Field mapping from template placeholders to student data
const FIELD_MAPPING: Record<string, keyof DocumentStudentData | ((data?: DocumentStudentData) => string) | (() => string)> = {
  // Personal Information
  'Student Name': 'name',
  'student_name': 'name',
  'studentName': 'name',
  'name': 'name',
  'Student Name Bangla': 'nameBangla',
  'Father Name': 'fatherName',
  'father_name': 'fatherName',
  'fatherName': 'fatherName',
  'Mother Name': 'motherName',
  'mother_name': 'motherName',
  'motherName': 'motherName',
  'Date of Birth': (data) => formatDate(data.dateOfBirth),
  'date_of_birth': (data) => formatDate(data.dateOfBirth),
  'dateOfBirth': (data) => formatDate(data.dateOfBirth),
  'Blood Group': 'bloodGroup',
  'blood_group': 'bloodGroup',
  'bloodGroup': 'bloodGroup',
  'Religion': 'religion',
  'religion': 'religion',
  'Nationality': 'nationality',
  'nationality': 'nationality',
  'Gender': 'gender',
  'gender': 'gender',
  
  // Academic Information
  'Roll No': 'rollNumber',
  'roll_no': 'rollNumber',
  'rollNumber': 'rollNumber',
  'Roll Number': 'rollNumber',
  'Reg No': 'registrationNumber',
  'reg_no': 'registrationNumber',
  'registrationNumber': 'registrationNumber',
  'Registration Number': 'registrationNumber',
  'Department': 'department',
  'department': 'department',
  'Technology Name': 'department',
  'Semester': 'semester',
  'semester': 'semester',
  'Session': 'session',
  'session': 'session',
  'CGPA': 'cgpa',
  'cgpa': 'cgpa',
  'GPA': 'cgpa',
  'gpa': 'cgpa',
  'Total Credits': 'totalCredits',
  'total_credits': 'totalCredits',
  'totalCredits': 'totalCredits',
  'Shift': 'shift',
  'shift': 'shift',
  
  // Contact Information
  'Address': 'address',
  'address': 'address',
  'Present Address': 'presentAddress',
  'present_address': 'presentAddress',
  'presentAddress': 'presentAddress',
  'Permanent Address': 'permanentAddress',
  'permanent_address': 'permanentAddress',
  'permanentAddress': 'permanentAddress',
  'Phone Number': 'phoneNumber',
  'phone_number': 'phoneNumber',
  'phoneNumber': 'phoneNumber',
  'Email': 'email',
  'email': 'email',
  
  // Institutional Information
  'Admission Date': (data) => formatDate(data.admissionDate),
  'admission_date': (data) => formatDate(data.admissionDate),
  'admissionDate': (data) => formatDate(data.admissionDate),
  'Graduation Date': (data) => formatDate(data.graduationDate),
  'graduation_date': (data) => formatDate(data.graduationDate),
  'graduationDate': (data) => formatDate(data.graduationDate),
  'Current Status': 'currentStatus',
  'current_status': 'currentStatus',
  'currentStatus': 'currentStatus',
  'Status': 'currentStatus',
  'status': 'currentStatus',
  
  // Previous Education
  'Previous Institution': 'previousInstitution',
  'previous_institution': 'previousInstitution',
  'previousInstitution': 'previousInstitution',
  'Previous Board': 'previousBoard',
  'previous_board': 'previousBoard',
  'previousBoard': 'previousBoard',
  'Previous GPA': 'previousGPA',
  'previous_gpa': 'previousGPA',
  'previousGPA': 'previousGPA',
  'Passing Year': 'passingYear',
  'passing_year': 'passingYear',
  'passingYear': 'passingYear',
  
  // Uppercase field mappings (for template compatibility)
  'STUDENT_NAME': 'name',
  'FATHER_NAME': 'fatherName',
  'MOTHER_NAME': 'motherName',
  'REGISTRATION_NUMBER': 'registrationNumber',
  'SESSION_YEAR': 'session',
  'PASSING_YEAR': 'passingYear',
  'TECHNOLOGY': 'department',
  'BOARD_ROLL': 'rollNumber',
  
  // Address components
  'VILLAGE': (data) => parseAddress(data.address).village || '',
  'POST_OFFICE': (data) => parseAddress(data.address).postOffice || '',
  'UPAZILA': (data) => parseAddress(data.address).upazila || '',
  'DISTRICT': (data) => parseAddress(data.address).district || '',
  
  // Gender pronouns
  'GENDER_PRONOUN_SUBJECT': (data) => getGenderPronouns(data.gender).subject,
  'GENDER_PRONOUN_SUBJECT_LOWER': (data) => getGenderPronouns(data.gender).subjectLower,
  'GENDER_PRONOUN_OBJECT': (data) => getGenderPronouns(data.gender).object,
  'GENDER_PRONOUN_POSSESSIVE_LOWER': (data) => getGenderPronouns(data.gender).possessiveLower,
  
  // System/Institute fields (using defaults, can be enhanced with system settings)
  'GOVERNMENT_NAME': () => 'Government of Bangladesh',
  'OFFICE_NAME': () => 'Office of the Registrar',
  'INSTITUTE_NAME': () => 'Institute Name', // Should be fetched from system settings
  'INSTITUTE_ADDRESS': () => 'Institute Address', // Should be fetched from system settings
  'INSTITUTE_LOGO': () => '', // Should be fetched from system settings
  'REGISTRAR_NAME': () => 'Registrar Name', // Should be fetched from system settings
  'PRINCIPAL_NAME': () => 'Principal Name', // Should be fetched from system settings
  
  // Date and serial number fields
  'ISSUE_DATE': () => getCurrentDate(),
  'SERIAL_NUMBER': () => getSerialNumber(),
};

// Date formatting utility
function formatDate(date?: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Gender pronoun helpers
function getGenderPronouns(gender?: string): {
  subject: string;
  subjectLower: string;
  object: string;
  possessiveLower: string;
} {
  const lowerGender = (gender || '').toLowerCase();
  if (lowerGender.includes('female') || lowerGender.includes('woman') || lowerGender === 'f') {
    return {
      subject: 'She',
      subjectLower: 'she',
      object: 'her',
      possessiveLower: 'her'
    };
  } else if (lowerGender.includes('male') || lowerGender.includes('man') || lowerGender === 'm') {
    return {
      subject: 'He',
      subjectLower: 'he',
      object: 'him',
      possessiveLower: 'his'
    };
  } else {
    return {
      subject: 'They',
      subjectLower: 'they',
      object: 'them',
      possessiveLower: 'their'
    };
  }
}

// Address parsing helper
function parseAddress(address?: string): {
  village?: string;
  postOffice?: string;
  upazila?: string;
  district?: string;
} {
  if (!address) return {};
  
  // Try to parse address components (this is a simple parser, can be enhanced)
  const parts = address.split(',').map(p => p.trim());
  return {
    village: parts[0] || '',
    postOffice: parts.find(p => p.toLowerCase().includes('post')) || parts[1] || '',
    upazila: parts.find(p => p.toLowerCase().includes('upazila') || p.toLowerCase().includes('thana')) || parts[2] || '',
    district: parts.find(p => p.toLowerCase().includes('district')) || parts[parts.length - 1] || ''
  };
}

// Get current date for issue date
function getCurrentDate(): string {
  return formatDate(new Date());
}

// Get serial number (can be enhanced with actual serial number generation)
function getSerialNumber(): string {
  // For now, return a timestamp-based serial number
  return `SN-${Date.now().toString().slice(-8)}`;
}

// Template Engine Class
export class TemplateEngine {
  // Cache for processed templates
  private static templateCache: Map<string, { placeholders: string[]; processed: boolean }> = new Map();

  /**
   * Populate template with student data with enhanced processing
   */
  static populateTemplate(templateContent: string, studentData: DocumentStudentData): string {
    if (!templateContent || !studentData) {
      throw new Error('Template content and student data are required');
    }

    let populatedContent = templateContent;
    const unmappedFields: string[] = [];
    
    // Process each placeholder pattern
    PLACEHOLDER_PATTERNS.forEach(pattern => {
      populatedContent = populatedContent.replace(pattern, (match, fieldName) => {
        const trimmedFieldName = fieldName.trim();
        const mapping = FIELD_MAPPING[trimmedFieldName];
        
        if (!mapping) {
          console.warn(`No mapping found for field: ${trimmedFieldName}`);
          unmappedFields.push(trimmedFieldName);
          return match; // Keep original placeholder if no mapping found
        }
        
        let value: string;
        try {
          if (typeof mapping === 'function') {
            // Try calling with studentData first (for functions that need data)
            try {
              value = mapping(studentData);
            } catch {
              // If that fails, try calling without parameters (for system settings functions)
              try {
                value = (mapping as () => string)();
              } catch {
                value = '';
              }
            }
          } else {
            const fieldValue = studentData[mapping];
            value = fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '';
          }
        } catch (error) {
          console.error(`Error processing field ${trimmedFieldName}:`, error);
          value = '';
        }
        
        // For editable spans, preserve the span structure
        if (match.includes('<span')) {
          return match.replace(/>[^<]*</, `>${value}<`);
        }
        
        return value;
      });
    });

    // Log unmapped fields for debugging
    if (unmappedFields.length > 0) {
      console.warn('Unmapped template fields:', unmappedFields);
    }
    
    return populatedContent;
  }

  /**
   * Populate template with error handling and fallbacks
   */
  static populateTemplateWithFallbacks(
    templateContent: string, 
    studentData: DocumentStudentData,
    fallbackValues?: Record<string, string>
  ): { content: string; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      let populatedContent = templateContent;
      
      PLACEHOLDER_PATTERNS.forEach(pattern => {
        populatedContent = populatedContent.replace(pattern, (match, fieldName) => {
          const trimmedFieldName = fieldName.trim();
          const mapping = FIELD_MAPPING[trimmedFieldName];
          
          if (!mapping) {
            // Check for fallback value
            if (fallbackValues && fallbackValues[trimmedFieldName]) {
              warnings.push(`Using fallback value for unmapped field: ${trimmedFieldName}`);
              return fallbackValues[trimmedFieldName];
            }
            
            warnings.push(`No mapping found for field: ${trimmedFieldName}`);
            return match; // Keep original placeholder
          }
          
          try {
            let value: string;
            if (typeof mapping === 'function') {
              // Try calling with studentData first (for functions that need data)
              try {
                value = mapping(studentData);
              } catch {
                // If that fails, try calling without parameters (for system settings functions)
                try {
                  value = (mapping as () => string)();
                } catch {
                  value = '';
                }
              }
            } else {
              const fieldValue = studentData[mapping];
              value = fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '';
            }
            
            // Use fallback if value is empty
            if (!value && fallbackValues && fallbackValues[trimmedFieldName]) {
              value = fallbackValues[trimmedFieldName];
              warnings.push(`Using fallback value for empty field: ${trimmedFieldName}`);
            }
            
            // For editable spans, preserve the span structure
            if (match.includes('<span')) {
              return match.replace(/>[^<]*</, `>${value}<`);
            }
            
            return value;
          } catch (error) {
            errors.push(`Error processing field ${trimmedFieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return match;
          }
        });
      });
      
      return { content: populatedContent, errors, warnings };
    } catch (error) {
      errors.push(`Template population failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { content: templateContent, errors, warnings };
    }
  }

  /**
   * Extract placeholders from template
   */
  static extractPlaceholders(templateContent: string): string[] {
    const placeholders = new Set<string>();
    
    PLACEHOLDER_PATTERNS.forEach(pattern => {
      const matches = templateContent.matchAll(pattern);
      for (const match of matches) {
        placeholders.add(match[1].trim());
      }
    });
    
    return Array.from(placeholders);
  }

  /**
   * Validate template content with comprehensive checks
   */
  static validateTemplate(templateContent: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    
    if (!templateContent || templateContent.trim() === '') {
      errors.push('Template content is empty');
      return { isValid: false, errors, warnings, missingFields };
    }
    
    // Check if template has valid HTML structure
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = templateContent;
      
      // Check for basic HTML structure issues
      const htmlErrors = this.validateHTMLStructure(templateContent);
      errors.push(...htmlErrors);
      
    } catch (error) {
      errors.push('Invalid HTML structure in template');
    }
    
    // Extract and validate placeholders
    const placeholders = this.extractPlaceholders(templateContent);
    
    if (placeholders.length === 0) {
      warnings.push('Template contains no placeholders - it may not be dynamic');
    }
    
    placeholders.forEach(placeholder => {
      if (!FIELD_MAPPING[placeholder]) {
        missingFields.push(placeholder);
        warnings.push(`Unknown placeholder: ${placeholder}`);
      }
    });
    
    // Check for required elements
    if (!templateContent.includes('class="page"') && !templateContent.includes('id="document-area"')) {
      warnings.push('Template should include a main document container with class="page" or id="document-area"');
    }
    
    // Check for print compatibility
    if (!templateContent.includes('@media print') && !templateContent.includes('print')) {
      warnings.push('Template may not be optimized for printing');
    }
    
    // Check for CSS styles
    if (!templateContent.includes('<style') && !templateContent.includes('style=')) {
      warnings.push('Template has no styling - consider adding CSS for better appearance');
    }
    
    // Validate placeholder syntax
    const syntaxErrors = this.validatePlaceholderSyntax(templateContent);
    errors.push(...syntaxErrors);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingFields
    };
  }

  /**
   * Validate HTML structure for common issues
   */
  private static validateHTMLStructure(htmlContent: string): string[] {
    const errors: string[] = [];
    
    // List of self-closing tags that don't need closing tags
    const selfClosingTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
    
    // Remove HTML comments and DOCTYPE declarations before checking
    let cleanedContent = htmlContent
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/<!DOCTYPE[^>]*>/gi, ''); // Remove DOCTYPE
    
    // Extract all tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    const tags: Array<{ name: string; isClosing: boolean }> = [];
    let match;
    
    while ((match = tagRegex.exec(cleanedContent)) !== null) {
      const tagName = match[1].toLowerCase();
      const isClosing = match[0].startsWith('</');
      
      // Skip self-closing tags
      if (!isClosing && selfClosingTags.has(tagName)) {
        continue;
      }
      
      // Check if it's a self-closing tag in XML style (<tag />)
      if (match[0].endsWith('/>')) {
        continue;
      }
      
      tags.push({ name: tagName, isClosing });
    }
    
    // Use a stack to check for properly closed tags
    const stack: string[] = [];
    for (const tag of tags) {
      if (tag.isClosing) {
        // Find matching opening tag
        let found = false;
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i] === tag.name) {
            // Remove this tag and all tags after it (they should have been closed first)
            stack.splice(i);
            found = true;
            break;
          }
        }
        // If we didn't find a matching opening tag, it's an extra closing tag
        // This is usually not a critical error, so we'll just continue
      } else {
        stack.push(tag.name);
      }
    }
    
    // Only report error if there are significantly unclosed tags
    // Allow some unclosed tags as they might be intentional (like <html>, <body> in partial templates)
    if (stack.length > 5) {
      errors.push(`Possible unclosed HTML tags detected: ${stack.slice(0, 5).join(', ')}${stack.length > 5 ? '...' : ''}`);
    }
    
    // Check for malformed attributes (attributes without quotes that aren't boolean)
    const malformedAttrs = cleanedContent.match(/\s[a-zA-Z-]+=[^"'\s>][^>]*/g);
    if (malformedAttrs && malformedAttrs.length > 0) {
      // Filter out common patterns that are actually valid
      const validPatterns = [
        /\s[a-zA-Z-]+=\d+/, // numeric attributes
        /\s[a-zA-Z-]+=true/, // boolean true
        /\s[a-zA-Z-]+=false/, // boolean false
      ];
      
      const actuallyMalformed = malformedAttrs.filter(attr => {
        return !validPatterns.some(pattern => pattern.test(attr));
      });
      
      if (actuallyMalformed.length > 0) {
        errors.push('Possible malformed HTML attributes detected');
      }
    }
    
    return errors;
  }

  /**
   * Validate placeholder syntax
   */
  private static validatePlaceholderSyntax(templateContent: string): string[] {
    const errors: string[] = [];
    
    // Check for unmatched brackets
    const openBrackets = (templateContent.match(/\{\{/g) || []).length;
    const closeBrackets = (templateContent.match(/\}\}/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      errors.push('Unmatched placeholder brackets {{ }} detected');
    }
    
    const openSquare = (templateContent.match(/\[(?![^\]]*\])/g) || []).length;
    const closeSquare = (templateContent.match(/\]/g) || []).length;
    
    if (openSquare !== closeSquare) {
      errors.push('Unmatched square brackets [ ] detected');
    }
    
    return errors;
  }

  /**
   * Generate document preview with enhanced editable fields
   */
  static generatePreview(templateContent: string, studentData: DocumentStudentData): DocumentPreview {
    try {
      const populatedContent = this.populateTemplate(templateContent, studentData);
      const placeholders = this.extractPlaceholders(templateContent);
      
      const editableFields: EditableField[] = placeholders.map(placeholder => {
        const mapping = FIELD_MAPPING[placeholder];
        let value = '';
        
        if (mapping) {
          try {
            if (typeof mapping === 'function') {
              value = mapping(studentData);
            } else {
              const fieldValue = studentData[mapping];
              value = fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '';
            }
          } catch (error) {
            console.error(`Error getting value for field ${placeholder}:`, error);
            value = '';
          }
        }
        
        return {
          key: placeholder,
          label: this.formatFieldLabel(placeholder),
          value,
          type: this.getFieldType(placeholder),
          required: this.isRequiredField(placeholder),
          validation: this.getFieldValidation(placeholder)
        };
      });
      
      const missingFields = placeholders.filter(p => !FIELD_MAPPING[p]);
      
      return {
        htmlContent: populatedContent,
        editableFields,
        missingFields
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      return {
        htmlContent: '<div style="color: red; padding: 20px;">Error generating preview</div>',
        editableFields: [],
        missingFields: []
      };
    }
  }

  /**
   * Generate preview with custom data merged
   */
  static generatePreviewWithCustomData(
    templateContent: string, 
    studentData: DocumentStudentData,
    customData: Partial<DocumentStudentData>
  ): DocumentPreview {
    const mergedData = { ...studentData, ...customData };
    return this.generatePreview(templateContent, mergedData);
  }

  /**
   * Format field label for better display
   */
  private static formatFieldLabel(fieldName: string): string {
    // Normalize underscores and camelCase into spaced words
    const normalized = fieldName
      .replace(/[_\-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
    // Capitalize each word
    return normalized
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get field type based on field name
   */
  private static getFieldType(fieldName: string): 'text' | 'date' | 'number' | 'email' {
    const lowerFieldName = fieldName.toLowerCase();
    
    if (lowerFieldName.includes('date') || lowerFieldName.includes('birth')) {
      return 'date';
    }
    if (lowerFieldName.includes('email')) {
      return 'email';
    }
    if (lowerFieldName.includes('gpa') || lowerFieldName.includes('cgpa') || 
        lowerFieldName.includes('credit') || lowerFieldName.includes('year')) {
      return 'number';
    }
    
    return 'text';
  }

  /**
   * Check if field is required
   */
  private static isRequiredField(fieldName: string): boolean {
    const requiredFields = [
      'Student Name', 'student_name', 'studentName', 'name',
      'Father Name', 'father_name', 'fatherName',
      'Mother Name', 'mother_name', 'motherName',
      'Roll No', 'roll_no', 'rollNumber', 'Roll Number',
      'Department', 'department'
    ];
    
    return requiredFields.includes(fieldName);
  }

  /**
   * Get validation pattern for field
   */
  private static getFieldValidation(fieldName: string): string | undefined {
    const lowerFieldName = fieldName.toLowerCase();
    
    if (lowerFieldName.includes('email')) {
      return '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
    }
    if (lowerFieldName.includes('phone') || lowerFieldName.includes('mobile')) {
      return '^[0-9+\\-\\s()]+$';
    }
    if (lowerFieldName.includes('gpa') || lowerFieldName.includes('cgpa')) {
      return '^[0-4](\\.\\d{1,2})?$';
    }
    
    return undefined;
  }

  /**
   * Update template with custom data (ensures custom data takes precedence)
   */
  static updateTemplateWithCustomData(
    templateContent: string, 
    studentData: DocumentStudentData, 
    customData: Partial<DocumentStudentData>
  ): string {
    // Merge data with custom data taking precedence
    const mergedData = { ...studentData, ...customData };
    
    // Ensure custom data values override student data values
    Object.keys(customData).forEach(key => {
      const customValue = customData[key as keyof DocumentStudentData];
      if (customValue !== undefined && customValue !== null) {
        (mergedData as any)[key] = customValue;
      }
    });
    
    return this.populateTemplate(templateContent, mergedData);
  }

  /**
   * Get field value with custom data precedence
   */
  static getFieldValue(
    fieldName: string,
    studentData: DocumentStudentData,
    customData: Partial<DocumentStudentData>
  ): string {
    const mapping = FIELD_MAPPING[fieldName];
    if (!mapping) return '';

    // Check if custom data has this field first
    const customValue = customData[fieldName as keyof DocumentStudentData];
    if (customValue !== undefined && customValue !== null) {
      if (typeof mapping === 'function') {
        // For function mappings, we need to use the merged data
        const mergedData = { ...studentData, ...customData };
        return mapping(mergedData);
      }
      return String(customValue);
    }

    // Fall back to student data
    if (typeof mapping === 'function') {
      return mapping(studentData);
    } else {
      return String(studentData[mapping] || '');
    }
  }
}