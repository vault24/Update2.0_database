# Authentication Troubleshooting Guide

## Current Issues

1. **403 Forbidden on `/api/auth/me/`** - Expected when not logged in
2. **400 Bad Request on `/api/auth/login/`** - Needs investigation
3. **404 on `/api/auth/signup-request-status/...`** - Expected if no signup request exists

## Common Causes and Solutions

### 1. CSRF Token Issues

**Symptoms:**
- 400 Bad Request on login
- CSRF token errors in browser console

**Solutions:**

#### Check CSRF_TRUSTED_ORIGINS
Make sure your frontend origin is in `CSRF_TRUSTED_ORIGINS` in `settings.py`:

```python
CSRF_TRUSTED_ORIGINS = [
    'http://18.138.238.106:8000',
    'http://18.138.238.106',
    # Add your frontend URL here (e.g., if frontend is on port 8080)
    'http://18.138.238.106:8080',
    # Or if using a different domain
    'http://your-frontend-domain.com',
]
```

#### Verify CSRF Cookie is Set
1. Open browser DevTools → Application → Cookies
2. Check if `csrftoken` cookie exists after calling `/api/auth/csrf/`
3. Verify the cookie domain and path are correct

#### Test CSRF Token Retrieval
```javascript
// In browser console after visiting the site
fetch('http://18.138.238.106:8000/api/auth/csrf/', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('CSRF Token:', data.csrfToken))
```

### 2. Invalid Credentials

**Symptoms:**
- 400 Bad Request with error message about invalid username/password

**Solutions:**

#### Verify User Exists
```bash
# On server, activate venv and run Django shell
cd ~/Update2.0_database/server
source venv/bin/activate
python manage.py shell

# In Django shell:
from apps.authentication.models import User
User.objects.filter(username='your_username').exists()
User.objects.filter(email='your_email').exists()
```

#### Check User Account Status
```python
# In Django shell:
user = User.objects.get(username='your_username')
print(f"Account Status: {user.account_status}")
print(f"Can Login: {user.can_login()}")
print(f"Role: {user.role}")
```

#### Create Admin User (if needed)
```bash
cd ~/Update2.0_database/server
source venv/bin/activate
python manage.py createsuperuser
# Or use the create_admin_user.py script
python create_admin_user.py
```

### 3. CORS Issues

**Symptoms:**
- Network errors in browser console
- CORS policy errors

**Solutions:**

#### Verify CORS Settings
In `settings.py`, ensure:
```python
CORS_ALLOWED_ORIGINS = [
    'http://18.138.238.106:8000',
    'http://18.138.238.106',
    # Add your frontend origin
    'http://your-frontend-domain:port',
]

CORS_ALLOW_CREDENTIALS = True

# If DEBUG=True, this allows all origins
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
```

### 4. Session Cookie Issues

**Symptoms:**
- Login succeeds but subsequent requests fail
- 403 errors after login

**Solutions:**

#### Check Session Settings
```python
# In settings.py
SESSION_COOKIE_SAMESITE = 'Lax'  # Should be 'Lax' or 'None'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Set to True only with HTTPS
SESSION_COOKIE_AGE = 86400  # 24 hours
```

#### Verify Cookies are Being Set
1. After login, check browser DevTools → Application → Cookies
2. Look for `sessionid` cookie
3. Verify it's being sent with subsequent requests

### 5. Frontend Request Format

**Verify Request Format:**
The login endpoint expects:
```json
{
  "username": "your_username_or_email",
  "password": "your_password"
}
```

**Check Network Tab:**
1. Open browser DevTools → Network tab
2. Try to login
3. Check the login request:
   - Method: POST
   - URL: `http://18.138.238.106:8000/api/auth/login/`
   - Headers: Should include `X-CSRFToken` and `Content-Type: application/json`
   - Request Payload: Should have `username` and `password` fields
   - Response: Check the actual error message

## Debugging Steps

### Step 1: Check Backend Logs
```bash
# On server
sudo journalctl -u gunicorn -f
# Or if running with manage.py runserver
# Check the terminal output
```

### Step 2: Test API Directly
```bash
# Get CSRF token
curl -X GET http://18.138.238.106:8000/api/auth/csrf/ \
  -c cookies.txt \
  -b cookies.txt

# Extract CSRF token from response or cookies.txt

# Try login
curl -X POST http://18.138.238.106:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: YOUR_CSRF_TOKEN" \
  -d '{"username":"your_username","password":"your_password"}' \
  -c cookies.txt \
  -b cookies.txt \
  -v
```

### Step 3: Check Django Admin
```bash
# Access Django admin to verify users exist
# URL: http://18.138.238.106:8000/admin
```

### Step 4: Verify Frontend Configuration
1. Check `.env` file has correct `VITE_API_BASE_URL`
2. Rebuild frontend if needed: `npm run build`
3. Clear browser cache and cookies
4. Try in incognito/private window

## Quick Fixes

### Fix 1: Add Frontend Origin to CSRF_TRUSTED_ORIGINS
Edit `server/slms_core/settings.py`:
```python
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.250,http://18.138.238.106:8000,http://18.138.238.106,http://YOUR_FRONTEND_DOMAIN:PORT',
    cast=Csv()
)
```

Then restart gunicorn:
```bash
sudo systemctl restart gunicorn
```

### Fix 2: Create Test Admin User
```bash
cd ~/Update2.0_database/server
source venv/bin/activate
python create_admin_user.py
# Or
python manage.py createsuperuser
```

### Fix 3: Check User Can Login
```python
# In Django shell
from apps.authentication.models import User
user = User.objects.get(username='admin')  # or your username
print(f"Can login: {user.can_login()}")
print(f"Account status: {user.account_status}")
print(f"Role: {user.role}")
```

## Expected Behavior

### Successful Login Flow:
1. Frontend calls `/api/auth/csrf/` → Gets CSRF token in cookie
2. Frontend calls `/api/auth/login/` with:
   - `X-CSRFToken` header
   - `credentials: 'include'` (sends cookies)
   - JSON body with `username` and `password`
3. Backend validates credentials and creates session
4. Backend returns user data
5. Frontend stores user in context
6. Subsequent requests include `sessionid` cookie automatically

### Error Responses:
- **400 Bad Request**: Invalid credentials or missing fields
- **403 Forbidden**: CSRF token missing/invalid or user not authenticated
- **404 Not Found**: Endpoint doesn't exist or resource not found

