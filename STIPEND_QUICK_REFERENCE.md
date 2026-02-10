# Stipend Feature - Quick Reference Card

## 🚀 Quick Start (5 minutes)

```bash
# 1. Backend Setup
cd server
python manage.py migrate stipends
python manage.py create_sample_criteria
python manage.py add_sample_student_data

# 2. Start Server
python manage.py runserver

# 3. Start Frontend (new terminal)
cd client/admin-side
npm run dev

# 4. Access Feature
# Login → Navigate to "Stipend Eligible" page
```

## 📋 API Endpoints Cheat Sheet

### Calculate Eligibility
```
GET /api/stipends/eligibility/calculate/
?minAttendance=75
&minGpa=2.5
&passRequirement=all_pass
&department=Computer Technology
&semester=4
&search=rahman
```

### Save Eligibility
```
POST /api/stipends/eligibility/save_eligibility/
{
  "criteriaId": "uuid",
  "studentIds": ["uuid1", "uuid2"]
}
```

### Approve Eligibility
```
POST /api/stipends/eligibility/{id}/approve/
```

### Bulk Approve
```
POST /api/stipends/eligibility/bulk_approve/
{
  "ids": ["uuid1", "uuid2"]
}
```

## 🎯 Common Criteria Presets

### Merit Stipend
- Attendance: ≥ 85%
- GPA: ≥ 3.5
- Pass: All subjects

### General Stipend
- Attendance: ≥ 75%
- GPA: ≥ 2.5
- Pass: All subjects

### Need-Based Stipend
- Attendance: ≥ 70%
- GPA: ≥ 2.0
- Pass: Max 1 referred

## 🔧 Troubleshooting

### No students showing?
```bash
# Add sample data
python manage.py add_sample_student_data

# Or lower criteria thresholds
```

### API errors?
```bash
# Check if server is running
curl http://localhost:8000/api/stipends/criteria/

# Check migrations
python manage.py showmigrations stipends
```

### Frontend errors?
```bash
# Check browser console
# Verify API_BASE_URL in .env
# Clear browser cache
```

## 📊 Data Structure

### Student Semester Results (JSON)
```json
{
  "semester": 4,
  "year": 2024,
  "gpa": 3.75,
  "cgpa": 3.70,
  "referredSubjects": []
}
```

### Student Semester Attendance (JSON)
```json
{
  "semester": 4,
  "year": 2024,
  "averagePercentage": 92.5
}
```

## 🎨 UI Components

### Criteria Dialog
- Attendance buttons: 50%, 60%, 65%, 70%, 75%, 80%, 85%, 90%
- GPA buttons: 2.0, 2.5, 3.0, 3.25, 3.5, 3.75
- Pass options: All Pass, Max 1 Referred, Max 2 Referred, Any

### Filters
- Search: Name (EN/BN) or Roll
- Department: All or specific
- Semester: 1-8
- Shift: Morning, Day, Evening
- Session: Year ranges

### Views
- Table: Detailed data with sortable columns
- Cards: Visual grid layout

## 🔐 Permissions

### Required
- User must be authenticated
- Admin role recommended for full access

### Actions
- View: All authenticated users
- Create Criteria: Admin only
- Approve: Admin only

## 📈 Statistics Explained

- **Total Eligible**: Count of students meeting criteria
- **Avg Attendance**: Mean attendance of eligible students
- **Avg GPA**: Mean GPA of eligible students
- **All Pass**: Students with 0 referred subjects

## 🎯 Best Practices

### For Admins
1. Create named criteria for reuse
2. Test with sample data first
3. Review statistics before approval
4. Export results for records

### For Developers
1. Use TypeScript interfaces
2. Handle loading/error states
3. Validate input data
4. Log API errors
5. Test with various data sizes

## 📝 File Locations

### Backend
```
server/apps/stipends/
├── models.py          # Data models
├── views.py           # API logic
├── serializers.py     # Data serialization
└── urls.py            # URL routing
```

### Frontend
```
client/admin-side/src/
├── pages/StipendEligible.tsx    # Main page
├── services/stipendService.ts   # API calls
└── config/api.ts                # Endpoints
```

## 🧪 Testing Commands

```bash
# Backend test
cd server
python test_stipend_api.py

# Check data
python manage.py shell
>>> from apps.stipends.models import *
>>> StipendCriteria.objects.count()
>>> Student.objects.filter(status='active').count()

# Django admin
# Navigate to: http://localhost:8000/admin/stipends/
```

## 🚨 Common Errors

### "No module named 'apps.stipends'"
```bash
# Add to INSTALLED_APPS in settings.py
'apps.stipends',
```

### "Relation does not exist"
```bash
# Run migrations
python manage.py migrate stipends
```

### "CORS error"
```bash
# Check CORS settings in settings.py
# Verify frontend URL in CORS_ALLOWED_ORIGINS
```

## 📞 Quick Help

| Issue | Solution |
|-------|----------|
| No data | Run `add_sample_student_data` |
| API 404 | Check URL configuration |
| Empty list | Lower criteria thresholds |
| Slow performance | Add database indexes |
| Type errors | Check TypeScript interfaces |

## 🎓 Learning Resources

- Feature Guide: `STIPEND_FEATURE_GUIDE.md`
- Testing Guide: `STIPEND_TESTING_GUIDE.md`
- Implementation: `STIPEND_IMPLEMENTATION_SUMMARY.md`
- Django Docs: https://docs.djangoproject.com/
- React Docs: https://react.dev/

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready
