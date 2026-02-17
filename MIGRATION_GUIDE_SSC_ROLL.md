# Migration Guide: SSC Board Roll System

## Quick Start

### 1. Apply Database Migrations

```bash
cd server
python manage.py migrate
```

This will apply:
- `authentication.0004_add_student_id_field` - Adds student_id field to User model
- `admissions.0006_add_application_id_field` - Adds application_id field to Admission model

### 2. Verify Migrations

Run the test script to verify everything is working:

```bash
python test_ssc_roll_system.py
```

Expected output:
```
✓ All tests passed! System is ready.
```

### 3. Restart Backend Server

```bash
# If using development server
python manage.py runserver

# If using production
# Restart your WSGI/ASGI server (gunicorn, uwsgi, etc.)
```

### 4. Rebuild Frontend (if needed)

```bash
# Student Side
cd client/student-side
npm install  # or bun install
npm run build  # or bun run build

# Admin Side
cd client/admin-side
npm install  # or bun install
npm run build  # or bun run build
```

## Testing Checklist

### ✅ Student Registration
- [ ] SSC Board Roll field appears for students
- [ ] Student ID preview shows `SIPI-{roll}`
- [ ] Registration succeeds with SSC Board Roll
- [ ] User record has `student_id` field populated

### ✅ Admission Application
- [ ] Application ID is set automatically
- [ ] Application ID matches Student ID format

### ✅ Admission Approval
- [ ] Roll number field removed from approval form
- [ ] Approval succeeds without manual roll entry
- [ ] Student profile has correct roll number (`SIPI-{ssc_roll}`)

## Rollback Plan

If you need to rollback:

```bash
cd server
python manage.py migrate authentication 0003_passwordresetattempt_otptoken
python manage.py migrate admissions 0005_add_nationality_field
```

Then restore the previous code from git:
```bash
git checkout HEAD~1 -- server/apps/authentication/
git checkout HEAD~1 -- server/apps/admissions/
git checkout HEAD~1 -- client/student-side/src/components/auth/
git checkout HEAD~1 -- client/admin-side/src/pages/AdmissionsNew.tsx
```

## Common Issues

### Issue: Migration fails with "column already exists"
**Solution**: The field might already exist. Check with:
```bash
python manage.py dbshell
# Then run: \d auth_user (PostgreSQL) or DESCRIBE auth_user (MySQL)
```

### Issue: Frontend shows validation error for SSC Board Roll
**Solution**: Ensure the field only contains numbers, no letters or special characters

### Issue: Roll number not auto-generated during approval
**Solution**: Check that the user has a `student_id` field populated. If not, they need to re-register or have it manually set.

## Data Migration (Optional)

If you have existing students and want to populate their Student IDs:

```python
# Create a management command: server/apps/authentication/management/commands/populate_student_ids.py

from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.students.models import Student

class Command(BaseCommand):
    help = 'Populate student_id for existing users'

    def handle(self, *args, **options):
        users = User.objects.filter(role__in=['student', 'captain'], student_id__isnull=True)
        
        for user in users:
            try:
                # Try to get student profile
                student = Student.objects.get(id=user.related_profile_id)
                # Extract roll number from SSC data
                ssc_roll = student.rollNumber  # SSC Board Roll
                if ssc_roll:
                    user.student_id = f"SIPI-{ssc_roll}"
                    user.save()
                    self.stdout.write(f"✓ Updated {user.email}: {user.student_id}")
            except Student.DoesNotExist:
                self.stdout.write(f"✗ No student profile for {user.email}")
            except Exception as e:
                self.stdout.write(f"✗ Error for {user.email}: {str(e)}")
```

Run with:
```bash
python manage.py populate_student_ids
```

## Verification

After completing the migration, verify the system:

1. **Check Database Fields**:
   ```bash
   python manage.py dbshell
   # PostgreSQL: \d auth_user
   # MySQL: DESCRIBE auth_user;
   ```
   Look for `student_id` column

2. **Run Test Script**:
   ```bash
   python test_ssc_roll_system.py
   ```

3. **Test Registration Flow**:
   - Register a new student with SSC Board Roll
   - Verify Student ID is generated
   - Check database record

4. **Test Admission Flow**:
   - Submit admission application
   - Verify Application ID
   - Approve admission
   - Check roll number is auto-generated

## Success Criteria

✓ Migrations applied without errors
✓ Test script passes all checks
✓ Student registration includes SSC Board Roll field
✓ Student ID is auto-generated as `SIPI-{roll}`
✓ Admission approval works without manual roll entry
✓ Roll numbers match Student IDs
