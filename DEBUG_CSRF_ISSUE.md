# Debugging CSRF 400 Errors

## Current Issue
Still getting 400 errors with HTML responses when trying to login.

## Troubleshooting Steps

### 1. Verify Backend Server Was Restarted
The CSRF handler changes require a server restart:
```bash
sudo systemctl restart gunicorn
# OR if using runserver, stop and restart it
```

### 2. Check What URL Your Frontend Is Running On

The frontend origin (URL where you access the admin panel) must be in `CSRF_TRUSTED_ORIGINS`.

**Check your browser's address bar:**
- What URL are you accessing? (e.g., `http://18.138.238.106:8081` or `http://localhost:8081`)

**The frontend origin must match one of these in settings.py:**
- `http://localhost:8081`
- `http://127.0.0.1:8081`
- `http://18.138.238.106:8000` (if frontend is on port 8000)
- `http://18.138.238.106` (if frontend is on port 80)

### 3. Test CSRF Endpoint Directly

Open browser console and run:
```javascript
// Test if CSRF endpoint works
fetch('http://18.138.238.106:8000/api/auth/csrf/', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('CSRF Success:', data))
.catch(err => console.error('CSRF Error:', err));
```

### 4. Check Cookies

In DevTools → Application → Cookies → `http://18.138.238.106:8000`:
- Is there a `csrftoken` cookie?
- Check its domain and path

### 5. Check Network Tab Response

For a failed request in Network tab:
- Click on the failed request
- Check Response tab
- Is it HTML (starts with `<!DOCTYPE`) or JSON?

If still HTML:
- Backend wasn't restarted, OR
- CSRF handler isn't being called (different error)

### 6. Add Your Frontend Origin to CSRF_TRUSTED_ORIGINS

If your frontend is on a different port/domain, add it to `server/slms_core/settings.py`:

```python
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.250,http://18.138.238.106:8000,http://18.138.238.106,YOUR_FRONTEND_URL_HERE',
    cast=Csv()
)
```

Then restart backend again.

## Quick Test

Try this in browser console:
```javascript
// 1. Get CSRF token
fetch('http://18.138.238.106:8000/api/auth/csrf/', {
  credentials: 'include',
  headers: {'Content-Type': 'application/json'}
})
.then(r => {
  console.log('CSRF Status:', r.status);
  return r.json();
})
.then(data => {
  console.log('CSRF Token:', data);
  
  // 2. Try login with token
  const token = data.csrfToken || document.cookie.match(/csrftoken=([^;]+)/)?.[1];
  console.log('Using token:', token);
  
  return fetch('http://18.138.238.106:8000/api/auth/login/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token
    },
    body: JSON.stringify({username: 'admin', password: 'admin123'})
  });
})
.then(r => {
  console.log('Login Status:', r.status);
  return r.json();
})
.then(data => console.log('Login Response:', data))
.catch(err => console.error('Error:', err));
```

This will show exactly what's happening at each step.

