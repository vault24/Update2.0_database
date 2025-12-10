# Admin Signup Approval - Testing Guide

## Prerequisites

### Backend Setup
1. Ensure Django server is running on `http://localhost:8000`
2. Database migrations are applied
3. Admin user exists with credentials:
   - **Username**: `admin`
   - **Email**: `admin@sipi.edu.bd`
   - **Password**: `admin123`
   - **Role**: `registrar`

To create/update the admin user, run:
```bash
cd server
python update_admin_user.py
```

### Frontend Setup
1. Ensure React app is running on `http://localhost:8081`
2. Browser extensions (ad blockers) are disabled to prevent API blocking

## Test Scenarios

### Scenario 1: New User Signup Request Flow

#### Steps:
1. Navigate to `http://localhost:8081/auth`
2. Click on "Sign Up" tab
3. Fill in the signup form:
   - **Username**: `testuser`
   - **First Name**: `Test`
   - **Last Name**: `User`
   - **Email**: `testuser@sipi.edu.bd`
   - **Mobile Number**: `01712345678` (optional)
   - **Requested Role**: Select `Registrar` or `Institute Head`
   - **Password**: `Test@123`
   - **Confirm Password**: `Test@123`
4. Click "Submit Signup Request"

#### Expected Results:
- ✅ Success message: "Signup Request Submitted!"
- ✅ Confirmation screen appears with shield icon
- ✅ Message: "Your signup request is pending approval from an administrator"
- ✅ "Back to Login" button is visible

#### Backend Verification:
```bash
cd server
python manage.py shell
>>> from apps.authentication.models import SignupRequest
>>> SignupRequest.objects.filter(username='testuser').first()
# Should show pending request
```

---

### Scenario 2: Login Attempt with Pending Request

#### Steps:
1. Click "Back to Login" or navigate to login tab
2. Try to login with pending request credentials:
   - **Email**: `testuser@sipi.edu.bd`
   - **Password**: `Test@123`
3. Click "Sign In"

#### Expected Results:
- ❌ Login fails with error message
- ✅ Toast notification: "Account Pending Approval"
- ✅ Message: "Your signup request is awaiting approval from an administrator. Please check back later."

---

### Scenario 3: Admin Login

#### Steps:
1. Navigate to `http://localhost:8081/auth`
2. Ensure you're on the "Login" tab
3. Enter admin credentials:
   - **Email**: `admin@sipi.edu.bd`
   - **Password**: `admin123`
4. Click "Sign In"

#### Expected Results:
- ✅ Success toast: "Welcome back!"
- ✅ Redirected to dashboard at `http://localhost:8081/`
- ✅ User info displayed in top navbar
- ✅ Sidebar shows "Signup Requests" link under "Requests" section

---

### Scenario 4: View Pending Signup Requests

#### Steps:
1. After logging in as admin, check the dashboard
2. Look for "Pending Signup Requests" widget
3. Click "View All Requests" or navigate to "Signup Requests" from sidebar

#### Expected Results:
- ✅ Dashboard widget shows count of pending requests
- ✅ Widget displays last 5 pending requests with details
- ✅ Signup Requests page loads with table view
- ✅ Pending request for `testuser` is visible
- ✅ Table shows: Name, Email, Username, Role, Submitted date, Actions

---

### Scenario 5: Approve Signup Request

#### Steps:
1. On Signup Requests page, find the pending request
2. Click the green "Approve" button
3. Confirm approval in the dialog

#### Expected Results:
- ✅ Confirmation dialog appears: "Are you sure you want to approve this signup request?"
- ✅ After confirming, success toast: "Signup request approved successfully"
- ✅ Request status changes to "Approved"
- ✅ Request moves to "Approved" tab
- ✅ User account is created in the system

#### Backend Verification:
```bash
cd server
python manage.py shell
>>> from apps.authentication.models import User, SignupRequest
>>> User.objects.filter(username='testuser').exists()
# Should return True
>>> user = User.objects.get(username='testuser')
>>> user.role
# Should show 'registrar' or 'institute_head'
>>> user.account_status
# Should show 'active'
```

---

### Scenario 6: Login with Approved Account

#### Steps:
1. Logout from admin account (click user menu → Logout)
2. Navigate to login page
3. Login with approved user credentials:
   - **Email**: `testuser@sipi.edu.bd`
   - **Password**: `Test@123`
4. Click "Sign In"

#### Expected Results:
- ✅ Success toast: "Welcome back!"
- ✅ Redirected to dashboard
- ✅ User can access all admin features

---

### Scenario 7: Reject Signup Request

#### Steps:
1. Login as admin
2. Create another signup request (use different username/email)
3. Navigate to Signup Requests page
4. Click the red "Reject" button on the new request
5. Enter rejection reason: "Insufficient credentials"
6. Click "Reject Request"

#### Expected Results:
- ✅ Rejection reason modal appears
- ✅ After confirming, success toast: "Signup request rejected successfully"
- ✅ Request status changes to "Rejected"
- ✅ Request moves to "Rejected" tab
- ✅ Rejection reason is stored
- ✅ No user account is created

---

### Scenario 8: Login Attempt with Rejected Request

#### Steps:
1. Logout from admin account
2. Try to login with rejected request credentials
3. Click "Sign In"

#### Expected Results:
- ❌ Login fails with error message
- ✅ Toast notification: "Signup Request Rejected"
- ✅ Message: "Your signup request was rejected. Please contact an administrator for more information."

---

### Scenario 9: Filter and Search Functionality

