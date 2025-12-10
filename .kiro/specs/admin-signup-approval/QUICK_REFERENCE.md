# Admin Signup Approval - Quick Reference

## 🚀 Quick Start

### For Testing (First Time Setup)

1. **Start Backend Server**
   ```bash
   cd server
   python manage.py runserver
   ```

2. **Start Frontend Server**
   ```bash
   cd client/admin-side
   npm run dev
   ```

3. **Create/Update Admin User**
   ```bash
   cd server
   python update_admin_user.py
   ```
   
   **Admin Credentials:**
   - Username: `admin`
   - Email: `admin@sipi.edu.bd`
   - Password: `admin123`
   - Role: `registrar`

4. **Access Application**
   - Frontend: `http://localhost:8081`
   - Backend API: `http://localhost:8000`

---

## 📋 User Workflows

### New User Signup Flow
1. Go to `http://localhost:8081/auth`
2. Click "Sign Up" tab
3. Fill form with username, name, email, role, password
4. Submit request
5. Wait for admin approval

### Admin Approval Flow
1. Login as admin
2. Go to "Signup Requests" from sidebar
3. Review pending requests
4. Click "Approve" or "Reject"
5. Confirm action

### Login Flow
1. Go to `http://localhost:8081/auth`
2. Enter email and password
3. Click "Sign In"
4. Access dashboard

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login/` - Login user
- `POST /api/auth/logout/` - Logout user
- `GET /api/auth/me/` - Get current user
- `GET /api/auth/csrf/` - Get CSRF token

### Signup Requests
- `POST /api/auth/signup-request/` - Create signup request
- `GET /api/auth/signup-requests/` - List all requests (admin only)
- `GET /api/auth/signup-requests/:id/` - Get request details (admin only)
- `POST /api/auth/signup-requests/:id/approve/` - Approve request (admin only)
- `POST /api/auth/signup-requests/:id/reject/` - Reject request (admin only)
- `GET /api/auth/signup-request-status/:username/` - Check request status

---

## 📁 Key Files

### Frontend
```
client/admin-side/src/
├── contexts/
│   └── AuthContext.tsx              # Authentication state management
├── components/
│   ├── ProtectedRoute.tsx           # Route protection
│   └── dashboard/
│       └── PendingSignupRequests.tsx # Dashboard widget
├── pages/
│   ├── Auth.tsx                     # Login/Signup page
│   └── SignupRequests.tsx           # Admin management page
└── services/
    └── signupRequestService.ts      # API service
```

### Backend
```
server/apps/authentication/
├── models.py                        # User & SignupRequest models
├── serializers.py                   # API serializers
├── views.py                         # API views
└── urls.py                          # URL patterns
```

### Scripts
```
server/
├── create_admin_user.py             # Create new admin user
└── update_admin_user.py             # Update existing user to admin
```

---

## 🎨 UI Components

### Auth Page (`/auth`)
- Login/Signup tabs
- Form fields with validation
- Password visibility toggle
- Success confirmation screen

### Signup Requests Page (`/signup-requests`)
- Status filter tabs (All, Pending, Approved, Rejected)
- Search bar (name, email, username)
- Date range filters
- Action buttons (Approve, Reject)
- Confirmation dialogs

### Dashboard Widget
- Pending requests count
- Last 5 pending requests
- "View All Requests" link

---

## 🔒 User Roles

### Admin Roles (Can approve requests)
- `registrar` - Registrar
- `institute_head` - Institute Head

### Other Roles
- `student` - Student
- `captain` - Captain
- `teacher` - Teacher

---

## 🐛 Common Issues & Solutions

### Issue: White screen on frontend
**Solution:** Check browser console, disable ad blockers

### Issue: Login fails with 403
**Solution:** Clear cookies, check CSRF token

### Issue: Login fails with 400
**Solution:** Backend expects `username` field, not `email`

### Issue: Cannot see signup requests
**Solution:** Ensure logged in as admin (registrar or institute_head)

### Issue: API returns 404
**Solution:** Check backend is running on port 8000

---

## 📊 Status Flow

```
Signup Request Created
        ↓
    [PENDING]
        ↓
    ┌───┴───┐
    ↓       ↓
[APPROVED] [REJECTED]
    ↓       ↓
User Created  No User
Can Login    Cannot Login
```

---

## 🧪 Quick Test

1. **Create signup request:**
   ```
   Username: testuser
   Email: test@sipi.edu.bd
   Password: Test@123
   Role: Registrar
   ```

2. **Login as admin:**
   ```
   Email: admin@sipi.edu.bd
   Password: admin123
   ```

3. **Approve request** from Signup Requests page

4. **Login as new user:**
   ```
   Email: test@sipi.edu.bd
   Password: Test@123
   ```

---

## 📝 Notes

- All passwords are hashed before storage
- CSRF protection is enabled
- Session-based authentication
- Admin users can manage all requests
- Rejected requests cannot be re-approved (create new request)
- Approved requests create active user accounts

---

## 🔗 Related Documents

- **Requirements**: `.kiro/specs/admin-signup-approval/requirements.md`
- **Design**: `.kiro/specs/admin-signup-approval/design.md`
- **Tasks**: `.kiro/specs/admin-signup-approval/tasks.md`
- **Implementation Summary**: `.kiro/specs/admin-signup-approval/IMPLEMENTATION_SUMMARY.md`
- **Testing Guide**: `.kiro/specs/admin-signup-approval/TESTING_GUIDE.md`

---

## 💡 Tips

- Use Chrome DevTools Network tab to debug API calls
- Check Django logs for backend errors
- Use React DevTools to inspect component state
- Clear browser cache if seeing stale data
- Disable browser extensions if API calls are blocked
- Use Postman to test API endpoints directly

---

## 🎯 Feature Highlights

✅ Secure signup request workflow
✅ Admin approval/rejection system
✅ Real-time status updates
✅ Comprehensive filtering and search
✅ Dashboard widget for quick access
✅ User-friendly error messages
✅ Responsive design
✅ CSRF protection
✅ Session management
✅ Protected routes
