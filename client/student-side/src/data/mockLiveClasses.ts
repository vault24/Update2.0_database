export interface LiveClass {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  platform: 'zoom' | 'google-meet' | 'youtube' | 'microsoft-teams';
  meetingLink: string;
  meetingId?: string;
  passcode?: string;
  topic: string;
  description?: string;
  isLive: boolean;
  isRecorded: boolean;
  recordingLink?: string;
}

export const mockLiveClasses: LiveClass[] = [
  {
    id: '1',
    subjectId: '1',
    subjectName: 'Data Structures',
    subjectCode: 'CSE-301',
    teacherName: 'Dr. Rahman',
    date: '2024-12-30',
    startTime: '09:00',
    endTime: '10:30',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/1234567890',
    meetingId: '123 456 7890',
    passcode: 'ds2024',
    topic: 'AVL Trees Introduction',
    description: 'Self-balancing BST concept and rotation operations',
    isLive: true,
    isRecorded: true,
  },
  {
    id: '2',
    subjectId: '2',
    subjectName: 'Database Management',
    subjectCode: 'CSE-302',
    teacherName: 'Prof. Ahmed',
    date: '2024-12-30',
    startTime: '11:00',
    endTime: '12:30',
    platform: 'google-meet',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    topic: 'Normalization - 3NF & BCNF',
    description: 'Higher normal forms and practical examples',
    isLive: false,
    isRecorded: false,
  },
  {
    id: '3',
    subjectId: '3',
    subjectName: 'Web Development',
    subjectCode: 'CSE-303',
    teacherName: 'Ms. Fatima',
    date: '2024-12-30',
    startTime: '14:00',
    endTime: '15:30',
    platform: 'youtube',
    meetingLink: 'https://youtube.com/live/xyz123',
    topic: 'React Context API',
    description: 'Global state management without external libraries',
    isLive: false,
    isRecorded: true,
    recordingLink: 'https://youtube.com/watch/xyz123',
  },
  {
    id: '4',
    subjectId: '4',
    subjectName: 'Computer Networks',
    subjectCode: 'CSE-304',
    teacherName: 'Mr. Hassan',
    date: '2024-12-30',
    startTime: '16:00',
    endTime: '17:00',
    platform: 'microsoft-teams',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/xyz',
    topic: 'TCP/IP Protocol Stack',
    description: 'Understanding network protocols and their layers',
    isLive: false,
    isRecorded: false,
  },
  {
    id: '5',
    subjectId: '1',
    subjectName: 'Data Structures',
    subjectCode: 'CSE-301',
    teacherName: 'Dr. Rahman',
    date: '2024-12-31',
    startTime: '09:00',
    endTime: '10:30',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/1234567890',
    meetingId: '123 456 7890',
    passcode: 'ds2024',
    topic: 'AVL Tree Implementation',
    description: 'Complete implementation with all operations',
    isLive: false,
    isRecorded: false,
  },
  {
    id: '6',
    subjectId: '5',
    subjectName: 'Operating Systems',
    subjectCode: 'CSE-305',
    teacherName: 'Dr. Khan',
    date: '2024-12-31',
    startTime: '11:00',
    endTime: '12:30',
    platform: 'google-meet',
    meetingLink: 'https://meet.google.com/klm-nopq-rst',
    topic: 'Process Management',
    description: 'Process states, PCB, and context switching',
    isLive: false,
    isRecorded: false,
  },
  {
    id: '7',
    subjectId: '2',
    subjectName: 'Database Management',
    subjectCode: 'CSE-302',
    teacherName: 'Prof. Ahmed',
    date: '2025-01-02',
    startTime: '11:00',
    endTime: '12:30',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/9876543210',
    meetingId: '987 654 3210',
    passcode: 'db2024',
    topic: 'SQL Joins Deep Dive',
    description: 'All types of joins with practical use cases',
    isLive: false,
    isRecorded: false,
  },
  {
    id: '8',
    subjectId: '3',
    subjectName: 'Web Development',
    subjectCode: 'CSE-303',
    teacherName: 'Ms. Fatima',
    date: '2025-01-01',
    startTime: '14:00',
    endTime: '15:30',
    platform: 'youtube',
    meetingLink: 'https://youtube.com/live/abc456',
    topic: 'React Router DOM',
    description: 'Client-side routing in React applications',
    isLive: false,
    isRecorded: false,
  },
];

export const getPlatformInfo = (platform: LiveClass['platform']) => {
  const platforms = {
    'zoom': { name: 'Zoom', color: 'bg-blue-500', icon: 'Video' },
    'google-meet': { name: 'Google Meet', color: 'bg-green-500', icon: 'Video' },
    'youtube': { name: 'YouTube Live', color: 'bg-red-500', icon: 'Youtube' },
    'microsoft-teams': { name: 'MS Teams', color: 'bg-purple-500', icon: 'Users' },
  };
  return platforms[platform];
};
