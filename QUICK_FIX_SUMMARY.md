# Quick Fix Summary: Document Preview Blank Page Issue

## What Was Wrong
Document generation worked locally but showed blank white pages in production after deployment.

## Why It Happened
- Template HTML files were in `src/` folder and not being copied to production build
- Asset paths (logos) were using `import.meta.url` which doesn't work in production
- Templates couldn't be loaded from the server

## What Was Fixed

### 1. Templates Moved to Public Folder
All template files are now in `client/admin-side/public/templates/`:
- ✅ All HTML templates (Testimonial.html, Certificate.html, etc.)
- ✅ Logo assets (spi.png, gov.svg)

### 2. Updated Code
Modified `client/admin-side/src/services/templateService.ts`:
- Changed paths from `/src/documents/templates/` to `/templates/`
- Simplified asset URL resolution
- Templates now load from public folder

### 3. Added Build Script
Created `client/admin-side/copy-templates.js`:
- Automatically copies templates before build
- Added to `package.json` as `prebuild` script
- Runs automatically when you run `npm run build`

## How to Deploy

### Step 1: Build Admin Frontend
```bash
cd client/admin-side
npm run build
```
The `prebuild` script will automatically copy templates.

### Step 2: Deploy to Server
Upload the `dist/` folder to your server. Make sure it includes:
```
dist/
  templates/
    *.html files
    spi.png
    gov.svg
```

### Step 3: Verify
1. Go to admin portal Documents page
2. Select student and template
3. Click "Generate Document"
4. Preview should now show the document with proper formatting

## Testing Locally

### Development
```bash
cd client/admin-side
npm run dev
```

### Production Build Preview
```bash
cd client/admin-side
npm run build
npm run preview
```

## What to Check If Still Not Working

1. **Browser Console**: Check for 404 errors loading templates
2. **Network Tab**: Verify `/templates/Testimonial.html` returns 200
3. **Templates Folder**: Ensure `dist/templates/` exists after build
4. **Server Config**: Make sure nginx/apache serves static files from dist folder

## Files Changed
- ✅ `client/admin-side/src/services/templateService.ts`
- ✅ `client/admin-side/package.json`
- ✅ `client/admin-side/copy-templates.js` (new)
- ✅ `client/admin-side/public/templates/*` (new folder)

## Next Steps
1. Rebuild admin frontend: `npm run build`
2. Redeploy to server
3. Test document generation
4. Verify preview shows content

That's it! The fix ensures templates are properly bundled and accessible in production.
