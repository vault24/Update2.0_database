export interface Message {
  id: string;
  type: 'institute' | 'department' | 'shift' | 'semester' | 'teacher';
  title: string;
  content: string;
  priority: 'normal' | 'important';
  sender: string;
  senderRole: string;
  department?: string;
  shift?: string;
  semester?: string;
  attachments?: MessageAttachment[];
  links?: MessageLink[];
  createdAt: string;
  isRead: boolean;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  url: string;
  size: string;
}

export interface MessageLink {
  id: string;
  title: string;
  url: string;
}

export const mockMessages: Message[] = [
  {
    id: '1',
    type: 'institute',
    title: 'Winter Vacation Notice',
    content: 'Dear Students, Winter vacation will be from December 25th to January 5th. Classes will resume on January 6th, 2025. All students are requested to complete their assignments before the vacation.',
    priority: 'important',
    sender: 'Principal',
    senderRole: 'Principal',
    createdAt: '2024-12-24T10:00:00Z',
    isRead: false,
  },
  {
    id: '2',
    type: 'department',
    title: 'Lab Equipment Training Session',
    content: 'All Computer Technology students are required to attend the lab equipment training session on December 28th at 10:00 AM in Lab-3. Attendance is mandatory.',
    priority: 'important',
    sender: 'Md. Rahman',
    senderRole: 'Head of Department',
    department: 'Computer Technology',
    createdAt: '2024-12-23T14:30:00Z',
    isRead: false,
    attachments: [
      {
        id: 'a1',
        name: 'Training Schedule.pdf',
        type: 'pdf',
        url: '#',
        size: '245 KB',
      },
    ],
  },
  {
    id: '3',
    type: 'shift',
    title: 'Exam Schedule Update for 1st Shift',
    content: 'The exam schedule for 1st shift has been updated. Please check the attached schedule and prepare accordingly. Any queries can be addressed to the exam section.',
    priority: 'normal',
    sender: 'Exam Controller',
    senderRole: 'Exam Controller',
    shift: '1st Shift',
    createdAt: '2024-12-22T09:15:00Z',
    isRead: true,
    attachments: [
      {
        id: 'a2',
        name: 'Exam_Schedule_Jan2025.pdf',
        type: 'pdf',
        url: '#',
        size: '512 KB',
      },
    ],
  },
  {
    id: '4',
    type: 'semester',
    title: 'Project Submission Deadline Extended',
    content: 'Good news! The deadline for the semester project submission has been extended to January 15th. Make sure to submit both soft copy and hard copy.',
    priority: 'normal',
    sender: 'Academic Office',
    senderRole: 'Academic Coordinator',
    semester: '5th Semester',
    createdAt: '2024-12-21T16:45:00Z',
    isRead: true,
  },
  {
    id: '5',
    type: 'teacher',
    title: 'Assignment 5 - Data Structures',
    content: 'Please complete Assignment 5 on Binary Search Trees. The assignment is due next Monday. Submit via the online portal. Reference materials are attached below.',
    priority: 'normal',
    sender: 'Karim Sir',
    senderRole: 'Lecturer',
    createdAt: '2024-12-20T11:00:00Z',
    isRead: false,
    attachments: [
      {
        id: 'a3',
        name: 'Assignment_5.pdf',
        type: 'pdf',
        url: '#',
        size: '128 KB',
      },
    ],
    links: [
      {
        id: 'l1',
        title: 'BST Visualization Tool',
        url: 'https://visualgo.net/en/bst',
      },
    ],
  },
  {
    id: '6',
    type: 'institute',
    title: 'Library Hours Extended',
    content: 'The library will now remain open until 8:00 PM on weekdays to support students during exam preparation. Weekend hours remain unchanged (9 AM - 4 PM).',
    priority: 'normal',
    sender: 'Librarian',
    senderRole: 'Chief Librarian',
    createdAt: '2024-12-19T08:30:00Z',
    isRead: true,
  },
  {
    id: '7',
    type: 'teacher',
    title: 'Extra Class - Web Development',
    content: 'There will be an extra class on React.js fundamentals this Saturday at 10 AM in Room 204. All 5th semester students are encouraged to attend. Bring your laptops.',
    priority: 'important',
    sender: 'Hasan Sir',
    senderRole: 'Senior Lecturer',
    createdAt: '2024-12-18T13:20:00Z',
    isRead: false,
    links: [
      {
        id: 'l2',
        title: 'React Documentation',
        url: 'https://react.dev',
      },
      {
        id: 'l3',
        title: 'Class Recording (Previous)',
        url: 'https://youtube.com/example',
      },
    ],
  },
  {
    id: '8',
    type: 'department',
    title: 'Industry Visit Announcement',
    content: 'An industry visit to Bangladesh Hi-Tech Park is scheduled for January 20th. Interested students should register by January 10th. Limited seats available.',
    priority: 'normal',
    sender: 'Fatema Madam',
    senderRole: 'Lecturer',
    department: 'Computer Technology',
    createdAt: '2024-12-17T15:00:00Z',
    isRead: true,
    attachments: [
      {
        id: 'a4',
        name: 'Registration_Form.pdf',
        type: 'pdf',
        url: '#',
        size: '85 KB',
      },
      {
        id: 'a5',
        name: 'Visit_Details.jpg',
        type: 'image',
        url: '#',
        size: '1.2 MB',
      },
    ],
  },
];
