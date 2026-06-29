import { AdmissionFormState } from './types';

export type FieldErrors = Partial<Record<keyof AdmissionFormState, string>>;

const REQUIRED_BY_STEP: Record<number, { field: keyof AdmissionFormState; label: string }[]> = {
  1: [
    { field: 'fullNameBangla', label: 'Full name (Bangla)' },
    { field: 'fullNameEnglish', label: 'Full name (English)' },
    { field: 'fatherName', label: "Father's name" },
    { field: 'fatherNID', label: "Father's NID" },
    { field: 'motherName', label: "Mother's name" },
    { field: 'motherNID', label: "Mother's NID" },
    { field: 'dateOfBirth', label: 'Date of birth' },
    { field: 'gender', label: 'Gender' },
    { field: 'birthCertificate', label: 'Birth certificate number' },
    { field: 'religion', label: 'Religion' },
    { field: 'maritalStatus', label: 'Marital status' },
  ],
  2: [
    { field: 'mobile', label: 'Mobile number' },
    { field: 'email', label: 'Email address' },
    { field: 'guardianMobile', label: "Guardian's mobile" },
    { field: 'presentAddress', label: 'Present address' },
    { field: 'presentDivision', label: 'Division' },
    { field: 'presentDistrict', label: 'District' },
    { field: 'presentUpazila', label: 'Upazila' },
    { field: 'presentPoliceStation', label: 'Police station' },
    { field: 'presentPostOffice', label: 'Post office' },
    { field: 'presentWard', label: 'Ward number' },
  ],
  3: [
    { field: 'sscBoard', label: 'Board' },
    { field: 'sscRoll', label: 'Roll number' },
    { field: 'sscYear', label: 'Passing year' },
    { field: 'sscGPA', label: 'GPA' },
    { field: 'sscGroup', label: 'Group' },
    { field: 'sscInstitution', label: 'Institution name' },
  ],
  4: [
    { field: 'department', label: 'Department' },
    { field: 'shift', label: 'Shift' },
    { field: 'session', label: 'Session' },
    { field: 'semester', label: 'Semester' },
    { field: 'admissionType', label: 'Admission type' },
  ],
  5: [
    { field: 'photo', label: 'Passport-size photo' },
    { field: 'sscMarksheet', label: 'SSC marksheet' },
    { field: 'birthCertificateDoc', label: 'Birth certificate' },
    { field: 'fatherNIDFront', label: "Father's NID (front)" },
    { field: 'fatherNIDBack', label: "Father's NID (back)" },
    { field: 'motherNIDFront', label: "Mother's NID (front)" },
    { field: 'motherNIDBack', label: "Mother's NID (back)" },
  ],
};

const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^01\d{9}$/;

/**
 * Returns a { field: message } map of problems for the given step.
 * Empty object means the step is valid.
 *
 * `satisfiedDocs` (step 5) is the set of document fields already satisfied by a
 * PREVIOUSLY uploaded file on the server — e.g. when re-applying after a
 * rejection. Such a field is valid even though no new file is in the form.
 */
export function getStepErrors(
  step: number,
  data: AdmissionFormState,
  satisfiedDocs?: Set<string>,
): FieldErrors {
  const errors: FieldErrors = {};
  const required = REQUIRED_BY_STEP[step] || [];

  for (const { field, label } of required) {
    if (isEmpty(data[field])) {
      // A required document already uploaded on the server counts as satisfied.
      if (step === 5 && satisfiedDocs?.has(field as string)) continue;
      errors[field] = `${label} is required`;
    }
  }

  // Friendly format checks (only when a value is present).
  if (step === 2) {
    if (!errors.email && data.email && !EMAIL_RE.test(data.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!errors.mobile && data.mobile && !MOBILE_RE.test(data.mobile.trim())) {
      errors.mobile = 'Enter an 11-digit number (e.g. 01XXXXXXXXX)';
    }
    if (!errors.guardianMobile && data.guardianMobile && !MOBILE_RE.test(data.guardianMobile.trim())) {
      errors.guardianMobile = 'Enter an 11-digit number (e.g. 01XXXXXXXXX)';
    }
  }

  if (step === 3 && !errors.sscGPA && data.sscGPA) {
    const gpa = parseFloat(data.sscGPA);
    if (Number.isNaN(gpa) || gpa < 0 || gpa > 5) {
      errors.sscGPA = 'GPA must be a number between 0.00 and 5.00';
    }
  }

  return errors;
}

export const stepHasErrors = (step: number, data: AdmissionFormState): boolean =>
  Object.keys(getStepErrors(step, data)).length > 0;
