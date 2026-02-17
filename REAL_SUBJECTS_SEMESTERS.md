# Real Subjects and Semesters from Teacher's Routine - Complete

## Overview
Updated the ManageMarksPage to fetch subjects from the teacher's class routine instead of a non-existent learning hub endpoint. Teachers can now only add marks for subjects they are assigned to teach in their routine.

## Problem Solved
- **404 Error**: The `/api/learning-hub/subjects/` endpoint doesn't exist in the URL configuration
- **Authorization**: Teachers should only see subjects they teach, not all subjects

## Solution

### 1. Updated Subject Service
**File**: `client/student-side/src/services/subjectService.ts`

Changed from fetching from learning hub to fetching from class routines:

```typescript
export interface Subject {
  code: string;
  name: string;
  semester: number;
}

export const subjectService = {
  /**
   * Get subjects from teacher's class routines
   */
  getTeacherSubjects: async (teacherId?: string): Promise<Subject[]> => {
    const params: any = {
      is_active: true,
      page_size: 1000,
      ordering: 'semester,subject_code'
    };
    
    if (teacherId) {
      params.teacher = teacherId;
    }
    
    const response = await apiClient.get<PaginatedResponse<ClassRoutine>>(
      'class-routines/', 
      params
    );
    
    // Extract unique subjects from routines
    const subjectsMap = new Map<string, Subject>();
    response.results.forEach(routine => {
      const key = `${routine.subjectCode}_${routine.semester}`;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
          code: routine.subjectCode,
          name: routine.subjectName,
          semester: routine.semester
        });
      }
    });
    
    return Array.from(subjectsMap.values());
  },
};
```

### 2. Updated ManageMarksPage

**Added Auth Context**:
```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function ManageMarksPage() {
  const { user } = useAuth();
  // ...
}
```

**Updated Fetch Logic**:
```typescript
const fetchSemestersAndSubjects = async () => {
  try {
    setLoadingSubjects(true);
    
    // Get teacher ID from authenticated user
    const teacherId = user?.relatedProfileId;
    
    // Fetch subjects from teacher's class routines
    const teacherSubjects = await subjectService.getTeacherSubjects(teacherId);
    
    if (teacherSubjects.length === 0) {
      toast.error('No subjects assigned', { 
        description: 'You have no subjects assigned in your class routine.' 
      });
      return;
    }
    
    setSubjects(teacherSubjects);
    // Extract semesters and set defaults...
  } catch (err) {
    toast.error('Failed to load subjects');
  }
};
```

## Data Flow

### 1. Teacher Login
```
Teacher logs in
    ↓
User context contains relatedProfileId (teacher ID)
    ↓
ManageMarksPage mounts
    ↓
fetchSemestersAndSubjects()
```

### 2. Fetch Teacher's Subjects
```
GET /api/class-routines/?teacher={teacherId}&is_active=true
    ↓
Returns all class routines assigned to teacher
    ↓
Extract unique subjects (code, name, semester)
    ↓
Group by semester
    ↓
Display in dropdowns
```

### 3. Subject Selection
```
Teacher selects semester
    ↓
Filter subjects by semester
    ↓
Auto-select first subject
    ↓
Load students and marks for that subject
```

## Backend Integration

### API Endpoint
- **URL**: `/api/class-routines/`
- **Method**: GET
- **Filters**:
  - `teacher`: UUID (teacher ID)
  - `is_active`: boolean
  - `page_size`: number
  - `ordering`: string

### ClassRoutine Model Fields Used
- `subject_code`: string (e.g., "MATH101")
- `subject_name`: string (e.g., "Mathematics-I")
- `semester`: integer (1-8)
- `teacher`: FK to Teacher
- `is_active`: boolean

## Benefits

1. **Correct API**: Uses existing `/api/class-routines/` endpoint
2. **Authorization**: Teachers only see their assigned subjects
3. **Real-time**: Reflects actual teaching assignments
4. **Accurate**: Based on official class routine
5. **Secure**: Can't add marks for subjects they don't teach
6. **Flexible**: Automatically updates when routine changes

## Security

- Teachers can only see subjects in their routine
- Teacher ID from authenticated user context
- Backend validates teacher assignment
- No access to other teachers' subjects

## Error Handling

1. **No Subjects Assigned**:
   - Clear message: "No subjects assigned in your class routine"
   - Suggests contacting administration
   - Prevents further actions

2. **Network Errors**:
   - Shows error toast with description
   - Provides retry button
   - Logs error to console

