import { User, MapPin, GraduationCap, BookOpen, Upload, CheckCircle } from 'lucide-react';

export const steps = [
  { id: 1, title: 'Personal Information', shortTitle: 'Personal', icon: User },
  { id: 2, title: 'Contact & Address', shortTitle: 'Contact', icon: MapPin },
  { id: 3, title: 'Educational Background', shortTitle: 'Education', icon: GraduationCap },
  { id: 4, title: 'Academic Information', shortTitle: 'Academic', icon: BookOpen },
  { id: 5, title: 'Documents Upload', shortTitle: 'Documents', icon: Upload },
  { id: 6, title: 'Review & Submit', shortTitle: 'Review', icon: CheckCircle },
];

// ── Bangladesh divisions + districts (dependent dropdown) ──────────────────
export const divisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'];

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

export const getDistricts = (division?: string): string[] =>
  (division && districtsByDivision[division.toLowerCase()]) || [];

// ── Option lists (match the student admission + Student model choices) ─────
export const genderOptions = ['Male', 'Female', 'Other'];
export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
export const religionOptions = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'];
export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
export const sscBoards = ['Dhaka', 'Rajshahi', 'Comilla', 'Chittagong', 'Jessore', 'Barisal', 'Sylhet', 'Dinajpur', 'Madrasah', 'Technical'];
export const sscGroups = ['Science', 'Commerce', 'Arts', 'Vocational'];
export const shiftOptions = ['Morning', 'Day', 'Evening'];
export const academicGroups = ['A', 'B'];

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

/** Maps the semester value ('1st'…'8th') to the integer the backend expects. */
export const semesterToNumber = (v: string): number =>
  Math.max(1, Math.min(8, parseInt(v, 10) || 1));

export const admissionTypeOptions = [
  { value: 'regular', label: 'Regular' },
  { value: 'after_hsc', label: 'After HSC' },
  { value: 'transfer', label: 'Transfer' },
];

// Student status — values must match the Student model's STATUS_CHOICES.
export const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'discontinued', label: 'Discontinued' },
];

/** Passing years — current year first, going back `count` years (never hardcoded). */
export const getPassingYears = (count = 20): string[] => {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(current - i));
};

/** Academic sessions — generated "YYYY-YY" from the current year. */
export const getSessions = (count = 8): string[] => {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const start = current - i;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  });
};
