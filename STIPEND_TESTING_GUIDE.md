# Stipend Feature Testing Guide

## Quick Start

### 1. Backend Setup
```bash
cd server

# Run migrations
python manage.py migrate stipends

# Create sample criteria
python manage.py create_sample_criteria

# Add sample student data (optional)
python manage.py add_sample_student_data

# Test the API
python test_stipend_api.py
```

### 2. Start the Server
```bash
# In server directory
python manage.py runserver
```

### 3. Start the Frontend
```bash
# In client/admin-side directory
npm install  # if not already done
npm run dev
```

### 4. Access the Feature
1. Login to admin panel
2. Navigate to "Stipend Eligible" page
3. Click "Criteria Settings" to customize thresholds
4. View eligible students

## Testing Checklist

### Backend Tests

#### 1. Database Setup
- [ ] Migrations applied successfully
- [ ] Sample criteria created (3 criteria)
- [ ] Sample students added (5 students with results)

#### 2. API Endpoints
Test using Django admin or API client:

**Criteria Endpoints:**
- [ ] GET `/api/stipends/criteria/` - List all criteria
- [ ] GET `/api/stipends/criteria/active/` - List active criteria
- [ ] POST `/api/stipends/criteria/` - Create new criteria
- [ ] PUT `/api/stipends/criteria/{id}/` - Update criteria
- [ ] DELETE `/api/stipends/criteria/{id}/` - Delete criteria

**Eligibility Endpoints:**
- [ ] GET `/api/stipends/eligibility/calculate/?minAttendance=75&minGpa=2.5&passRequirement=all_pass`
  - Should return eligible students with statistics
- [ ] POST `/api/stipends/eligibility/save_eligibility/`
  - Body: `{"criteriaId": "...", "studentIds": ["..."]}`
- [ ] POST `/api/stipends/eligibility/{id}/approve/`
- [ ] POST `/api/stipends/eligibility/bulk_approve/`
  - Body: `{"ids": ["..."]}`

#### 3. Data Validation
- [ ] Students with attendance < threshold are filtered out
- [ ] Students with GPA < threshold are filtered out
- [ ] Pass requirement is correctly applied
- [ ] Ranking is assigned correctly (by GPA, then attendance)
- [ ] Statistics are calculated correctly

### Frontend Tests

#### 1. Page Load
- [ ] Page loads without errors
- [ ] Statistics cards display correctly
- [ ] Default criteria shown in header

#### 2. Criteria Settings
- [ ] Dialog opens when clicking "Criteria Settings"
- [ ] Attendance threshold buttons work
- [ ] GPA threshold buttons work
- [ ] Pass requirement buttons work
- [ ] "Reset to Default" button works
- [ ] "Apply Criteria" button triggers recalculation

#### 3. Filters
- [ ] Search by name works (English and Bangla)
- [ ] Search by roll number works
- [ ] Department filter works
- [ ] Semester filter works
- [ ] Shift filter works
- [ ] Session filter works
- [ ] "Clear Filters" button works

#### 4. Sorting
- [ ] Sort by GPA works (asc/desc)
- [ ] Sort by attendance works (asc/desc)
- [ ] Sort by name works (asc/desc)
- [ ] Sort by roll works (asc/desc)
- [ ] Sort by semester works (asc/desc)
- [ ] Sort by department works (asc/desc)
- [ ] Sort order toggle works

#### 5. View Modes
- [ ] Table view displays correctly
- [ ] Card view displays correctly
- [ ] Switch between views works smoothly

#### 6. Student Actions
- [ ] "View Full Profile" navigates correctly
- [ ] "Academic Details" navigates correctly
- [ ] "Generate Stipend Letter" navigates correctly

#### 7. Statistics
- [ ] Total eligible count is correct
- [ ] Average attendance is correct
- [ ] Average GPA is correct
- [ ] All pass count is correct

#### 8. Responsive Design
- [ ] Mobile view works correctly
- [ ] Tablet view works correctly
- [ ] Desktop view works correctly

