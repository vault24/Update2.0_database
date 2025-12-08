# Design Document

## Overview

This design document outlines the architecture and implementation approach for completing the full-stack integration of the Student Learning Management System (SLMS). The system follows a modern three-tier architecture with React frontends (Admin-side and Student-side) communicating with a Django REST API backend that manages data persistence in PostgreSQL.

The design focuses on implementing missing backend endpoints, authentication workflows, role-based access control, and ensuring data consistency across all CRUD operations. The system will support multiple user roles (Student, Captain, Teacher, Registrar, Institute Head) with appropriate permissions and workflows.

## Architecture

### System Components

1. **Frontend Applications**
   - Admin-side (React + TypeScript + Vite)
   - Student-side (React + TypeScript + Vite)
   - Shared UI components (shadcn/ui)
   - State management (React Query)

2. **Backend API**
   - Django 4.2 with Django REST Framework
   - PostgreSQL database
   - Django Channels for WebSocket support (notifications)
   - Redis for channel layers

3. **Authentication & Authorization**
   - Django session-based authentication
   - Role-based access control (RBAC)
   - Custom user model with role field

### Data Flow

```
Frontend (React) → API Request → Django Views → Serializers → Models → PostgreSQL
                                      ↓
                                 Validators
                                      ↓
                              Business Logic
                                      ↓
                              Activity Logging
```

### API Design Principles

- RESTful endpoints following Django REST Framework conventions
- Consistent response formats with proper HTTP status codes
- Comprehensive error handling with descriptive messages
- Pagination for list endpoints (20 items per page)
- Filtering, searching, and ordering capabilities
- Nested resources where appropriate (e.g., `/departments/{id}/students/`)

## Components and Interfaces

### 1. Authentication System

**User Model Extension**
```python
class User(AbstractUser):
    role = CharField(choices=[
        ('student', 'Student'),
        ('captain', 'Captain'),
        ('teacher', 'Teacher'),
        ('registrar', 'Registrar'),
        ('institute_head', 'Institute Head')
    ])
    account_status = CharField(choices=[
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('suspended', 'Suspended')
    ])
    admission_status = CharField(choices=[
        ('not_started', 'Not Started'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ])
    related_profile_id = UUIDField(null=True)  # Links to Student/Teacher model
```

**Authentication Endpoints**
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/me/` - Get current user profile
- `POST /api/auth/change-password/` - Change password

### 2. Admission System

**Admission Model**
```python
class Admission(models.Model):
    user = ForeignKey(User)
    # Personal Information
    full_name_bangla = CharField(max_length=255)
    full_name_english = CharField(max_length=255)
    father_name = CharField(max_length=255)
    father_nid = CharField(max_length=20)
    mother_name = CharField(max_length=255)
    mother_nid = CharField(max_length=20)
    date_of_birth = DateField()
    birth_certificate_no = CharField(max_length=50)
    gender = CharField(max_length=10)
    religion = CharField(max_length=50)
    blood_group = CharField(max_length=5)
    
    # Contact Information
    mobile_student = CharField(max_length=11)
    guardian_mobile = CharField(max_length=11)
    email = EmailField()
    emergency_contact = CharField(max_length=255)
    present_address = JSONField()
    permanent_address = JSONField()
    
    # Educational Background
    highest_exam = CharField(max_length=100)
    board = CharField(max_length=100)
    group = CharField(max_length=50)
    roll_number = CharField(max_length=50)
    registration_number = CharField(max_length=50)
    passing_year = IntegerField()
    gpa = DecimalField(max_digits=4, decimal_places=2)
    institution_name = CharField(max_length=255)
    
    # Admission Details
    desired_department = ForeignKey(Department)
    desired_shift = CharField(max_length=20)
    session = CharField(max_length=20)
    
    # Documents
    documents = JSONField(default=dict)  # {type: file_path}
    
    # Status
    status = CharField(choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ])
    submitted_at = DateTimeField(auto_now_add=True)
    reviewed_at = DateTimeField(null=True)
    reviewed_by = ForeignKey(User, related_name='reviewed_admissions')
    review_notes = TextField(blank=True)
