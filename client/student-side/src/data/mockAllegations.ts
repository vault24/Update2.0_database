export type AllegationCategory = 
  | 'misbehavior' 
  | 'academic_dishonesty' 
  | 'discipline_violation' 
  | 'moral_misconduct' 
  | 'other';

export type SeverityLevel = 'minor' | 'moderate' | 'serious';

export type AllegationStatus = 'reported' | 'under_review' | 'action_taken' | 'resolved';

export interface Allegation {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  departmentId: string;
  departmentName: string;
  semester: string;
  shift: string;
  category: AllegationCategory;
  severity: SeverityLevel;
  description: string;
  teacherAdvice: string;
  suggestedAction?: string;
  attachmentUrl?: string;
  status: AllegationStatus;
  reportedBy: string;
  reportedAt: string;
  incidentDate: string;
  isEscalated: boolean;
  reviewNotes?: string;
  actionTaken?: string;
  resolvedAt?: string;
}

export const allegationCategories: { value: AllegationCategory; label: string; description: string }[] = [
  { value: 'misbehavior', label: 'Misbehavior', description: 'General misconduct in class or campus' },
  { value: 'academic_dishonesty', label: 'Academic Dishonesty', description: 'Cheating, plagiarism, or unfair means' },
  { value: 'discipline_violation', label: 'Discipline Violation', description: 'Breaking institutional rules' },
  { value: 'moral_misconduct', label: 'Moral Misconduct', description: 'Behavior against ethical standards' },
  { value: 'other', label: 'Other', description: 'Other behavioral concerns' },
];

export const severityLevels: { value: SeverityLevel; label: string; color: string; bgColor: string; description: string }[] = [
  { value: 'minor', label: 'Minor', color: 'bg-yellow-500', bgColor: 'bg-yellow-500/10', description: 'First-time or small issue, needs gentle guidance' },
  { value: 'moderate', label: 'Moderate', color: 'bg-orange-500', bgColor: 'bg-orange-500/10', description: 'Repeated issue or concerning behavior' },
  { value: 'serious', label: 'Serious', color: 'bg-destructive', bgColor: 'bg-destructive/10', description: 'Major incident requiring immediate attention' },
];

