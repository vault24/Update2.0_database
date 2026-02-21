# Server Restart Required

## Issue
The `shifts` field has been added to the Teacher model, but the Django server needs to be restarted to recognize this new field.

## Solution

### Step 1: Stop the Django Server
If your Django server is running, stop it by pressing `Ctrl+C` in the terminal where it's running.

### Step 2: Verify Migration
```bash
cd server
python manage.py showmigrations teachers
```

You should see:
```
teachers
 [X] 0001_initial
 [X] 0002_add_shifts_field
```

### Step 3: Restart the Server
```bash
python manage.py runserver
```

### Step 4: Test the Shift Toggle
1. Go to the admin panel
2. Navigate to a teacher's profile
3. Go to the "Assignments" tab
4. Try toggling the Morning or Day shift
5. You should see a success message

## Troubleshooting

### If you still get 400 errors:

1. **Check the server console** for detailed error messages
2. **Verify the field exists**:
   ```bash
   python manage.py shell
   >>> from apps.teachers.models import Teacher
   >>> Teacher._meta.get_field('shifts')
   <django.db.models.fields.json.JSONField: shifts>
   ```

3. **Check a teacher record**:
   ```bash
   python manage.py shell
   >>> from apps.teachers.models import Teacher
   >>> t = Teacher.objects.first()
   >>> print(t.shifts)
   []
   >>> t.shifts = ['morning']
   >>> t.save()
   >>> print(t.shifts)
   ['morning']
   ```

### If the field doesn't exist:
```bash
python manage.py makemigrations teachers
python manage.py migrate teachers
```

## Expected Behavior After Restart

- Toggle switches should work smoothly
- Success toast notification appears
- Shifts are saved to the database
- The "Currently Assigned" section updates immediately
- No 400 errors in the console

## API Endpoint
```
PUT /api/teachers/{teacher_id}/
Content-Type: application/json

{
  "shifts": ["morning", "day"]
}
```

Response: 200 OK with updated teacher data including shifts field
