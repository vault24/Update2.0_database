# Teacher Management System Design

## Overview

The teacher management system extends the existing admin-side and student-side applications to provide comprehensive teacher information management and student-teacher communication tracking. The system consists of three main components: a teacher request management interface for administrators, a teacher directory with detailed profiles, and a request submission interface for students.

The design follows the existing application architecture using React with TypeScript on the frontend, Django REST Framework on the backend, and PostgreSQL for data persistence. The system integrates seamlessly with the current navigation structure and UI component library.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin-Side Application                   │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │ Teacher Requests   │  │   Teacher Directory          │  │
│  │ Management Page    │  │   & Profile Pages            │  │
│  └────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Django Backend                           │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │ Teachers App       │  │   Teacher Requests App       │  │
│  │ (Models, Views,    │  │   (Models, Views,            │  │
│  │  Serializers)      │  │    Serializers)              │  │
│  └────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Student-Side Application                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Teacher Contact Request Submission Form              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18, TypeScript, React Router v6, TanStack Query, Framer Motion
- **UI Components**: shadcn/ui component library (existing)
- **Backend**: Django 4.x, Django REST Framework
- **Database**: PostgreSQL with UUID primary keys
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS with existing design system

## Components and Interfaces

### Backend Models

#### Teacher Model
```python
class Teacher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    fullNameBangla = models.CharField(max_length=255)
    fullNameEnglish = models.CharField(max_length=255)
    designation = models.CharField(max_length=100)
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT)
    email = models.EmailField(unique=True)
    mobileNumber = models.CharField(max_length=11)
    officeLocation = models.CharField(max_length=255)
    subjects = models.JSONField(default=list)  # List of subject names
    employmentStatus = models.CharField(max_length=20, choices=STATUS_CHOICES)
    joiningDate = models.DateField()
    profilePhoto = models.CharField(max_length=500, blank=True)
    qualifications = models.JSONField(default=list)
    specializations = models.JSONField(default=list)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
```

#### TeacherRequest Model
```python
class TeacherRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    teacher = models.ForeignKey('Teacher', on_delete=models.CASCADE)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requestDate = models.DateTimeField(auto_now_add=True)
    resolvedDate = models.DateTimeField(null=True, blank=True)
    adminNotes = models.TextField(blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
```

### API Endpoints

#### Teachers API
- `GET /api/teachers/` - List all teachers (paginated, searchable)
- `GET /api/teachers/:id/` - Get teacher details
- `POST /api/teachers/` - Create new teacher (admin only)
- `PUT /api/teachers/:id/` - Update teacher (admin only)
- `DELETE /api/teachers/:id/` - Delete teacher (admin only)
- `GET /api/teachers/stats/` - Get teacher statistics

#### Teacher Requests API
- `GET /api/teacher-requests/` - List all requests (admin view, filterable by status)
- `GET /api/teacher-requests/:id/` - Get request details
- `POST /api/teacher-requests/` - Create new request (student side)
- `PATCH /api/teacher-requests/:id/status/` - Update request status (admin only)
- `GET /api/teacher-requests/stats/` - Get request statistics by status

### Frontend Components

#### Admin-Side Pages

**TeachersPage.tsx** - Main teachers section with tabs
- Tab 1: Teacher Requests (default)
- Tab 2: All Teachers Directory

**TeacherRequestsTab.tsx** - Teacher requests management
- Request list with filtering (pending, resolved, archived)
- Request details modal/panel
- Status update controls
- Statistics cards

**TeacherDirectoryTab.tsx** - Teacher directory
- Paginated teacher list
- Search and filter controls
- Teacher cards with basic info
- Navigation to profile pages

**TeacherProfile.tsx** - Detailed teacher profile page
- Personal and contact information
- Department and subjects
- Employment details
- Statistics (students, classes)

#### Student-Side Components

**TeacherContactRequestForm.tsx** - Request submission form
- Teacher selection dropdown
- Subject input
- Message textarea
- Form validation
- Success/error feedback

### Data Models

#### Teacher Interface (TypeScript)
```typescript
interface Teacher {
  id: string;
  fullNameBangla: string;
  fullNameEnglish: string;
  designation: string;
  department: Department;
  email: string;
  mobileNumber: string;
  officeLocation: string;
  subjects: string[];
  employmentStatus: 'active' | 'on_leave' | 'retired';
  joiningDate: string;
  profilePhoto?: string;
  qualifications: Qualification[];
  specializations: string[];
  createdAt: string;
  updatedAt: string;
}

interface Qualification {
  degree: string;
  institution: string;
  year: number;
}
```

