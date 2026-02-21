# Manage Marks Save Fix

## Issue
Student marks and field saving was not working properly in the student-side teacher section manage-marks page. The root cause was a mismatch between the field naming conventions used by the frontend (camelCase) and the backend API (snake_case).

## Additional Issues Fixed
1. **NaN% and incorrect total display**: After saving, percentage showed "NaN%" and total showed concatenated values like "09.00000023.00"
2. **Deleted columns reappearing**: When columns were deleted, they would reappear after page refresh
3. **Column order not maintained**: After saving, column positions would change randomly

## Root Causes

### Issue 1: Field Naming Mismatch
1. The backend Django API expects snake_case field names:
   - `subject_code`, `subject_name`, `marks_obtained`, `total_marks`, `exam_type`

2. The frontend was sending camelCase field names:
   - `subjectCode`, `subjectName`, `marksObtained`, `totalMarks`, `examType`

3. The API client does not automatically convert between naming conventions

### Issue 2: Number Parsing
- The `marks_obtained` field from the API is a Decimal field that was being treated as a string
- This caused string concatenation instead of numeric addition (e.g., "9" + "23" = "923" instead of 32)
- The percentage calculation was dividing by 0 or getting NaN due to improper parsing

### Issue 3: Column Persistence
- Columns were hardcoded in the component state initialization
- They reset to default values on every page refresh
- Deleted columns weren't actually deleted from the database, so they reappeared when data was reloaded

### Issue 4: Column Ordering
- Columns were ordered based on the order they appeared in the database query results
- This order was inconsistent and would change after saving
- No consistent ordering strategy was applied

## Changes Made

### 1. Updated MarksRecord Interface (`client/student-side/src/services/marksService.ts`)
Changed from camelCase to snake_case to match API response:
```typescript
export interface MarksRecord {
  id: string;
  student: string;
  student_name?: string;      // was: studentName
  student_roll?: string;       // was: studentRoll
  subject_code: string;        // was: subjectCode
  subject_name: string;        // was: subjectName
  semester: number;
  exam_type: ExamType;         // was: examType
  marks_obtained: number;      // was: marksObtained
  total_marks: number;         // was: totalMarks
  percentage?: number;
  recorded_by?: string;        // was: recordedBy
  recorded_by_name?: string;   // was: recordedByName
  recorded_at?: string;        // was: recordedAt
  remarks?: string;
}
```

### 2. Updated MarksCreateData Interface (`client/student-side/src/services/marksService.ts`)
Changed to snake_case for API requests:
```typescript
export interface MarksCreateData {
  student: string;
  subject_code: string;        // was: subjectCode
  subject_name: string;        // was: subjectName
  semester: number;
  exam_type: ExamType;         // was: examType
  marks_obtained: number;      // was: marksObtained
  total_marks: number;         // was: totalMarks
  recorded_by?: string;        // was: recordedBy
  remarks?: string;
}
```

### 3. Updated handleSaveAll Function (`client/student-side/src/pages/ManageMarksPage.tsx`)
Changed field names in save operations:
- `subjectCode` → `subject_code`
- `subjectName` → `subject_name`
- `examType` → `exam_type`
- `marksObtained` → `marks_obtained`
- `totalMarks` → `total_marks`

### 4. Updated fetchMarks Function (`client/student-side/src/pages/ManageMarksPage.tsx`)
Major improvements:
- **Dynamic column loading**: Columns are now built from the database marks records instead of hardcoded
- **Proper number parsing**: Added `Number()` conversion for `marks_obtained` to prevent string concatenation
- **Column persistence**: Columns are loaded from actual database data, so deleted columns stay deleted
- **Consistent ordering**: Columns are sorted by exam type priority (quiz → assignment → practical → midterm → final), then alphabetically by name
- Changed field access to use snake_case: `m.exam_type`, `m.marks_obtained`, `m.total_marks`

```typescript
// Define exam type priority for consistent ordering
const examTypePriority: Record<string, number> = {
  'quiz': 1,
  'assignment': 2,
  'practical': 3,
  'midterm': 4,
  'final': 5
};

// Build columns dynamically from marks data
const columnsMap = new Map<string, MarkColumn>();
allMarks.forEach(mark => {
  const columnKey = `${mark.exam_type}_${mark.remarks || 'default'}`;
  if (!columnsMap.has(columnKey)) {
    columnsMap.set(columnKey, {
      id: columnKey,
      name: mark.remarks || mark.exam_type,
      maxMarks: Number(mark.total_marks) || 0,
      examType: mark.exam_type,
      order: 0
    });
  }
});

// Sort by exam type priority, then by name
const dynamicColumns = Array.from(columnsMap.values()).sort((a, b) => {
  const aPriority = examTypePriority[a.examType] || 99;
  const bPriority = examTypePriority[b.examType] || 99;
  
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }
  
  return a.name.localeCompare(b.name);
}).map((col, index) => ({
  ...col,
  order: index + 1
}));

// Parse marks as numbers to avoid concatenation
const marksValue = Number(matchingMark.marks_obtained);
customMarks[col.id] = isNaN(marksValue) ? null : marksValue;
```

