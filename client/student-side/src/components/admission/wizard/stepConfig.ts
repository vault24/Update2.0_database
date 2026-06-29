import { User, MapPin, GraduationCap, BookOpen, Upload, CheckCircle } from 'lucide-react';

export const steps = [
  { id: 1, title: 'Personal Information', shortTitle: 'Personal', icon: User },
  { id: 2, title: 'Contact & Address', shortTitle: 'Contact', icon: MapPin },
  { id: 3, title: 'Educational Background', shortTitle: 'Education', icon: GraduationCap },
  { id: 4, title: 'Current Academic Info', shortTitle: 'Academic', icon: BookOpen },
  { id: 5, title: 'Documents Upload', shortTitle: 'Documents', icon: Upload },
  { id: 6, title: 'Review & Submit', shortTitle: 'Review', icon: CheckCircle },
];

// ── Bangladesh divisions (value stored lowercase) ──────────────────────────
export const divisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'];

// District list per division — keyed by the lowercased division name so it
// matches the value stored on the form. Powers the dependent District dropdown.
export const districtsByDivision: Record<string, string[]> = {
  dhaka: ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  chittagong: ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', "Cox's Bazar", 'Cumilla', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati'],
  rajshahi: ['Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Rajshahi', 'Sirajganj'],
  khulna: ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  barisal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
};

/** Districts that belong to a given (lowercased) division value. */
export const getDistricts = (division?: string): string[] =>
  (division && districtsByDivision[division.toLowerCase()]) || [];

// ── Generic option lists ───────────────────────────────────────────────────
export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
export const groups = ['A', 'B'];

export const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const religionOptions = [
  { value: 'islam', label: 'Islam' },
  { value: 'hinduism', label: 'Hinduism' },
  { value: 'christianity', label: 'Christianity' },
  { value: 'buddhism', label: 'Buddhism' },
  { value: 'other', label: 'Other' },
];

export const sscBoards = [
  'dhaka', 'rajshahi', 'comilla', 'chittagong', 'jessore',
  'barisal', 'sylhet', 'dinajpur', 'madrasah', 'technical',
].map((b) => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }));

export const sscGroups = [
  { value: 'science', label: 'Science' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'arts', label: 'Arts' },
  { value: 'vocational', label: 'Vocational' },
];

export const shiftOptions = [
  { value: 'Morning', label: 'Morning' },
  { value: 'Day', label: 'Day' },
];

// All eight semesters.
export const semesterOptions = [
  { value: '1st', label: 'First Semester' },
  { value: '2nd', label: 'Second Semester' },
  { value: '3rd', label: 'Third Semester' },
  { value: '4th', label: 'Fourth Semester' },
  { value: '5th', label: 'Fifth Semester' },
  { value: '6th', label: 'Sixth Semester' },
  { value: '7th', label: 'Seventh Semester' },
  { value: '8th', label: 'Eighth Semester' },
];

// Admission types (only these three).
export const admissionTypeOptions = [
  { value: 'regular', label: 'Regular' },
  { value: 'after_hsc', label: 'After HSC' },
  { value: 'transfer', label: 'Transfer' },
];

/**
 * Passing years — generated from the current year going back `count` years.
 * Never hardcoded, so the list rolls forward automatically every year.
 * e.g. in 2025 → [2025, 2024, … 2006].
 */
export const getPassingYears = (count = 20): string[] => {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(current - i));
};

/**
 * Academic sessions — generated from the current year, formatted "YYYY-YY".
 * e.g. in 2025 → ["2025-26", "2024-25", …].
 */
export const getSessions = (count = 8): string[] => {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const start = current - i;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  });
};
