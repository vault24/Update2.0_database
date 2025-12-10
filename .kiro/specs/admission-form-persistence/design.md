# Design Document

## Overview

This design implements server-side draft saving for admission forms and ensures proper post-submission flow. The solution adds new API endpoints for draft management and modifies the frontend to use server-side storage as the primary mechanism, with localStorage as a fallback.

## Architecture

### Backend Components

1. **Draft API Endpoints** (Django REST Framework)
   - `POST /api/admissions/save-draft/` - Save form draft
   - `GET /api/admissions/get-draft/` - Retrieve form draft
   - `DELETE /api/admissions/clear-draft/` - Clear form draft

2. **Admission Model Extension**
   - Add `draft_data` JSONField to store incomplete form data
   - Add `is_draft` BooleanField to distinguish drafts from submissions

### Frontend Components

1. **Draft Service** (`admissionService.ts`)
   - `saveDraft()` - Save draft to server with localStorage fallback
   - `getDraft()` - Retrieve draft from server with localStorage fallback
   - `clearDraft()` - Clear draft from both server and localStorage

2. **AdmissionWizard Component**
   - Auto-save to server on field changes (debounced)
   - Load draft from server on mount
   - Handle submission flow to success page
   - Detect existing submissions and show success page

## Components and Interfaces

### Backend API Interfaces

```python
# Draft Save Request
{
  "draft_data": {
    "fullNameBangla": "...",
    "fullNameEnglish": "...",
    # ... all form fields
  },
  "current_step": 1
}

# Draft Response
{
  "id": "uuid",
  "draft_data": { ... },
  "current_step": 1,
  "saved_at": "2024-12-09T10:30:00Z"
}

# Admission Check Response
{
  "has_admission": true,
  "admission_id": "uuid",
  "status": "pending"
}
```

### Frontend Service Interface

```typescript
interface DraftData {
  formData: AdmissionFormData;
  currentStep: number;
  savedAt: string;
}

interface AdmissionService {
  saveDraft(data: DraftData): Promise<void>;
  getDraft(): Promise<DraftData | null>;
  clearDraft(): Promise<void>;
  checkExistingAdmission(): Promise<{
    hasAdmission: boolean;
    admissionId?: string;
    status?: string;
  }>;
}
```

## Data Models

### Extended Admission Model

```python
class Admission(models.Model):
    # ... existing fields ...
    
    # New fields for draft support
    draft_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Stores incomplete form data"
    )
    is_draft = models.BooleanField(
        default=False,
        help_text="True if this is a draft, False if submitted"
    )
    draft_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time draft was updated"
    )
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Draft persistence across devices

*For any* student user and any form data, when a draft is saved on one device, then retrieving the draft from another device should return the same form data.

**Validates: Requirements 1.1, 1.2**

### Property 2: Draft clearing on submission

*For any* student user with a saved draft, when they successfully submit their admission form, then both server-side and client-side draft data should be cleared.

**Validates: Requirements 1.4**

### Property 3: Success page display after submission

*For any* student user who has submitted an admission, when they access the admission page, then the system should display the success page with their application ID.

**Validates: Requirements 1.3, 2.1, 2.4, 2.5, 3.1**

### Property 4: Duplicate submission prevention

*For any* student user with an existing admission, when they attempt to submit another admission, then the system should reject the submission and return their existing admission data.

**Validates: Requirements 3.2**

### Property 5: Fallback to localStorage

*For any* draft save operation, when the server is unreachable, then the system should save the draft to localStorage and continue functioning.

**Validates: Requirements 1.5**

### Property 6: PDF generation consistency

*For any* submitted admission, when the student requests a PDF download, then the PDF should contain all the form data that was submitted.

**Validates: Requirements 2.2, 2.3, 3.4**

## Error Handling

### Network Errors

- **Draft Save Failure**: Fall back to localStorage, show warning toast
- **Draft Load Failure**: Fall back to localStorage, log error
- **Submission Failure**: Show error message, preserve form data

### Validation Errors

- **Duplicate Submission**: Show existing admission ID, redirect to success page
- **Invalid Draft Data**: Clear corrupted draft, start fresh
- **Missing Required Fields**: Show validation errors, prevent submission

### Edge Cases

- **Concurrent Edits**: Last write wins (acceptable for single-user drafts)
- **Session Expiry**: Redirect to login, preserve draft in localStorage
- **Partial Network**: Retry with exponential backoff

## Testing Strategy

### Unit Tests

1. **Draft Service Tests**
   - Test saveDraft with valid data
   - Test getDraft returns correct data
   - Test clearDraft removes all data
   - Test fallback to localStorage on network error

2. **Backend API Tests**
   - Test draft save endpoint creates/updates draft
   - Test draft retrieval returns user's draft only
   - Test draft clear removes draft data
   - Test duplicate submission prevention

### Property-Based Tests

Property-based tests will use `fast-check` for TypeScript and `hypothesis` for Python to verify universal properties across many randomly generated inputs.

1. **Property Test: Draft Round-Trip**
   - Generate random form data
   - Save draft to server
   - Retrieve draft from server
   - Verify retrieved data matches saved data

2. **Property Test: Submission Clears Draft**
   - Generate random form data
   - Save draft
   - Submit admission
   - Verify draft is cleared

3. **Property Test: Success Page Display**
   - Generate random admission data
   - Submit admission
   - Access admission page
   - Verify success page is displayed

### Integration Tests

1. **Multi-Device Flow**
   - Save draft on device A
   - Login on device B
   - Verify draft is loaded
   - Submit from device B
   - Verify success page on both devices

2. **Submission Flow**
   - Fill form completely
   - Submit admission
   - Verify success page displays
   - Verify PDF can be generated
   - Verify draft is cleared

3. **Duplicate Prevention**
   - Submit admission
   - Attempt second submission
   - Verify rejection
   - Verify existing admission is returned

## Implementation Notes

### Debouncing

Draft saves should be debounced to avoid excessive API calls:
- Debounce delay: 1000ms
- Save on step change immediately
- Save on form unmount

### Security

- Drafts are user-scoped (filtered by request.user)
- Only authenticated users can save/retrieve drafts
- Drafts are automatically cleared after submission

### Performance

- Draft data is stored as JSON (no parsing overhead)
- Index on user_id for fast draft retrieval
- Soft delete drafts (keep for audit trail)

### Migration Strategy

1. Add new fields to Admission model
2. Create migration
3. Deploy backend changes
4. Deploy frontend changes
5. Existing localStorage drafts will be migrated on next save
