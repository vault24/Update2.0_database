# Alumni Student Backend Integration Guide

This guide documents the backend implementation that allows students to manage their own alumni profiles.

## Overview

The alumni system now supports two types of users:
1. **Admin users** - Can view, create, edit, and delete any alumni profile
2. **Student users** - Can view and edit their own alumni profile

## Backend Implementation

### New Endpoints for Students

All student-specific endpoints are prefixed with `/api/alumni/` and use authentication to identify the current user.

#### 1. Get My Profile
```
GET /api/alumni/my-profile/
```
Returns the alumni profile for the authenticated student.

**Response:**
```json
{
  "student": {
    "id": "student-id",
    "fullNameEnglish": "Student Name",
    "email": "student@example.com",
    ...
  },
  "alumniType": "recent",
  "graduationYear": 2024,
  "bio": "Student bio",
  "linkedinUrl": "https://linkedin.com/in/student",
  "portfolioUrl": "https://portfolio.com",
  "skills": [...],
  "highlights": [...],
  "careerHistory": [...]
}
```

#### 2. Update My Profile
```
PATCH /api/alumni/update-my-profile/
```
Updates the authenticated student's alumni profile.

**Request Body:**
```json
{
  "bio": "Updated bio",
  "linkedinUrl": "https://linkedin.com/in/updated",
  "portfolioUrl": "https://updated-portfolio.com",
  "email": "updated@example.com",
  "phone": "+880 1712-345678",
  "location": "Dhaka"
}
```

#### 3. Add Career Position
```
POST /api/alumni/add-my-career/
```
Adds a new career position to the student's profile.

**Request Body:**
```json
{
  "positionType": "job",
  "organizationName": "Company Name",
  "positionTitle": "Software Engineer",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "isCurrent": true,
  "description": "Job description",
  "location": "Dhaka",
  "salary": "50,000 BDT"
}
```

#### 4. Update Career Position
```
PUT /api/alumni/update-my-career/{career_id}/
```
Updates an existing career position.

#### 5. Delete Career Position
```
DELETE /api/alumni/delete-my-career/{career_id}/
```
Deletes a career position.

#### 6. Add Skill
```
POST /api/alumni/add-my-skill/
```
Adds a new skill to the profile.

**Request Body:**
```json
{
  "name": "Python",
  "category": "technical",
  "proficiency": 85
}
```

#### 7. Update Skill
```
PUT /api/alumni/update-my-skill/{skill_id}/
```
Updates an existing skill.

#### 8. Delete Skill
```
DELETE /api/alumni/delete-my-skill/{skill_id}/
```
Deletes a skill.

#### 9. Add Career Highlight
```
POST /api/alumni/add-my-highlight/
```
Adds a new career highlight.

**Request Body:**
```json
{
  "title": "Achievement Title",
  "description": "Achievement description",
  "date": "2024-06-01",
  "type": "achievement"
}
```

#### 10. Update Career Highlight
```
PUT /api/alumni/update-my-highlight/{highlight_id}/
```
Updates an existing highlight.

#### 11. Delete Career Highlight
```
DELETE /api/alumni/delete-my-highlight/{highlight_id}/
```
Deletes a highlight.

## Frontend Integration

### Student-Side Service

The `alumniService.ts` file in the student-side has been updated to connect to the real backend:

```typescript
// Get current user's profile
const profile = await alumniService.getProfile();

// Update profile
await alumniService.updateProfile({
  bio: 'New bio',
  linkedin: 'https://linkedin.com/in/user'
});

// Add career
await alumniService.addCareer({
  type: 'job',
  position: 'Software Engineer',
  company: 'Tech Company',
  ...
});

// Update career
await alumniService.updateCareer(careerData);

// Delete career
await alumniService.deleteCareer(careerId);
```

### Data Transformation

The service includes a `transformBackendToFrontend` function that converts backend data format to the frontend format:

- Maps support categories: `receiving_support` → `needSupport`
- Transforms career history with proper field mapping
- Converts skills, highlights, and other data structures

## Admin-Side Integration

The admin-side continues to use the existing endpoints:

```
GET /api/alumni/              - List all alumni
GET /api/alumni/{id}/         - Get specific alumni
POST /api/alumni/             - Create alumni
PATCH /api/alumni/{id}/       - Update alumni
DELETE /api/alumni/{id}/      - Delete alumni
```

Admin endpoints remain unchanged and work with student IDs.

## Authentication & Permissions

- Student endpoints use `IsAuthenticated` permission
- Students can only access their own profile
- Admin endpoints allow access to any alumni profile
- The system automatically identifies the student from the authenticated user

## Testing

Run the test script to verify all endpoints:

```bash
cd server
python test_alumni_student_endpoints.py
```

The test script will:
1. Find an alumni student in the database
2. Authenticate as that student
3. Test all CRUD operations on the profile
4. Verify responses and data integrity

## Database Schema

The alumni system uses the existing `Alumni` model with a one-to-one relationship to `Student`:

```python
class Alumni(models.Model):
    student = models.OneToOneField('students.Student', primary_key=True)
    alumniType = models.CharField(...)
    graduationYear = models.IntegerField()
    currentSupportCategory = models.CharField(...)
    bio = models.TextField()
    linkedinUrl = models.URLField()
    portfolioUrl = models.URLField()
    skills = models.JSONField()
    highlights = models.JSONField()
    careerHistory = models.JSONField()
    ...
```

## Key Features

1. **Self-Service Profile Management** - Students can update their own profiles
2. **Career Tracking** - Add, update, and delete career positions
3. **Skills Management** - Maintain a list of skills with proficiency levels
4. **Highlights** - Showcase achievements and milestones
5. **Dual Access** - Both students and admins can manage alumni data
6. **Data Consistency** - Changes made by students are immediately visible to admins

## Error Handling

The backend returns appropriate error messages:

- `404` - Alumni profile not found
- `400` - Invalid data or missing required fields
- `401` - Not authenticated
- `403` - Permission denied

## Next Steps

1. Test the endpoints with real data
2. Verify the frontend integration
3. Add course management endpoints (currently placeholder)
4. Implement additional validation as needed
5. Add analytics and reporting features

## Support

For issues or questions, refer to:
- Backend code: `server/apps/alumni/views.py`
- Frontend service: `client/student-side/src/services/alumniService.ts`
- Frontend page: `client/student-side/src/pages/AlumniProfilePage.tsx`
