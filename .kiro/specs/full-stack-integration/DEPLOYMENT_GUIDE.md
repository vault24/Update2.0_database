# Deployment Guide - Frontend Integration

## Quick Start

### 1. Replace Old Pages with New Integrated Pages

#### Students Page
```bash
# Backup old file
mv client/admin-side/src/pages/StudentsList.tsx client/admin-side/src/pages/StudentsListOld.tsx

# Rename new file
mv client/admin-side/src/pages/StudentsListNew.tsx client/admin-side/src/pages/StudentsList.tsx
```

#### Admissions Page
```bash
# Backup old file
mv client/admin-side/src/pages/Admissions.tsx client/admin-side/src/pages/AdmissionsOld.tsx

# Rename new file
mv client/admin-side/src/pages/AdmissionsNew.tsx client/admin-side/src/pages/Admissions.tsx
```

### 2. Start Backend Server

```bash
cd server

# Activate virtual environment (if using)
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Run migrations (if needed)
python manage.py migrate

# Start server
python manage.py runserver
```

Backend will be available at: `http://localhost:8000`

### 3. Start Frontend Server

```bash
cd client/admin-side

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### 4. Test the Integration

1. Open browser to `http://localhost:5173`
2. Navigate to Students page
3. Verify data loads from backend
4. Test search, filters, and pagination
5. Navigate to Admissions page
6. Verify statistics and data load
7. Test approve/reject functionality

## Configuration

### Backend CORS Setup

Edit `server/slms_core/settings.py`:

```python
# Add to INSTALLED_APPS if not present
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

# Add to MIDDLEWARE (near the top)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ...
]

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True

# Session settings
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True
```

### Install CORS Package (if needed)

```bash
cd server
pip install django-cors-headers
```

### Frontend Environment Variables

Create/verify `client/admin-side/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Troubleshooting

### Issue: CORS Errors

**Symptom**: Browser console shows CORS policy errors

**Solution**:
1. Verify `django-cors-headers` is installed
2. Check CORS settings in `settings.py`
3. Ensure `corsheaders` middleware is added
4. Restart Django server

### Issue: 404 Not Found

**Symptom**: API calls return 404

**Solution**:
1. Verify backend server is running
2. Check API_BASE_URL in `.env`
3. Verify URL patterns in Django `urls.py`
4. Check endpoint paths in `config/api.ts`

### Issue: Authentication Errors

**Symptom**: 401 Unauthorized or 403 Forbidden

**Solution**:
1. Ensure user is logged in
2. Check session cookie is being sent
3. Verify `credentials: 'include'` in API client
4. Check Django session settings

### Issue: Data Not Loading

**Symptom**: Empty lists or loading forever

**Solution**:
1. Check browser console for errors
2. Verify backend has data (use Django admin or API browser)
3. Check network tab for API responses
4. Verify serializers are returning data correctly

### Issue: TypeScript Errors

**Symptom**: Build fails with type errors

**Solution**:
1. Run `npm install` to ensure all dependencies are installed
2. Check import paths are correct
3. Verify all required UI components exist
4. Run `npm run build` to see detailed errors

## Testing Checklist

### Backend Testing

- [ ] Django server starts without errors
- [ ] Can access Django admin at `http://localhost:8000/admin`
- [ ] Can access API browser at `http://localhost:8000/api`
- [ ] Students endpoint returns data: `http://localhost:8000/api/students/`
- [ ] Admissions endpoint returns data: `http://localhost:8000/api/admissions/`
- [ ] CORS headers are present in responses

### Frontend Testing

- [ ] Frontend dev server starts without errors
- [ ] Can access app at `http://localhost:5173`
- [ ] No console errors on page load
- [ ] Students page loads and displays data
- [ ] Search works on students page
- [ ] Filters work on students page
- [ ] Pagination works on students page
- [ ] Admissions page loads and displays data
- [ ] Statistics show correct counts
- [ ] Approve dialog opens and works
- [ ] Reject dialog opens and works
- [ ] Toast notifications appear for actions

### Integration Testing

- [ ] Create a new student via API
- [ ] Verify student appears in frontend list
- [ ] Update student via frontend
- [ ] Verify changes in backend
- [ ] Submit admission via API
- [ ] Verify admission appears in frontend
- [ ] Approve admission via frontend
- [ ] Verify student profile created
- [ ] Reject admission via frontend
- [ ] Verify status updated

## Production Deployment

### Backend

1. **Update Settings**:
```python
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com']
CORS_ALLOWED_ORIGINS = ['https://your-frontend-domain.com']
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

2. **Collect Static Files**:
```bash
python manage.py collectstatic
```

3. **Use Production Server**:
- Gunicorn, uWSGI, or similar
- Configure with Nginx or Apache

### Frontend

1. **Update Environment**:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

2. **Build for Production**:
```bash
npm run build
```

3. **Deploy Build**:
- Upload `dist/` folder to hosting
- Configure server (Nginx, Apache, Vercel, Netlify, etc.)
- Ensure SPA routing works (redirect all to index.html)

## Rollback Plan

If issues occur, rollback to old pages:

```bash
# Restore old Students page
mv client/admin-side/src/pages/StudentsListOld.tsx client/admin-side/src/pages/StudentsList.tsx

# Restore old Admissions page
mv client/admin-side/src/pages/AdmissionsOld.tsx client/admin-side/src/pages/Admissions.tsx

# Restart dev server
npm run dev
```

## Support

For issues:
1. Check browser console for errors
2. Check Django server logs
3. Review this guide's troubleshooting section
4. Check API endpoint documentation
5. Verify data exists in database

## Next Steps

After successful deployment:
1. Monitor for errors in production
2. Gather user feedback
3. Continue integrating remaining pages
4. Add more features as needed
5. Optimize performance
6. Add analytics/monitoring
