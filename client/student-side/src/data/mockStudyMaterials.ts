export interface StudyMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'slide' | 'ebook';
  department: string;
  shift: string;
  semester: string;
  subject: string;
  uploadedBy: string;
  uploadedAt: string;
  fileUrl: string;
  size?: string;
  duration?: string;
}

export const departments = [
  'Computer Technology',
  'Civil Technology',
  'Electrical Technology',
  'Electronics Technology',
  'Mechanical Technology',
  'Power Technology',
];

export const shifts = ['1st Shift', '2nd Shift'];

export const semesters = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'];

export const subjects: Record<string, string[]> = {
  'Computer Technology': ['Programming in C', 'Data Structures', 'Database Management', 'Web Development', 'Computer Networks', 'Object Oriented Programming'],
  'Civil Technology': ['Surveying', 'Building Construction', 'Structural Analysis', 'Highway Engineering', 'Concrete Technology'],
  'Electrical Technology': ['Basic Electrical', 'Power Systems', 'Control Systems', 'Electrical Machines', 'Power Electronics'],
  'Electronics Technology': ['Digital Electronics', 'Analog Electronics', 'Microprocessor', 'Communication Systems', 'Embedded Systems'],
  'Mechanical Technology': ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing Process', 'Automobile Engineering'],
  'Power Technology': ['Power Plant Engineering', 'Renewable Energy', 'Transmission & Distribution', 'Power System Protection'],
};

export const mockMaterials: StudyMaterial[] = [
  {
    id: '1',
    title: 'Introduction to C Programming',
    type: 'pdf',
    department: 'Computer Technology',
    shift: '1st Shift',
    semester: '1st Semester',
    subject: 'Programming in C',
    uploadedBy: 'Md. Rahman Sir',
    uploadedAt: '2024-12-15',
    fileUrl: '#',
    size: '2.5 MB',
  },
  {
    id: '2',
    title: 'Data Structures Lecture 01 - Arrays',
    type: 'video',
    department: 'Computer Technology',
    shift: '1st Shift',
    semester: '3rd Semester',
    subject: 'Data Structures',
    uploadedBy: 'Karim Sir',
    uploadedAt: '2024-12-20',
    fileUrl: 'https://youtube.com/watch?v=example',
    duration: '45 mins',
  },
  {
    id: '3',
    title: 'Database Normalization Slides',
    type: 'slide',
    department: 'Computer Technology',
    shift: '2nd Shift',
    semester: '4th Semester',
    subject: 'Database Management',
    uploadedBy: 'Fatema Madam',
    uploadedAt: '2024-12-18',
    fileUrl: '#',
    size: '5.2 MB',
  },
  {
    id: '4',
    title: 'Complete Web Development Guide',
    type: 'ebook',
    department: 'Computer Technology',
    shift: '1st Shift',
    semester: '5th Semester',
    subject: 'Web Development',
    uploadedBy: 'Hasan Sir',
    uploadedAt: '2024-12-10',
    fileUrl: '#',
    size: '15 MB',
  },
  {
    id: '5',
    title: 'Surveying Basics and Instruments',
    type: 'pdf',
    department: 'Civil Technology',
    shift: '1st Shift',
    semester: '2nd Semester',
    subject: 'Surveying',
    uploadedBy: 'Alam Sir',
    uploadedAt: '2024-12-12',
    fileUrl: '#',
    size: '3.8 MB',
  },
  {
    id: '6',
    title: 'Building Construction Methods',
    type: 'video',
    department: 'Civil Technology',
    shift: '2nd Shift',
    semester: '3rd Semester',
    subject: 'Building Construction',
    uploadedBy: 'Rashid Sir',
    uploadedAt: '2024-12-22',
    fileUrl: 'https://drive.google.com/example',
    duration: '1 hour 20 mins',
  },
  {
    id: '7',
    title: 'Basic Electrical Theory',
    type: 'pdf',
    department: 'Electrical Technology',
    shift: '1st Shift',
    semester: '1st Semester',
    subject: 'Basic Electrical',
    uploadedBy: 'Kabir Sir',
    uploadedAt: '2024-12-08',
    fileUrl: '#',
    size: '4.1 MB',
  },
  {
    id: '8',
    title: 'Digital Electronics Complete Notes',
    type: 'ebook',
    department: 'Electronics Technology',
    shift: '1st Shift',
    semester: '3rd Semester',
    subject: 'Digital Electronics',
    uploadedBy: 'Nasreen Madam',
    uploadedAt: '2024-12-05',
    fileUrl: '#',
    size: '22 MB',
  },
  {
    id: '9',
    title: 'Thermodynamics Lecture Series',
    type: 'video',
    department: 'Mechanical Technology',
    shift: '2nd Shift',
    semester: '4th Semester',
    subject: 'Thermodynamics',
    uploadedBy: 'Ahmed Sir',
    uploadedAt: '2024-12-19',
    fileUrl: 'https://youtube.com/playlist?list=example',
    duration: '6 hours',
  },
  {
    id: '10',
    title: 'Power Plant Operations',
    type: 'slide',
    department: 'Power Technology',
    shift: '1st Shift',
    semester: '6th Semester',
    subject: 'Power Plant Engineering',
    uploadedBy: 'Islam Sir',
    uploadedAt: '2024-12-14',
    fileUrl: '#',
    size: '8.5 MB',
  },
  {
    id: '11',
    title: 'OOP Concepts with Java',
    type: 'pdf',
    department: 'Computer Technology',
    shift: '2nd Shift',
    semester: '4th Semester',
    subject: 'Object Oriented Programming',
    uploadedBy: 'Karim Sir',
    uploadedAt: '2024-12-21',
    fileUrl: '#',
    size: '6.2 MB',
  },
  {
    id: '12',
    title: 'Computer Networks Lab Manual',
    type: 'pdf',
    department: 'Computer Technology',
    shift: '1st Shift',
    semester: '6th Semester',
    subject: 'Computer Networks',
    uploadedBy: 'Hasan Sir',
    uploadedAt: '2024-12-23',
    fileUrl: '#',
    size: '1.8 MB',
  },
];
