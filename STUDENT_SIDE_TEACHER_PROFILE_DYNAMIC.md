# Student-Side Teacher Profile - Make Dynamic

## Current Status
The `LinkedInTeacherProfile` component (`client/student-side/src/components/profile/LinkedInTeacherProfile.tsx`) is currently using static mock data. It has a comprehensive LinkedIn-style UI but doesn't fetch real data from the backend.

## Component Props
```typescript
interface LinkedInTeacherProfileProps {
  isPublicView?: boolean;  // Currently used to hide/show edit buttons
  teacherId?: string;       // Currently NOT used - needs to fetch data
}
```

## Static Data Structure
The component uses `initialTeacherData` which includes:
- Basic info (name, headline, designation, department, email, phone, etc.)
- About section
- Experience array
- Education array
- Publications array
- Research projects array
- Awards array
- Courses array
- Skills and specializations arrays
- Profile and cover images

## Implementation Plan

### Phase 1: Backend API Endpoints (REQUIRED)

We need to create/update backend endpoints to support the teacher profile data:

1. **Teacher Profile Endpoint** (Already exists)
   - `GET /api/teachers/{id}/` - Returns basic teacher info
   - Need to extend to include additional fields

2. **Teacher Profile Extended Data** (NEW - Need to create)
   - `GET /api/teachers/{id}/profile/` - Returns full profile data including:
     - Experience
     - Education
     - Publications
     - Research
     - Awards
     - Skills
     - Specializations

3. **Update Endpoints** (NEW - Need to create)
   - `PATCH /api/teachers/{id}/profile/` - Update profile sections
   - `POST /api/teachers/{id}/experience/` - Add experience
   - `PUT /api/teachers/{id}/experience/{exp_id}/` - Update experience
   - `DELETE /api/teachers/{id}/experience/{exp_id}/` - Delete experience
   - Similar endpoints for education, publications, research, awards

4. **Photo Upload** (Already exists)
   - `POST /api/teachers/{id}/upload-photo/` - Upload profile photo
   - Need to add cover photo upload

### Phase 2: Frontend Service Layer

Update `client/student-side/src/services/teacherService.ts` to add:

```typescript
// Get full teacher profile
getTeacherProfile: async (id: string): Promise<TeacherProfileData> => {
  return await apiClient.get(`teachers/${id}/profile/`);
}

// Update profile sections
updateTeacherProfile: async (id: string, data: Partial<TeacherProfileData>): Promise<TeacherProfileData> => {
  return await apiClient.patch(`teachers/${id}/profile/`, data);
}

// Experience CRUD
addExperience: async (id: string, exp: Experience): Promise<Experience> => {
  return await apiClient.post(`teachers/${id}/experience/`, exp);
}

updateExperience: async (id: string, expId: string, exp: Experience): Promise<Experience> => {
  return await apiClient.put(`teachers/${id}/experience/${expId}/`, exp);
}

deleteExperience: async (id: string, expId: string): Promise<void> => {
  return await apiClient.delete(`teachers/${id}/experience/${expId}/`);
}

// Similar methods for education, publications, research, awards
```

### Phase 3: Component Updates

Update `LinkedInTeacherProfile.tsx`:

1. **Add State Management**
   ```typescript
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const { user } = useAuth(); // Get current user
   ```

2. **Fetch Data on Mount**
   ```typescript
   useEffect(() => {
     const fetchProfile = async () => {
       try {
         setLoading(true);
         const profileId = teacherId || user?.relatedProfileId;
         if (!profileId) {
           setError('Teacher ID not found');
           return;
         }
         
         const data = await teacherService.getTeacherProfile(profileId);
         setTeacher(data);
       } catch (err) {
         setError(getErrorMessage(err));
       } finally {
         setLoading(false);
       }
     };
     
     fetchProfile();
   }, [teacherId, user]);
   ```

