# Manage Marks Page Filter Update

## Summary
Updated the student-side Manage Marks page filter section to show only Subject and Semester options, with automatic department selection and shift filtering based on teacher permissions.

## Changes Made

### 1. Filter Options
- **Semester**: Select semester (1st, 2nd, 3rd, etc.)
- **Subject**: Select subject from teacher's assigned subjects in the selected semester
- **Shift**: Select shift (only shown if teacher has shift permissions assigned)
  - Filtered based on teacher's assigned shifts from admin-side teacher profile
  - Shows all available shifts if teacher has no specific shift restrictions
- **Department**: Automatically selected from the first subject's class routine (no manual selection needed)

### 2. State Management
Added new state variables:
```typescript
const [selectedShift, setSelectedShift] = useState<string>('');
const [availableShifts, setAvailableShifts] = useState<string[]>([]);
const [teacherShifts, setTeacherShifts] = useState<string[]>([]);
```

### 3. Data Fetching Logic

#### fetchSemestersAndSubjects()
- Fetches teacher profile to get assigned shifts
- Fetches class routines to get subjects and available shifts
- Filters available shifts based on teacher's assigned shifts (if any)
- Auto-selects first semester, subject, and shift

#### fetchStudents()
- Fetches all routines for teacher, semester, and shift
- Filters routines by subject code on client-side (since API doesn't support subject_code filter)
- Gets department automatically from the matching routine
- Filters students by:
  - Semester
  - Department (auto-selected)
  - Shift (selected by teacher)
  - Status: active

### 4. UI Updates

#### Filter Section
- Shows Semester, Subject, and Shift (conditionally) dropdowns
- Shift dropdown includes a note "(Based on permissions)" when teacher has specific shifts assigned
- Search box for filtering students by name or roll number

#### Current Selection Info
- Displays selected semester, subject, and shift as badges
- Shows student count for current filters

### 5. Dependencies
- Uses existing `teacherService.getTeacher()` to fetch teacher profile with shifts
- Uses `apiClient` to fetch class routines with shift information
- Uses `studentService.getStudents()` with department and shift filters

## How It Works

1. **On Page Load**:
   - Fetches teacher's assigned shifts from their profile
   - Fetches all class routines for the teacher
   - Extracts unique subjects, semesters, and shifts
   - Filters shifts based on teacher's permissions
   - Auto-selects first semester, subject, and shift

2. **When Semester Changes**:
   - Updates available subjects for that semester
   - Auto-selects first subject
   - Maintains shift selection if valid
   - Triggers student fetch

3. **When Subject, Semester, or Shift Changes**:
   - Fetches all class routines for teacher, semester, and shift
   - Filters routines by subject code on client-side
   - Gets department from the matching routine
   - Fetches students filtered by semester, department, and shift

4. **Department Selection**:
   - Automatically determined from the class routine
   - No manual selection needed
   - Ensures students match the teacher's assigned class

## Benefits

1. **Simplified UI**: Removed unnecessary department dropdown
2. **Permission-Based**: Respects teacher's shift assignments from admin
3. **Automatic Filtering**: Department is auto-selected from routine
4. **Accurate Data**: Students shown match the teacher's actual class
5. **Flexible**: Works with or without shift restrictions

## Known Limitations

- The class-routines API doesn't support filtering by `subject_code`, so we fetch all routines for the teacher/semester/shift and filter by subject on the client-side. This is acceptable since teachers typically don't have hundreds of routines.
- Teacher shifts are stored in lowercase (`'morning'`, `'day'`) but the API expects capitalized values (`'Morning'`, `'Day'`). The code handles this conversion automatically.
- The class routine API returns department as a nested object, but the students API expects just the department ID. The code extracts the ID automatically.

## Testing Checklist

- [ ] Teacher with no shift restrictions sees all available shifts
- [ ] Teacher with specific shifts only sees their assigned shifts
- [ ] Department is correctly auto-selected from routine
- [ ] Students are filtered correctly by semester, department, and shift
- [ ] Marks can be entered and saved for filtered students
- [ ] UI shows appropriate badges for current selection
- [ ] Error handling works when no routines are found
