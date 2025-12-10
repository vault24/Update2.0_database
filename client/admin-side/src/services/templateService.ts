/**
 * Template Service
 * Handles document template management and operations
 */

import { DocumentTemplate, DocumentTemplateCategory } from '@/types/template';

// Built-in templates configuration
const BUILT_IN_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'eligibility-statement',
    name: 'Eligibility Statement',
    description: 'Character and academic eligibility certificate',
    category: 'eligibility',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Father Name', 'Mother Name', 'Roll No', 'Reg No', 'Session', 'Technology Name', 'CGPA', 'Date of Birth'],
    optionalFields: ['Graduation Date', 'Previous Institution'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'Character and academic testimonial certificate',
    category: 'testimonial',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Father Name', 'Mother Name', 'Roll No', 'Department', 'Session'],
    optionalFields: ['CGPA', 'Graduation Date'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'id-card',
    name: 'ID Card',
    description: 'Student identity card',
    category: 'idCard',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Roll No', 'Department', 'Session', 'Blood Group'],
    optionalFields: ['Photo', 'Address'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'transcript',
    name: 'Academic Transcript',
    description: 'Complete academic record with grades',
    category: 'transcript',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Roll No', 'Registration Number', 'Department', 'Session', 'CGPA'],
    optionalFields: ['Total Credits', 'Graduation Date'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'character-certificate',
    name: 'Character Certificate',
    description: 'Certificate of good character and conduct',
    category: 'character',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Father Name', 'Roll No', 'Department', 'Session'],
    optionalFields: ['Graduation Date'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'clearance-certificate',
    name: 'Clearance Certificate',
    description: 'No dues clearance certificate',
    category: 'clearance',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Roll No', 'Department', 'Session'],
    optionalFields: ['Graduation Date'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'bonafide-certificate',
    name: 'Bonafide Certificate',
    description: 'Certificate of enrollment verification',
    category: 'bonafide',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Roll No', 'Department', 'Session', 'Current Status'],
    optionalFields: ['Semester'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'completion-certificate',
    name: 'Certificate of Completion',
    description: 'Formal certificate of course completion',
    category: 'completion',
    htmlContent: '', // Will be loaded from file
    requiredFields: ['Student Name', 'Father Name', 'Mother Name', 'Roll No', 'Registration Number', 'Department', 'Session', 'CGPA'],
    optionalFields: ['Graduation Date'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Template Service
export class TemplateService {
  private static templates: Map<string, DocumentTemplate> = new Map();
  private static initialized = false;

  /**
   * Initialize template service with built-in templates
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load built-in templates
    for (const template of BUILT_IN_TEMPLATES) {
      try {
        // Try to load template content from file
        const content = await this.loadTemplateContent(template.id);
        template.htmlContent = content;
        this.templates.set(template.id, template);
      } catch (error) {
        console.warn(`Failed to load template ${template.id}:`, error);
        // Keep template without content for now
        this.templates.set(template.id, template);
      }
    }

    this.initialized = true;
  }

  /**
   * Load template content from file
   */
  private static async loadTemplateContent(templateId: string): Promise<string> {
    const templatePaths: Record<string, string> = {
      'eligibility-statement': '/src/documents/templates/EligibilityStatement.html',
      'id-card': '/src/documents/templates/IdCard.html',
      'testimonial': '/src/documents/templates/Testimonial.html',
      'completion-certificate': '/src/documents/templates/Certificate.html',
      'character-certificate': '/src/documents/templates/characterCertificate.html',
      'transcript': '/src/documents/templates/CourseCompletionCertificate.html',
      'clearance-certificate': '/src/documents/templates/Prottayon.html',
      'bonafide-certificate': '/src/documents/templates/Sallu_certificate.html'
    };

    const path = templatePaths[templateId];
    if (!path) {
      throw new Error(`No file path configured for template: ${templateId}`);
    }

    try {
      // Use Vite's import mechanism for static assets
      const response = await fetch(path + '?raw');
      if (!response.ok) {
        // Fallback to regular fetch
        const fallbackResponse = await fetch(path);
        if (!fallbackResponse.ok) {
          throw new Error(`Failed to fetch template: ${fallbackResponse.statusText}`);
        }
        return await fallbackResponse.text();
      }
      return await response.text();
    } catch (error) {
      console.warn(`Failed to load template from ${path}:`, error);
      // Fallback: return a basic template structure
      return this.getDefaultTemplateContent(templateId);
    }
  }

  /**
   * Get default template content as fallback
   */
  private static getDefaultTemplateContent(templateId: string): string {
    const defaultTemplates: Record<string, string> = {
      'eligibility-statement': `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Eligibility Statement</title>
          <style>
            .page { width: 210mm; height: 297mm; padding: 20mm; background: white; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { font-size: 16px; line-height: 1.6; }
            .editable { font-weight: bold; border-bottom: 1px dotted #999; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <h1>SIRAJGANJ POLYTECHNIC INSTITUTE</h1>
              <h2>Eligibility Statement</h2>
            </div>
            <div class="content">
              <p>This is to certify that <span class="editable">[Student Name]</span>, 
              S/o <span class="editable">[Father Name]</span> & <span class="editable">[Mother Name]</span> 
              bearing Roll No: <span class="editable">[Roll No]</span>, 
              Registration No: <span class="editable">[Reg No]</span> 
              Session: <span class="editable">[Session]</span> successfully completed the 
              Diploma-in-Engineering in <span class="editable">[Technology Name]</span>.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'id-card': `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Student ID Card</title>
          <style>
            .id-card { width: 85.6mm; height: 53.98mm; border: 1px solid #000; padding: 5mm; }
            .header { text-align: center; font-size: 12px; font-weight: bold; }
            .content { margin-top: 10px; font-size: 10px; }
            .editable { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">
              <div>SIRAJGANJ POLYTECHNIC INSTITUTE</div>
              <div>STUDENT ID CARD</div>
            </div>
            <div class="content">
              <div>Name: <span class="editable">[Student Name]</span></div>
              <div>Roll: <span class="editable">[Roll No]</span></div>
              <div>Dept: <span class="editable">[Department]</span></div>
              <div>Session: <span class="editable">[Session]</span></div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return defaultTemplates[templateId] || '<html><body><h1>Template Not Found</h1></body></html>';
  }

  /**
   * Get all available templates
   */
  static async getTemplates(): Promise<DocumentTemplate[]> {
    await this.initialize();
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  static async getTemplatesByCategory(category: DocumentTemplateCategory): Promise<DocumentTemplate[]> {
    await this.initialize();
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get template by ID with ID normalization
   */
  static async getTemplate(id: string): Promise<DocumentTemplate | null> {
    await this.initialize();
    
    // Try direct lookup first
    let template = this.templates.get(id);
    if (template) return template;
    
    // Try with ID normalization (handle both camelCase and kebab-case)
    const normalizedId = this.normalizeTemplateId(id);
    template = this.templates.get(normalizedId);
    if (template) return template;
    
    // Try reverse normalization
    const reverseNormalizedId = this.reverseNormalizeTemplateId(id);
    template = this.templates.get(reverseNormalizedId);
    if (template) return template;
    
    return null;
  }

  /**
   * Normalize template ID (camelCase to kebab-case)
   */
  private static normalizeTemplateId(id: string): string {
    return id
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Reverse normalize template ID (kebab-case to camelCase)
   */
  private static reverseNormalizeTemplateId(id: string): string {
    return id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Add custom template
   */
  static addTemplate(template: DocumentTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Update template
   */
  static updateTemplate(id: string, updates: Partial<DocumentTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
    this.templates.set(id, updatedTemplate);
    return true;
  }

  /**
   * Delete template
   */
  static deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Search templates
   */
  static async searchTemplates(query: string): Promise<DocumentTemplate[]> {
    await this.initialize();
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get template categories
   */
  static getCategories(): DocumentTemplateCategory[] {
    return ['testimonial', 'idCard', 'transcript', 'character', 'clearance', 'bonafide', 'eligibility', 'completion'];
  }

  /**
   * Validate template ID
   */
  static isValidTemplateId(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(): Promise<{
    total: number;
    byCategory: Record<DocumentTemplateCategory, number>;
  }> {
    await this.initialize();
    const templates = Array.from(this.templates.values());
    
    const byCategory = {} as Record<DocumentTemplateCategory, number>;
    this.getCategories().forEach(category => {
      byCategory[category] = templates.filter(t => t.category === category).length;
    });

    return {
      total: templates.length,
      byCategory
    };
  }
}