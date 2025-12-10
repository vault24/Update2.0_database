# Design Document: Admin Signup Approval Workflow

## Overview

This design document outlines the implementation of an admin signup approval workflow for the admin-side application. The system extends the existing authentication infrastructure to support a request-approval model where new admin users must be approved by existing administrators before gaining access to the system.

The implementation leverages the existing User model's `account_status` field and introduces a new SignupRequest model to track pending, approved, and rejected signup attempts. The workflow integrates seamlessly with the current Django REST Framework backend and React frontend.

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Signup Form    │────────▶│  SignupRequest   │────────▶│  Admin Review   │
│  (Frontend)     │         │  API Endpoint    │         │  Interface      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │                             │
                                     ▼                             ▼
                            ┌──────────────────┐         ┌─────────────────┐
                            │  SignupRequest   │         │  Approve/Reject │
                            │  Model (DB)      │◀────────│  API Endpoints  │
                            └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  User Account    │
                            │  Creation        │
                            └──────────────────┘
```

### Data Flow

1. **Signup Request Submission**: New user submits signup form → Creates SignupRequest with status "pending"
2. **Admin Review**: Existing admin views pending requests → Displays list of SignupRequest objects
3. **Approval**: Admin approves request → Creates User account with active status → Updates SignupRequest status
4. **Rejection**: Admin rejects request → Updates SignupRequest status → No User account created
5. **Login Attempt**: User attempts login → System checks User account status → Grants/denies access

## Components and Interfaces

### Backend Components

#### 1. SignupRequest Model

```python
class SignupRequest(models.Model):
    """
    Model to track admin signup requests awaiting approval
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Request identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Requester information
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    mobile_number = models.CharField(max_length=11, blank=True)
    
    # Requested role (admin roles only)
    requested_role = models.CharField(max_length=20)
    
    # Password (hashed)
    password_hash = models.CharField(max_length=128)
    
    # Request status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval/rejection details
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Created user reference (for approved requests)
    created_user = models.ForeignKey(User, null=True, blank=True, related_name='signup_request', on_delete=models.SET_NULL)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 2. API Endpoints

**POST /api/auth/signup-request/**
- Creates a new signup request
- Validates input data
- Stores hashed password
- Returns confirmation message

**GET /api/auth/signup-requests/**
- Lists all signup requests (with filtering)
- Requires admin authentication
- Supports filtering by status, date range
- Returns paginated results

**GET /api/auth/signup-requests/:id/**
- Retrieves specific signup request details
- Requires admin authentication

**POST /api/auth/signup-requests/:id/approve/**
- Approves a pending signup request
- Creates User account
- Updates SignupRequest status
- Requires admin authentication

**POST /api/auth/signup-requests/:id/reject/**
- Rejects a pending signup request
- Updates SignupRequest status
- Optionally stores rejection reason
- Requires admin authentication

**GET /api/auth/signup-request-status/:username/**
- Checks status of signup request by username
- Public endpoint (no authentication required)
- Returns status: pending, approved, rejected, or not_found

#### 3. Serializers

```python
class SignupRequestSerializer(serializers.ModelSerializer):
    """Serializer for creating signup requests"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

class SignupRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing signup requests"""
    reviewed_by_name = serializers.SerializerMethodField()

class SignupRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed signup request view"""
    reviewed_by_details = UserSerializer(source='reviewed_by', read_only=True)

class ApproveSignupRequestSerializer(serializers.Serializer):
    """Serializer for approving signup requests"""
    # No additional fields needed

