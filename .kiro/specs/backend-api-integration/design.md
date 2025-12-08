# Design Document

## Overview

This design outlines the architecture and implementation strategy for integrating all frontend pages with the backend Django REST API and removing all mock data. The solution will create a comprehensive API service layer, implement proper loading and error states, and ensure all pages fetch real data from the Sadhu PostgreSQL database.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Applications                    │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │   Admin-Side React   │    │  Student-Side React      │  │
│  │   - Pages            │    │  - Pages                 │  │
│  │   - Components       │    │  - Components            │  │
│  └──────────┬───────────┘    └──────────┬───────────────┘  │
│             │                            │                   │
│  ┌──────────┴────────────────────────────┴───────────────┐  │
│  │           API Service Layer (TypeScript)              │  │
│  │  - studentService.ts                                  │  │
│  │  - teacherService.ts                                  │  │
│  │  - attendanceService.ts                               │  │
│  │  - marksService.ts                                    │  │
│  │  - routineService.ts                                  │  │
│  │  - dashboardService.ts                                │  │
│  │  - activityLogService.ts                              │  │
│  │  - alumniService.ts                                   │  │
│  │  - documentService.ts                                 │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │         Centralized API Client (axios)                │  │
│  │  - Authentication interceptor                         │  │
│  │  - Error handling interceptor                         │  │
│  │  - Base URL configuration                             │  │
│  └───────────────────────┬───────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────┴─────────────────────────────────┐
│                    Django REST Framework API                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Endpoints                                        │   │
│  │  - /api/students/                                     │   │
│  │  - /api/teachers/                                     │   │
│  │  - /api/attendance/                                   │   │
│  │  - /api/marks/                                        │   │
│  │  - /api/class-routines/                               │   │
│  │  - /api/dashboard/                                    │   │
│  │  - /api/activity-logs/                                │   │
│  │  - /api/alumni/                                       │   │
│  │  - /api/documents/                                    │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│              Sadhu PostgreSQL Database                       │
│  - Students, Teachers, Attendance, Marks, etc.              │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

Each page will follow this pattern:

```typescript
// Page Component Pattern
const PageComponent = () => {
  // State management
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data fetching
  useEffect(() => {
    fetchData();
  }, [dependencies]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiService.getData(params);
      setData(result);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Render states
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (data.length === 0) return <EmptyState />;
  
  return <DataDisplay data={data} />;
};
```

## Components and Interfaces

### API Service Layer

Each service will implement CRUD operations:

```typescript
// Example: studentService.ts
export interface Student {
  id: string;
  fullNameEnglish: string;
  fullNameBangla: string;
  currentRollNumber: string;
  department: string;
  semester: number;
  session: string;
  status: 'active' | 'inactive' | 'graduated' | 'discontinued';
  // ... other fields
}

export interface StudentFilters {
  page?: number;
  page_size?: number;
  search?: string;
  department?: string;
  semester?: number;
  status?: string;
  session?: string;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const studentService = {
  // List with pagination and filters
  getStudents: async (filters?: StudentFilters): Promise<PaginatedResponse<Student>> => {
    const response = await api.get('/students/', { params: filters });
    return response.data;
  },
  
  // Get single student
  getStudent: async (id: string): Promise<Student> => {
    const response = await api.get(`/students/${id}/`);
    return response.data;
  },
  
  // Create student
  createStudent: async (data: Partial<Student>): Promise<Student> => {
    const response = await api.post('/students/', data);
    return response.data;
  },
  
  // Update student
  updateStudent: async (id: string, data: Partial<Student>): Promise<Student> => {
    const response = await api.patch(`/students/${id}/`, data);
    return response.data;
  },
  
  // Delete student
  deleteStudent: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}/`);
  },
  
  // Bulk operations
  bulkUpdateStatus: async (data: { student_ids: string[]; status: string }): Promise<void> => {
    await api.post('/students/bulk_update_status/', data);
  },
  
  // Special operations
  disconnectStudies: async (id: string, data: { discontinuedReason: string }): Promise<void> => {
    await api.post(`/students/${id}/disconnect_studies/`, data);
  },
  
  transitionToAlumni: async (id: string): Promise<void> => {
    await api.post(`/students/${id}/transition_to_alumni/`);
  },
};
```

### Centralized API Client

```typescript
// lib/api.ts
import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Error message extractor
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  return 'An unexpected error occurred';
};
```

## Data Models

### TypeScript Interfaces

```typescript
// types/student.ts
export interface Student {
  id: string;
  fullNameEnglish: string;
  fullNameBangla: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  currentRollNumber: string;
  registrationNumber: string;
  department: string;
  departmentName?: string;
  semester: number;
  session: string;
  shift: string;
  status: 'active' | 'inactive' | 'graduated' | 'discontinued';
  studentMobile: string;
  guardianMobile: string;
  email: string;
  profilePhoto?: string;
  // ... other fields
}

