import { AdmissionFormState } from './types';
import { ADMISSION_DOCUMENT_FIELDS, DEFAULT_DOCUMENT_REQUIREMENTS } from './stepConfig';

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
  // Step 5 (documents) is validated dynamically from the admin's document
  // requirement settings — see the docRequirements handling in getStepErrors.
};

const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Permanent address is mandatory. When "Same as present" is ticked the present
// address is copied on submit; otherwise every core permanent field must be
// filled in explicitly.
const PERMANENT_ADDRESS_REQUIRED: { field: keyof AdmissionFormState; label: string }[] = [
  { field: 'permanentAddress', label: 'Permanent address' },
  { field: 'permanentDivision', label: 'Division (permanent)' },
  { field: 'permanentDistrict', label: 'District (permanent)' },
  { field: 'permanentUpazila', label: 'Upazila (permanent)' },
  { field: 'permanentPoliceStation', label: 'Police station (permanent)' },
  { field: 'permanentPostOffice', label: 'Post office (permanent)' },
  { field: 'permanentWard', label: 'Ward number (permanent)' },
];

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
  docRequirements?: Record<string, boolean>,
): FieldErrors {
  const errors: FieldErrors = {};
  const required = REQUIRED_BY_STEP[step] || [];

  for (const { field, label } of required) {
    if (isEmpty(data[field])) {
      errors[field] = `${label} is required`;
    }
  }

  // Step 5 — documents are required per the admin's Admission Settings.
  if (step === 5) {
    const reqMap = docRequirements || DEFAULT_DOCUMENT_REQUIREMENTS;
    for (const doc of ADMISSION_DOCUMENT_FIELDS) {
      if (!reqMap[doc.key]) continue; // optional document
      const field = doc.key as keyof AdmissionFormState;
      if (!isEmpty(data[field])) continue;
      // A required document already uploaded on the server counts as satisfied.
      if (satisfiedDocs?.has(doc.key)) continue;
      errors[field] = `${doc.label} is required`;
    }
  }

  // Permanent address is required unless it mirrors the present address.
  if (step === 2 && !data.sameAsPresent) {
    for (const { field, label } of PERMANENT_ADDRESS_REQUIRED) {
      if (isEmpty(data[field])) {
        errors[field] = `${label} is required`;
      }
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