```

**Admission Endpoints**
- `POST /api/admissions/` - Submit admission application
- `GET /api/admissions/` - List all admissions (admin only)
- `GET /api/admissions/{id}/` - Get admission details
- `PATCH /api/admissions/{id}/approve/` - Approve admission
- `PATCH /api/admissions/{id}/reject/` - Reject admission
- `GET /api/admissions/my-admission/` - Get current user's admission

### 3. Teacher Management System

**Teacher Signup Request Model**
```python
class TeacherSignupRequest(models.Model):
    # Personal Information
    full_name_bangla = CharField(max_length=255)
    full_name_english = CharField(max_length=255)
    email = EmailField(unique=True)
    mobile_number = CharField(max_length=11)
    
    # Professional Information
    designation = CharField(max_length=100)
    department = ForeignKey(Department)
    qualifications = JSONField(default=list)
    specializations = JSONField(default=list)
    
    # Account Information
    username = CharField(max_length=150, unique=True)
    password_hash = CharField(max_length=255)
    
    # Status
    status = CharField(choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ])
    submitted_at = DateTimeField(auto_now_add=True)
    reviewed_at = DateTimeField(null=True)
    reviewed_by = ForeignKey(User, related_name='reviewed_teacher_requests')
    review_notes = TextField(blank=True)
```

**Teacher Management Endpoints**
- `POST /api/teachers/signup-request/` - Submit teacher signup request
- `GET /api/teachers/requests/` - List pending teacher requests (admin only)
- `GET /api/teachers/requests/{id}/` - Get request details
- `POST /api/teachers/requests/{id}/approve/` - Approve teacher request
- `POST /api/teachers/requests/{id}/reject/` - Reject teacher request
- `GET /api/teachers/` - List all teachers
- `GET /api/teachers/{id}/` - Get teacher details
- `PUT /api/teachers/{id}/` - Update teacher information
- `DELETE /api/teachers/{id}/` - Delete teacher

### 4. Class Routine System

**ClassRoutine Model**
```python
class ClassRoutine(models.Model):
    department = ForeignKey(Department)
    semester = IntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    shift = CharField(max_length=20)
    
    day_of_week = CharField(max_length=10, choices=[
        ('Sunday', 'Sunday'),
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday')
    ])
    
    start_time = TimeField()
    end_time = TimeField()
    
    subject_name = CharField(max_length=255)
    subject_code = CharField(max_length=50)
    teacher = ForeignKey(Teacher, null=True)
    room_number = CharField(max_length=50)
    
    session = CharField(max_length=20)
    is_active = BooleanField(default=True)
```

**Class Routine Endpoints**
- `POST /api/class-routines/` - Create class routine entry
- `GET /api/class-routines/` - List class routines with filters
- `GET /api/class-routines/{id}/` - Get routine details
- `PUT /api/class-routines/{id}/` - Update routine entry
- `DELETE /api/class-routines/{id}/` - Delete routine entry
- `GET /api/class-routines/my-routine/` - Get current user's routine

### 5. Attendance System

**Attendance Model**
```python
class AttendanceRecord(models.Model):
    student = ForeignKey(Student)
    subject_code = CharField(max_length=50)
    subject_name = CharField(max_length=255)
    semester = IntegerField()
    
    date = DateField()
    is_present = BooleanField()
    
    recorded_by = ForeignKey(User)  # Teacher or Captain
    recorded_at = DateTimeField(auto_now_add=True)
    
    notes = TextField(blank=True)
```

**Attendance Endpoints**
- `POST /api/attendance/` - Record attendance
- `GET /api/attendance/` - List attendance records with filters
- `GET /api/attendance/student/{student_id}/` - Get student attendance
- `GET /api/attendance/summary/` - Get attendance summary
- `PUT /api/attendance/{id}/` - Update attendance record

### 6. Marks Management System

**MarksRecord Model**
```python
class MarksRecord(models.Model):
    student = ForeignKey(Student)
    subject_code = CharField(max_length=50)
    subject_name = CharField(max_length=255)
    semester = IntegerField()
    
    exam_type = CharField(max_length=50, choices=[
        ('midterm', 'Midterm'),
        ('final', 'Final'),
        ('assignment', 'Assignment'),
        ('practical', 'Practical')
    ])
    
    marks_obtained = DecimalField(max_digits=5, decimal_places=2)
    total_marks = DecimalField(max_digits=5, decimal_places=2)
    
    recorded_by = ForeignKey(User)  # Teacher
    recorded_at = DateTimeField(auto_now_add=True)
    
    remarks = TextField(blank=True)
