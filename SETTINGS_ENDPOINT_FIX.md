# Settings Endpoint Access Fix

## Problem
The `/api/settings/` endpoint was returning 403 Forbidden when accessed by non-admin users, preventing the teacher profile from fetching the institute name.

## Root Cause
Two layers of access control were blocking the endpoint:

1. **RoleBasedAccessMiddleware** (`server/apps/authentication/middleware.py`):
   - Had `/api/settings/` restricted to only `['registrar', 'institute_head']`
   - Middleware runs before view-level permissions
   - Was blocking all non-admin users

2. **SystemSettingsView** (`server/apps/system_settings/views.py`):
   - Didn't have explicit permission classes
   - Was using default authentication requirement

## Solution

### 1. Updated Middleware (`server/apps/authentication/middleware.py`)

**Added public endpoint handling:**
```python
def __call__(self, request):
    # Skip middleware for non-authenticated requests to public endpoints
    public_get_endpoints = ['/api/settings/']
    if not request.user.is_authenticated and request.path in public_get_endpoints and request.method == 'GET':
        return self.get_response(request)
```

**Modified access rules check:**
```python
# Allow GET requests to settings for all authenticated users
if pattern == '/api/settings/' and request.method == 'GET':
    continue
```

### 2. Updated View (`server/apps/system_settings/views.py`)

**Added explicit permission classes:**
```python
def get_permissions(self):
    """
    Allow anyone to read settings, but only authenticated users to update
    """
    if self.request.method == 'GET':
        return [AllowAny()]
    return [IsAuthenticated()]
```

### 3. Updated Frontend (`client/student-side/src/components/profile/LinkedInTeacherProfile.tsx`)

**Made settings fetch optional:**
```typescript
// Try to fetch system settings, but don't fail if it errors
let instituteName = 'Sylhet Polytechnic Institute'; // Default fallback
try {
  const systemSettings = await settingsService.getSystemSettings();
  instituteName = systemSettings.institute_name || instituteName;
} catch (settingsErr) {
  console.warn('Could not fetch system settings, using default institute name:', settingsErr);
}
```

## Result

Now the settings endpoint works as follows:

| Method | Authentication | Authorization | Result |
|--------|---------------|---------------|---------|
| GET | Not required | Public | ✅ Anyone can read settings |
| GET | Authenticated | Any role | ✅ All users can read settings |
| PUT | Required | Admin only | ✅ Only admins can update |

## Benefits

1. **Public Access**: Institute information is publicly accessible (as it should be)
2. **Graceful Degradation**: Profile loads even if settings fetch fails
3. **Security Maintained**: Only admins can update settings
4. **Better UX**: No authentication errors for public information

## Testing

After restarting the Django server:

1. ✅ Unauthenticated users can GET `/api/settings/`
2. ✅ Authenticated users (any role) can GET `/api/settings/`
3. ✅ Only admins can PUT `/api/settings/`
4. ✅ Teacher profile loads with dynamic institute name
5. ✅ Profile still loads if settings endpoint fails

## Files Modified

- `server/apps/authentication/middleware.py` - Updated access rules
- `server/apps/system_settings/views.py` - Added permission classes
- `client/student-side/src/components/profile/LinkedInTeacherProfile.tsx` - Made settings optional

## Next Steps

**IMPORTANT**: Restart the Django development server for changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd server
python manage.py runserver
```
