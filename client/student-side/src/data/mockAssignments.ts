export interface Assignment {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  title: string;
  description: string;
  assignedDate: string;
  deadline: string;
  teacherName: string;
  status: 'pending' | 'submitted' | 'late' | 'graded';
  priority: 'normal' | 'important';
  attachments?: string[];
  submittedAt?: string;
  grade?: string;
  feedback?: string;
}

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    subjectId: '1',
    subjectName: 'Data Structures',
    subjectCode: 'CSE-301',
    title: 'Implement Binary Search Tree',
    description: 'Write a complete BST implementation in C++ with insert, delete, search, and traversal operations. Include proper comments and test cases.',
    assignedDate: '2024-12-25',
    deadline: '2024-12-31T23:59:00',
    teacherName: 'Dr. Rahman',
    status: 'pending',
    priority: 'important',
  },
  {
    id: '2',
    subjectId: '1',
    subjectName: 'Data Structures',
    subjectCode: 'CSE-301',
    title: 'Time Complexity Analysis',
    description: 'Analyze and compare time complexities of different sorting algorithms with graphs and explanations.',
    assignedDate: '2024-12-20',
    deadline: '2024-12-28T23:59:00',
    teacherName: 'Dr. Rahman',
    status: 'submitted',
    priority: 'normal',
    submittedAt: '2024-12-27T14:30:00',
  },
  {
    id: '3',
    subjectId: '2',
    subjectName: 'Database Management',
    subjectCode: 'CSE-302',
    title: 'ER Diagram Design',
    description: 'Design an ER diagram for a university management system with at least 10 entities and proper relationships.',
    assignedDate: '2024-12-22',
    deadline: '2024-12-30T23:59:00',
    teacherName: 'Prof. Ahmed',
    status: 'pending',
    priority: 'important',
    attachments: ['er_diagram_template.pdf'],
  },
  {
    id: '4',
    subjectId: '2',
    subjectName: 'Database Management',
    subjectCode: 'CSE-302',
    title: 'SQL Queries Practice',
    description: 'Complete the 20 SQL query exercises from the practice sheet.',
    assignedDate: '2024-12-18',
    deadline: '2024-12-26T23:59:00',
    teacherName: 'Prof. Ahmed',
    status: 'late',
    priority: 'normal',
    submittedAt: '2024-12-27T10:00:00',
  },
  {
    id: '5',
    subjectId: '3',
    subjectName: 'Web Development',
    subjectCode: 'CSE-303',
    title: 'React Todo Application',
    description: 'Build a fully functional todo application using React with add, edit, delete, and filter features. Use local storage for persistence.',
    assignedDate: '2024-12-26',
    deadline: '2025-01-02T23:59:00',
    teacherName: 'Ms. Fatima',
    status: 'pending',
    priority: 'important',
  },
  {
    id: '6',
    subjectId: '3',
    subjectName: 'Web Development',
    subjectCode: 'CSE-303',
    title: 'CSS Flexbox Layout',
    description: 'Create a responsive webpage layout using CSS Flexbox only. Submit both HTML and CSS files.',
    assignedDate: '2024-12-15',
    deadline: '2024-12-22T23:59:00',
    teacherName: 'Ms. Fatima',
    status: 'graded',
    priority: 'normal',
    submittedAt: '2024-12-21T16:45:00',
    grade: 'A',
    feedback: 'Excellent work! Clean code and responsive design.',
  },
  {
    id: '7',
    subjectId: '4',
    subjectName: 'Computer Networks',
    subjectCode: 'CSE-304',
    title: 'OSI Model Report',
    description: 'Write a detailed report on the OSI model explaining each layer with real-world examples and protocols.',
    assignedDate: '2024-12-24',
    deadline: '2024-12-31T23:59:00',
    teacherName: 'Mr. Hassan',
    status: 'pending',
    priority: 'normal',
  },
  {
    id: '8',
    subjectId: '5',
    subjectName: 'Operating Systems',
    subjectCode: 'CSE-305',
    title: 'Process Scheduling Simulation',
    description: 'Implement FCFS, SJF, and Round Robin scheduling algorithms in Python with Gantt chart visualization.',
    assignedDate: '2024-12-28',
    deadline: '2025-01-05T23:59:00',
    teacherName: 'Dr. Khan',
    status: 'pending',
    priority: 'important',
  },
];