```

**Marks Endpoints**
- `POST /api/marks/` - Record marks
- `GET /api/marks/` - List marks records with filters
- `GET /api/marks/student/{student_id}/` - Get student marks
- `PUT /api/marks/{id}/` - Update marks record
- `DELETE /api/marks/{id}/` - Delete marks record

### 7. Correction Request System

**CorrectionRequest Model**
```python
class CorrectionRequest(models.Model):
    student = ForeignKey(Student)
    
    field_name = CharField(max_length=100)
    current_value = TextField()
    requested_value = TextField()
    reason = TextField()
    
    supporting_documents = JSONField(default=list)
    
    status = CharField(choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ])
    
    submitted_at = DateTimeField(auto_now_add=True)
    reviewed_at = DateTimeField(null=True)
    reviewed_by = ForeignKey(User, related_name='reviewed_corrections')
    review_notes = TextField(blank=True)
```

**Correction Request Endpoints**
- `POST /api/correction-requests/` - Submit correction request
- `GET /api/correction-requests/` - List correction requests
- `GET /api/correction-requests/{id}/` - Get request details
- `POST /api/correction-requests/{id}/approve/` - Approve and apply correction
- `POST /api/correction-requests/{id}/reject/` - Reject correction request

### 8. Activity Logging System

**ActivityLog Model**
```python
class ActivityLog(models.Model):
    user = ForeignKey(User)
    action_type = CharField(max_length=50, choices=[
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('login', 'Login'),
        ('logout', 'Logout')
    ])
    
    entity_type = CharField(max_length=50)  # e.g., 'Student', 'Admission', 'Teacher'
    entity_id = CharField(max_length=255)
    
    description = TextField()
    changes = JSONField(default=dict)  # Before/after values for updates
    
    ip_address = GenericIPAddressField(null=True)
    user_agent = TextField(blank=True)
    
    timestamp = DateTimeField(auto_now_add=True)
```

**Activity Log Endpoints**
- `GET /api/activity-logs/` - List activity logs with filters
- `GET /api/activity-logs/{id}/` - Get log details
- `GET /api/activity-logs/export/` - Export logs to CSV

### 9. Dashboard and Analytics

**Dashboard Endpoints**
- `GET /api/dashboard/stats/` - Get dashboard statistics
- `GET /api/dashboard/admin/` - Get admin dashboard data
- `GET /api/dashboard/student/` - Get student dashboard data
- `GET /api/dashboard/teacher/` - Get teacher dashboard data

**Analytics Endpoints**
- `GET /api/analytics/admissions-trend/` - Admission trends over time
- `GET /api/analytics/department-distribution/` - Student distribution by department
- `GET /api/analytics/attendance-summary/` - Attendance statistics
- `GET /api/analytics/performance-metrics/` - Academic performance metrics

## Data Models

### Address Structure (JSON)
```json
{
  "village": "string",
  "postOffice": "string",
  "upazila": "string",
  "district": "string",
  "division": "string"
}
```

### Semester Results Structure (JSON)
```json
[
  {
    "semester": 1,
    "year": 2024,
    "resultType": "gpa",
    "gpa": 3.75,
    "cgpa": 3.75,
    "subjects": [
      {
        "code": "CSE101",
        "name": "Programming Fundamentals",
        "credit": 3,
        "grade": "A",
        "gradePoint": 4.0
      }
    ]
  }
]
```

### Semester Attendance Structure (JSON)
```json
[
  {
    "semester": 1,
    "year": 2024,
    "subjects": [
      {
        "code": "CSE101",
        "name": "Programming Fundamentals",
        "present": 45,
        "total": 50,
        "percentage": 90.0
      }
    ],
    "averagePercentage": 88.5
  }
]
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all identified testable properties, several can be consolidated to reduce redundancy:

