# Shift Assignment System

## Overview
The shift assignment system controls which teachers are available for specific time slots in the class routine. This ensures that only teachers with permission for a particular shift can be assigned to classes during that shift.

## How It Works

### 1. Teacher Shift Assignment
- Navigate to **Teachers** → Select a teacher → Go to **Assignments** tab
- You'll see two shift options:
  - **Morning Shift** (8:00 AM - 12:00 PM) - Amber/Orange toggle
  - **Day Shift** (12:00 PM - 5:00 PM) - Blue toggle

### 2. Shift Permissions
- **No shifts assigned**: Teacher won't appear in any class routine teacher selection
- **Morning shift only**: Teacher only appears when adding morning shift classes
- **Day shift only**: Teacher only appears when adding day shift classes
- **Both shifts assigned**: Teacher can be assigned to any shift

### 3. Class Routine Integration
When adding a class slot in the class routine:
1. Select the shift (Morning/Day)
2. The teacher dropdown will **only show teachers** who have that shift enabled
3. This prevents scheduling conflicts and ensures teachers are only assigned to their available shifts

## Database Changes
- Added `shifts` field to Teacher model (JSONField storing array of shift names)
- Migration file: `server/apps/teachers/migrations/0002_add_shifts_field.py`
- Updated serializers to include shifts in create/update operations

## API Usage
```python
# Update teacher shifts
PUT /api/teachers/{id}/
{
  "shifts": ["morning", "day"]  # Both shifts
}

# Or single shift
{
  "shifts": ["morning"]  # Morning only
}

# Remove all shifts
{
  "shifts": []  # No shifts
}
```

## Frontend Implementation
- Toggle switches with color coding (amber for morning, blue for day)
- Real-time updates with toast notifications
- Disabled state during save operations
- Visual summary showing currently assigned shifts

## Benefits
1. **Prevents scheduling conflicts**: Teachers can't be assigned to shifts they're not available for
2. **Better organization**: Clear visibility of teacher availability
3. **Flexible assignment**: Teachers can work single or multiple shifts
4. **Automatic filtering**: Class routine only shows relevant teachers
