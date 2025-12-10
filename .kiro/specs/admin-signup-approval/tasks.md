# Implementation Plan: Admin Signup Approval Workflow

- [x] 1. Create SignupRequest model and database migration


  - Create SignupRequest model in `server/apps/authentication/models.py` with all required fields (id, username, email, first_name, last_name, mobile_number, requested_role, password_hash, status, reviewed_by, reviewed_at, rejection_reason, created_user, timestamps)
  - Add STATUS_CHOICES for pending/approved/rejected
  - Add database indexes for status, username, email, created_at
  - Create and run Django migration
  - _Requirements: 1.1, 1.4, 6.1_

- [x] 1.1 Write property test for SignupRequest model


  - **Property 1: Valid signup creates pending request**
  - **Validates: Requirements 1.1, 1.4**

- [x] 2. Implement signup request serializers



  - Create SignupRequestSerializer for creating requests with password validation
  - Create SignupRequestListSerializer for listing requests with reviewed_by_name
  - Create SignupRequestDetailSerializer with full details
  - Create ApproveSignupRequestSerializer
  - Create RejectSignupRequestSerializer with optional rejection_reason
  - Add password hashing logic using Django's make_password
  - _Requirements: 1.1, 1.2, 1.3, 4.5_

- [x] 2.1 Write property test for serializer validation


  - **Property 2: Invalid signup is rejected**
  - **Validates: Requirements 1.2**

- [x] 2.2 Write property test for duplicate email rejection


  - **Property 3: Duplicate email rejection**
  - **Validates: Requirements 1.3**

- [x] 3. Create signup request API endpoints



  - Implement POST /api/auth/signup-request/ view for creating requests
  - Implement GET /api/auth/signup-requests/ view with filtering and pagination
  - Implement GET /api/auth/signup-requests/:id/ view for details
  - Implement POST /api/auth/signup-requests/:id/approve/ view
  - Implement POST /api/auth/signup-requests/:id/reject/ view
  - Implement GET /api/auth/signup-request-status/:username/ view
  - Add permission checks (admin required for list/approve/reject)
  - Add URL patterns to `server/apps/authentication/urls.py`
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.2_

- [x] 3.1 Write property test for pending requests filtering


  - **Property 4: Pending requests filtering**
  - **Validates: Requirements 2.1, 2.4**

- [x] 3.2 Write property test for request display completeness


  - **Property 5: Request display completeness**
  - **Validates: Requirements 2.2**

- [x] 4. Implement approval logic


  - Create approve_signup_request function that creates User account from SignupRequest
  - Set User account_status to 'active'
  - Set User role from requested_role
  - Link created User to SignupRequest via created_user field
  - Update SignupRequest status to 'approved'
  - Record reviewed_by and reviewed_at
  - Handle transaction rollback on failure
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 4.1 Write property test for approval creates active user


  - **Property 6: Approval creates active user**
  - **Validates: Requirements 3.1, 3.4**

- [x] 4.2 Write property test for status transition



  - **Property 7: Status transition on approval/rejection**
  - **Validates: Requirements 3.2, 4.1, 6.2**

- [x] 5. Implement rejection logic



  - Create reject_signup_request function that updates status to 'rejected'
  - Store optional rejection_reason
  - Record reviewed_by and reviewed_at
  - Ensure no User account is created
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 5.1 Write property test for rejection prevents user creation


  - **Property 9: Rejection prevents user creation**
  - **Validates: Requirements 4.2**

- [x] 5.2 Write property test for rejection reason storage


  - **Property 10: Rejection reason storage**
  - **Validates: Requirements 4.5**

