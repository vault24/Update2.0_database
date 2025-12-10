/**
 * Document Template Types
 * Defines interfaces for document template generation
 */

// Template Categories
export type DocumentTemplateCategory = 
  | 'testimonial'
  | 'idCard'
  | 'transcript'
  | 'character'
  | 'clearance'
  | 'bonafide'
  | 'eligibility'
  | 'completion';

// Document Template Interface
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocumentTemplateCategory;
  htmlContent: string;
  requiredFields: string[];
  optionalFields: string[];
  previewImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Student data specifically formatted for document generation
export interface DocumentStudentData {
  // Personal Information
  id: string;
  name: string;
  nameBangla?: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: Date;
  bloodGroup?: string;
  religion?: string;
  nationality: string;
  gender: string;
  
  // Academic Information
  rollNumber: string;
  registrationNumber: string;
  department: string;
  departmentCode?: string;
  semester: string;
  session: string;
  cgpa?: number;
  totalCredits?: number;
  shift?: string;
  
  // Contact Information
  address: string;
  presentAddress?: string;
  permanentAddress?: string;
  phoneNumber?: string;
  email?: string;
  
  // Institutional Information
  admissionDate?: Date;
  graduationDate?: Date;
  currentStatus: 'Active' | 'Graduated' | 'Discontinued';
  
  // Additional Fields
  photo?: string;
  signature?: string;
  
  // Previous Education
  previousInstitution?: string;
  previousBoard?: string;
  previousGPA?: number;
  passingYear?: number;
}

// Generated Document Interface
export interface GeneratedDocument {
  id: string;
  templateId: string;
  studentId: string;
  htmlContent: string;
  generatedAt: Date;
  customData?: Record<string, any>;
  status: 'draft' | 'final';
}

// Generation Request
export interface GenerationRequest {
  templateId: string;
  studentId: string;
  customData?: Partial<DocumentStudentData>;
  outputFormat: 'html' | 'pdf';
}

// Batch Generation Request
export interface BatchGenerationRequest {
  studentId: string;
  templateIds: string[];
  customData?: Partial<DocumentStudentData>;
  outputFormat: 'html' | 'pdf';
}

// Template Validation Result
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
}

// Document Preview
export interface DocumentPreview {
  htmlContent: string;
  editableFields: EditableField[];
  missingFields: string[];
}

// Editable Field
export interface EditableField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'date' | 'number' | 'email';
  required: boolean;
  validation?: string; // regex pattern
}

// PDF Generation Options
export interface PDFOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground: boolean;
}

// Batch Generation Result
export interface BatchResult {
  successful: GeneratedDocument[];
  failed: {
    templateId: string;
    error: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Template Field Mapping
export interface TemplateFieldMapping {
  [placeholder: string]: keyof DocumentStudentData | string;
}