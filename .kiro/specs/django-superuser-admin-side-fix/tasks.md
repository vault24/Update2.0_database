# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Superuser Creation with Student Role Bug
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that `createsuperuser` command creates users with 'student' role instead of admin roles (from Fault Condition in design)
  - Test that superusers with 'student' role cannot access admin endpoints due to role restrictions
  - The test assertions should match the Expected Behavior Properties from design (admin role assignment and full admin access)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "createsuperuser creates user with role='student', admin access denied")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Superuser Creation Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (student registration, teacher signup, existing admin access)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that student registration continues to create users with 'student' role
  - Test that teacher signup continues to create users with 'teacher' role and pending status
  - Test that existing admin users continue to have full admin access
  - Test that role-based access control continues to work for API endpoints
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix for Django createsuperuser admin-side access

  - [x] 3.1 Create custom createsuperuser management command
    - Create `server/apps/authentication/management/commands/createsuperuser.py`
    - Override Django's default createsuperuser command
    - Add role selection logic for admin roles ('institute_head', 'registrar')
    - Default to 'institute_head' role for superusers
    - Support interactive role selection during command execution
    - Maintain compatibility with `--noinput` flag for automated deployments
    - _Bug_Condition: isBugCondition(input) where input.command == 'createsuperuser' AND input.creates_user_with_role == 'student'_
    - _Expected_Behavior: expectedBehavior(result) - superuser created with admin role and full admin access_
    - _Preservation: Preservation Requirements - existing user creation workflows unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Implement role validation and assignment logic
    - Add validation to ensure superusers cannot be created with student/teacher roles
    - Set proper field values: is_superuser=True, is_staff=True, account_status='active'
    - Validate email format and uniqueness
    - Ensure username uniqueness
    - Add error handling for invalid role selections
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Add command interface and user interaction
    - Implement interactive prompts for role selection
    - Add help text explaining admin role options
    - Support environment variable configuration for automated setups
    - Maintain backward compatibility with Django's command interface
    - Add proper error messages and user feedback
    - _Requirements: 2.1, 2.3_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Superuser Creation with Admin Role
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that createsuperuser now creates users with admin roles
    - Verify that created superusers can access admin endpoints without restrictions
    - _Requirements: Expected Behavior Properties from design (2.1, 2.2, 2.3)_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Superuser Creation Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm that student registration still creates users with 'student' role
    - Confirm that teacher signup still creates users with 'teacher' role and pending status
    - Confirm that existing admin users still have full admin access
    - Confirm that role-based access control still works for API endpoints
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Add comprehensive test coverage

  - [ ] 4.1 Write unit tests for custom createsuperuser command
    - Test command with different role selections ('institute_head', 'registrar')
    - Test command with --noinput flag and environment variables
    - Test role validation logic (reject student/teacher roles)
    - Test proper field assignment (is_superuser, is_staff, account_status)
    - Test error handling for invalid inputs
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 4.2 Write integration tests for admin access
    - Test full superuser creation flow from command execution to admin access
    - Test that fixed superusers can access all admin endpoints
    - Test role-based middleware continues to work for non-superusers
    - Test deployment scenarios with automated superuser creation
    - _Requirements: 2.2, 2.3, 3.3, 3.4_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.