3. **Update Save Handlers to Call API**
   ```typescript
   const handleSaveProfile = async (data: ProfileHeaderData) => {
     try {
       const updated = await teacherService.updateTeacherProfile(teacher.id, data);
       setTeacher(updated);
       toast.success('Profile updated successfully');
     } catch (err) {
       toast.error(getErrorMessage(err));
     }
   };
   
   const handleSaveExperience = async (exp: Experience) => {
     try {
       if (editingExperience) {
         await teacherService.updateExperience(teacher.id, exp.id, exp);
       } else {
         await teacherService.addExperience(teacher.id, exp);
       }
       // Refresh profile
       const updated = await teacherService.getTeacherProfile(teacher.id);
       setTeacher(updated);
       toast.success('Experience saved');
     } catch (err) {
       toast.error(getErrorMessage(err));
     }
   };
   ```

4. **Add Loading and Error States**
   ```typescript
   if (loading) {
     return <LoadingSpinner />;
   }
   
   if (error) {
     return <ErrorMessage error={error} />;
   }
   ```

### Phase 4: Database Schema (Backend)

Need to create new models or extend existing Teacher model:

```python
# In teachers/models.py or create new profile app

class TeacherExperience(models.Model):
    teacher = models.ForeignKey(Teacher, related_name='experiences')
    title = models.CharField(max_length=200)
    institution = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    start_date = models.CharField(max_length=50)
    end_date = models.CharField(max_length=50, blank=True)
    current = models.BooleanField(default=False)
    description = models.TextField()
    order = models.IntegerField(default=0)

class TeacherEducation(models.Model):
    teacher = models.ForeignKey(Teacher, related_name='education')
    degree = models.CharField(max_length=200)
    institution = models.CharField(max_length=200)
    year = models.CharField(max_length=10)
    field = models.CharField(max_length=200)
    order = models.IntegerField(default=0)

class TeacherPublication(models.Model):
    teacher = models.ForeignKey(Teacher, related_name='publications')
    title = models.CharField(max_length=500)
    journal = models.CharField(max_length=200)
    year = models.CharField(max_length=10)
    citations = models.IntegerField(default=0)
    link = models.URLField(blank=True)
    order = models.IntegerField(default=0)

class TeacherResearch(models.Model):
    teacher = models.ForeignKey(Teacher, related_name='research')
    title = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=[('ongoing', 'Ongoing'), ('completed', 'Completed')])
    year = models.CharField(max_length=50)
    description = models.TextField()
    order = models.IntegerField(default=0)

class TeacherAward(models.Model):
    teacher = models.ForeignKey(Teacher, related_name='awards')
    title = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200)
    year = models.CharField(max_length=10)
    order = models.IntegerField(default=0)

# Extend Teacher model
class Teacher(models.Model):
    # ... existing fields ...
    about = models.TextField(blank=True)
    headline = models.CharField(max_length=500, blank=True)
    skills = models.JSONField(default=list)
    specializations = models.JSONField(default=list)
    cover_photo = models.CharField(max_length=500, blank=True)
```

## Implementation Steps

1. ✅ Create backend models for teacher profile data
2. ✅ Create serializers for the new models
3. ✅ Create API endpoints for CRUD operations
4. ✅ Update teacher service on frontend
5. ✅ Update LinkedInTeacherProfile component to fetch data
6. ✅ Update save handlers to call API
7. ✅ Add loading and error states
8. ✅ Test all functionality

## Priority

**HIGH PRIORITY:**
- Basic profile info (name, designation, email, etc.) - Already working
- About section
- Contact information

**MEDIUM PRIORITY:**
- Experience
- Education
- Skills and specializations

**LOW PRIORITY:**
- Publications
- Research projects
- Awards
- Cover photo upload

## Notes

- The component is well-structured and ready for dynamic data
- Most of the UI is already built
- Main work is backend API creation and connecting frontend to it
- Consider using React Query or SWR for better data fetching/caching
- Add optimistic updates for better UX
- Consider pagination for large lists (publications, research, etc.)

## Estimated Effort

- Backend models and endpoints: 4-6 hours
- Frontend service layer: 1-2 hours
- Component updates: 2-3 hours
- Testing and bug fixes: 2-3 hours
- **Total: 9-14 hours**

## Current Blockers

1. Backend endpoints don't exist yet for extended profile data
2. Database schema needs to be extended
3. Need to decide on data structure for complex fields (experience, education, etc.)

## Recommendation

Start with Phase 1 (Backend) as it's the foundation. Once backend is ready, frontend updates will be straightforward since the UI is already built.