// types/teacher.ts
export interface Teacher {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  officeRoom: string;
  subjects: string[];
  // ... other fields
}

// types/attendance.ts
export interface AttendanceRecord {
  id: string;
  student: string;
  studentName: string;
  date: string;
  period: number;
  subject: string;
  status: 'present' | 'absent' | 'late';
  markedBy: string;
}

// types/marks.ts
export interface MarksRecord {
  id: string;
  student: string;
  studentName: string;
  subject: string;
  subjectCode: string;
  ct1: number;
  ct2: number;
  ct3: number;
  assignment: number;
  attendance: number;
  internalTotal: number;
  finalExam: number | null;
  total: number | null;
  grade: string | null;
  gpa: number | null;
}

// types/routine.ts
export interface ClassPeriod {
  id: string;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  teacher: string;
  room: string;
  type: 'theory' | 'lab' | 'break';
}

// types/dashboard.ts
export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  discontinuedStudents: number;
  alumni: number;
  pendingAdmissions: number;
  totalApplications: number;
  attendancePercentage: number;
  averageCGPA: number;
}

// types/activityLog.ts
export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  targetName: string;
  description: string;
}

// types/alumni.ts
export interface Alumni {
  id: string;
  name: string;
  roll: string;
  department: string;
  graduationYear: string;
  currentJob: string;
  company: string;
  location: string;
  email: string;
  phone: string;
  gpa: number;
  category: string;
  supportStatus: 'needSupport' | 'needExtraSupport' | 'noSupportNeeded';
}

