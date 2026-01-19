export interface ClassActivity {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;
  topicCovered: string;
  description: string;
  keyPoints: string[];
  teacherName: string;
  status: 'completed' | 'today' | 'upcoming';
  nextClassPlan?: {
    topic: string;
    preparation: string[];
  };
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  color: string;
}

export const mockSubjects: Subject[] = [
  { id: '1', name: 'Data Structures', code: 'CSE-301', teacherName: 'Dr. Rahman', color: 'bg-blue-500' },
  { id: '2', name: 'Database Management', code: 'CSE-302', teacherName: 'Prof. Ahmed', color: 'bg-green-500' },
  { id: '3', name: 'Web Development', code: 'CSE-303', teacherName: 'Ms. Fatima', color: 'bg-purple-500' },
  { id: '4', name: 'Computer Networks', code: 'CSE-304', teacherName: 'Mr. Hassan', color: 'bg-orange-500' },
  { id: '5', name: 'Operating Systems', code: 'CSE-305', teacherName: 'Dr. Khan', color: 'bg-red-500' },
];

export const mockClassActivities: ClassActivity[] = [
  // Data Structures
  {
    id: '1',
    subjectId: '1',
    subjectName: 'Data Structures',
    date: '2024-12-28',
    topicCovered: 'Binary Search Trees - Insertion',
    description: 'Introduction to BST and insertion operation with time complexity analysis',
    keyPoints: ['BST properties', 'Insertion algorithm', 'Time complexity O(log n)'],
    teacherName: 'Dr. Rahman',
    status: 'completed',
  },
  {
    id: '2',
    subjectId: '1',
    subjectName: 'Data Structures',
    date: '2024-12-29',
    topicCovered: 'Binary Search Trees - Deletion',
    description: 'Deletion operation in BST with three cases explained',
    keyPoints: ['Leaf node deletion', 'One child deletion', 'Two children deletion'],
    teacherName: 'Dr. Rahman',
    status: 'completed',
  },
  {
    id: '3',
    subjectId: '1',
    subjectName: 'Data Structures',
    date: '2024-12-30',
    topicCovered: 'AVL Trees Introduction',
    description: 'Self-balancing BST concept and rotation operations',
    keyPoints: ['Balance factor', 'Left rotation', 'Right rotation', 'LL, RR, LR, RL cases'],
    teacherName: 'Dr. Rahman',
    status: 'today',
    nextClassPlan: {
      topic: 'AVL Tree Implementation',
      preparation: ['Review rotation operations', 'Practice balance factor calculation'],
    },
  },
  {
    id: '4',
    subjectId: '1',
    subjectName: 'Data Structures',
    date: '2024-12-31',
    topicCovered: 'AVL Tree Implementation',
    description: 'Complete implementation of AVL tree with all operations',
    keyPoints: ['Insert with balancing', 'Delete with balancing'],
    teacherName: 'Dr. Rahman',
    status: 'upcoming',
  },
  // Database Management
  {
    id: '5',
    subjectId: '2',
    subjectName: 'Database Management',
    date: '2024-12-28',
    topicCovered: 'Normalization - 1NF & 2NF',
    description: 'First and Second Normal Forms with practical examples',
    keyPoints: ['Atomic values', 'Primary key dependency', 'Partial dependency removal'],
    teacherName: 'Prof. Ahmed',
    status: 'completed',
  },
  {
    id: '6',
    subjectId: '2',
    subjectName: 'Database Management',
    date: '2024-12-30',
    topicCovered: 'Normalization - 3NF & BCNF',
    description: 'Higher normal forms and when to use them',
    keyPoints: ['Transitive dependency', 'BCNF conditions', 'Denormalization scenarios'],
    teacherName: 'Prof. Ahmed',
    status: 'today',
    nextClassPlan: {
      topic: 'SQL Joins Deep Dive',
      preparation: ['Practice basic SELECT queries', 'Review table relationships'],
    },
  },
  {
    id: '7',
    subjectId: '2',
    subjectName: 'Database Management',
    date: '2025-01-02',
    topicCovered: 'SQL Joins Deep Dive',
    description: 'All types of joins with practical use cases',
    keyPoints: ['INNER JOIN', 'LEFT/RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN'],
    teacherName: 'Prof. Ahmed',
    status: 'upcoming',
  },
  // Web Development
  {
    id: '8',
    subjectId: '3',
    subjectName: 'Web Development',
    date: '2024-12-29',
    topicCovered: 'React Hooks - useState & useEffect',
    description: 'State management and side effects in functional components',
    keyPoints: ['useState syntax', 'useEffect dependencies', 'Cleanup functions'],
    teacherName: 'Ms. Fatima',
    status: 'completed',
  },
  {
    id: '9',
    subjectId: '3',
    subjectName: 'Web Development',
    date: '2024-12-30',
    topicCovered: 'React Context API',
    description: 'Global state management without external libraries',
    keyPoints: ['createContext', 'Provider pattern', 'useContext hook'],
    teacherName: 'Ms. Fatima',
    status: 'today',
    nextClassPlan: {
      topic: 'React Router DOM',
      preparation: ['Review SPA concepts', 'Install react-router-dom'],
    },
  },
  {
    id: '10',
    subjectId: '3',
    subjectName: 'Web Development',
    date: '2025-01-01',
    topicCovered: 'React Router DOM',
    description: 'Client-side routing in React applications',
    keyPoints: ['BrowserRouter', 'Routes & Route', 'useNavigate', 'useParams'],
    teacherName: 'Ms. Fatima',
    status: 'upcoming',
  },
];