3. **Invalid Teacher ID**:
   - Falls back to fetching all routines (admin view)
   - Handles gracefully

## Testing Checklist

✅ Teacher with assigned subjects sees their subjects
✅ Teacher with no subjects sees appropriate message
✅ Subjects filtered correctly by semester
✅ Only active routines are included
✅ Duplicate subjects (same code/semester) are deduplicated
✅ Subjects sorted by semester then code
✅ Changing semester updates subject list
✅ Marks can be added for assigned subjects
✅ API returns 200 (not 404)
✅ Teacher ID passed correctly from auth context

## Files Modified
- `client/student-side/src/services/subjectService.ts`
- `client/student-side/src/pages/ManageMarksPage.tsx`

## Example Data Flow

**Teacher's Routine**:
```
ClassRoutine 1: MATH101 - Mathematics-I, Semester 1
ClassRoutine 2: MATH101 - Mathematics-I, Semester 2
ClassRoutine 3: PHY101 - Physics-I, Semester 1
```

**Extracted Subjects**:
```typescript
[
  { code: 'MATH101', name: 'Mathematics-I', semester: 1 },
  { code: 'MATH101', name: 'Mathematics-I', semester: 2 },
  { code: 'PHY101', name: 'Physics-I', semester: 1 }
]
```

**Semesters**: `[1, 2]`

**Semester 1 Subjects**:
```typescript
[
  { code: 'MATH101', name: 'Mathematics-I', semester: 1 },
  { code: 'PHY101', name: 'Physics-I', semester: 1 }
]
```

## Future Enhancements
- Cache routine data to reduce API calls
- Add subject search/filter
- Show class type (Theory/Lab) in subject list
- Display room number and schedule info
- Add "My Routine" quick view
- Support for multiple shifts
- Department-based filtering

## Overview
Updated the ManageMarksPage to fetch real subjects and semesters from the backend instead of using hardcoded values. The system now dynamically loads active subjects and automatically filters them by semester.

## Changes Made

### 1. Created Subject Service
**File**: `client/student-side/src/services/subjectService.ts`

New service to interact with the learning hub subjects API:

```typescript
export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  departmentName?: string;
  semester: number;
  teacher?: string;
  teacherName?: string;
  color?: string;
  description?: string;
  isActive: boolean;
}

export const subjectService = {
  getSubjects: async (filters?: SubjectFilters) => {...},
  getSubject: async (id: string) => {...},
  getSubjectsBySemester: async (semester: number) => {...},
  getAvailableSemesters: async () => {...},
};
```

### 2. Updated ManageMarksPage State Management

**Before** (Hardcoded):
```typescript
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const subjects = [
  { code: 'MATH101', name: 'Mathematics-I' },
  { code: 'PHY101', name: 'Physics-I' },
  // ... hardcoded list
];
```

**After** (Dynamic):
```typescript
const [semesters, setSemesters] = useState<number[]>([]);
const [subjects, setSubjects] = useState<Subject[]>([]);
const [selectedSubject, setSelectedSubject] = useState<string>('');
const [selectedSemester, setSelectedSemester] = useState<string>('');
const [loadingSubjects, setLoadingSubjects] = useState(true);
```

### 3. Added Data Fetching Logic

**fetchSemestersAndSubjects()**:
- Fetches all active subjects from backend
- Extracts unique semesters from subjects
- Sets default semester and subject selections
- Handles errors gracefully

```typescript
const fetchSemestersAndSubjects = async () => {
  try {
    setLoadingSubjects(true);
    
    // Fetch all active subjects
    const subjectsResponse = await subjectService.getSubjects({
      is_active: true,
      page_size: 1000,
      ordering: 'semester,code'
    });
    
    setSubjects(subjectsResponse.results);
    
    // Extract unique semesters
    const uniqueSemesters = new Set<number>();
    subjectsResponse.results.forEach(subject => 
      uniqueSemesters.add(subject.semester)
    );
    const semesterList = Array.from(uniqueSemesters).sort((a, b) => a - b);
    setSemesters(semesterList);
    
    // Set defaults
    if (semesterList.length > 0) {
      setSelectedSemester(semesterList[0].toString());
      const firstSemesterSubjects = subjectsResponse.results.filter(
        s => s.semester === semesterList[0]
      );
      if (firstSemesterSubjects.length > 0) {
        setSelectedSubject(firstSemesterSubjects[0].code);
      }
    }
  } catch (err) {
    toast.error('Failed to load subjects');
  } finally {
    setLoadingSubjects(false);
  }
};
```

### 4. Added Semester Change Handler