## Test Scenarios

### Scenario 1: High Achievers
**Criteria:**
- Attendance ≥ 85%
- GPA ≥ 3.5
- All subjects pass

**Expected Results:**
- Should show only students with GPA ≥ 3.5 and attendance ≥ 85%
- No students with referred subjects
- Ranked by GPA

### Scenario 2: General Stipend
**Criteria:**
- Attendance ≥ 75%
- GPA ≥ 2.5
- All subjects pass

**Expected Results:**
- Should show more students than Scenario 1
- No students with referred subjects
- Includes students with GPA 2.5-3.5

### Scenario 3: Need-Based
**Criteria:**
- Attendance ≥ 70%
- GPA ≥ 2.0
- Max 1 referred subject

**Expected Results:**
- Should show most students
- May include students with 1 referred subject
- Lower GPA threshold

### Scenario 4: Filtering
**Steps:**
1. Apply general criteria (75% attendance, 2.5 GPA)
2. Filter by specific department
3. Filter by specific semester
4. Search for specific student

**Expected Results:**
- Each filter should narrow down results
- Search should work across all filtered results
- Statistics should update accordingly

### Scenario 5: Empty Results
**Steps:**
1. Set very high criteria (95% attendance, 3.9 GPA)
2. Apply filters

**Expected Results:**
- "No Eligible Students Found" message
- Option to reset filters and criteria
- Statistics show 0

## Common Issues and Solutions

### Issue 1: No students appearing
**Possible Causes:**
- No active students in database
- Students don't have semesterResults or semesterAttendance data
- Criteria too strict

**Solutions:**
- Run `python manage.py add_sample_student_data`
- Lower criteria thresholds
- Check student status is 'active'

### Issue 2: Incorrect statistics
**Possible Causes:**
- JSON data structure mismatch
- Calculation logic error

**Solutions:**
- Check semesterResults and semesterAttendance JSON structure
- Verify latest semester data exists
- Check backend calculation methods

### Issue 3: API errors
**Possible Causes:**
- Backend not running
- CORS issues
- Authentication issues

**Solutions:**
- Ensure backend is running on port 8000
- Check CORS settings in Django
- Verify user is authenticated

### Issue 4: Filters not working
**Possible Causes:**
- Frontend state management issue
- API parameter mismatch

**Solutions:**
- Check browser console for errors
- Verify API parameters match backend expectations
- Clear browser cache

## Performance Testing

### Load Testing
Test with different numbers of students:
- [ ] 10 students - Should be instant
- [ ] 100 students - Should be < 1 second
- [ ] 1000 students - Should be < 3 seconds
- [ ] 10000 students - Should be < 10 seconds

### Optimization Tips
If performance is slow:
1. Add database indexes on frequently queried fields
2. Use pagination for large result sets
3. Cache criteria and statistics
4. Optimize JSON field queries

## Security Testing

### Authorization
- [ ] Only authenticated users can access endpoints
- [ ] Only admins can create/update criteria
- [ ] Only admins can approve eligibility

### Data Validation
- [ ] Invalid criteria values are rejected
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized

## Accessibility Testing

### Keyboard Navigation
- [ ] All buttons are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible

### Screen Reader
- [ ] All images have alt text
- [ ] Form labels are properly associated
- [ ] ARIA labels are used where appropriate

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Deployment Testing

### Pre-Deployment
- [ ] All tests pass
- [ ] No console errors
- [ ] No console warnings
- [ ] Environment variables configured
- [ ] Database migrations ready

### Post-Deployment
- [ ] API endpoints accessible
- [ ] Frontend loads correctly
- [ ] Data persists correctly
- [ ] Performance is acceptable

## Maintenance

### Regular Checks
- [ ] Monitor API response times
- [ ] Check error logs
- [ ] Verify data integrity
- [ ] Update criteria as needed

### Backup
- [ ] Database backups include stipend tables
- [ ] Criteria configurations are documented
- [ ] Student data is backed up regularly
