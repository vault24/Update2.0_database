// Mock data for teacher attendance management

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Shift {
  id: string;
  name: string;
}

export interface ClassInfo {
  id: string;
  semester: number;
  section: string;
  departmentId: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  departmentId: string;
}

export interface Period {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface StudentForAttendance {
  id: string;
  name: string;
  rollNumber: string;
  photo?: string;
  departmentId: string;
  semester: number;
  section: string;
}

export interface AttendanceStatus {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'unmarked';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  departmentId: string;
  semester: number;
  section: string;
  subjectId: string;
  periodId: string;
  records: AttendanceStatus[];
  submittedAt?: string;
  submittedBy?: string;
}

export const mockDepartments: Department[] = [
  { id: 'cst', name: 'Computer Science & Technology', code: 'CST' },
  { id: 'eet', name: 'Electrical & Electronics Technology', code: 'EET' },
  { id: 'cet', name: 'Civil Engineering Technology', code: 'CET' },
  { id: 'met', name: 'Mechanical Engineering Technology', code: 'MET' },
  { id: 'ent', name: 'Electronics Technology', code: 'ENT' },
];

export const mockShifts: Shift[] = [
  { id: 'morning', name: 'Morning Shift' },
  { id: 'day', name: 'Day Shift' },
];

export const mockClasses: ClassInfo[] = [
  { id: 'cst-1-a', semester: 1, section: 'A', departmentId: 'cst' },
  { id: 'cst-1-b', semester: 1, section: 'B', departmentId: 'cst' },
  { id: 'cst-3-a', semester: 3, section: 'A', departmentId: 'cst' },
  { id: 'cst-5-a', semester: 5, section: 'A', departmentId: 'cst' },
  { id: 'eet-1-a', semester: 1, section: 'A', departmentId: 'eet' },
  { id: 'eet-3-a', semester: 3, section: 'A', departmentId: 'eet' },
];

export const mockSubjects: Subject[] = [
  { id: 'cst-101', code: 'CST-101', name: 'Computer Fundamentals', semester: 1, departmentId: 'cst' },
  { id: 'cst-102', code: 'CST-102', name: 'Programming in C', semester: 1, departmentId: 'cst' },
  { id: 'cst-301', code: 'CST-301', name: 'Data Structures', semester: 3, departmentId: 'cst' },
  { id: 'cst-302', code: 'CST-302', name: 'Database Management', semester: 3, departmentId: 'cst' },
  { id: 'cst-501', code: 'CST-501', name: 'Web Development', semester: 5, departmentId: 'cst' },
  { id: 'eet-101', code: 'EET-101', name: 'Basic Electrical', semester: 1, departmentId: 'eet' },
];

export const mockPeriods: Period[] = [
  { id: '1', name: '1st Period', startTime: '09:00', endTime: '09:45' },
  { id: '2', name: '2nd Period', startTime: '09:45', endTime: '10:30' },
  { id: '3', name: '3rd Period', startTime: '10:45', endTime: '11:30' },
  { id: '4', name: '4th Period', startTime: '11:30', endTime: '12:15' },
  { id: '5', name: '5th Period', startTime: '12:15', endTime: '13:00' },
  { id: '6', name: '6th Period', startTime: '14:00', endTime: '14:45' },
  { id: '7', name: '7th Period', startTime: '14:45', endTime: '15:30' },
];

export const mockStudentsForAttendance: StudentForAttendance[] = [
  { id: '1', name: 'Md. Rahim Uddin', rollNumber: '001', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '2', name: 'Fatima Begum', rollNumber: '002', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '3', name: 'Abdul Karim', rollNumber: '003', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '4', name: 'Nasrin Akhter', rollNumber: '004', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '5', name: 'Md. Hasan Ali', rollNumber: '005', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '6', name: 'Taslima Khatun', rollNumber: '006', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '7', name: 'Md. Rafiq Islam', rollNumber: '007', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '8', name: 'Ayesha Siddika', rollNumber: '008', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '9', name: 'Md. Jahangir Alam', rollNumber: '009', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '10', name: 'Roksana Parvin', rollNumber: '010', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '11', name: 'Md. Kamrul Hasan', rollNumber: '011', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '12', name: 'Sharmin Akter', rollNumber: '012', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '13', name: 'Md. Nasir Uddin', rollNumber: '013', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '14', name: 'Rehana Yasmin', rollNumber: '014', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '15', name: 'Md. Zahirul Islam', rollNumber: '015', departmentId: 'cst', semester: 1, section: 'A' },
  { id: '16', name: 'Sabina Yeasmin', rollNumber: '016', departmentId: 'cst', semester: 1, section: 'B' },
  { id: '17', name: 'Md. Faruk Ahmed', rollNumber: '017', departmentId: 'cst', semester: 1, section: 'B' },
  { id: '18', name: 'Monira Begum', rollNumber: '018', departmentId: 'cst', semester: 1, section: 'B' },
  { id: '19', name: 'Md. Shafiqul Islam', rollNumber: '019', departmentId: 'cst', semester: 1, section: 'B' },
  { id: '20', name: 'Dilara Khatun', rollNumber: '020', departmentId: 'cst', semester: 1, section: 'B' },
];

// Generate sample attendance history
export const mockAttendanceHistory: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: '2025-12-30',
    departmentId: 'cst',
    semester: 1,
    section: 'A',
    subjectId: 'cst-101',
    periodId: '1',
    submittedAt: '2025-12-30T09:50:00Z',
    submittedBy: 'Dr. Kamal Hossain',
    records: [
      { studentId: '1', status: 'present' },
      { studentId: '2', status: 'present' },
      { studentId: '3', status: 'absent' },
      { studentId: '4', status: 'present' },
      { studentId: '5', status: 'late' },
      { studentId: '6', status: 'present' },
      { studentId: '7', status: 'present' },
      { studentId: '8', status: 'absent' },
      { studentId: '9', status: 'present' },
      { studentId: '10', status: 'present' },
    ],
  },
  {
    id: 'att-2',
    date: '2025-12-29',
    departmentId: 'cst',
    semester: 1,
    section: 'A',
    subjectId: 'cst-102',
    periodId: '3',
    submittedAt: '2025-12-29T11:35:00Z',
    submittedBy: 'Dr. Kamal Hossain',
    records: [
      { studentId: '1', status: 'present' },
      { studentId: '2', status: 'absent' },
      { studentId: '3', status: 'present' },
      { studentId: '4', status: 'present' },
      { studentId: '5', status: 'present' },
      { studentId: '6', status: 'late' },
      { studentId: '7', status: 'present' },
      { studentId: '8', status: 'present' },
      { studentId: '9', status: 'absent' },
      { studentId: '10', status: 'present' },
    ],
  },
  {
    id: 'att-3',
    date: '2025-12-28',
    departmentId: 'cst',
    semester: 1,
    section: 'A',
    subjectId: 'cst-101',
    periodId: '1',
    submittedAt: '2025-12-28T09:48:00Z',
    submittedBy: 'Dr. Kamal Hossain',
    records: [
      { studentId: '1', status: 'present' },
      { studentId: '2', status: 'present' },
      { studentId: '3', status: 'present' },
      { studentId: '4', status: 'absent' },
      { studentId: '5', status: 'present' },
      { studentId: '6', status: 'present' },
      { studentId: '7', status: 'late' },
      { studentId: '8', status: 'present' },
      { studentId: '9', status: 'present' },
      { studentId: '10', status: 'absent' },
    ],
  },
];