- Properties related to "validate and create/update" follow the same pattern and can be grouped by entity type
- Properties related to "display with filtering" are repetitive across different list views
- Properties related to approval/rejection workflows follow the same pattern
- Properties related to data isolation (students seeing only their data) follow the same pattern

The consolidated properties below focus on unique validation value while eliminating redundant checks.

### Authentication and Authorization Properties

**Property 1: Role-based account activation**
*For any* user account creation, if the role is Student or Captain, then the account status should be active; if the role is Teacher, then the account status should be pending.
**Validates: Requirements 1.1, 1.2**

**Property 2: Login credential validation**
*For any* login attempt with valid credentials, the system should return user profile data including role information and admission status.
**Validates: Requirements 1.3**

**Property 3: Admission-based redirection**
*For any* Student or Captain user with admission_status not equal to 'approved', login should trigger a redirect to the admission page.
**Validates: Requirements 1.4**

**Property 4: Teacher approval workflow**
*For any* pending teacher account, when approved by an admin, the account status should change to active and login should be enabled.
**Validates: Requirements 1.5**

### Admission Workflow Properties

**Property 5: Admission submission validation**
*For any* admission form submission with all required fields, the system should create an admission record with status 'pending'.
**Validates: Requirements 2.1**

**Property 6: Admission data persistence**
*For any* submitted admission, all personal, contact, educational, and document fields should be stored and retrievable from the database.
**Validates: Requirements 2.2**

**Property 7: Admission approval creates student profile**
*For any* approved admission, the system should create or update a student profile with matching data and change admission status to 'approved'.
**Validates: Requirements 2.4**

### CRUD Operation Properties

**Property 8: Unique identifier generation**
*For any* newly created student record, the system should generate unique currentRollNumber and currentRegistrationNumber values that do not conflict with existing records.
**Validates: Requirements 3.1**

**Property 9: Status transition with required data**
*For any* student marked as discontinued, the system should update status to 'discontinued', store a non-empty discontinuedReason, and include the record in the discontinued students list.
**Validates: Requirements 3.5**

**Property 10: Complete data retrieval**
*For any* detail view request (student, teacher, alumni, department), the system should return all expected fields including nested relationships.
**Validates: Requirements 3.3, 4.4, 5.2, 8.3**

### Filtering and Search Properties

**Property 11: Multi-criteria filtering**
*For any* list endpoint with filter parameters, the system should return only records matching all specified filter criteria (department, semester, status, shift, type, etc.).
**Validates: Requirements 2.3, 3.2, 4.1, 5.5, 6.2, 7.2, 8.2, 9.2, 11.2, 12.5**

**Property 12: Personalized data isolation**
*For any* student or teacher viewing their own data (applications, documents, attendance, marks, routine, correction requests), the system should return only records associated with that user.
**Validates: Requirements 6.5, 7.5, 9.3, 9.4, 11.5, 13.4, 13.5**

### Approval and Rejection Workflow Properties

**Property 13: Approval workflow consistency**
*For any* approval action (admission, teacher request, application, correction request), the system should update status to 'approved', record reviewer information, and execute any required side effects (profile creation, account activation, data changes).
**Validates: Requirements 2.4, 4.2, 6.3, 11.3**

**Property 14: Rejection workflow consistency**
*For any* rejection action (admission, teacher request, application, correction request), the system should update status to 'rejected' and store optional rejection notes.
**Validates: Requirements 2.5, 4.3, 6.4, 11.4**

### Data Validation Properties

**Property 15: Required field validation**
*For any* create or update operation, the system should reject requests missing required fields with appropriate error messages.
**Validates: Requirements 2.1, 3.1, 5.3, 6.1, 9.1, 11.1, 14.1**

**Property 16: Range and format validation**
*For any* numeric or formatted field (GPA, marks, mobile numbers, time slots), the system should validate values are within acceptable ranges and formats before storage.
**Validates: Requirements 9.1, 10.2**

### Academic Records Properties

