# Teacher Profile Page - Dynamic Data Implementation

## Current Status Analysis

The Teacher Profile page (`client/admin-side/src/pages/TeacherProfile.tsx`) is already mostly dynamic with backend integration. Here's what's currently implemented:

### Already Dynamic ✅
1. **Basic Information**
   - Full name (English & Bangla)
   - Teacher ID
   - Designation
   - Department
   - Employment status
   - Profile photo

2. **Contact Information**
   - Email
   - Mobile number
   - Office location (editable)
   - Room number (editable)

3. **Assignment Information**
   - Assigned subjects/classes
   - Department assignment (editable)
   - Shift assignment (editable with toggle switches)

4. **Access Control**
   - Account status
   - User role
   - Account created date
   - Last updated date
   - System permissions

5. **Job Information**
   - Joining date
   - Years of service (calculated)
   - Employment type
   - Contract status
   - Qualifications
   - Specializations

### Currently Static (Needs Backend) ❌

1. **Attendance Statistics Tab**
   - Average class attendance: Hardcoded as "85%"
   - Classes conducted: Hardcoded as "124"
   - Student satisfaction: Hardcoded as "4.5/5"

2. **System Permissions**
   - Permission badges are hardcoded
   - Should be fetched from user role/permissions

## Recommendations for Full Dynamic Implementation

### 1. Attendance Statistics
Need to create/use backend endpoints to fetch:
- Teacher's class attendance records
- Calculate average attendance across all classes
- Count total classes conducted
- Fetch student feedback/ratings

**Backend Requirements:**
```python
# In teacher viewset or separate endpoint
@action(detail=True, methods=['get'])
def attendance_stats(self, request, pk=None):
    teacher = self.get_object()
    # Calculate stats from attendance records
    return Response({
        'average_attendance': 85.5,
        'classes_conducted': 124,
        'student_satisfaction': 4.5,
        'total_students': 450
    })
```

### 2. System Permissions
Should be based on user role and permissions from backend:
```python
# Return permissions with teacher data
{
    'permissions': [
        {'name': 'mark_attendance', 'granted': True},
        {'name': 'view_student_records', 'granted': True},
        {'name': 'submit_marks', 'granted': True},
        {'name': 'manage_class_routine', 'granted': False}
    ]
}
```

### 3. Class Routine Integration
Currently shows "Manage Classes" button but doesn't show actual class routine:
- Fetch teacher's class routine from backend
- Display schedule with days and times
- Show which classes are assigned

## Implementation Priority

### High Priority
1. ✅ Basic teacher information (Already done)
2. ✅ Contact information with edit capability (Already done)
3. ✅ Department and shift assignment (Already done)
4. ❌ Attendance statistics (Needs backend endpoint)

### Medium Priority
5. ❌ Dynamic permissions based on role
6. ❌ Class routine display
7. ❌ Student feedback/ratings

### Low Priority
8. Profile photo upload
9. Bulk edit capabilities
10. Export teacher report

## Current Backend Integration

The page uses:
- `teacherService.getTeacher(id)` - Fetches teacher data
- `teacherService.updateTeacher(id, data)` - Updates teacher info
- `settingsService.getSettings()` - Fetches institute settings
- Department service for department list

## Next Steps

To make the page fully dynamic:

1. **Create Attendance Stats Endpoint**
   ```typescript
   // In teacherService.ts
   getTeacherStats: async (id: string): Promise<TeacherStats> => {
     return await apiClient.get(`teachers/${id}/stats/`);
   }
   ```

2. **Update Frontend to Fetch Stats**
   ```typescript
   const [stats, setStats] = useState<TeacherStats | null>(null);
   
   useEffect(() => {
     if (id) {
       fetchTeacherStats();
     }
   }, [id]);
   
   const fetchTeacherStats = async () => {
     const statsData = await teacherService.getTeacherStats(id);
     setStats(statsData);
   };
   ```

3. **Replace Hardcoded Values**
   ```typescript
   <p className="text-2xl font-bold">{stats?.average_attendance || 0}%</p>
   <p className="text-2xl font-bold">{stats?.classes_conducted || 0}</p>
   <p className="text-2xl font-bold">{stats?.student_satisfaction || 0}/5</p>
   ```

## Conclusion

The Teacher Profile page is already well-implemented with most data being dynamic. The main areas that need backend integration are:
1. Attendance statistics
2. Dynamic permissions
3. Class routine display

All other features are already connected to the backend and working dynamically.
