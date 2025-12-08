# Implementation Plan

- [x] 1. Set up backend Django apps and database models



  - Create `teachers` Django app with Teacher model
  - Create `teacher_requests` Django app with TeacherRequest model
  - Write database migration files
  - Add database indexes for frequently queried fields
  - _Requirements: 2.1, 3.2, 4.2, 5.5_

- [ ] 2. Implement backend serializers and validators
  - [ ] 2.1 Create Teacher serializers (list, detail, create, update)
    - Write TeacherListSerializer for lightweight list views
    - Write TeacherDetailSerializer with all fields
    - Write TeacherCreateSerializer with validation
    - Write TeacherUpdateSerializer
    - _Requirements: 2.1, 2.2, 3.2_

  - [ ] 2.2 Create TeacherRequest serializers
    - Write TeacherRequestListSerializer
    - Write TeacherRequestDetailSerializer
    - Write TeacherRequestCreateSerializer with validation
    - Write status update serializer
    - _Requirements: 1.2, 4.2, 5.3_

  - [ ] 2.3 Implement field validators
    - Write mobile number validator for teachers
    - Write email validator
    - Write subjects JSON field validator
    - Write request message validator
    - _Requirements: 3.2, 5.4_

- [ ] 3. Create backend API views and endpoints
  - [ ] 3.1 Implement Teacher API views
    - Write list view with pagination and search
    - Write detail view
    - Write create view (admin only)
    - Write update view (admin only)
    - Write delete view (admin only)
    - Write statistics endpoint
    - _Requirements: 2.1, 2.2, 2.4, 3.1_

  - [ ] 3.2 Implement TeacherRequest API views
    - Write list view with status filtering
    - Write detail view
    - Write create view (student side)
    - Write status update endpoint (admin only)
    - Write statistics endpoint
    - _Requirements: 1.1, 1.2, 4.1, 4.3, 5.1_

  - [ ] 3.3 Configure URL routing
    - Add teachers app URLs to main urlpatterns
    - Add teacher_requests app URLs to main urlpatterns
    - _Requirements: 6.5_

- [x] 4. Create frontend TypeScript interfaces and types


  - Write Teacher interface with all fields
  - Write TeacherRequest interface
  - Write StudentBasic and TeacherBasic interfaces
  - Write Qualification interface
  - Write API response types
  - _Requirements: 2.2, 3.2, 1.2_

- [ ] 5. Implement frontend API service layer
  - [ ] 5.1 Create teachers API service
    - Write fetchTeachers function with pagination and search
    - Write fetchTeacherById function
    - Write createTeacher function
    - Write updateTeacher function
    - Write deleteTeacher function
    - _Requirements: 2.1, 2.4, 3.1_

  - [ ] 5.2 Create teacher requests API service
    - Write fetchTeacherRequests function with filtering
    - Write fetchTeacherRequestById function
    - Write createTeacherRequest function
    - Write updateRequestStatus function
    - Write fetchRequestStats function
    - _Requirements: 1.1, 4.1, 4.3, 5.1_

- [ ] 6. Build admin-side teacher requests management interface
  - [ ] 6.1 Create TeacherRequestsTab component
    - Implement request list table with columns (student, teacher, date, message)
    - Add status filter dropdown (pending, resolved, archived)
    - Add date sorting functionality
    - Implement empty state display
    - Add statistics cards showing counts by status
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.4_

  - [ ] 6.2 Create request detail modal/panel
    - Display complete request details
    - Show student contact information
    - Add status update controls
    - Add admin notes field
    - _Requirements: 1.5, 4.1_

  - [ ] 6.3 Implement status update functionality
    - Add status change dropdown
    - Implement optimistic UI updates
    - Add confirmation toast notifications
    - Handle error states
    - _Requirements: 4.1, 4.2, 4.4_

- [ ] 7. Build admin-side teacher directory interface
  - [ ] 7.1 Create TeacherDirectoryTab component
    - Implement paginated teacher list (20 per page)
    - Add teacher cards with basic info
    - Implement search functionality (name, department, subject)
    - Add filter controls
    - Implement empty state display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 7.2 Add navigation to teacher profiles
    - Implement click handlers on teacher cards
    - Navigate to profile page with teacher ID in URL
    - _Requirements: 3.1, 3.5_

- [ ] 8. Build admin-side teacher profile page
  - [ ] 8.1 Create TeacherProfile component
    - Display personal information section
    - Display contact details section
    - Display department and subjects section
    - Display employment details
    - Show statistics (students, classes)
    - Handle loading and error states
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 8.2 Add navigation controls
    - Add back button to return to directory
    - Implement breadcrumb navigation
    - _Requirements: 3.5_

- [x] 9. Create main teachers page with tabs



  - [x] 9.1 Create TeachersPage component



    - Implement tab navigation (Requests, Directory)
    - Set Requests tab as default
    - Integrate TeacherRequestsTab component
    - Integrate TeacherDirectoryTab component
    - Apply consistent styling with existing pages
    - _Requirements: 1.1, 2.1, 6.1, 6.2_



  - [ ] 9.2 Add routing configuration
    - Add /teachers route to App.tsx
    - Add /teachers/:id route for profiles


    - _Requirements: 6.5_

  - [ ] 9.3 Update sidebar navigation
    - Add Teachers menu item to Sidebar component
    - Add appropriate icon
    - Position in navigation hierarchy
    - _Requirements: 6.1_

- [ ] 10. Build student-side request submission form
  - [ ] 10.1 Create TeacherContactRequestForm component
    - Add teacher selection dropdown
    - Add subject input field
    - Add message textarea
    - Implement form validation
    - Add submit button
    - _Requirements: 5.1, 5.2_

  - [ ] 10.2 Implement form submission logic
    - Handle form validation on submit
    - Call API to create request
    - Display success confirmation message
    - Clear form after successful submission
    - Handle validation errors
    - Display error messages
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 10.3 Integrate form into TeacherContactsPage
    - Add form section to existing page
    - Position above or below teacher list
    - Ensure responsive layout
    - _Requirements: 5.1, 6.3_

- [ ] 11. Implement TanStack Query hooks for state management
  - [ ] 11.1 Create teacher query hooks
    - Write useTeachers hook with pagination
    - Write useTeacher hook for single teacher
    - Write useCreateTeacher mutation
    - Write useUpdateTeacher mutation
    - Configure cache invalidation
    - _Requirements: 2.1, 3.1_

  - [ ] 11.2 Create teacher request query hooks
    - Write useTeacherRequests hook with filtering
    - Write useTeacherRequest hook for single request
    - Write useCreateTeacherRequest mutation
    - Write useUpdateRequestStatus mutation
    - Configure optimistic updates
    - _Requirements: 1.1, 4.2, 5.5_

- [ ] 12. Add error handling and loading states
  - [ ] 12.1 Implement frontend error handling
    - Add toast notifications for API errors
    - Implement retry logic with exponential backoff
    - Add loading skeletons for data fetching
    - Create fallback UI for failed loads
    - Display 404 page for invalid teacher IDs
    - _Requirements: 3.4, 6.3_

  - [ ] 12.2 Add form validation error displays
    - Show inline validation messages
    - Highlight invalid fields
    - Display backend validation errors
    - _Requirements: 5.4_

- [ ] 13. Apply consistent UI styling and animations
  - Use existing shadcn/ui components throughout
  - Apply glass-card styling from existing pages
  - Implement Framer Motion animations for transitions
  - Ensure responsive design for mobile devices
  - Use existing color scheme for status badges
  - _Requirements: 6.2, 6.3, 6.4_

