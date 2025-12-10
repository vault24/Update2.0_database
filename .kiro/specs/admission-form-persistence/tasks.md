# Implementation Plan

- [x] 1. Update backend Admission model to support drafts


  - Add `draft_data` JSONField to store incomplete form data
  - Add `is_draft` BooleanField to distinguish drafts from submissions
  - Add `draft_updated_at` DateTimeField for tracking
  - Create and run database migration
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement backend draft API endpoints



  - [x] 2.1 Create save-draft endpoint (POST /api/admissions/save-draft/)

    - Accept draft_data and current_step in request
    - Create or update draft for authenticated user
    - Return saved draft with timestamp
    - _Requirements: 1.1_

  - [x] 2.2 Create get-draft endpoint (GET /api/admissions/get-draft/)

    - Retrieve draft for authenticated user
    - Return draft_data and current_step
    - Return 404 if no draft exists
    - _Requirements: 1.2_

  - [x] 2.3 Create clear-draft endpoint (DELETE /api/admissions/clear-draft/)

    - Delete draft for authenticated user
    - Return success confirmation
    - _Requirements: 1.4_

  - [x] 2.4 Update submission endpoint to clear drafts

    - When admission is successfully submitted, clear any existing draft
    - Set is_draft to False on submission
    - _Requirements: 1.4_

- [x] 3. Update frontend admission service


  - [x] 3.1 Add draft management methods to admissionService

    - Implement saveDraft() method with server call and localStorage fallback
    - Implement getDraft() method with server call and localStorage fallback
    - Implement clearDraft() method for both server and localStorage
    - Add error handling and retry logic
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 3.2 Add admission status check method

    - Implement checkExistingAdmission() method
    - Return hasAdmission, admissionId, and status
    - Handle 404 as "no admission" gracefully
    - _Requirements: 1.3, 3.1, 3.2_


- [ ] 4. Update AdmissionWizard component for server-side drafts

  - [ ] 4.1 Replace localStorage-only draft saving with server-side saving


    - Update useEffect to call admissionService.saveDraft()
    - Add debouncing (1000ms) to reduce API calls
    - Keep localStorage as fallback for offline support
    - Show toast notification on save errors
    - _Requirements: 1.1, 1.5_

  - [ ] 4.2 Load draft from server on component mount
    - Call admissionService.getDraft() on mount
    - Populate form fields with retrieved draft data
    - Set current step from draft
    - Fall back to localStorage if server fails
    - _Requirements: 1.2_

  - [ ] 4.3 Check for existing admission on mount
    - Call admissionService.checkExistingAdmission() on mount
    - If admission exists, set isSubmitted=true and show success page
    - Clear any draft data if admission exists
    - Store application ID for success page display
    - _Requirements: 1.3, 3.1, 3.3_

  - [ ] 4.4 Clear draft on successful submission
    - After successful submission, call admissionService.clearDraft()
    - Remove STORAGE_KEY from localStorage
    - Ensure success page displays with application ID
    - _Requirements: 1.4, 2.1_

  - [ ] 4.5 Fix success page display and persistence
    - Ensure isSubmitted state persists across page refreshes
    - Check for existing admission on every mount
    - Display success page with application ID when admission exists
    - Ensure PDF download and print buttons work correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Handle duplicate submission attempts
  - [ ] 5.1 Update backend to return existing admission on duplicate attempt
    - Modify create endpoint to check for existing admission
    - Return existing admission data with 200 status (not error)
    - Include clear message about existing submission
    - _Requirements: 3.2_

  - [ ] 5.2 Update frontend to handle duplicate submission response
    - Detect "already submitted" response
    - Fetch existing admission data
    - Display success page with existing application ID
    - Clear any draft data
    - _Requirements: 3.2, 3.3_

- [ ] 6. Add error handling and user feedback
  - [ ] 6.1 Add network error handling
    - Show user-friendly error messages for network failures
    - Implement retry logic with exponential backoff
    - Fall back to localStorage when server is unreachable
    - Display warning when using localStorage fallback
    - _Requirements: 1.5, 3.5_

  - [ ] 6.2 Add loading states and feedback
    - Show loading spinner during draft save/load
    - Display success toast on draft save
    - Show error toast on failures with retry option
    - Add loading state to submission button
    - _Requirements: 1.1, 1.2_

- [ ] 7. Test the complete flow
  - [ ] 7.1 Test draft persistence across devices
    - Fill form partially on device A
    - Login on device B
    - Verify form data is loaded
    - Continue filling and submit
    - _Requirements: 1.1, 1.2_

  - [ ] 7.2 Test submission and success page flow
    - Submit complete admission form
    - Verify success page displays immediately
    - Verify application ID is shown
    - Test PDF download functionality
    - Test print functionality
    - Refresh page and verify success page persists
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 7.3 Test duplicate submission prevention
    - Submit admission form
    - Logout and login again
    - Verify success page is shown (not form)
    - Attempt to access form directly
    - Verify redirect to success page
    - _Requirements: 3.1, 3.2_

  - [ ] 7.4 Test offline/fallback behavior
    - Disconnect network
    - Fill form fields
    - Verify localStorage fallback works
    - Reconnect network
    - Verify draft syncs to server
    - _Requirements: 1.5, 3.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