class RejectSignupRequestSerializer(serializers.Serializer):
    """Serializer for rejecting signup requests"""
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
```

### Frontend Components

#### 1. Signup Request Form (Auth.tsx Enhancement)

- Extends existing Auth.tsx component
- Adds admin role selection
- Submits to signup-request endpoint instead of register endpoint
- Shows confirmation message after submission

#### 2. Signup Requests Management Page

**Location**: `client/admin-side/src/pages/SignupRequests.tsx`

Features:
- Table view of pending signup requests
- Filtering by status (pending, approved, rejected)
- Search by name or email
- Approve/Reject action buttons
- Rejection reason modal
- Real-time status updates

#### 3. Signup Request Service

**Location**: `client/admin-side/src/services/signupRequestService.ts`

```typescript
interface SignupRequest {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export const signupRequestService = {
  createSignupRequest: (data: SignupRequestData) => Promise<Response>
  getSignupRequests: (filters?: Filters) => Promise<SignupRequest[]>
  getSignupRequestById: (id: string) => Promise<SignupRequest>
  approveSignupRequest: (id: string) => Promise<Response>
  rejectSignupRequest: (id: string, reason?: string) => Promise<Response>
  checkSignupRequestStatus: (username: string) => Promise<StatusResponse>
}
```

## Data Models

### SignupRequest Model Schema

```
SignupRequest
├── id: UUID (PK)
├── username: String (unique, indexed)
├── email: String (unique, indexed)
├── first_name: String
├── last_name: String
├── mobile_number: String (optional)
├── requested_role: String
├── password_hash: String
├── status: Enum ['pending', 'approved', 'rejected'] (indexed)
├── reviewed_by: FK(User) (nullable)
├── reviewed_at: DateTime (nullable)
├── rejection_reason: Text (optional)
├── created_user: FK(User) (nullable)
├── created_at: DateTime (auto)
└── updated_at: DateTime (auto)
```

### Database Indexes

- `username` - For quick lookup during login attempts
- `email` - For uniqueness validation
- `status` - For filtering pending requests
- `created_at` - For ordering by submission date

### Relationships

- `SignupRequest.reviewed_by` → `User` (Many-to-One)
- `SignupRequest.created_user` → `User` (One-to-One)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all identified properties, several can be consolidated:

- Properties 3.2 and 4.1 (status updates) can be combined into a single state transition property
- Properties 3.5 and 4.4 (removal from pending list) are redundant with the status update properties
- Properties 3.3 and 4.3 (notifications) can be combined into a single notification property
- Properties 1.4 and 6.1 (data persistence) overlap and can be consolidated

The consolidated properties below eliminate redundancy while maintaining comprehensive coverage.

### Correctness Properties

**Property 1: Valid signup creates pending request**
*For any* valid signup data (with all required fields), submitting the signup form should create a SignupRequest with status "pending" and all provided data stored correctly.
**Validates: Requirements 1.1, 1.4**

**Property 2: Invalid signup is rejected**
*For any* signup data with missing required fields or invalid format, the system should reject the submission and return appropriate validation errors.
**Validates: Requirements 1.2**

**Property 3: Duplicate email rejection**
*For any* existing SignupRequest or User email, attempting to create a new SignupRequest with the same email should be rejected.
**Validates: Requirements 1.3**

**Property 4: Pending requests filtering**
*For any* set of SignupRequests with mixed statuses, querying for pending requests should return only those with status "pending", ordered by creation date (newest first).
**Validates: Requirements 2.1, 2.4**

**Property 5: Request display completeness**
*For any* SignupRequest, the API response should include username, email, first_name, last_name, requested_role, status, and created_at fields.
**Validates: Requirements 2.2**

**Property 6: Approval creates active user**
*For any* pending SignupRequest, approving it should create a User account with account_status "active", matching credentials, and link the created user to the SignupRequest.
**Validates: Requirements 3.1, 3.4**

**Property 7: Status transition on approval/rejection**
*For any* pending SignupRequest, approving it should update status to "approved" and rejecting it should update status to "rejected", with both actions recording reviewed_by and reviewed_at.
**Validates: Requirements 3.2, 4.1, 6.2**

**Property 8: Notification on status change**
*For any* SignupRequest that transitions from pending to approved or rejected, the system should trigger a notification to the requester's email with appropriate content.
**Validates: Requirements 3.3, 4.3**

**Property 9: Rejection prevents user creation**
*For any* SignupRequest that is rejected, no User account should exist with the username or email from that request.
**Validates: Requirements 4.2**

**Property 10: Rejection reason storage**
*For any* SignupRequest rejection with a provided reason, the rejection_reason field should be stored and included in the notification.
**Validates: Requirements 4.5**

**Property 11: Login behavior by request status**
*For any* SignupRequest username, login attempts should behave according to status: pending returns "awaiting approval" message, rejected returns "signup rejected" message, approved allows authentication.
**Validates: Requirements 5.1, 5.2, 5.3**

**Property 12: Immediate persistence**
*For any* SignupRequest status change, querying the database immediately after should reflect the new status.
**Validates: Requirements 5.4**

**Property 13: Automatic timestamp recording**
*For any* SignupRequest creation or status change, the system should automatically record created_at on creation and updated_at on any modification.
**Validates: Requirements 6.1, 6.2**

**Property 14: History completeness**
*For any* query to the SignupRequest history endpoint without filters, all SignupRequests regardless of status should be returned.
**Validates: Requirements 6.3**

**Property 15: Filter functionality**
*For any* combination of status, date range, and approver filters, the system should return only SignupRequests matching all applied filters.
**Validates: Requirements 6.4**

**Property 16: Permanent record retention**
*For any* SignupRequest that has been approved or rejected, the record should remain in the database and not be deleted.
**Validates: Requirements 6.5**

## Error Handling

### Backend Error Scenarios

1. **Duplicate Username/Email**
   - Status Code: 400 Bad Request
   - Response: `{"email": ["A signup request with this email already exists"]}`
   - Action: Return validation error to frontend

2. **Invalid Request Data**
   - Status Code: 400 Bad Request
   - Response: `{"field_name": ["Error message"]}`
   - Action: Display field-specific errors in form

3. **Unauthorized Access**
   - Status Code: 401 Unauthorized
   - Response: `{"detail": "Authentication credentials were not provided"}`
   - Action: Redirect to login page

4. **Forbidden Action**
   - Status Code: 403 Forbidden
   - Response: `{"detail": "You do not have permission to perform this action"}`
   - Action: Display error message, check user permissions

5. **SignupRequest Not Found**
   - Status Code: 404 Not Found
   - Response: `{"detail": "Signup request not found"}`
   - Action: Refresh list, display error message

6. **Invalid Status Transition**
   - Status Code: 400 Bad Request
   - Response: `{"detail": "Cannot approve/reject a request that is not pending"}`
   - Action: Refresh list, display error message

7. **User Creation Failure**
   - Status Code: 500 Internal Server Error
   - Response: `{"detail": "Failed to create user account"}`
   - Action: Log error, rollback SignupRequest status, notify admin

### Frontend Error Handling

1. **Network Errors**
   - Display toast notification: "Network error. Please check your connection."
   - Retry mechanism for critical operations

2. **Validation Errors**
   - Display inline field errors
   - Highlight invalid fields
   - Prevent form submission until resolved

3. **Session Expiration**
   - Detect 401 responses
   - Redirect to login page
   - Preserve intended action for post-login redirect

4. **Concurrent Modifications**
   - Detect 409 Conflict responses
   - Refresh data
   - Notify user of changes

## Testing Strategy

### Unit Testing

**Backend Unit Tests:**

1. **Model Tests**
   - SignupRequest model field validation
   - Status choices validation
   - Timestamp auto-generation
   - Relationship integrity

2. **Serializer Tests**
   - SignupRequestSerializer validation
   - Password hashing
   - Password confirmation matching
   - Email format validation
   - Required field validation

3. **View Tests**
   - Signup request creation endpoint
   - List filtering and pagination
   - Approval endpoint logic
   - Rejection endpoint logic
   - Permission checks

**Frontend Unit Tests:**

1. **Component Tests**
   - SignupRequests page rendering
   - Form validation
   - Action button states
   - Empty state display
   - Error message display

2. **Service Tests**
   - API call formatting
   - Response parsing
   - Error handling
   - Request parameter construction

### Property-Based Testing

The property-based testing approach will use **Hypothesis** for Python backend tests. Each property test will run a minimum of 100 iterations with randomly generated data.

**Property Test Implementation:**

1. **Property 1: Valid signup creates pending request**
   - Generate random valid signup data
   - Submit signup request
   - Verify SignupRequest created with status "pending"
   - Verify all fields stored correctly

2. **Property 2: Invalid signup is rejected**
   - Generate signup data with random missing required fields
   - Submit signup request
   - Verify rejection with appropriate error messages

3. **Property 3: Duplicate email rejection**
   - Create SignupRequest with random email
   - Attempt to create another with same email
   - Verify rejection

4. **Property 6: Approval creates active user**
   - Generate random pending SignupRequest
   - Approve request
   - Verify User account created with active status
   - Verify credentials match

5. **Property 7: Status transition on approval/rejection**
   - Generate random pending SignupRequest
   - Randomly approve or reject
   - Verify status updated correctly
   - Verify reviewed_by and reviewed_at recorded

6. **Property 9: Rejection prevents user creation**
   - Generate random pending SignupRequest
   - Reject request
   - Verify no User account exists with that username/email

7. **Property 12: Immediate persistence**
   - Generate random SignupRequest
   - Change status
   - Immediately query database
   - Verify status reflects change

8. **Property 15: Filter functionality**
   - Generate random set of SignupRequests with varied attributes
   - Apply random combination of filters
   - Verify results match all filter criteria

### Integration Testing

1. **End-to-End Signup Flow**
   - Submit signup request
   - Verify pending status
   - Admin approves request
   - Verify user can login

2. **End-to-End Rejection Flow**
   - Submit signup request
   - Admin rejects with reason
   - Verify user cannot login
   - Verify rejection message displayed

3. **Concurrent Request Handling**
   - Multiple admins viewing same request
   - One approves while other attempts to reject
   - Verify only one action succeeds

4. **Notification Integration**
   - Approve/reject request
   - Verify email notification sent
   - Verify notification content correct

### Test Data Generators

For property-based testing, implement generators for:

```python
@st.composite
def valid_signup_data(draw):
    """Generate valid signup request data"""
    return {
        'username': draw(st.text(min_size=3, max_size=150, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        'email': draw(st.emails()),
        'first_name': draw(st.text(min_size=1, max_size=150)),
        'last_name': draw(st.text(min_size=1, max_size=150)),
        'password': draw(st.text(min_size=8, max_size=128)),
        'requested_role': draw(st.sampled_from(['registrar', 'institute_head'])),
        'mobile_number': draw(st.text(min_size=11, max_size=11, alphabet='0123456789'))
    }

@st.composite
def invalid_signup_data(draw):
    """Generate invalid signup request data with missing fields"""
    data = draw(valid_signup_data())
    # Randomly remove required fields
    required_fields = ['username', 'email', 'first_name', 'last_name', 'password']
    field_to_remove = draw(st.sampled_from(required_fields))
    del data[field_to_remove]
    return data
```

## Implementation Notes

### Security Considerations

1. **Password Storage**: Use Django's `make_password()` to hash passwords before storing in SignupRequest
2. **Permission Checks**: Only users with `is_admin()` can approve/reject requests
3. **CSRF Protection**: All state-changing endpoints require CSRF tokens
4. **Rate Limiting**: Implement rate limiting on signup request endpoint to prevent spam
5. **Email Verification**: Consider adding email verification step before creating SignupRequest

### Performance Considerations

1. **Database Indexes**: Add indexes on `status`, `username`, `email`, and `created_at` fields
2. **Pagination**: Implement pagination for signup request list (default 20 per page)
3. **Caching**: Cache pending request count for dashboard display
4. **Query Optimization**: Use `select_related()` for reviewed_by and created_user relationships

### Migration Strategy

1. Create SignupRequest model migration
2. Add database indexes
3. Update authentication views to check for pending SignupRequests on login
4. Deploy backend changes
5. Deploy frontend changes
6. Notify existing admins of new feature

### Future Enhancements

1. **Email Notifications**: Integrate with email service (SendGrid, AWS SES)
2. **Bulk Actions**: Allow admins to approve/reject multiple requests at once
3. **Request Expiration**: Auto-reject requests older than X days
4. **Admin Comments**: Allow admins to add notes to requests
5. **Approval Workflow**: Multi-level approval for certain roles
6. **Analytics Dashboard**: Track signup request metrics over time
