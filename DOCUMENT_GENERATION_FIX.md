# Document Generation Preview Fix

## Problem
After deploying to production, the document preview shows a blank white page even though documents are generated successfully in local development.

## Root Cause
The issue was caused by:
1. Template HTML files and assets (logos) were not being properly served in production
2. Asset paths were using `import.meta.url` which doesn't resolve correctly in production builds
3. Template files were in `src/documents/templates/` but not being copied to the build output

## Solution

### 1. Move Templates to Public Folder
Templates and assets are now served from the `public/templates/` folder, which ensures they're accessible in both development and production.

### 2. Updated Template Service
Modified `client/admin-side/src/services/templateService.ts`:
- Changed asset URLs to use `/templates/` path (public folder)
- Updated template loading to fetch from `/templates/*.html`
- Simplified asset path resolution

### 3. Added Build Script
Created `client/admin-side/copy-templates.js` to automatically copy templates during build:
- Copies all HTML templates from `src/documents/templates/` to `public/templates/`
- Copies logo assets (spi.png, gov.svg)
- Runs automatically before build via `prebuild` script

## Deployment Steps

### For Local Development
```bash
cd client/admin-side
npm run prebuild  # Copy templates to public folder
npm run dev       # Start development server
```

### For Production Build
```bash
cd client/admin-side
npm run build     # Automatically runs prebuild first
```

### For Server Deployment
After building, ensure the following files are deployed:
```
dist/
  templates/
    Certificate.html
    characterCertificate.html
    CourseCompletionCertificate.html
    EligibilityStatement.html
    gov.svg
    IdCard.html
    Prottayon.html
    Sallu_certificate.html
    spi.png
    Testimonial.html
```

## Verification

### Test in Development
1. Start the dev server: `npm run dev`
2. Navigate to Documents page
3. Select a student and template
4. Click "Generate Document"
5. Preview should show the document with proper formatting and logos

### Test in Production
1. Build the application: `npm run build`
2. Preview the build: `npm run preview`
3. Test document generation as above
4. Verify logos and styles load correctly

## Additional Notes

### Template Assets
- Logo files are now served from `/templates/spi.png` and `/templates/gov.svg`
- These paths work in both development and production
- No need for complex URL resolution

### External Resources
Templates may still use external resources like Google Fonts:
```html
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif...');
```
Ensure your server allows external font loading or consider self-hosting fonts.

### CSP Headers
If you have Content Security Policy headers, ensure they allow:
- `font-src: https://fonts.googleapis.com https://fonts.gstatic.com`
- `style-src: 'unsafe-inline' https://fonts.googleapis.com`

## Troubleshooting

### Preview Still Blank
1. Check browser console for errors
2. Verify templates exist in `public/templates/` folder
3. Check network tab to see if template files are loading (should return 200)
4. Ensure `prebuild` script ran successfully

### Logos Not Showing
1. Verify `spi.png` and `gov.svg` are in `public/templates/`
2. Check browser console for 404 errors
3. Verify asset paths in template HTML are relative: `src="spi.png"`

### Styles Not Applied
1. Check if external fonts are loading (Google Fonts)
2. Verify inline styles in template HTML
3. Check for CSP violations in browser console

## Files Modified
- `client/admin-side/src/services/templateService.ts` - Updated asset paths and template loading
- `client/admin-side/package.json` - Added prebuild script
- `client/admin-side/copy-templates.js` - New build script to copy templates
- `client/admin-side/public/templates/` - New folder containing all templates and assets