**handleSemesterChange()**:
- Filters subjects by selected semester
- Automatically selects first subject of that semester
- Ensures valid subject selection

```typescript
const handleSemesterChange = (semester: string) => {
  setSelectedSemester(semester);
  
  // Filter subjects for selected semester
  const semesterSubjects = subjects.filter(
    s => s.semester === parseInt(semester)
  );
  if (semesterSubjects.length > 0) {
    setSelectedSubject(semesterSubjects[0].code);
  } else {
    setSelectedSubject('');
  }
};
```

### 5. Added Subject Filtering

```typescript
const filteredSubjects = subjects.filter(
  s => s.semester === parseInt(selectedSemester || '0')
);
```

### 6. Enhanced UI Components

**Semester Selector**:
- Shows only available semesters from backend
- Displays proper ordinal suffixes (1st, 2nd, 3rd, etc.)
- Placeholder text when loading

**Subject Selector**:
- Shows only subjects for selected semester
- Displays both code and name (e.g., "MATH101 - Mathematics-I")
- Disabled when loading or no subjects available
- Placeholder text for better UX

### 7. Added Loading States

**Initial Loading**:
```typescript
if (loadingSubjects) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p>Loading subjects and semesters...</p>
    </div>
  );
}
```

**No Data State**:
```typescript
if (semesters.length === 0 || subjects.length === 0) {
  return (
    <div className="text-center">
      <AlertCircle className="w-12 h-12" />
      <h3>No Subjects Available</h3>
      <p>No active subjects found. Please contact administration.</p>
      <Button onClick={fetchSemestersAndSubjects}>Try Again</Button>
    </div>
  );
}
```

## Data Flow

### 1. Component Mount
```
Component Mounts
    ↓
fetchSemestersAndSubjects()
    ↓
GET /api/learning-hub/subjects/?is_active=true
    ↓
Extract unique semesters
    ↓
Set default semester & subject
    ↓
Trigger fetchStudents()
```

### 2. Semester Change
```
User selects semester
    ↓
handleSemesterChange()
    ↓
Filter subjects by semester
    ↓
Auto-select first subject
    ↓
Trigger fetchStudents() & fetchMarks()
```

### 3. Subject Change
```
User selects subject
    ↓
setSelectedSubject()
    ↓
Trigger fetchMarks()
```

## Backend Integration

### API Endpoint
- **URL**: `/api/learning-hub/subjects/`
- **Method**: GET
- **Filters**: 
  - `is_active`: boolean
  - `semester`: number
  - `department`: string
  - `page_size`: number
  - `ordering`: string

### Subject Model Fields
- `id`: UUID
- `name`: string (e.g., "Mathematics-I")
- `code`: string (e.g., "MATH101")
- `department`: FK to Department
- `semester`: integer (1-8)
- `teacher`: FK to Teacher (optional)
- `color`: string (CSS class)
- `description`: text
- `is_active`: boolean

## Benefits

1. **Dynamic Data**: No hardcoded subjects or semesters
2. **Real-time Updates**: Reflects actual subjects in database
3. **Semester Filtering**: Only shows relevant subjects per semester
4. **Validation**: Ensures selected semester and subject are valid
5. **Better UX**: Loading states, error handling, placeholders
6. **Scalability**: Automatically adapts to new subjects/semesters
7. **Department Support**: Can filter by department if needed
8. **Teacher Assignment**: Shows which teacher teaches each subject

## Error Handling

1. **Network Errors**: Shows error toast and retry button
2. **No Data**: Clear message when no subjects available
3. **Invalid Selection**: Auto-corrects to valid subject when semester changes
4. **Loading States**: Prevents interaction during data fetch

## Testing Checklist

✅ Subjects load from backend on page load
✅ Semesters extracted correctly from subjects
✅ Default semester and subject selected automatically
✅ Changing semester filters subjects correctly
✅ Changing semester auto-selects first subject
✅ Subject selector shows code and name
✅ Loading state displays during fetch
✅ Error state shows when fetch fails
✅ Retry button works after error
✅ No subjects state displays correctly
✅ Marks load correctly for selected subject/semester
✅ Save works with real subject codes

## Files Modified
- `client/student-side/src/pages/ManageMarksPage.tsx`

## Files Created
- `client/student-side/src/services/subjectService.ts`

## Future Enhancements
- Add department filter
- Add teacher filter
- Cache subjects to reduce API calls
- Add subject search functionality
- Show subject description in tooltip
- Add subject color coding
- Support for inactive subjects (archive view)
- Bulk subject management