// types/document.ts
export interface Document {
  id: string;
  name: string;
  type: string;
  student: string;
  studentName: string;
  uploadDate: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'verified' | 'rejected';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data Consistency
*For any* page that displays data, when the data is fetched from the API, the displayed data should match the data returned from the API response.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

### Property 2: No Mock Data
*For any* page component, when searching the codebase for hardcoded data arrays, no mock data should be found in production code.
**Validates: Requirements 3.1, 3.2**

### Property 3: Loading State Display
*For any* page that fetches data, when the data is being loaded, a loading indicator should be visible to the user.
**Validates: Requirements 3.3, 6.1, 6.2, 6.3, 6.4**

### Property 4: Error State Display
*For any* API request that fails, when an error occurs, an appropriate error message should be displayed to the user.
**Validates: Requirements 3.4, 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 5: Empty State Display
*For any* list page, when the API returns an empty array, an empty state message should be displayed to the user.
**Validates: Requirements 3.5**

### Property 6: Service Layer Centralization
*For any* API request, when making the request, it should go through a dedicated service file rather than being called directly in components.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 7: Type Safety
*For any* API service method, when it returns data, the data should conform to the defined TypeScript interface.
**Validates: Requirements 4.5**

### Property 8: Authentication Handling
*For any* API request that returns a 401 status, when the error is received, the user should be redirected to the login page.
**Validates: Requirements 7.2**

### Property 9: Consistent Data Fetching
*For any* page that fetches data on mount, when the component mounts, it should use the useEffect hook with proper dependency array.
**Validates: Requirements 8.1**

### Property 10: Optimistic Updates
*For any* data mutation operation, when the user submits changes, the UI should update optimistically and rollback on error.
**Validates: Requirements 8.5**

## Error Handling

### Error Types and Handling Strategy

1. **Network Errors**: Display "Unable to connect to server. Please check your internet connection."
2. **Authentication Errors (401)**: Redirect to login page and clear stored tokens
3. **Authorization Errors (403)**: Display "You don't have permission to perform this action."
4. **Validation Errors (400)**: Display field-specific error messages from API response
5. **Not Found Errors (404)**: Display "The requested resource was not found."
6. **Server Errors (500)**: Display "Something went wrong on our end. Please try again later."

### Error Component

```typescript
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Error</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
};
```

## Testing Strategy

### Unit Tests

1. Test API service methods with mocked axios responses
2. Test error message extraction utility
3. Test TypeScript interface validation
4. Test loading state transitions in components

### Integration Tests

1. Test complete data flow from component to API and back
2. Test error handling across different error types
3. Test pagination and filtering functionality
4. Test authentication flow and token refresh

### Property-Based Tests

Property-based tests will be written using fast-check library for JavaScript/TypeScript. Each test should run at least 100 iterations.

1. **Property 1 Test**: Generate random API responses and verify displayed data matches
2. **Property 2 Test**: Scan codebase for patterns matching mock data arrays
3. **Property 3 Test**: Verify loading states appear during async operations
4. **Property 4 Test**: Generate random error responses and verify error messages display
5. **Property 5 Test**: Verify empty states appear when API returns empty arrays
6. **Property 6 Test**: Verify all API calls go through service layer
7. **Property 7 Test**: Generate random data and verify TypeScript type checking
8. **Property 8 Test**: Verify 401 responses trigger redirect to login
9. **Property 9 Test**: Verify useEffect hooks have correct dependencies
10. **Property 10 Test**: Verify UI updates optimistically and rolls back on error

## Implementation Notes

### Pages Requiring Integration

**Admin-Side:**
- ActivityLogs.tsx - Connect to /api/activity-logs/
- Alumni.tsx - Connect to /api/alumni/
- AlumniDetails.tsx - Connect to /api/alumni/:id/
- Analytics.tsx - Connect to /api/analytics/
- AttendanceMarks.tsx - Connect to /api/attendance/ and /api/marks/
- ClassRoutine.tsx - Connect to /api/class-routines/
- Dashboard.tsx - Connect to /api/dashboard/stats/
- DiscontinuedStudents.tsx - Connect to /api/students/?status=discontinued
- Documents.tsx - Connect to /api/documents/
- Settings.tsx - Connect to /api/settings/

**Student-Side:**
- AddAttendancePage.tsx - Connect to /api/attendance/
- AttendancePage.tsx - Connect to /api/attendance/my-attendance/
- ClassRoutinePage.tsx - Connect to /api/class-routines/my-routine/
- Dashboard.tsx - Connect to /api/dashboard/student-stats/
- ManageMarksPage.tsx - Connect to /api/marks/
- MarksPage.tsx - Connect to /api/marks/my-marks/
- ProfilePage.tsx - Connect to /api/students/me/
- StudentListPage.tsx - Connect to /api/students/
- TeacherContactsPage.tsx - Connect to /api/teachers/

### Sample Data Script

The `server/create_sample_data.py` script should be:
1. Renamed to `server/create_sample_data.py.disabled` or moved to a `dev-tools` directory
2. Updated with a warning comment at the top
3. Never executed in production environments
4. Documented in README with clear warnings

### Migration Strategy

1. **Phase 1**: Create all API service files
2. **Phase 2**: Update one page at a time, starting with simple list pages
3. **Phase 3**: Add loading and error states to all pages
4. **Phase 4**: Remove all mock data
5. **Phase 5**: Test thoroughly and fix any issues
6. **Phase 6**: Disable sample data script
