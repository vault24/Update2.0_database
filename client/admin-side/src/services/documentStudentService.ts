/**
 * Document Student Service
 * Enhanced student service for document generation with comprehensive data formatting
 */

import { studentService, Student } from './studentService';
import { DocumentStudentData } from '@/types/template';

export interface StudentSearchResult {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  semester: string;
  session: string;
  status: string;
  avatar?: string;
}

export interface DocumentDataValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackToCache?: boolean;
  useDefaults?: boolean;
}

export interface ServiceHealthStatus {
  isHealthy: boolean;
  lastError?: string;
  errorCount: number;
  lastSuccessfulCall?: Date;
}

export class DocumentStudentService {
  // Cache for frequently accessed student data
  private static studentCache: Map<string, { data: DocumentStudentData; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Error tracking and recovery
  private static errorCount = 0;
  private static lastError: string | null = null;
  private static lastSuccessfulCall: Date | null = null;
  private static readonly MAX_ERROR_COUNT = 10;
  private static readonly ERROR_RESET_INTERVAL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get student data formatted for document generation with enhanced error handling
   */
  static async getStudentForDocument(
    studentId: string, 
    options: ErrorRecoveryOptions = {}
  ): Promise<DocumentStudentData> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallbackToCache = true,
      useDefaults = true
    } = options;

