export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  isGroup: boolean;
  participants: string[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
  type: 'individual' | 'class' | 'department' | 'institute';
}

export const mockChats: Chat[] = [
  {
    id: 'chat-1',
    name: 'Computer Technology - 6th Semester',
    isGroup: true,
    type: 'class',
    participants: ['All Students', 'Teachers'],
    lastMessage: 'Tomorrow\'s class will start at 9 AM',
    lastMessageTime: '2024-01-15T10:30:00',
    unreadCount: 3,
    messages: [
      {
        id: 'msg-1',
        senderId: 'teacher-1',
        senderName: 'Md. Rahman Sir',
        content: 'Good morning everyone! Please submit your assignments by Friday.',
        timestamp: '2024-01-15T08:00:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-2',
        senderId: 'student-1',
        senderName: 'Rahul Ahmed',
        content: 'Sir, can we get an extension for the database project?',
        timestamp: '2024-01-15T08:15:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-3',
        senderId: 'teacher-1',
        senderName: 'Md. Rahman Sir',
        content: 'I\'ll consider it. Let\'s discuss in class.',
        timestamp: '2024-01-15T08:20:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-4',
        senderId: 'student-2',
        senderName: 'Fatima Khatun',
        content: 'Thank you sir!',
        timestamp: '2024-01-15T08:25:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-5',
        senderId: 'teacher-1',
        senderName: 'Md. Rahman Sir',
        content: 'Tomorrow\'s class will start at 9 AM',
        timestamp: '2024-01-15T10:30:00',
        type: 'text',
        isRead: false
      }
    ]
  },
  {
    id: 'chat-2',
    name: 'Md. Rahman Sir',
    isGroup: false,
    type: 'individual',
    participants: ['Md. Rahman Sir'],
    lastMessage: 'Your marks have been updated',
    lastMessageTime: '2024-01-14T16:45:00',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-6',
        senderId: 'student-me',
        senderName: 'Me',
        content: 'Sir, I wanted to ask about my attendance.',
        timestamp: '2024-01-14T14:00:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-7',
        senderId: 'teacher-1',
        senderName: 'Md. Rahman Sir',
        content: 'Yes, tell me what\'s the issue?',
        timestamp: '2024-01-14T14:30:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-8',
        senderId: 'student-me',
        senderName: 'Me',
        content: 'My attendance shows 75% but I attended all classes last week.',
        timestamp: '2024-01-14T14:35:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-9',
        senderId: 'teacher-1',
        senderName: 'Md. Rahman Sir',
        content: 'I\'ll check and update it. Also, your marks have been updated',
        timestamp: '2024-01-14T16:45:00',
        type: 'text',
        isRead: false
      }
    ]
  },
  {
    id: 'chat-3',
    name: 'Department of Computer',
    isGroup: true,
    type: 'department',
    participants: ['All Computer Students', 'All Computer Teachers'],
    lastMessage: 'Industrial visit scheduled for next month',
    lastMessageTime: '2024-01-13T11:00:00',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-10',
        senderId: 'hod-1',
        senderName: 'HOD - Computer',
        content: 'Important: All students must submit their project proposals by end of this month.',
        timestamp: '2024-01-12T09:00:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-11',
        senderId: 'hod-1',
        senderName: 'HOD - Computer',
        content: 'Industrial visit scheduled for next month',
        timestamp: '2024-01-13T11:00:00',
        type: 'text',
        isRead: true
      }
    ]
  },
  {
    id: 'chat-4',
    name: 'SPI Official Announcements',
    isGroup: true,
    type: 'institute',
    participants: ['All Students', 'All Teachers', 'Administration'],
    lastMessage: 'Exam schedule has been published',
    lastMessageTime: '2024-01-12T09:00:00',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-12',
        senderId: 'admin-1',
        senderName: 'Administration',
        content: 'Notice: Institute will remain closed on 26th January for Republic Day.',
        timestamp: '2024-01-10T10:00:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-13',
        senderId: 'admin-1',
        senderName: 'Administration',
        content: 'Exam schedule has been published. Check the notice board.',
        timestamp: '2024-01-12T09:00:00',
        type: 'text',
        isRead: true
      }
    ]
  },
  {
    id: 'chat-5',
    name: 'Karim Uddin',
    isGroup: false,
    type: 'individual',
    participants: ['Karim Uddin'],
    lastMessage: 'Thanks for the notes!',
    lastMessageTime: '2024-01-11T20:30:00',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-14',
        senderId: 'student-3',
        senderName: 'Karim Uddin',
        content: 'Hey, can you share the programming notes?',
        timestamp: '2024-01-11T19:00:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-15',
        senderId: 'student-me',
        senderName: 'Me',
        content: 'Sure, here you go',
        timestamp: '2024-01-11T19:30:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-16',
        senderId: 'student-me',
        senderName: 'Me',
        content: 'Programming_Notes.pdf',
        timestamp: '2024-01-11T19:31:00',
        type: 'file',
        fileName: 'Programming_Notes.pdf',
        fileUrl: '#',
        isRead: true
      },
      {
        id: 'msg-17',
        senderId: 'student-3',
        senderName: 'Karim Uddin',
        content: 'Thanks for the notes!',
        timestamp: '2024-01-11T20:30:00',
        type: 'text',
        isRead: true
      }
    ]
  },
  {
    id: 'chat-6',
    name: 'Mrs. Sultana Ma\'am',
    isGroup: false,
    type: 'individual',
    participants: ['Mrs. Sultana'],
    lastMessage: 'Keep up the good work!',
    lastMessageTime: '2024-01-10T15:00:00',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-18',
        senderId: 'teacher-2',
        senderName: 'Mrs. Sultana Ma\'am',
        content: 'Your presentation was excellent today.',
        timestamp: '2024-01-10T14:00:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-19',
        senderId: 'student-me',
        senderName: 'Me',
        content: 'Thank you ma\'am! I worked hard on it.',
        timestamp: '2024-01-10T14:30:00',
        type: 'text',
        isRead: true
      },
      {
        id: 'msg-20',
        senderId: 'teacher-2',
        senderName: 'Mrs. Sultana Ma\'am',
        content: 'Keep up the good work!',
        timestamp: '2024-01-10T15:00:00',
        type: 'text',
        isRead: true
      }
    ]
  }
];

export const currentUserId = 'student-me';