**Property 17: Attendance percentage calculation**
*For any* student's attendance records, the displayed percentage should equal (present_count / total_count) * 100 for each subject.
**Validates: Requirements 10.3**

**Property 18: Alumni eligibility check**
*For any* student, conversion to alumni status should only be allowed if semester results include all semesters 1 through 8.
**Validates: Requirements 8.1**

### Activity Logging Properties

**Property 19: Automatic action logging**
*For any* create, update, delete, approve, or reject operation, the system should create an activity log entry with user, timestamp, action type, entity type, and entity ID.
**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

**Property 20: Change tracking in logs**
*For any* update operation, the activity log should include before and after values for changed fields.
**Validates: Requirements 12.2**

### Aggregation and Analytics Properties

**Property 21: Dashboard KPI accuracy**
*For any* dashboard view, displayed statistics (student counts, admission counts, department summaries) should match the actual count of records in the database with applied filters.
**Validates: Requirements 5.1, 13.1, 13.2**

**Property 22: Filtered aggregation consistency**
*For any* analytics or dashboard view with date range or department filters applied, the aggregated data should include only records matching the filter criteria.
**Validates: Requirements 13.3**

### File Management Properties

**Property 23: File upload and metadata consistency**
*For any* document upload, both the file should be stored in the file system and a corresponding database record with metadata should be created.
**Validates: Requirements 7.1**

**Property 24: File deletion cleanup**
*For any* document deletion, both the database record and the physical file should be removed from the system.
**Validates: Requirements 7.4**

## Error Handling

### Error Response Format

All API errors should follow a consistent format:

```json
{
  "error": "Brief error message",
  "details": "Detailed explanation",
  "field_errors": {
    "field_name": ["Error message 1", "Error message 2"]
  },
  "status_code": 400
}
```

### Error Categories

1. **Validation Errors (400 Bad Request)**
   - Missing required fields
   - Invalid field formats
   - Out-of-range values
   - Duplicate unique fields

2. **Authentication Errors (401 Unauthorized)**
   - Invalid credentials
   - Expired session
   - Missing authentication token

3. **Authorization Errors (403 Forbidden)**
   - Insufficient permissions
   - Role-based access denied
   - Account status prevents action

4. **Not Found Errors (404 Not Found)**
   - Resource does not exist
   - Invalid ID

5. **Conflict Errors (409 Conflict)**
   - Duplicate record
   - State conflict (e.g., already approved)

6. **Server Errors (500 Internal Server Error)**
   - Database errors
   - File system errors
   - Unexpected exceptions

### Error Handling Strategy

- Use Django REST Framework's exception handling
- Implement custom exception classes for domain-specific errors
- Log all errors with stack traces for debugging
- Return user-friendly error messages
- Include field-level validation errors
- Implement retry logic for transient failures

## Testing Strategy

### Unit Testing

Unit tests will verify individual components in isolation:

- **Model Tests**: Validate model methods, properties, and constraints
- **Serializer Tests**: Test validation logic and data transformation
- **View Tests**: Verify endpoint behavior with mocked dependencies
- **Utility Tests**: Test helper functions and validators

**Testing Framework**: Django's built-in TestCase and pytest

**Coverage Target**: Minimum 80% code coverage

### Property-Based Testing

Property-based tests will verify universal properties across many inputs:

- **Testing Framework**: Hypothesis for Python
- **Test Configuration**: Minimum 100 iterations per property
- **Property Test Organization**: One test file per major component (auth, admissions, students, etc.)

Each property-based test must:
- Be tagged with a comment referencing the design document property
- Use the format: `# Feature: full-stack-integration, Property {number}: {property_text}`
- Generate realistic test data using Hypothesis strategies
- Verify the property holds across all generated inputs

**Example Property Test Structure**:

```python
from hypothesis import given, strategies as st
import hypothesis.strategies as st

# Feature: full-stack-integration, Property 1: Role-based account activation
@given(
    role=st.sampled_from(['student', 'captain', 'teacher']),
    user_data=st.fixed_dictionaries({
        'username': st.text(min_size=5, max_size=20),
        'email': st.emails(),
        'password': st.text(min_size=8)
    })
)
def test_role_based_account_activation(role, user_data):
    """For any user account creation, account status should match role requirements"""
    user = create_user(role=role, **user_data)
    
    if role in ['student', 'captain']:
        assert user.account_status == 'active'
    elif role == 'teacher':
        assert user.account_status == 'pending'
```