- [x] 6. Update login view to handle signup request status


  - Modify LoginSerializer to check for pending SignupRequest when authentication fails
  - Return appropriate error messages for pending/rejected signup requests
  - Add logic to differentiate between "user doesn't exist" and "signup pending/rejected"
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.1 Write property test for login behavior by request status


  - **Property 11: Login behavior by request status**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 7. Checkpoint - Ensure all backend tests pass



  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create signup request service on frontend


  - Create `client/admin-side/src/services/signupRequestService.ts`
  - Implement createSignupRequest function
  - Implement getSignupRequests function with filtering
  - Implement getSignupRequestById function
  - Implement approveSignupRequest function
  - Implement rejectSignupRequest function
  - Implement checkSignupRequestStatus function
  - Add TypeScript interfaces for SignupRequest and related types
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 9. Update Auth.tsx for admin signup requests


  - Modify signup form to detect admin role selection
  - Add role selection dropdown (registrar, institute_head)
  - Route admin signups to signup-request endpoint instead of register endpoint
  - Display confirmation message after successful signup request submission
  - Show "Your request is pending approval" message
  - _Requirements: 1.1, 1.5_

- [x] 10. Create SignupRequests management page


  - Create `client/admin-side/src/pages/SignupRequests.tsx`
  - Implement table view with columns: name, email, role, submission date, actions
  - Add status filter tabs (All, Pending, Approved, Rejected)
  - Add search functionality by name or email
  - Implement approve button with confirmation dialog
  - Implement reject button with rejection reason modal
  - Add empty state for no requests
  - Add loading and error states
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 11. Add SignupRequests route to admin navigation


  - Add route to `client/admin-side/src/App.tsx`
  - Add navigation link in sidebar/header
  - Restrict access to admin users only
  - _Requirements: 2.1_

- [x] 12. Implement rejection reason modal

  - Create modal component for entering rejection reason
  - Add textarea for reason input
  - Add cancel and confirm buttons
  - Pass rejection reason to rejectSignupRequest service call
  - _Requirements: 4.5_

- [x] 13. Add real-time status updates

  - Implement auto-refresh of signup requests list after approve/reject actions
  - Show success toast notifications after actions
  - Update pending count badge if displayed in navigation
  - _Requirements: 3.5, 4.4_

- [x] 14. Implement signup request status check on login

  - Modify login error handling to check signup request status
  - Display appropriate messages for pending/rejected requests
  - Add link to contact admin for rejected requests
  - _Requirements: 5.1, 5.2_

- [ ] 14.1 Write property test for immediate persistence
  - **Property 12: Immediate persistence**
  - **Validates: Requirements 5.4**

- [-] 15. Add signup request history view

  - Add "History" tab to SignupRequests page
  - Implement filtering by status, date range, and approver
  - Display all requests regardless of status
  - Show reviewed_by and reviewed_at for processed requests
  - _Requirements: 6.3, 6.4_

- [ ] 15.1 Write property test for history completeness
  - **Property 14: History completeness**
  - **Validates: Requirements 6.3**

- [ ] 15.2 Write property test for filter functionality
  - **Property 15: Filter functionality**
  - **Validates: Requirements 6.4**

- [ ] 15.3 Write property test for permanent record retention
  - **Property 16: Permanent record retention**
  - **Validates: Requirements 6.5**

- [x] 16. Add admin dashboard widget for pending requests



  - Create PendingSignupRequests widget component
  - Display count of pending requests
  - Add "View All" link to SignupRequests page
  - Show recent pending requests (last 5)
  - _Requirements: 2.1_

- [ ] 17. Implement notification system integration 
  - Create email notification templates for approval and rejection
  - Integrate with email service (if available)
  - Send notification on approval with login instructions
  - Send notification on rejection with reason (if provided)
  - _Requirements: 3.3, 4.3, 5.5_

- [ ] 17.1 Write property test for notification on status change
  - **Property 8: Notification on status change**
  - **Validates: Requirements 3.3, 4.3**

- [ ] 18. Add rate limiting to signup request endpoint
  - Implement rate limiting middleware or decorator
  - Limit to 5 signup requests per IP per hour
  - Return 429 Too Many Requests with appropriate message
  - _Security consideration_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

