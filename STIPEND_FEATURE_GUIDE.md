# Stipend Eligibility Feature Guide

## Overview
The Stipend Eligibility feature allows administrators to manage and track student eligibility for stipends based on customizable criteria including attendance, GPA, and pass requirements.

## Features

### 1. Dynamic Eligibility Calculation
- Real-time calculation of eligible students based on criteria
- Customizable thresholds for:
  - Minimum attendance percentage (50% - 90%)
  - Minimum GPA (2.0 - 3.75)
  - Pass requirements (All Pass, Max 1 Referred, Max 2 Referred, Any)

### 2. Advanced Filtering
- Filter by department, semester, shift, and session
- Search by student name (English/Bangla) or roll number
- Sort by multiple fields (GPA, attendance, name, roll, etc.)

### 3. Ranking System
- Automatic ranking based on GPA and attendance
- Visual rank badges for easy identification

### 4. Statistics Dashboard
- Total eligible students count
- Average attendance percentage
- Average GPA
- All-pass vs referred students count

### 5. Multiple View Modes
- Table view for detailed information
- Card view for visual browsing

## Backend Structure

### Models

#### StipendCriteria
Stores configurable eligibility criteria:
- `name`: Criteria name (e.g., "Semester 4 Stipend 2024")
- `description`: Detailed description
- `minAttendance`: Minimum attendance percentage (0-100)
- `minGpa`: Minimum GPA required (0-4)
- `passRequirement`: Pass requirement type
- `department`, `semester`, `shift`, `session`: Optional filters
- `isActive`: Active status

#### StipendEligibility
Tracks individual student eligibility:
- `student`: Foreign key to Student
- `criteria`: Foreign key to StipendCriteria
- `attendance`, `gpa`, `cgpa`: Snapshot of student performance
- `referredSubjects`, `totalSubjects`, `passedSubjects`: Subject status
- `rank`: Student ranking
- `isEligible`, `isApproved`: Status flags
- `approvedBy`, `approvedAt`: Approval tracking

### API Endpoints

#### Criteria Management
- `GET /api/stipends/criteria/` - List all criteria
- `GET /api/stipends/criteria/active/` - List active criteria
- `GET /api/stipends/criteria/{id}/` - Get specific criteria
- `POST /api/stipends/criteria/` - Create new criteria
- `PUT /api/stipends/criteria/{id}/` - Update criteria
- `DELETE /api/stipends/criteria/{id}/` - Delete criteria

#### Eligibility Management
- `GET /api/stipends/eligibility/calculate/` - Calculate eligible students
  - Query params: `minAttendance`, `minGpa`, `passRequirement`, `department`, `semester`, `shift`, `session`, `search`
- `POST /api/stipends/eligibility/save_eligibility/` - Save eligibility records
  - Body: `{ criteriaId, studentIds[] }`
- `GET /api/stipends/eligibility/` - List eligibility records
- `POST /api/stipends/eligibility/{id}/approve/` - Approve eligibility
- `POST /api/stipends/eligibility/{id}/unapprove/` - Unapprove eligibility
- `POST /api/stipends/eligibility/bulk_approve/` - Bulk approve
  - Body: `{ ids[] }`

## Frontend Structure

### Components
- `StipendEligible.tsx` - Main page component
- `stipendService.ts` - API service layer

### Key Features
1. **Criteria Settings Dialog**
   - Quick selection buttons for common thresholds
   - Real-time preview of criteria
   - Reset to default option

2. **Statistics Cards**
   - Animated cards showing key metrics
   - Color-coded badges for visual clarity

3. **Advanced Filters**
   - Multiple filter options
   - Clear all filters button
   - Sort order toggle

4. **Student List**
   - Table view with sortable columns
   - Card view for mobile-friendly browsing
   - Action menu for each student
   - Quick navigation to student profile

## Usage

### Setup
1. Run migrations:
   ```bash
   cd server
   python manage.py migrate stipends
   ```

2. Create sample criteria (optional):
   ```bash
   python manage.py create_sample_criteria
   ```

### Admin Panel
Access the Django admin panel to manage criteria:
- Navigate to `/admin/stipends/stipendcriteria/`
- Create, edit, or delete criteria
- View eligibility records at `/admin/stipends/stipendeligibility/`

### Frontend Usage
1. Navigate to "Stipend Eligible" page in admin dashboard
2. Click "Criteria Settings" to customize eligibility requirements
3. Use filters to narrow down students
4. View eligible students in table or card view
5. Click on student actions to:
   - View full profile
   - View academic details
   - Generate stipend letter

## Data Flow

### Eligibility Calculation
1. Frontend sends criteria parameters to `/api/stipends/eligibility/calculate/`
2. Backend queries active students from database
3. For each student:
   - Calculate average attendance from `semesterAttendance` JSON field
   - Extract latest GPA/CGPA from `semesterResults` JSON field
   - Count referred subjects from latest semester result
   - Check against eligibility criteria
4. Sort eligible students by GPA and attendance
5. Assign ranks
6. Return results with statistics

### Data Sources
- **Attendance**: Calculated from `Student.semesterAttendance` JSON field
- **GPA/CGPA**: Extracted from `Student.semesterResults` JSON field
- **Referred Subjects**: Counted from `semesterResults[].referredSubjects` array

## Customization

### Adding New Pass Requirements
1. Update `PASS_REQUIREMENT_OPTIONS` in frontend
2. Add new choice to `StipendCriteria.passRequirement` in backend
3. Update `_check_pass_requirement()` method in views

### Adding New Filters
1. Add filter state in `StipendEligible.tsx`
2. Add filter UI component
3. Pass filter parameter to `calculateEligibility()` API call
4. Update backend `calculate()` method to handle new filter

## Testing

### Backend Tests
```bash
cd server
python manage.py test apps.stipends
```

### Frontend Tests
```bash
cd client/admin-side
npm test -- StipendEligible
```

### Manual Testing
1. Create test students with varying attendance and GPA
2. Set different criteria thresholds
3. Verify correct students appear in eligible list
4. Test all filters and sorting options
5. Verify statistics calculations

## Troubleshooting

### No Students Appearing
- Check if students have `status='active'`
- Verify students have attendance and result data in JSON fields
- Lower criteria thresholds to test

### Incorrect Statistics
- Verify `semesterAttendance` and `semesterResults` JSON structure
- Check calculation logic in `_calculate_attendance()` and `_get_latest_gpa()`

### API Errors
- Check Django logs for detailed error messages
- Verify all required apps are in `INSTALLED_APPS`
- Ensure migrations are applied

## Future Enhancements
- Export eligible students to Excel/PDF
- Email notifications to eligible students
- Stipend amount calculation
- Payment tracking
- Historical eligibility records
- Bulk approval workflow
- Custom criteria templates
- Integration with document generation for stipend letters
