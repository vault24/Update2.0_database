# Deployment Checklist - Document Generation Fix

## Pre-Deployment Checklist

### ✅ Code Changes Verified
- [x] Template service updated to use `/templates/` paths
- [x] Copy script created (`copy-templates.js`)
- [x] Package.json updated with `prebuild` script
- [x] Templates copied to `public/templates/` folder

### ✅ Local Testing
```bash
cd client/admin-side
npm run dev
```
Test document generation:
1. Navigate to Documents page
2. Select a student
3. Choose a template (e.g., Testimonial)
4. Click "Generate Document"
5. Verify preview shows content with logos

### ✅ Production Build Testing
```bash
cd client/admin-side
npm run build
npm run preview
```
Verify:
- Build completes without errors
- `dist/templates/` folder exists
- Contains all HTML files and assets
- Preview works correctly

## Deployment Steps

### Step 1: Prepare Backend
```bash
cd server
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py collectstatic --noinput
```

### Step 2: Build Admin Frontend
```bash
cd client/admin-side
npm run build
```
Verify output:
```
✓ built in XXXms
dist/templates/ created
```

### Step 3: Build Student Frontend
```bash
cd client/student-side
npm run build
```

### Step 4: Deploy to Server

#### Option A: Using SCP
```bash
# Admin frontend
scp -r client/admin-side/dist/* user@13.250.99.61:/var/www/admin/

# Student frontend
scp -r client/student-side/dist/* user@13.250.99.61:/var/www/student/

# Backend
scp -r server/* user@13.250.99.61:/var/www/backend/
```

#### Option B: Using Git
```bash
# On server
cd /var/www/slms
git pull origin main

# Rebuild frontends
cd client/admin-side && npm run build
cd ../student-side && npm run build

# Restart services
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

### Step 5: Verify Deployment

#### Check Files on Server
```bash
ssh user@13.250.99.61
ls -la /var/www/admin/templates/
```
Should show:
- Certificate.html
- Testimonial.html
- spi.png
- gov.svg
- etc.

#### Test in Browser
1. Open http://13.250.99.61:8080 (Admin Portal)
2. Login
3. Go to Documents page
4. Generate a document
5. Verify preview shows content

## Post-Deployment Verification

### ✅ Document Generation
- [ ] Can select student
- [ ] Can select template
- [ ] Generate button works
- [ ] Preview shows document content
- [ ] Logos display correctly
- [ ] Styles are applied
- [ ] Print preview works
- [ ] PDF download works

### ✅ Browser Console
- [ ] No 404 errors for templates
- [ ] No 404 errors for assets (spi.png, gov.svg)
- [ ] No CORS errors
- [ ] No CSP violations

### ✅ Network Tab
Check these URLs return 200:
- [ ] http://13.250.99.61:8080/templates/Testimonial.html
- [ ] http://13.250.99.61:8080/templates/spi.png
- [ ] http://13.250.99.61:8080/templates/gov.svg

## Troubleshooting

### Issue: Preview Still Blank

#### Check 1: Templates Exist
```bash
ssh user@13.250.99.61
ls -la /var/www/admin/templates/
```
If missing, rebuild and redeploy.

#### Check 2: Nginx Configuration
Verify nginx serves static files:
```nginx
location /templates/ {
    alias /var/www/admin/templates/;
    try_files $uri $uri/ =404;
}
```

#### Check 3: File Permissions
```bash
chmod -R 755 /var/www/admin/templates/
```

### Issue: Logos Not Showing

#### Check 1: Asset Files
```bash
ls -la /var/www/admin/templates/*.png
ls -la /var/www/admin/templates/*.svg
```

#### Check 2: MIME Types
Verify nginx serves correct MIME types:
```nginx
types {
    image/png png;
    image/svg+xml svg;
    text/html html;
}
```

### Issue: Fonts Not Loading

#### Check 1: External Fonts
Templates use Google Fonts. Verify:
- Server allows outbound HTTPS
- No firewall blocking fonts.googleapis.com

#### Check 2: CSP Headers
If using Content Security Policy:
```nginx
add_header Content-Security-Policy "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;";
```

## Rollback Plan

If deployment fails:

### Quick Rollback
```bash
# On server
cd /var/www/slms
git checkout HEAD~1
cd client/admin-side && npm run build
sudo systemctl restart nginx
```

### Manual Rollback
1. Restore previous `dist/` folder backup
2. Restart nginx: `sudo systemctl restart nginx`

## Success Criteria

✅ All checks passed:
- [ ] Build completes without errors
- [ ] Templates folder exists in dist
- [ ] Preview shows document content
- [ ] Logos display correctly
- [ ] No console errors
- [ ] PDF download works
- [ ] Print preview works

## Support

If issues persist:
1. Check `DOCUMENT_GENERATION_FIX.md` for detailed troubleshooting
2. Review browser console for specific errors
3. Check nginx error logs: `tail -f /var/log/nginx/error.log`
4. Check application logs

## Notes

- Templates are now served from `/templates/` path
- Assets (logos) are bundled with templates
- Build script automatically copies templates
- No manual copying needed after initial setup