### 5. Updated handleDeleteColumn Function (`client/student-side/src/pages/ManageMarksPage.tsx`)
Now actually deletes marks from the database:
```typescript
const handleDeleteColumn = async (columnId: string) => {
  // Delete all marks records for this column from the database
  const marksToDelete: string[] = [];
  students.forEach(student => {
    const markRecord = (student.marksRecords as any)[columnId];
    if (markRecord?.id) {
      marksToDelete.push(markRecord.id);
    }
  });
  
  if (marksToDelete.length > 0) {
    await Promise.all(marksToDelete.map(id => marksService.deleteMarks(id)));
  }
  // ... update local state
};
```

### 6. Updated Display Formatting (`client/student-side/src/pages/ManageMarksPage.tsx`)
Added proper number formatting and NaN handling:
```typescript
// Total display
<span className="font-bold text-base text-primary">
  {Number(student.total).toFixed(2)}
</span>

// Percentage display with NaN check
<span className={`font-semibold ${student.percentage >= 40 ? 'text-emerald-600' : 'text-red-600'}`}>
  {isNaN(student.percentage) ? '0.00' : Number(student.percentage).toFixed(2)}%
</span>
```

### 7. Updated Column State Initialization (`client/student-side/src/pages/ManageMarksPage.tsx`)
Changed from hardcoded to empty array (populated dynamically):
```typescript
// Before: Hardcoded columns
const [markColumns, setMarkColumns] = useState<MarkColumn[]>([
  { id: 'ct1', name: 'CT-1', maxMarks: 20, examType: 'quiz', order: 1 },
  // ... more hardcoded columns
]);

// After: Empty, populated from database
const [markColumns, setMarkColumns] = useState<MarkColumn[]>([]);
```

### 8. Updated ProfilePage (`client/student-side/src/pages/ProfilePage.tsx`)
Changed marks field access to use snake_case first:
- `m.subjectCode || m.subjectName` → `m.subject_code || m.subject_name`

## Testing Recommendations
1. Test creating new marks records - verify numbers display correctly
2. Test updating existing marks records - verify totals calculate properly
3. Test saving marks with different column types (quiz, assignment, practical, etc.)
4. Test bulk editing marks - ensure no string concatenation
5. Verify marks display correctly after saving - no NaN or concatenated values
6. Test with multiple students and multiple columns
7. **Test deleting columns** - verify they don't reappear after refresh
8. **Test adding custom columns** - verify they persist after refresh
9. Test percentage calculations with various mark combinations
10. Test with zero marks and empty fields

## Notes
- The MarksPage.tsx already had a helper function `getField()` that handles both camelCase and snake_case, so it didn't need updates
- All TypeScript diagnostics pass with no errors
- The changes maintain backward compatibility by checking for both naming conventions where needed
- Default columns are still provided if no marks exist yet in the database
- Column deletion now properly removes marks from the database, preventing them from reappearing


### 9. Updated handleAddColumn Function (`client/student-side/src/pages/ManageMarksPage.tsx`)
Now maintains consistent ordering when adding new columns:
```typescript
const handleAddColumn = () => {
  // Create new column with consistent ID format
  const newColumn: MarkColumn = {
    id: `${newColumnType}_${newColumnName.trim().replace(/\s+/g, '_').toLowerCase()}`,
    name: newColumnName.trim(),
    maxMarks: parseInt(newColumnMax),
    examType: newColumnType,
    order: 0
  };
  
  // Add and re-sort all columns by exam type priority
  const updatedColumns = [...markColumns, newColumn].sort((a, b) => {
    const aPriority = examTypePriority[a.examType] || 99;
    const bPriority = examTypePriority[b.examType] || 99;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return a.name.localeCompare(b.name);
  }).map((col, index) => ({
    ...col,
    order: index + 1
  }));
  
  setMarkColumns(updatedColumns);
};
```

### 10. Updated handleUpdateColumn Function (`client/student-side/src/pages/ManageMarksPage.tsx`)
Re-sorts columns after updates to maintain order:
```typescript
const handleUpdateColumn = () => {
  // Update column and re-sort if exam type changed
  const updatedColumns = markColumns.map(col => 
    col.id === editingColumn.id 
      ? { ...col, name: newColumnName.trim(), maxMarks: parseInt(newColumnMax), examType: newColumnType }
      : col
  ).sort((a, b) => {
    // Same sorting logic as above
  }).map((col, index) => ({
    ...col,
    order: index + 1
  }));
  
  setMarkColumns(updatedColumns);
};
```

## Column Ordering Strategy
Columns are now consistently ordered by:
1. **Exam Type Priority**: quiz (1) → assignment (2) → practical (3) → midterm (4) → final (5)
2. **Alphabetical by Name**: Within the same exam type, columns are sorted alphabetically

This ensures that:
- Quiz columns always appear first
- Final exam columns always appear last
- Multiple columns of the same type are sorted alphabetically
- The order remains consistent across page refreshes and after saving