#### Steps:
1. Login as admin
2. Navigate to Signup Requests page
3. Test status filters:
   - Click "All" tab
   - Click "Pending" tab
   - Click "Approved" tab
   - Click "Rejected" tab
4. Test search:
   - Enter username in search box
   - Enter email in search box
   - Enter name in search box
5. Test date filters:
   - Select "From Date"
   - Select "To Date"
   - Click "Clear Filters"

#### Expected Results:
- ✅ Each tab shows only requests with matching status
- ✅ Search filters results in real-time
- ✅ Date filters work correctly
- ✅ "Clear Filters" resets all filters
- ✅ Empty state shows when no results match filters

---

### Scenario 10: Dashboard Widget

#### Steps:
1. Login as admin
2. View dashboard
3. Check "Pending Signup Requests" widget

#### Expected Results:
- ✅ Widget shows count of pending requests
- ✅ Widget displays last 5 pending requests
- ✅ Each request shows: name, email, role, relative time
- ✅ "View All Requests" button links to full page
- ✅ Widget updates after approving/rejecting requests

---

### Scenario 11: Logout Functionality

#### Steps:
1. While logged in, click user menu in top navbar
2. Click "Logout"

#### Expected Results:
- ✅ User is logged out
- ✅ Session is cleared
- ✅ Redirected to login page
- ✅ Cannot access protected routes without logging in again

---

### Scenario 12: Protected Routes

#### Steps:
1. Ensure you're logged out
2. Try to access protected routes directly:
   - `http://localhost:8081/`
   - `http://localhost:8081/signup-requests`
   - `http://localhost:8081/students`

#### Expected Results:
- ✅ Automatically redirected to `/auth` login page
- ✅ Cannot access any protected routes without authentication

---

## Edge Cases to Test

### 1. Duplicate Username
- Try to create signup request with existing username
- **Expected**: Error message about duplicate username

### 2. Duplicate Email
- Try to create signup request with existing email
- **Expected**: Error message about duplicate email

### 3. Password Mismatch
- Enter different passwords in password and confirm password fields
- **Expected**: Error message about password mismatch

### 4. Missing Required Fields
- Try to submit form with empty required fields
- **Expected**: Validation errors for each missing field

### 5. Invalid Email Format
- Enter invalid email (e.g., "notanemail")
- **Expected**: Email validation error

### 6. Weak Password
- Enter weak password (e.g., "123")
- **Expected**: Password strength validation error (if implemented)

### 7. Network Error
- Stop backend server
- Try to submit signup request
- **Expected**: Error message about network/server error

### 8. Session Expiration
- Login and wait for session to expire
- Try to access protected route
- **Expected**: Redirected to login page

---

## Performance Testing

### Load Testing
1. Create multiple signup requests (10-20)
2. Check page load time for Signup Requests page
3. Test pagination if implemented
4. Test search performance with many results

### Expected Performance:
- ✅ Page loads in < 2 seconds
- ✅ Search results appear in < 500ms
- ✅ Approve/reject actions complete in < 1 second

---

## Browser Compatibility

Test on multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

Test on multiple devices:
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

---

## Security Testing

### 1. CSRF Protection
- Try to submit form without CSRF token
- **Expected**: Request should fail

### 2. Permission Checks
- Try to access admin endpoints as non-admin user
- **Expected**: 403 Forbidden error

### 3. SQL Injection
- Try to enter SQL commands in form fields
- **Expected**: Input sanitization prevents injection

### 4. XSS Prevention
- Try to enter JavaScript in form fields
- **Expected**: Script tags are escaped/sanitized

---

## Troubleshooting

### Issue: White screen on frontend
**Solution**: Check browser console for errors. Common causes:
- Import errors (check file paths)
- API connection issues (check CORS settings)
- Browser extensions blocking requests (disable ad blockers)

### Issue: Login fails with 403 Forbidden
**Solution**: CSRF token issue
- Clear browser cookies
- Ensure CSRF token is being fetched and sent
- Check Django CSRF settings

### Issue: Login fails with 400 Bad Request
**Solution**: Check request payload
- Backend expects `username` field, not `email`
- Ensure password is being sent correctly

### Issue: API returns 404
**Solution**: Check URL patterns
- Ensure backend URLs are correctly configured
- Check for trailing slashes in URLs
- Verify API endpoint exists

### Issue: Cannot see pending requests
**Solution**: Check user role
- Only admin users (registrar, institute_head) can view requests
- Verify user role in database

---

## Test Checklist

Use this checklist to ensure all features are tested:

- [ ] New user can submit signup request
- [ ] Signup request appears in admin panel
- [ ] Admin can view all signup requests
- [ ] Admin can filter by status
- [ ] Admin can search by name/email
- [ ] Admin can approve request
- [ ] Approved user can login
- [ ] Admin can reject request with reason
- [ ] Rejected user cannot login
- [ ] Pending user cannot login
- [ ] Dashboard widget shows pending requests
- [ ] Logout works correctly
- [ ] Protected routes require authentication
- [ ] CSRF protection works
- [ ] Form validation works
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly
- [ ] Toast notifications appear
- [ ] Responsive design works on mobile
- [ ] Browser compatibility verified

---

## Reporting Issues

When reporting issues, include:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Screenshots** (if applicable)
5. **Browser and version**
6. **Console errors** (if any)
7. **Network tab** (for API errors)

---

## Success Criteria

The feature is considered fully functional when:
- ✅ All test scenarios pass
- ✅ No console errors
- ✅ All edge cases handled
- ✅ Performance meets expectations
- ✅ Security checks pass
- ✅ Works across browsers and devices
- ✅ User experience is smooth and intuitive
