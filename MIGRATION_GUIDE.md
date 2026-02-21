# Database Migration Guide - Teacher Profile

## Steps to Apply Changes

### 1. Create Migrations

```bash
cd server
python manage.py makemigrations teachers
```

This will create a new migration file for the teacher profile models.

### 2. Review Migration

Check the generated migration file in `server/apps/teachers/migrations/` to ensure it includes:
- New fields added to Teacher model (headline, about, skills, coverPhoto, user)
- New tables: teacher_experiences, teacher_education, teacher_publications, teacher_research, teacher_awards

### 3. Apply Migrations

```bash
python manage.py migrate teachers
```

This will create the new database tables and add new columns to the existing teachers table.

### 4. Verify in Django Admin

```bash
python manage.py runserver
```

Navigate to `/admin` and verify:
- Teacher model shows new fields
- New models appear in admin (TeacherExperience, TeacherEducation, etc.)

### 5. Create Sample Data (Optional)

You can create sample profile data through Django admin or Django shell:

```python
python manage.py shell

from apps.teachers.models import Teacher, TeacherExperience, TeacherEducation
from apps.departments.models import Department

# Get a teacher
teacher = Teacher.objects.first()

# Update profile fields
teacher.headline = "Senior Lecturer in Computer Science"
teacher.about = "Passionate educator with 10 years of experience..."
teacher.skills = ["Python", "Django", "React", "Machine Learning"]
teacher.specializations = ["Artificial Intelligence", "Web Development"]
teacher.save()

# Add experience
TeacherExperience.objects.create(
    teacher=teacher,
    title="Senior Lecturer",
    institution="Sylhet Polytechnic Institute",
    location="Sylhet, Bangladesh",
    startDate="Jan 2020",
    current=True,
    description="Teaching undergraduate courses in Computer Science.",
    order=0
)

# Add education
TeacherEducation.objects.create(
    teacher=teacher,
    degree="Ph.D. in Computer Science",
    institution="University of Dhaka",
    year="2020",
    field="Artificial Intelligence",
    order=0
)
```

### 6. Test Frontend

1. Start the backend server:
```bash
cd server
python manage.py runserver
```

2. Start the frontend:
```bash
cd client/student-side
npm run dev
```

3. Navigate to teacher profile page and verify:
   - Profile loads with real data
   - Edit buttons work
   - Can add/edit/delete experiences, education, etc.
   - Changes persist after page refresh

## Rollback (If Needed)

If you need to rollback the migration:

```bash
# Find the migration number before the new one
python manage.py showmigrations teachers

# Rollback to previous migration
python manage.py migrate teachers <previous_migration_number>

# Delete the migration file
rm server/apps/teachers/migrations/<new_migration_file>.py
```

## Common Issues

### Issue: Migration conflicts
**Solution**: Run `python manage.py makemigrations --merge` to resolve conflicts

### Issue: Foreign key constraint errors
**Solution**: Ensure all referenced models (Department, User) exist before creating Teacher records

### Issue: JSONField not supported
**Solution**: Ensure you're using PostgreSQL or SQLite 3.9+. For MySQL, you may need to use TextField with JSON serialization.

## Production Deployment

For production deployment:

1. Backup database before migration
2. Run migrations in maintenance mode
3. Test thoroughly in staging environment first
4. Monitor for errors after deployment
5. Have rollback plan ready

```bash
# Backup database
python manage.py dumpdata > backup.json

# Apply migrations
python manage.py migrate

# If issues occur, restore backup
python manage.py loaddata backup.json
```
