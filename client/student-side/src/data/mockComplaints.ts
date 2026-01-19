export interface Complaint {
  id: string;
  category: 'academic' | 'website' | 'facility';
  subcategory: string;
  title: string;
  description: string;
  status: 'pending' | 'seen' | 'in_progress' | 'resolved';
  isAnonymous: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
  response?: string;
  respondedBy?: string;
}

export const complaintCategories = {
  academic: {
    label: 'Academic Issues',
    icon: 'GraduationCap',
    subcategories: [
      'Attendance Problem',
      'Result Correction',
      'Routine Issue',
      'Class Cancellation',
      'Teacher Absence',
      'Exam Related',
      'Other Academic',
    ],
  },
  website: {
    label: 'Website/System Problems',
    icon: 'Monitor',
    subcategories: [
      'Login Issues',
      'Data Not Loading',
      'Error Messages',
      'Missing Features',
      'Slow Performance',
      'Mobile App Issues',
      'Other Technical',
    ],
  },
  facility: {
    label: 'Facility & General',
    icon: 'Building',
    subcategories: [
      'Classroom Issues',
      'Lab Equipment',
      'Library Services',
      'Washroom/Cleanliness',
      'Canteen Services',
      'Transport Issues',
      'Safety Concerns',
      'Other Facility',
    ],
  },
};

export const mockComplaints: Complaint[] = [
  {
    id: '1',
    category: 'academic',
    subcategory: 'Attendance Problem',
    title: 'Wrong attendance marked for Dec 15th',
    description: 'I was present in the Computer Networks class on December 15th but my attendance was marked as absent. I have witnesses who can confirm my presence. Please correct this.',
    status: 'in_progress',
    isAnonymous: false,
    createdAt: '2024-12-18T10:30:00Z',
    updatedAt: '2024-12-20T14:00:00Z',
    response: 'We are verifying with the class teacher. Will update soon.',
    respondedBy: 'Academic Office',
  },
  {
    id: '2',
    category: 'website',
    subcategory: 'Data Not Loading',
    title: 'Marks page showing blank',
    description: 'The marks page is not loading any data. It shows a blank screen after the loading spinner. Tried on both mobile and desktop browsers. Issue persists since yesterday.',
    status: 'resolved',
    isAnonymous: false,
    createdAt: '2024-12-15T09:00:00Z',
    updatedAt: '2024-12-16T11:30:00Z',
    response: 'The issue has been fixed. Please try again and let us know if the problem persists.',
    respondedBy: 'IT Department',
  },
  {
    id: '3',
    category: 'facility',
    subcategory: 'Lab Equipment',
    title: 'Computer Lab 3 - Multiple PCs not working',
    description: 'In Computer Lab 3, at least 5 computers (PC-12 to PC-16) are not working properly. They either don\'t boot up or shut down randomly. This is affecting our practical classes.',
    status: 'seen',
    isAnonymous: false,
    attachmentName: 'lab_issue_photo.jpg',
    attachmentUrl: '#',
    createdAt: '2024-12-20T14:45:00Z',
    updatedAt: '2024-12-21T09:00:00Z',
  },
  {
    id: '4',
    category: 'academic',
    subcategory: 'Result Correction',
    title: 'Incorrect marks in Physics',
    description: 'My Physics internal marks show 18/30 but I scored 25/30 as per the answer sheet shown by the teacher. Request correction.',
    status: 'pending',
    isAnonymous: false,
    createdAt: '2024-12-22T16:20:00Z',
    updatedAt: '2024-12-22T16:20:00Z',
  },
  {
    id: '5',
    category: 'facility',
    subcategory: 'Washroom/Cleanliness',
    title: 'Washroom maintenance needed in Block B',
    description: 'The washroom on the 2nd floor of Block B requires immediate maintenance. Water taps are leaking and the cleanliness is poor.',
    status: 'resolved',
    isAnonymous: true,
    createdAt: '2024-12-10T08:00:00Z',
    updatedAt: '2024-12-12T17:00:00Z',
    response: 'Maintenance completed. Thank you for bringing this to our attention.',
    respondedBy: 'Maintenance Department',
  },
];
