# Stipend Feature - GPA Criteria Removal

## Changes Made

The minimum GPA requirement has been removed from the Stipend Eligibility criteria. Students are now evaluated based on **attendance** and **pass requirements** only.

## What Was Removed

### Frontend Changes

1. **GPA Options Constant**
   - Removed `GPA_OPTIONS` array

2. **State Management**
   - Removed `minGpa` state variable
   - Removed `setMinGpa` setter

3. **UI Components**
   - Removed "Minimum GPA" section from Criteria Settings dialog
   - Removed GPA threshold buttons
   - Updated page header to not display GPA criteria

4. **API Calls**
   - Removed `minGpa` parameter from `calculateEligibility()` call
   - Updated `resetCriteria()` to not reset GPA

### Backend Changes

1. **API Parameter**
   - Made `minGpa` optional in the `calculate()` endpoint
   - Only applies GPA filter if `minGpa` is provided

2. **Response Structure**
   - Made `minGpa` optional in criteria response
   - Only includes `minGpa` in response if it was provided

## Current Eligibility Criteria

Students are now evaluated based on:

1. **Minimum Attendance** (default: 75%)
   - Options: 50%, 60%, 65%, 70%, 75%, 80%, 85%, 90%

2. **Pass Requirement** (default: All Subjects Pass)
   - All Subjects Pass
   - Max 1 Referred
   - Max 2 Referred
   - Any (No Restriction)

## Benefits

1. **Simplified Criteria**
   - Easier to understand and configure
   - Focuses on attendance and pass status

2. **More Inclusive**
   - Doesn't exclude students based on GPA
   - Allows institutions to focus on attendance and completion

3. **Flexible**
   - Can still be added back if needed
   - Backend still supports GPA filtering if parameter is provided

## Backward Compatibility

The changes are **backward compatible**:
- Backend still accepts `minGpa` parameter (optional)
- If `minGpa` is provided, it will be applied
- If not provided, GPA filtering is skipped

## Testing

### Verify Changes
1. Open Stipend Eligible page
2. Click "Criteria Settings"
3. Confirm only Attendance and Pass Requirement sections are shown
4. Apply criteria and verify students are filtered correctly
5. Check page header shows: "Current criteria: Attendance ≥ X%, [Pass Requirement]"

### Test Scenarios

**Scenario 1: High Attendance**
- Set attendance to 85%
- Set pass requirement to "All Subjects Pass"
- Should show only students with ≥85% attendance and no referred subjects

**Scenario 2: Relaxed Criteria**
- Set attendance to 70%
- Set pass requirement to "Max 1 Referred"
- Should show students with ≥70% attendance and ≤1 referred subject

**Scenario 3: Most Inclusive**
- Set attendance to 50%
- Set pass requirement to "Any"
- Should show all students with ≥50% attendance

## Files Modified

### Frontend
- `client/admin-side/src/pages/StipendEligible.tsx`
  - Removed GPA_OPTIONS constant
  - Removed minGpa state
  - Removed GPA UI section
  - Updated API calls
  - Updated criteria display

### Backend
- `server/apps/stipends/views.py`
  - Made minGpa optional in calculate() method
  - Updated GPA filtering logic
  - Updated response structure

## Migration Notes

No database migration needed - this is a UI/logic change only.

## Rollback

If you need to restore GPA criteria:

1. **Frontend**: Restore the removed sections from git history
2. **Backend**: Change `min_gpa = request.query_params.get('minGpa')` back to `min_gpa = Decimal(request.query_params.get('minGpa', '2.5'))`

## Summary

The stipend eligibility feature now focuses on **attendance** and **pass requirements** only, making it simpler and more inclusive. The GPA criterion has been completely removed from the UI, but the backend still supports it if needed in the future.

---

**Status:** ✅ Complete  
**GPA Criteria:** Removed  
**Backward Compatible:** Yes  
**Production Ready:** Yes