### Integration Testing

Integration tests will verify end-to-end workflows:

- **Authentication Flow**: Registration → Login → Access Protected Resource
- **Admission Workflow**: Submit → Admin Review → Approve → Student Profile Created
- **Teacher Approval**: Signup Request → Admin Approve → Account Active → Login
- **CRUD Operations**: Create → Read → Update → Delete for each entity
- **File Upload**: Upload → Store → Retrieve → Delete

**Testing Approach**:
- Use Django's TestClient for API requests
- Create test database with sample data
- Verify database state after operations
- Test both success and failure scenarios

### API Testing

API tests will verify endpoint contracts:

- **Request/Response Format**: Validate JSON structure
- **Status Codes**: Verify correct HTTP status codes
- **Pagination**: Test page navigation and limits
- **Filtering**: Verify filter parameters work correctly
- **Sorting**: Test ordering parameters
- **Error Responses**: Verify error format and messages

### Performance Testing

Performance tests will ensure system scalability:

- **Load Testing**: Simulate concurrent users
- **Query Optimization**: Verify database query efficiency
- **Response Time**: Measure endpoint response times
- **Memory Usage**: Monitor memory consumption

**Tools**: Django Debug Toolbar, django-silk for profiling

## Implementation Notes

### Database Migrations

- Create migrations incrementally for each new model
- Use data migrations for transforming existing data
- Test migrations on a copy of production data
- Provide rollback migrations for safety

### Authentication Implementation

- Extend Django's AbstractUser model
- Use Django's session-based authentication
- Implement custom authentication backend if needed
- Add middleware for role-based access control

### File Storage

- Store uploaded files in `media/` directory
- Organize files by type: `media/students/`, `media/documents/`, etc.
- Generate unique filenames to prevent conflicts
- Implement file size and type validation
- Consider cloud storage (S3) for production

### Activity Logging Implementation

- Use Django signals to automatically log model changes
- Create middleware to capture request context (IP, user agent)
- Implement async logging to avoid performance impact
- Provide log retention policy (e.g., keep 1 year)

### API Versioning

- Use URL versioning: `/api/v1/`
- Maintain backward compatibility
- Document breaking changes
- Provide migration guides for frontend

### Security Considerations

- Implement CSRF protection for state-changing operations
- Use HTTPS in production
- Sanitize user inputs to prevent XSS
- Implement rate limiting to prevent abuse
- Use parameterized queries to prevent SQL injection
- Validate file uploads to prevent malicious files
- Implement proper CORS configuration

### Performance Optimization

- Use `select_related()` and `prefetch_related()` for related data
- Implement database indexing on frequently queried fields
- Use caching for frequently accessed data (Redis)
- Implement pagination for large datasets
- Optimize serializers to avoid N+1 queries
- Use database connection pooling

### Code Organization

- Follow Django app structure conventions
- Keep views thin, move business logic to services
- Use serializers for validation and transformation
- Create reusable utility functions
- Document complex business logic
- Use type hints for better code clarity

## Deployment Considerations

### Environment Configuration

- Use environment variables for sensitive data
- Separate settings for development, staging, production
- Use `.env` files for local development
- Document all required environment variables

### Database Setup

- Use PostgreSQL in production
- Configure connection pooling
- Set up regular backups
- Implement database replication for high availability

### Static and Media Files

- Collect static files for production
- Use CDN for static file delivery
- Configure media file storage (local or cloud)
- Implement file cleanup for deleted records

### Monitoring and Logging

- Set up application logging (INFO, WARNING, ERROR)
- Use centralized logging service (e.g., ELK stack)
- Monitor application performance (APM tools)
- Set up alerts for critical errors
- Track API usage and response times

### Continuous Integration/Deployment

- Set up CI pipeline for automated testing
- Run migrations automatically on deployment
- Implement blue-green deployment for zero downtime
- Use containerization (Docker) for consistent environments