export const allegationStatuses: { value: AllegationStatus; label: string; color: string }[] = [
  { value: 'reported', label: 'Reported', color: 'bg-blue-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500' },
  { value: 'action_taken', label: 'Action Taken', color: 'bg-orange-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
];

// New department, semester, shift data
export const mockDepartments = [
  { id: 'cse', name: 'Computer Science & Technology', shortName: 'CSE' },
  { id: 'eee', name: 'Electrical & Electronic Engineering', shortName: 'EEE' },
  { id: 'civil', name: 'Civil Engineering', shortName: 'Civil' },
  { id: 'mech', name: 'Mechanical Engineering', shortName: 'Mech' },
  { id: 'rac', name: 'Refrigeration & Air Conditioning', shortName: 'RAC' },
];

export const mockSemesters = [
  { id: '1', name: '1st' },
  { id: '2', name: '2nd' },
  { id: '3', name: '3rd' },
  { id: '4', name: '4th' },
  { id: '5', name: '5th' },
  { id: '6', name: '6th' },
  { id: '7', name: '7th' },
  { id: '8', name: '8th' },
];

export const mockShifts = [
  { id: '1st', name: '1st Shift' },
  { id: '2nd', name: '2nd Shift' },
];

// Legacy class data for compatibility
export const mockClasses = [
  { id: 'cse-1a', name: 'CSE 1st Year - Section A' },
  { id: 'cse-1b', name: 'CSE 1st Year - Section B' },
  { id: 'cse-2a', name: 'CSE 2nd Year - Section A' },
  { id: 'eee-1a', name: 'EEE 1st Year - Section A' },
  { id: 'civil-2a', name: 'Civil 2nd Year - Section A' },
];

export const mockSubjects = [
  { id: 'math-101', name: 'Mathematics I', classIds: ['cse-1a', 'cse-1b', 'eee-1a'] },
  { id: 'phy-101', name: 'Physics', classIds: ['cse-1a', 'cse-1b', 'eee-1a', 'civil-2a'] },
  { id: 'prog-101', name: 'Programming Fundamentals', classIds: ['cse-1a', 'cse-1b'] },
  { id: 'ds-201', name: 'Data Structures', classIds: ['cse-2a'] },
  { id: 'circuit-101', name: 'Circuit Analysis', classIds: ['eee-1a'] },
];

export const mockStudents = [
  { id: 's1', name: 'Rahim Ahmed', roll: '2024-CSE-001', classId: 'cse-1a', departmentId: 'cse', semester: '1', shift: '1st' },
  { id: 's2', name: 'Karim Hossain', roll: '2024-CSE-002', classId: 'cse-1a', departmentId: 'cse', semester: '1', shift: '1st' },
  { id: 's3', name: 'Fatima Begum', roll: '2024-CSE-003', classId: 'cse-1a', departmentId: 'cse', semester: '1', shift: '1st' },
  { id: 's4', name: 'Jamal Uddin', roll: '2024-CSE-004', classId: 'cse-1b', departmentId: 'cse', semester: '1', shift: '2nd' },
  { id: 's5', name: 'Nasreen Akter', roll: '2024-CSE-005', classId: 'cse-1b', departmentId: 'cse', semester: '1', shift: '2nd' },
  { id: 's6', name: 'Habib Rahman', roll: '2024-CSE-101', classId: 'cse-2a', departmentId: 'cse', semester: '3', shift: '1st' },
  { id: 's7', name: 'Salma Khatun', roll: '2024-EEE-001', classId: 'eee-1a', departmentId: 'eee', semester: '1', shift: '1st' },
  { id: 's8', name: 'Imran Khan', roll: '2024-CIV-001', classId: 'civil-2a', departmentId: 'civil', semester: '3', shift: '1st' },
  { id: 's9', name: 'Tasnim Islam', roll: '2024-CSE-006', classId: 'cse-1a', departmentId: 'cse', semester: '2', shift: '1st' },
  { id: 's10', name: 'Arif Hossain', roll: '2024-EEE-002', classId: 'eee-1a', departmentId: 'eee', semester: '2', shift: '2nd' },
];

export const mockAllegations: Allegation[] = [
  {
    id: 'alg-1',
    studentId: 's2',
    studentName: 'Karim Hossain',
    studentRoll: '2024-CSE-002',
    departmentId: 'cse',
    departmentName: 'Computer Science & Technology',
    semester: '1',
    shift: '1st',
    category: 'academic_dishonesty',
    severity: 'moderate',
    description: 'Student was found copying from a classmate during the mid-term practical exam. Both students had identical code with the same variable naming conventions.',
    teacherAdvice: 'I recommend counseling the student about academic integrity and the importance of original work. This appears to be their first offense, so a warning with clear explanation of consequences for repeat behavior would be appropriate.',
    suggestedAction: 'Verbal warning and mandatory attendance in academic integrity workshop',
    status: 'under_review',
    reportedBy: 'Dr. Rahman',
    reportedAt: '2024-01-15T10:30:00Z',
    incidentDate: '2024-01-14',
    isEscalated: false,
  },
  {
    id: 'alg-2',
    studentId: 's4',
    studentName: 'Jamal Uddin',
    studentRoll: '2024-CSE-004',
    departmentId: 'cse',
    departmentName: 'Computer Science & Technology',
    semester: '1',
    shift: '2nd',
    category: 'discipline_violation',
    severity: 'minor',
    description: 'Student arrived 30 minutes late to class for the third time this week without prior notice or valid excuse.',
    teacherAdvice: 'I suggest having a one-on-one conversation with the student to understand if there are underlying issues causing tardiness. Setting up a check-in system might help.',
    suggestedAction: 'Parent/guardian notification and attendance monitoring for 2 weeks',
    status: 'action_taken',
    reportedBy: 'Prof. Kamal',
    reportedAt: '2024-01-12T09:15:00Z',
    incidentDate: '2024-01-12',
    isEscalated: false,
    actionTaken: 'Student counseled and parents informed. Student committed to improving attendance.',
  },
  {
    id: 'alg-3',
    studentId: 's1',
    studentName: 'Rahim Ahmed',
    studentRoll: '2024-CSE-001',
    departmentId: 'cse',
    departmentName: 'Computer Science & Technology',
    semester: '1',
    shift: '1st',
    category: 'misbehavior',
    severity: 'serious',
    description: 'Student was involved in a verbal altercation with another student during lab session, using inappropriate language and threatening gestures. The situation required intervention from multiple staff members.',
    teacherAdvice: 'This is a serious matter that requires immediate attention. I recommend involving the counseling department and possibly the discipline committee. Both students need mediation and conflict resolution guidance.',
    suggestedAction: 'Mandatory counseling sessions and temporary suspension from lab activities pending review',
    status: 'reported',
    reportedBy: 'Dr. Hasan',
    reportedAt: '2024-01-16T14:45:00Z',
    incidentDate: '2024-01-16',
    isEscalated: true,
  },
  {
    id: 'alg-4',
    studentId: 's6',
    studentName: 'Habib Rahman',
    studentRoll: '2024-CSE-101',
    departmentId: 'cse',
    departmentName: 'Computer Science & Technology',
    semester: '3',
    shift: '1st',
    category: 'misbehavior',
    severity: 'minor',
    description: 'Student was using mobile phone during lecture despite multiple warnings.',
    teacherAdvice: 'A simple reminder about classroom policies should suffice. The student is generally well-behaved and this seems to be an isolated incident.',
    status: 'resolved',
    reportedBy: 'Prof. Alam',
    reportedAt: '2024-01-10T11:00:00Z',
    incidentDate: '2024-01-10',
    isEscalated: false,
    actionTaken: 'Verbal warning given in class.',
    resolvedAt: '2024-01-10T11:30:00Z',
  },
  {
    id: 'alg-5',
    studentId: 's7',
    studentName: 'Salma Khatun',
    studentRoll: '2024-EEE-001',
    departmentId: 'eee',
    departmentName: 'Electrical & Electronic Engineering',
    semester: '1',
    shift: '1st',
    category: 'moral_misconduct',
    severity: 'moderate',
    description: 'Student was found spreading rumors about a classmate through social media, causing distress to the affected student.',
    teacherAdvice: 'This is a sensitive matter involving cyberbullying. I recommend involving the counseling team and facilitating a restorative conversation between both parties. Digital citizenship education may be beneficial.',
    suggestedAction: 'Counseling for both parties, digital citizenship workshop, and monitoring',
    status: 'under_review',
    reportedBy: 'Dr. Fatima',
    reportedAt: '2024-01-14T16:20:00Z',
    incidentDate: '2024-01-13',
    isEscalated: false,
  },
];

export const correctiveActions = [
  'Verbal warning',
  'Written warning',
  'Parent/guardian notification',
  'Counseling session',
  'Academic integrity workshop',
  'Community service',
  'Temporary suspension from activity',
  'Peer mediation',
  'Behavioral improvement plan',
  'Other (specify in description)',
];