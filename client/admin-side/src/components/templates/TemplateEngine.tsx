/**
 * Template Engine Component
 * React component for template processing and preview generation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DocumentStudentData, DocumentPreview, EditableField, TemplateValidationResult } from '@/types/template';
import { TemplateEngine as TemplateEngineUtil } from '@/utils/templateEngine';
import { TemplateValidator } from '@/utils/templateValidator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Edit3, Eye, RefreshCw } from 'lucide-react';

interface TemplateEngineProps {
  templateContent: string;
  studentData: DocumentStudentData;
  onPreviewUpdate?: (preview: DocumentPreview) => void;
  onValidationUpdate?: (validation: TemplateValidationResult) => void;
  onCustomDataChange?: (customData: Partial<DocumentStudentData>) => void;
  editable?: boolean;
  className?: string;
}

export const TemplateEngineComponent: React.FC<TemplateEngineProps> = ({
  templateContent,
  studentData,
  onPreviewUpdate,
  onValidationUpdate,
  onCustomDataChange,
  editable = true,
  className = ''
}) => {
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);
  const [customData, setCustomData] = useState<Partial<DocumentStudentData>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview when template or data changes
  const generatePreview = useCallback(async () => {
    if (!templateContent || !studentData) return;

    setLoading(true);
    setError(null);

    try {
      // Merge student data with custom data
      const mergedData = { ...studentData, ...customData };
      
      // Generate preview
      const newPreview = TemplateEngineUtil.generatePreview(templateContent, mergedData);
      setPreview(newPreview);
      onPreviewUpdate?.(newPreview);

      // Validate template
      const newValidation = TemplateValidator.validateTemplate(templateContent);
      setValidation(newValidation);
      onValidationUpdate?.(newValidation);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
      setError(errorMessage);
      console.error('Template engine error:', err);
    } finally {
      setLoading(false);
    }
  }, [templateContent, studentData, customData, onPreviewUpdate, onValidationUpdate]);

  // Generate preview on mount and when dependencies change
  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  // Handle field value changes with real-time preview update
  const handleFieldChange = (fieldKey: string, value: string) => {
    const newCustomData = { ...customData, [fieldKey]: value };
    setCustomData(newCustomData);
    onCustomDataChange?.(newCustomData);
    
    // Trigger immediate preview regeneration for real-time updates
    setTimeout(() => {
      generatePreview();
    }, 100); // Small delay to batch rapid changes
  };

  // Handle field type conversion
  const convertFieldValue = (value: string, type: EditableField['type']): any => {
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      case 'date':
        return value ? new Date(value) : value;
      default:
        return value;
    }
  };

  // Format field value for display
  const formatFieldValue = (value: any, type: EditableField['type']): string => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'date':
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        return value;
      default:
        return String(value);
    }
  };

  // Validate field value with comprehensive validation
  const validateFieldValue = (value: string, field: EditableField): string | null => {
    if (field.required && !value.trim()) {
      return 'This field is required';
    }

    if (!value.trim()) {
      return null; // Empty non-required fields are valid
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        // Additional validation for specific number fields
        if (field.key.toLowerCase().includes('gpa') || field.key.toLowerCase().includes('cgpa')) {
          if (num < 0 || num > 4) {
            return 'GPA should be between 0 and 4';
          }
        }
        break;
      
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'Please enter a valid date';
        }
        // Check if date is reasonable (not too far in past or future)
        const currentYear = new Date().getFullYear();
        const inputYear = date.getFullYear();
        if (inputYear < 1900 || inputYear > currentYear + 10) {
          return 'Please enter a reasonable date';
        }
        break;
    }

    // Custom regex validation
    if (field.validation && value) {
      try {
        const regex = new RegExp(field.validation);
        if (!regex.test(value)) {
          return 'Invalid format for this field';
        }
      } catch (error) {
        console.warn('Invalid regex pattern:', field.validation);
      }
    }

    return null;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Generating preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Validation Results */}
      {validation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
              Template Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {validation.errors.length > 0 && (
              <div>
                <Badge variant="destructive" className="mb-2">Errors</Badge>
                <ul className="text-sm text-red-600 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div>
                <Badge variant="outline" className="mb-2">Warnings</Badge>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.missingFields.length > 0 && (
              <div>
                <Badge variant="secondary" className="mb-2">Missing Field Mappings</Badge>
                <ul className="text-sm text-gray-600 space-y-1">
                  {validation.missingFields.map((field, index) => (
                    <li key={index}>• {field}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.isValid && validation.warnings.length === 0 && (
              <p className="text-sm text-green-600">Template is valid and ready for use.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editable Fields */}
      {editable && preview && preview.editableFields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Editable Fields
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preview.editableFields.map((field, index) => {
                  const currentValue = customData[field.key as keyof DocumentStudentData] ?? field.value;
                  const formattedValue = formatFieldValue(currentValue, field.type);
                  const validationError = validateFieldValue(formattedValue, field);

                  return (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`field-${index}`} className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={`field-${index}`}
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={formattedValue}
                        onChange={(e) => {
                          const convertedValue = convertFieldValue(e.target.value, field.type);
                          handleFieldChange(field.key, convertedValue);
                        }}
                        className={validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                        placeholder={field.label}
                        aria-invalid={!!validationError}
                        aria-describedby={validationError ? `field-${index}-error` : undefined}
                      />
                      {validationError && (
                        <p id={`field-${index}-error`} className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {validationError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preview.editableFields.map((field, index) => {
                  const currentValue = customData[field.key as keyof DocumentStudentData] ?? field.value;
                  return (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-700">{field.label}:</span>
                      <span className="text-sm text-gray-900">{String(currentValue || 'Not set')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Fields Alert */}
      {preview && preview.missingFields.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Missing field mappings:</strong> {preview.missingFields.join(', ')}
            <br />
            <span className="text-sm text-gray-600">
              These placeholders in the template don't have corresponding data mappings.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Document Preview */}
      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Document Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded-lg p-4 bg-white shadow-sm overflow-auto max-h-96"
              dangerouslySetInnerHTML={{ __html: preview.htmlContent }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TemplateEngineComponent;