#### TeacherRequest Interface (TypeScript)
```typescript
interface TeacherRequest {
  id: string;
  student: StudentBasic;
  teacher: TeacherBasic;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'archived';
  requestDate: string;
  resolvedDate?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentBasic {
  id: string;
  fullNameEnglish: string;
  currentRollNumber: string;
  mobileStudent: string;
  email: string;
}

interface TeacherBasic {
  id: string;
  fullNameEnglish: string;
  designation: string;
  department: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Request list displays all required fields
*For any* teacher request in the system, when displayed in the admin request list, the rendered output SHALL contain the student name, teacher name, request date, and request message.
**Validates: Requirements 1.2**

### Property 2: Request sorting by date
*For any* list of teacher requests, when sorted by date, the most recent request SHALL appear first in the list.
**Validates: Requirements 1.4**

### Property 3: Teacher directory pagination
*For any* teacher list containing more than 20 entries, the system SHALL display exactly 20 or fewer teachers per page.
**Validates: Requirements 2.3**

### Property 4: Search filter correctness
*For any* search query and teacher list, all returned results SHALL match the query in at least one of: teacher name, department name, or subject name.
**Validates: Requirements 2.4**

### Property 5: Profile navigation consistency
*For any* teacher entry in the directory, clicking the entry SHALL navigate to a profile page with a URL containing that teacher's ID.
**Validates: Requirements 3.1**

### Property 6: Status update persistence
*For any* teacher request, when the status is updated, querying the request immediately after SHALL return the updated status value.
**Validates: Requirements 4.2**

### Property 7: Status filter correctness
*For any* status filter selection and request list, all displayed requests SHALL have a status matching the selected filter.
**Validates: Requirements 4.3**

### Property 8: Form validation for empty requests
*For any* request submission attempt with empty required fields, the system SHALL prevent submission and display validation errors.
**Validates: Requirements 5.4**

### Property 9: Request availability after submission
*For any* successfully submitted teacher request, querying the admin system immediately after submission SHALL return the request in the list.
**Validates: Requirements 5.5**

### Property 10: UI component consistency
*For any* teacher section page, all UI components used SHALL be from the existing shadcn/ui component library.
**Validates: Requirements 6.4**

## Error Handling

### Frontend Error Handling

**Network Errors**
- Display toast notifications for failed API calls
- Implement retry logic with exponential backoff
- Show loading skeletons during data fetching
- Provide fallback UI for failed data loads

**Validation Errors**
- Display inline validation messages on form fields
- Prevent form submission until all validations pass
- Show field-specific error messages from backend
- Highlight invalid fields with error styling

**Not Found Errors**
- Display 404 page for invalid teacher IDs
- Show empty state messages for no results
- Provide navigation back to directory

### Backend Error Handling

**Database Errors**
- Return 500 status with generic error message
- Log detailed error information server-side
- Implement transaction rollback for failed operations

**Validation Errors**
- Return 400 status with field-specific error details
- Validate all required fields before database operations
- Check foreign key constraints

**Permission Errors**
- Return 403 status for unauthorized operations
- Implement role-based access control
- Verify admin permissions for sensitive operations

**Not Found Errors**
- Return 404 status for non-existent resources
- Validate UUID format before database queries

## Testing Strategy

### Unit Testing

The system will use **Vitest** for unit testing React components and **pytest** for Django backend testing.

**Frontend Unit Tests**
- Component rendering with various props
- Form validation logic
- Search and filter functionality
- Status update handlers
- Navigation behavior
- Empty state displays

**Backend Unit Tests**
- Model creation and validation
- Serializer field validation
- API endpoint responses
- Permission checks
- Query filtering logic

### Property-Based Testing

The system will use **fast-check** for frontend property-based testing and **Hypothesis** for backend property-based testing. Each property-based test will run a minimum of 100 iterations.

**Property Test Requirements**
- Each property-based test MUST be tagged with a comment referencing the design document property
- Tag format: `**Feature: teacher-management, Property {number}: {property_text}**`
- Each correctness property MUST be implemented by a SINGLE property-based test
- Tests should generate random valid inputs to verify properties hold across all cases

**Frontend Property Tests**
- Property 1: Request list field display
- Property 2: Request date sorting
- Property 3: Pagination limits
- Property 4: Search filter matching
- Property 5: Profile navigation URLs
- Property 7: Status filter matching
- Property 8: Empty form validation
- Property 10: Component library usage

**Backend Property Tests**
- Property 6: Status update persistence
- Property 9: Request availability after creation

### Integration Testing

**API Integration Tests**
- Full request/response cycles
- Database persistence verification
- Cross-app data relationships (students, teachers, departments)
- Pagination and filtering with real data

**End-to-End Tests**
- Complete user workflows (submit request → view in admin → update status)
- Navigation flows between pages
- Form submission and validation
- Search and filter interactions

## Implementation Notes

### Database Migrations

1. Create `teachers` app with Teacher model
2. Create `teacher_requests` app with TeacherRequest model
3. Add indexes for frequently queried fields (status, requestDate, teacher_id, student_id)
4. Add foreign key constraints with CASCADE/PROTECT as appropriate

### Routing Structure

**Admin-Side Routes**
- `/teachers` - Main teachers page (requests tab by default)
- `/teachers/:id` - Teacher profile page

**Student-Side Routes**
- `/teacher-contacts` - Existing page, add request form

### State Management

- Use TanStack Query for all API data fetching
- Implement optimistic updates for status changes
- Cache teacher list and profile data
- Invalidate queries on mutations

### UI/UX Considerations

- Maintain consistent styling with existing pages
- Use existing color scheme for status badges
- Implement responsive design for mobile devices
- Add loading states and skeletons
- Provide clear feedback for all user actions
- Use animations from Framer Motion for transitions

### Performance Optimization

- Implement pagination for large datasets
- Use database indexes for common queries
- Lazy load teacher profiles
- Debounce search input
- Cache frequently accessed data
- Optimize images with appropriate formats and sizes