    // Validate input
    if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
      throw new Error('Invalid student ID provided');
    }

    // Check service health
    if (!this.isServiceHealthy()) {
      if (fallbackToCache) {
        const cached = this.getCachedStudent(studentId);
        if (cached) {
          console.warn(`Service unhealthy, using cached data for student ${studentId}`);
          return cached;
        }
      }
      throw new Error('Service is currently unavailable and no cached data available');
    }

    // Check cache first
    const cached = this.studentCache.get(studentId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      this.recordSuccessfulCall();
      return cached.data;
    }

    // Attempt to fetch with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching student data for ${studentId}, attempt ${attempt}/${maxRetries}`);
        
        const student = await this.fetchStudentWithTimeout(studentId, 10000); // 10 second timeout
        const formattedData = this.formatStudentForDocument(student);
        
        // Validate the formatted data
        const validation = this.validateStudentData(formattedData);
        if (!validation.isValid && !useDefaults) {
          throw new Error(`Student data validation failed: ${validation.missingFields.join(', ')}`);
        }

        // Apply defaults if needed and allowed
        const finalData = useDefaults ? this.mergeWithDefaults(formattedData) : formattedData;
        
        // Cache the result
        this.studentCache.set(studentId, {
          data: finalData,
          timestamp: Date.now()
        });

        this.recordSuccessfulCall();
        return finalData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.recordError(lastError.message);
        
        console.error(`Attempt ${attempt} failed for student ${studentId}:`, lastError.message);
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed, try fallback strategies
    if (fallbackToCache) {
      const staleCache = this.getCachedStudent(studentId, true); // Allow stale cache
      if (staleCache) {
        console.warn(`All retries failed, using stale cached data for student ${studentId}`);
        return staleCache;
      }
    }

    // Final fallback: create minimal student data if allowed
    if (useDefaults) {
      console.warn(`Creating minimal student data for ${studentId} due to fetch failure`);
      return this.createMinimalStudentData(studentId, lastError?.message);
    }

    throw new Error(`Failed to fetch student data after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Clear cache for a specific student or all students
   */
  static clearCache(studentId?: string): void {
    if (studentId) {
      this.studentCache.delete(studentId);
    } else {
      this.studentCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.studentCache.size,
      entries: Array.from(this.studentCache.keys())
    };
  }

  /**
   * Search students for document generation with enhanced filtering
   */
  static async searchStudentsForDocuments(
    query: string, 
    filters?: {
      department?: string;
      semester?: number;
      status?: string;
      session?: string;
      limit?: number;
    }
  ): Promise<StudentSearchResult[]> {
    try {
      const students = await studentService.searchStudents(query);
      let filteredStudents = students;

      // Apply additional filters
      if (filters) {
        filteredStudents = students.filter(student => {
          if (filters.department) {
            const studentDept = typeof student.department === 'object' 
              ? student.department.name 
              : student.departmentName || student.department || '';
            if (!studentDept.toLowerCase().includes(filters.department.toLowerCase())) {
              return false;
            }
          }

          if (filters.semester && student.semester !== filters.semester) {
            return false;
          }

          if (filters.status && student.status !== filters.status) {
            return false;
          }

          if (filters.session && student.session !== filters.session) {
            return false;
          }

          return true;
        });
      }

      // Sort by relevance (name match first, then roll number match)
      filteredStudents.sort((a, b) => {
        const queryLower = query.toLowerCase();
        const aNameMatch = a.fullNameEnglish.toLowerCase().includes(queryLower);
        const bNameMatch = b.fullNameEnglish.toLowerCase().includes(queryLower);
        const aRollMatch = a.currentRollNumber?.toLowerCase().includes(queryLower);
        const bRollMatch = b.currentRollNumber?.toLowerCase().includes(queryLower);

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        if (aRollMatch && !bRollMatch) return -1;
        if (!aRollMatch && bRollMatch) return 1;

        return a.fullNameEnglish.localeCompare(b.fullNameEnglish);
      });

      // Apply limit
      if (filters?.limit) {
        filteredStudents = filteredStudents.slice(0, filters.limit);
      }

      return filteredStudents.map(student => this.formatStudentSearchResult(student));
    } catch (error) {
      console.error('Error searching students:', error);
      throw new Error(`Student search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple students for batch document generation with detailed results
   */
  static async getStudentsForDocuments(studentIds: string[]): Promise<{
    successful: DocumentStudentData[];
    failed: { studentId: string; error: string }[];
    summary: { total: number; successful: number; failed: number };
  }> {
    const successful: DocumentStudentData[] = [];
    const failed: { studentId: string; error: string }[] = [];
    
    // Process students in parallel for better performance
    const promises = studentIds.map(async (id) => {
      try {
        const studentData = await this.getStudentForDocument(id);
        return { success: true, data: studentData, id };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          id 
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successful.push(result.value.data);
        } else {
          failed.push({
            studentId: result.value.id,
            error: result.value.error
          });
        }
      } else {
        failed.push({
          studentId: studentIds[index],
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });
    
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
   * Get students by department for batch operations
   */
  static async getStudentsByDepartment(
    departmentId: string, 
    filters?: {
      semester?: number;
      status?: string;
      session?: string;
    }
  ): Promise<StudentSearchResult[]> {
    try {
      const studentFilters = {
        department: departmentId,
        ...filters,
        page_size: 1000 // Get a large number for batch operations
      };

      const response = await studentService.getStudents(studentFilters);
      return response.results.map(student => this.formatStudentSearchResult(student));
    } catch (error) {
      console.error('Error fetching students by department:', error);
      throw new Error(`Failed to fetch students by department: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format student data for document generation
   */
  private static formatStudentForDocument(student: Student): DocumentStudentData {
    // Format addresses
    const formatAddress = (address: any): string => {
      if (!address) return '';
      const parts = [
        address.village,
        address.postOffice,
        address.upazila,
        address.district,
        address.division
      ].filter(Boolean);
      return parts.join(', ');
    };

    // Get department name
    const departmentName = typeof student.department === 'object' 
      ? student.department.name 
      : student.departmentName || student.department || '';

    const departmentCode = typeof student.department === 'object' 
      ? student.department.code 
      : '';

    // Calculate CGPA from semester results
    const cgpa = this.calculateCGPA(student.semesterResults);

    // Calculate total credits
    const totalCredits = this.calculateTotalCredits(student.semesterResults);

    // Format dates
    const formatDate = (dateString?: string): Date | undefined => {
      return dateString ? new Date(dateString) : undefined;
    };

    // Determine current status
    const currentStatus = this.mapStudentStatus(student.status);

    return {
      // Personal Information
      id: student.id,
      name: student.fullNameEnglish,
      nameBangla: student.fullNameBangla,
      fatherName: student.fatherName,
      motherName: student.motherName,
      dateOfBirth: new Date(student.dateOfBirth),
      bloodGroup: student.bloodGroup,
      religion: student.religion,
      nationality: student.nationality,
      gender: student.gender,

      // Academic Information
      rollNumber: student.currentRollNumber || '',
      registrationNumber: student.currentRegistrationNumber || '',
      department: departmentName,
      departmentCode: departmentCode,
      semester: student.semester?.toString() || '',
      session: student.session,
      cgpa: cgpa,
      totalCredits: totalCredits,
      shift: student.shift,

      // Contact Information
      address: formatAddress(student.presentAddress),
      presentAddress: formatAddress(student.presentAddress),
      permanentAddress: formatAddress(student.permanentAddress),
      phoneNumber: student.mobileStudent,
      email: student.email,

      // Institutional Information
      admissionDate: formatDate(student.createdAt), // Using creation date as admission date
      graduationDate: this.getGraduationDate(student),
      currentStatus: currentStatus,

      // Additional Fields
      photo: student.profilePhoto,
      signature: undefined, // Not available in current student model

      // Previous Education
      previousInstitution: student.institutionName,
      previousBoard: student.board,
      previousGPA: student.gpa,
      passingYear: student.passingYear
    };
  }

  /**
   * Format student for search results
   */
  private static formatStudentSearchResult(student: Student): StudentSearchResult {
    const departmentName = typeof student.department === 'object' 
      ? student.department.name 
      : student.departmentName || student.department || '';

    return {
      id: student.id,
      name: student.fullNameEnglish,
      rollNumber: student.currentRollNumber || '',
      department: departmentName,
      semester: student.semester?.toString() || '',
      session: student.session,
      status: student.status,
      avatar: student.profilePhoto
    };
  }

  /**
   * Calculate CGPA from semester results
   */
  private static calculateCGPA(semesterResults?: any[]): number | undefined {
    if (!semesterResults || semesterResults.length === 0) return undefined;

    const validResults = semesterResults.filter(result => 
      result.resultType === 'gpa' && result.cgpa !== undefined
    );

    if (validResults.length === 0) return undefined;

    // Get the latest CGPA
    const latestResult = validResults.sort((a, b) => 
      (b.year * 10 + b.semester) - (a.year * 10 + a.semester)
    )[0];

    return latestResult.cgpa;
  }

  /**
   * Calculate total credits from semester results
   */
  private static calculateTotalCredits(semesterResults?: any[]): number | undefined {
    if (!semesterResults || semesterResults.length === 0) return undefined;

    let totalCredits = 0;
    const processedSemesters = new Set<string>();

    semesterResults.forEach(result => {
      const semesterKey = `${result.year}-${result.semester}`;
      if (processedSemesters.has(semesterKey)) return;

      if (result.subjects && Array.isArray(result.subjects)) {
        result.subjects.forEach((subject: any) => {
          if (subject.credit && subject.grade !== 'F') {
            totalCredits += subject.credit;
          }
        });
      }

      processedSemesters.add(semesterKey);
    });

    return totalCredits > 0 ? totalCredits : undefined;
  }

  /**
   * Map student status to document status
   */
  private static mapStudentStatus(status: string): 'Active' | 'Graduated' | 'Discontinued' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'graduated':
        return 'Graduated';
      case 'discontinued':
      case 'inactive':
        return 'Discontinued';
      default:
        return 'Active';
    }
  }

  /**
   * Get graduation date from student data
   */
  private static getGraduationDate(student: Student): Date | undefined {
    // If student is graduated, estimate graduation date
    if (student.status === 'graduated') {
      // Try to get from semester results or estimate based on session
      if (student.semesterResults && student.semesterResults.length > 0) {
        const latestResult = student.semesterResults.sort((a, b) => 
          (b.year * 10 + b.semester) - (a.year * 10 + a.semester)
        )[0];
        
        // Estimate graduation date (usually end of academic year)
        return new Date(latestResult.year, 6, 1); // July 1st of the year
      }
      
      // Fallback: estimate based on session (4-year program)
      if (student.session) {
        const sessionYear = parseInt(student.session.split('-')[0]);
        if (!isNaN(sessionYear)) {
          return new Date(sessionYear + 4, 6, 1);
        }
      }
    }
    
    return undefined;
  }

  /**
   * Validate student data for document generation with comprehensive checks
   */
  static validateStudentData(data: DocumentStudentData): DocumentDataValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    const requiredFields: (keyof DocumentStudentData)[] = [
      'name', 'fatherName', 'motherName', 'rollNumber', 'department'
    ];

    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && (data[field] as string).trim() === '')) {
        missingFields.push(field);
      }
    });

    // Check important optional fields
    const importantFields: (keyof DocumentStudentData)[] = [
      'registrationNumber', 'session', 'dateOfBirth'
    ];

    importantFields.forEach(field => {
      if (!data[field]) {
        warnings.push(`Missing ${field} - may be required for some document types`);
      }
    });

    // Validate data formats and constraints
    if (data.email && !this.isValidEmail(data.email)) {
      warnings.push('Invalid email format');
    }

    if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
      warnings.push('Invalid phone number format');
    }

    if (data.cgpa !== undefined && data.cgpa !== null) {
      if (data.cgpa < 0 || data.cgpa > 4) {
        warnings.push('CGPA should be between 0 and 4');
      }
    }

    // Validate date fields
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth);
      const currentDate = new Date();
      const age = currentDate.getFullYear() - birthDate.getFullYear();
      
      if (age < 15 || age > 50) {
        warnings.push('Date of birth seems unrealistic for a student');
      }
    }

    if (data.admissionDate && data.graduationDate) {
      const admission = new Date(data.admissionDate);
      const graduation = new Date(data.graduationDate);
      
      if (graduation <= admission) {
        warnings.push('Graduation date should be after admission date');
      }
    }

    // Validate academic data consistency
    if (data.semester && data.currentStatus === 'Graduated') {
      const semesterNum = parseInt(data.semester);
      if (semesterNum < 8) {
        warnings.push('Graduated student should have completed at least 8 semesters');
      }
    }

    // Validate name fields for proper formatting
    if (data.name && !/^[a-zA-Z\s.'-]+$/.test(data.name)) {
      warnings.push('Student name contains invalid characters');
    }

    if (data.fatherName && !/^[a-zA-Z\s.'-]+$/.test(data.fatherName)) {
      warnings.push('Father name contains invalid characters');
    }

    if (data.motherName && !/^[a-zA-Z\s.'-]+$/.test(data.motherName)) {
      warnings.push('Mother name contains invalid characters');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Validate student data for specific document type
   */
  static validateForDocumentType(
    data: DocumentStudentData, 
    documentType: string
  ): DocumentDataValidationResult {
    const baseValidation = this.validateStudentData(data);
    const additionalMissing: string[] = [];
    const additionalWarnings: string[] = [];

    switch (documentType.toLowerCase()) {
      case 'id-card':
      case 'idcard':
        if (!data.bloodGroup) additionalMissing.push('bloodGroup');
        if (!data.photo) additionalWarnings.push('Photo is recommended for ID cards');
        break;

      case 'transcript':
        if (!data.cgpa) additionalMissing.push('cgpa');
        if (!data.totalCredits) additionalWarnings.push('Total credits information is missing');
        if (!data.registrationNumber) additionalMissing.push('registrationNumber');
        break;

      case 'testimonial':
      case 'character':
        if (data.currentStatus === 'Graduated' && !data.graduationDate) {
          additionalWarnings.push('Graduation date is missing for graduated student');
        }
        break;

      case 'eligibility':
        if (!data.cgpa) additionalMissing.push('cgpa');
        if (!data.registrationNumber) additionalMissing.push('registrationNumber');
        if (!data.session) additionalMissing.push('session');
        break;
    }

    return {
      isValid: baseValidation.isValid && additionalMissing.length === 0,
      missingFields: [...baseValidation.missingFields, ...additionalMissing],
      warnings: [...baseValidation.warnings, ...additionalWarnings]
    };
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[0-9+\-\s()]+$/;
    return phoneRegex.test(phone) && phone.replace(/[^0-9]/g, '').length >= 10;
  }

  /**
   * Get default values for missing fields
   */
  static getDefaultValues(): Partial<DocumentStudentData> {
    return {
      nationality: 'Bangladeshi',
      religion: 'Islam',
      currentStatus: 'Active',
      shift: 'Day'
    };
  }

  /**
   * Merge student data with defaults
   */
  static mergeWithDefaults(studentData: DocumentStudentData): DocumentStudentData {
    const defaults = this.getDefaultValues();
    return { ...defaults, ...studentData };
  }

  /**
   * Format student data for specific document type with enhanced defaults
   */
  static formatForDocumentType(
    studentData: DocumentStudentData, 
    documentType: string
  ): DocumentStudentData {
    const formatted = { ...studentData };

    // Apply defaults first
    const defaults = this.getDefaultValues();
    Object.keys(defaults).forEach(key => {
      if (!formatted[key as keyof DocumentStudentData]) {
        (formatted as any)[key] = defaults[key as keyof typeof defaults];
      }
    });

    switch (documentType.toLowerCase()) {
      case 'id-card':
      case 'idcard':
        // For ID cards, ensure we have essential fields
        if (!formatted.bloodGroup) formatted.bloodGroup = 'Not Specified';
        if (!formatted.photo) formatted.photo = ''; // Placeholder for missing photo
        break;
        
      case 'transcript':
        // For transcripts, ensure academic data is present
        if (formatted.cgpa === undefined || formatted.cgpa === null) formatted.cgpa = 0;
        if (!formatted.totalCredits) formatted.totalCredits = 0;
        if (!formatted.registrationNumber) formatted.registrationNumber = 'N/A';
        break;
        
      case 'testimonial':
      case 'character':
        // For testimonials, ensure graduation info is available
        if (formatted.currentStatus === 'Graduated' && !formatted.graduationDate) {
          // Estimate graduation date based on session
          if (formatted.session) {
            const sessionYear = parseInt(formatted.session.split('-')[0]);
            if (!isNaN(sessionYear)) {
              formatted.graduationDate = new Date(sessionYear + 4, 6, 1);
            }
          } else {
            const currentYear = new Date().getFullYear();
            formatted.graduationDate = new Date(currentYear, 6, 1);
          }
        }
        break;

      case 'eligibility':
        // For eligibility statements, ensure all required academic info
        if (formatted.cgpa === undefined || formatted.cgpa === null) formatted.cgpa = 0;
        if (!formatted.registrationNumber) formatted.registrationNumber = 'Pending';
        break;

      case 'bonafide':
        // For bonafide certificates, ensure current status is clear
        if (!formatted.currentStatus) formatted.currentStatus = 'Active';
        break;
    }

    return formatted;
  }

  /**
   * Get student data summary for quick preview
   */
  static getStudentSummary(data: DocumentStudentData): {
    name: string;
    rollNumber: string;
    department: string;
    session: string;
    status: string;
    completeness: number; // Percentage of filled fields
  } {
    const totalFields = Object.keys(data).length;
    const filledFields = Object.values(data).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;

    return {
      name: data.name,
      rollNumber: data.rollNumber,
      department: data.department,
      session: data.session,
      status: data.currentStatus,
      completeness: Math.round((filledFields / totalFields) * 100)
    };
  }

  /**
   * Compare two student data objects and return differences
   */
  static compareStudentData(
    original: DocumentStudentData, 
    modified: DocumentStudentData
  ): {
    changed: Array<{ field: string; original: any; modified: any }>;
    hasChanges: boolean;
  } {
    const changed: Array<{ field: string; original: any; modified: any }> = [];

    Object.keys(original).forEach(key => {
      const originalValue = (original as any)[key];
      const modifiedValue = (modified as any)[key];

      if (originalValue !== modifiedValue) {
        changed.push({
          field: key,
          original: originalValue,
          modified: modifiedValue
        });
      }
    });

    return {
      changed,
      hasChanges: changed.length > 0
    };
  }

  /**
   * Sanitize student data for document generation
   */
  static sanitizeStudentData(data: DocumentStudentData): DocumentStudentData {
    const sanitized = { ...data };

    // Trim string fields
    Object.keys(sanitized).forEach(key => {
      const value = (sanitized as any)[key];
      if (typeof value === 'string') {
        (sanitized as any)[key] = value.trim();
      }
    });

    // Normalize names (proper case)
    if (sanitized.name) {
      sanitized.name = this.toProperCase(sanitized.name);
    }
    if (sanitized.fatherName) {
      sanitized.fatherName = this.toProperCase(sanitized.fatherName);
    }
    if (sanitized.motherName) {
      sanitized.motherName = this.toProperCase(sanitized.motherName);
    }

    // Normalize department name
    if (sanitized.department) {
      sanitized.department = this.toProperCase(sanitized.department);
    }

    return sanitized;
  }

  /**
   * Convert string to proper case
   */
  private static toProperCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Fetch student with timeout
   */
  private static async fetchStudentWithTimeout(studentId: string, timeout: number): Promise<Student> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      studentService.getStudent(studentId)
        .then(student => {
          clearTimeout(timeoutId);
          resolve(student);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Get cached student data with optional stale cache support
   */
  private static getCachedStudent(studentId: string, allowStale = false): DocumentStudentData | null {
    const cached = this.studentCache.get(studentId);
    if (!cached) return null;

    const isStale = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isStale && !allowStale) return null;

    return cached.data;
  }

  /**
   * Create minimal student data as fallback
   */
  private static createMinimalStudentData(studentId: string, errorMessage?: string): DocumentStudentData {
    const defaults = this.getDefaultValues();
    
    return {
      id: studentId,
      name: 'Student Name Not Available',
      fatherName: 'Father Name Not Available',
      motherName: 'Mother Name Not Available',
      dateOfBirth: new Date('1990-01-01'), // Default birth date
      rollNumber: 'N/A',
      registrationNumber: 'N/A',
      department: 'Department Not Available',
      semester: 'N/A',
      session: 'N/A',
      address: 'Address Not Available',
      gender: 'Not Specified',
      ...defaults,
      // Add error information for debugging
      _errorInfo: {
        createdAsFallback: true,
        originalError: errorMessage,
        createdAt: new Date()
      }
    } as DocumentStudentData;
  }

  /**
   * Record successful API call
   */
  private static recordSuccessfulCall(): void {
    this.lastSuccessfulCall = new Date();
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Record API error
   */
  private static recordError(errorMessage: string): void {
    this.errorCount++;
    this.lastError = errorMessage;
    
    // Reset error count after interval
    if (this.lastSuccessfulCall && 
        Date.now() - this.lastSuccessfulCall.getTime() > this.ERROR_RESET_INTERVAL) {
      this.errorCount = 1; // Reset but keep current error
    }
  }

  /**
   * Check if service is healthy
   */
  private static isServiceHealthy(): boolean {
    return this.errorCount < this.MAX_ERROR_COUNT;
  }

  /**
   * Get service health status
   */
  static getServiceHealth(): ServiceHealthStatus {
    return {
      isHealthy: this.isServiceHealthy(),
      lastError: this.lastError || undefined,
      errorCount: this.errorCount,
      lastSuccessfulCall: this.lastSuccessfulCall || undefined
    };
  }

  /**
   * Reset service health status
   */
  static resetServiceHealth(): void {
    this.errorCount = 0;
    this.lastError = null;
    this.lastSuccessfulCall = new Date();
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced search with error recovery
   */
  static async searchStudentsForDocumentsWithRecovery(
    query: string,
    filters?: {
      department?: string;
      semester?: number;
      status?: string;
      session?: string;
      limit?: number;
    },
    options: ErrorRecoveryOptions = {}
  ): Promise<StudentSearchResult[]> {
    const { maxRetries = 2, retryDelay = 500 } = options;

    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.searchStudentsForDocuments(query, filters);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.recordError(lastError.message);
        
        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt);
        }
      }
    }

    // Return empty results with warning instead of throwing
    console.warn(`Student search failed after ${maxRetries} attempts:`, lastError?.message);
    return [];
  }

  /**
   * Batch operation with enhanced error handling
   */
  static async getStudentsForDocumentsWithRecovery(
    studentIds: string[],
    options: ErrorRecoveryOptions = {}
  ): Promise<{
    successful: DocumentStudentData[];
    failed: { studentId: string; error: string }[];
    summary: { total: number; successful: number; failed: number };
    warnings: string[];
  }> {
    if (!studentIds || studentIds.length === 0) {
      throw new Error('Student IDs array cannot be empty');
    }

    const successful: DocumentStudentData[] = [];
    const failed: { studentId: string; error: string }[] = [];
    const warnings: string[] = [];

    // Validate all student IDs first
    const validIds = studentIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
    if (validIds.length !== studentIds.length) {
      warnings.push(`${studentIds.length - validIds.length} invalid student IDs were filtered out`);
    }

    // Process in smaller batches to avoid overwhelming the service
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < validIds.length; i += batchSize) {
      batches.push(validIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (id) => {
        try {
          const studentData = await this.getStudentForDocument(id, options);
          return { success: true, data: studentData, id };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            id
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const studentId = batch[index];
        
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successful.push(result.value.data);
          } else {
            failed.push({
              studentId: result.value.id,
              error: result.value.error
            });
          }
        } else {
          failed.push({
            studentId,
            error: result.reason?.message || 'Promise rejected'
          });
        }
      });

      // Small delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(100);
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: validIds.length,
        successful: successful.length,
        failed: failed.length
      },
      warnings
    };
  }

  /**
   * Validate and repair student data
   */
  static validateAndRepairStudentData(
    data: DocumentStudentData,
    documentType?: string
  ): {
    repaired: DocumentStudentData;
    repairs: Array<{ field: string; original: any; repaired: any; reason: string }>;
    validation: DocumentDataValidationResult;
  } {
    const repairs: Array<{ field: string; original: any; repaired: any; reason: string }> = [];
    const repaired = { ...data };

    // Repair common data issues
    Object.keys(repaired).forEach(key => {
      const value = (repaired as any)[key];
      
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== value) {
          repairs.push({
            field: key,
            original: value,
            repaired: trimmed,
            reason: 'Removed leading/trailing whitespace'
          });
          (repaired as any)[key] = trimmed;
        }

        // Fix common name formatting issues
        if (['name', 'fatherName', 'motherName', 'department'].includes(key)) {
          const properCase = this.toProperCase(trimmed);
          if (properCase !== trimmed && trimmed.length > 0) {
            repairs.push({
              field: key,
              original: trimmed,
              repaired: properCase,
              reason: 'Applied proper case formatting'
            });
            (repaired as any)[key] = properCase;
          }
        }
      }
    });

    // Apply document type specific repairs
    if (documentType) {
      const typeSpecificRepairs = this.applyDocumentTypeRepairs(repaired, documentType);
      repairs.push(...typeSpecificRepairs);
    }

    // Validate the repaired data
    const validation = documentType 
      ? this.validateForDocumentType(repaired, documentType)
      : this.validateStudentData(repaired);

    return {
      repaired,
      repairs,
      validation
    };
  }

  /**
   * Apply document type specific repairs
   */
  private static applyDocumentTypeRepairs(
    data: DocumentStudentData,
    documentType: string
  ): Array<{ field: string; original: any; repaired: any; reason: string }> {
    const repairs: Array<{ field: string; original: any; repaired: any; reason: string }> = [];

    switch (documentType.toLowerCase()) {
      case 'idcard':
        if (!data.bloodGroup || data.bloodGroup.trim() === '') {
          repairs.push({
            field: 'bloodGroup',
            original: data.bloodGroup,
            repaired: 'Not Specified',
            reason: 'ID card requires blood group information'
          });
          data.bloodGroup = 'Not Specified';
        }
        break;

      case 'transcript':
        if (data.cgpa === undefined || data.cgpa === null || data.cgpa < 0) {
          repairs.push({
            field: 'cgpa',
            original: data.cgpa,
            repaired: 0,
            reason: 'Transcript requires valid CGPA'
          });
          data.cgpa = 0;
        }
        break;
    }

    return repairs;
  }

  /**
   * Get comprehensive error report
   */
  static getErrorReport(): {
    serviceHealth: ServiceHealthStatus;
    cacheStats: { size: number; entries: string[] };
    recentErrors: string[];
    recommendations: string[];
  } {
    const health = this.getServiceHealth();
    const cache = this.getCacheStats();
    
    const recommendations: string[] = [];
    
    if (!health.isHealthy) {
      recommendations.push('Service is experiencing issues - consider using cached data');
    }
    
    if (cache.size === 0) {
      recommendations.push('No cached data available - first requests may be slower');
    }
    
    if (health.errorCount > 5) {
      recommendations.push('High error rate detected - check network connectivity');
    }

    return {
      serviceHealth: health,
      cacheStats: cache,
      recentErrors: health.lastError ? [health.lastError] : [],
      recommendations
    };
  }
}