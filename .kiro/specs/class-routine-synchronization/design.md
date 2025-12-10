# Design Document

## Overview

The class routine synchronization system addresses critical issues in the current implementation where class schedule changes are not properly persisted to the database and synchronized across different user sessions and devices. The solution involves fixing the frontend-backend integration, implementing proper API calls for CRUD operations, standardizing data structures, and ensuring real-time synchronization of routine data.

## Architecture

The system follows a client-server architecture with the following components:

### Frontend Components
- **Admin Routine Interface**: React component for managing class schedules with edit capabilities
- **Student Routine Interface**: React component for viewing class schedules in read-only mode
- **Routine Service Layer**: TypeScript service handling API communication and data transformation
- **State Management**: React state management for routine data and UI states

### Backend Components
- **ClassRoutine Model**: Django model representing class schedule data
- **ClassRoutineViewSet**: Django REST Framework viewset providing CRUD operations
- **Serializers**: Data serialization/deserialization for API communication
- **URL Routing**: RESTful API endpoints for routine operations

### Integration Layer
- **API Client**: Centralized HTTP client for consistent API communication
- **Data Transformers**: Functions to convert between frontend and backend data formats
- **Error Handlers**: Centralized error handling and user feedback mechanisms

## Components and Interfaces

### 1. Frontend Service Interface

```typescript
interface RoutineService {
  // CRUD operations
  createRoutine(data: RoutineCreateData): Promise<ClassRoutine>
  updateRoutine(id: string, data: Partial<RoutineCreateData>): Promise<ClassRoutine>
  deleteRoutine(id: string): Promise<void>
  getRoutine(filters: RoutineFilters): Promise<PaginatedResponse<ClassRoutine>>
  
  // Batch operations for admin interface
  saveRoutineChanges(changes: RoutineChange[]): Promise<ClassRoutine[]>
  
  // Real-time sync
  refreshRoutineData(filters: RoutineFilters): Promise<void>
}
```

### 2. Backend API Interface

```python
# ViewSet methods
class ClassRoutineViewSet:
    def list(request) -> PaginatedResponse[ClassRoutine]
    def create(request) -> ClassRoutine
    def retrieve(request, pk) -> ClassRoutine
    def update(request, pk) -> ClassRoutine
    def partial_update(request, pk) -> ClassRoutine
    def destroy(request, pk) -> None
    
    # Custom actions
    def my_routine(request) -> MyRoutineResponse
    def bulk_update(request) -> List[ClassRoutine]
```

### 3. Data Models

```typescript
// Frontend data structure
interface ClassRoutine {
  id: string
  department: Department
  semester: number
  shift: Shift
  session: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  subjectName: string
  subjectCode: string
  teacher?: Teacher
  roomNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Grid representation for admin interface
interface RoutineGridData {
  [day: string]: {
    [timeSlot: string]: ClassSlot | null
  }
}

interface ClassSlot {
  id?: string
  subject: string
  teacher: string
  room: string
}
```

## Data Models

### Database Schema
The existing `ClassRoutine` model provides the foundation with the following key fields:
- `id`: UUID primary key
- `department`: Foreign key to Department
- `semester`: Integer (1-8)
- `shift`: Choice field (Morning/Day/Evening)
- `day_of_week`: Choice field (Sunday-Thursday)
- `start_time`/`end_time`: Time fields
- `subject_name`/`subject_code`: Subject information
- `teacher`: Optional foreign key to Teacher
- `room_number`: Room location
- `is_active`: Boolean status flag

### Data Transformation
The system requires transformation between:
1. **Database format**: Normalized relational data
2. **Admin grid format**: Day/time slot matrix for editing
3. **Student display format**: Chronological list with period numbers

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all properties identified in the prework, several can be consolidated:
- Properties 1.1, 1.2, 1.3 can be combined into a comprehensive CRUD operations property
- Properties 2.1, 2.2, 3.1 can be combined into a data loading and display property
- Properties 4.1, 4.2, 4.3 can be combined into an API contract consistency property
- Properties 5.1, 5.3, 5.5 can be combined into a comprehensive error handling property

Property 1: CRUD Operations Persistence
*For any* valid class routine data, when create/update/delete operations are performed through the admin interface, the corresponding database records should be created/modified/removed and the changes should be immediately reflected in subsequent API responses
**Validates: Requirements 1.1, 1.2, 1.3**

Property 2: Data Loading and Display Consistency
*For any* routine data retrieved from the API, the system should display it correctly formatted for the user's role and immediately refresh the display after successful modifications
**Validates: Requirements 2.1, 2.2, 3.1**

Property 3: Filter-Based Data Loading
*For any* combination of department, semester, and shift filters, the system should load and display only the routine data matching those exact criteria
**Validates: Requirements 3.4**

Property 4: API Contract Consistency
*For any* routine data exchanged between frontend and backend, the data format should match the expected API schema and be consistent across all endpoints
**Validates: Requirements 4.1, 4.2, 4.3**

Property 5: Time Format Consistency
*For any* time values processed by the system, the conversion between frontend display format and backend storage format should be bidirectional and consistent
**Validates: Requirements 4.4**

Property 6: Nested Object Serialization
*For any* routine data containing teacher and department relationships, the serialization and deserialization should preserve all nested object properties correctly
**Validates: Requirements 4.5**

Property 7: Comprehensive Error Handling
*For any* invalid data submission, network error, or validation failure, the system should provide specific error messages and appropriate UI feedback without losing user input
**Validates: Requirements 5.1, 5.3, 5.5**

Property 8: Conflict Detection
*For any* attempt to schedule overlapping classes in the same room or with the same teacher at the same time, the system should detect and prevent the conflict
**Validates: Requirements 5.2**

Property 9: Loading State Management
*For any* routine operation in progress, the system should display appropriate loading indicators and prevent duplicate operations until completion
**Validates: Requirements 5.4**

Property 10: Cache Invalidation
*For any* routine data modification, cached data should be invalidated and subsequent requests should return the updated information
**Validates: Requirements 3.5**

## Error Handling

### Frontend Error Handling
1. **Network Errors**: Retry mechanisms with exponential backoff
2. **Validation Errors**: Field-level error display with specific messages
3. **API Errors**: Toast notifications with actionable error messages
4. **Loading States**: Prevent user actions during operations
5. **Optimistic Updates**: Rollback on failure with user notification

### Backend Error Handling
1. **Validation Errors**: Detailed field-level error responses
2. **Constraint Violations**: Specific error messages for database constraints
3. **Permission Errors**: Clear authorization failure messages
4. **Server Errors**: Graceful error responses with error tracking

### Error Recovery
1. **Auto-retry**: Automatic retry for transient network errors
2. **Manual Retry**: User-initiated retry buttons for failed operations
3. **Data Recovery**: Preserve user input during error states
4. **Fallback States**: Graceful degradation when services are unavailable

## Testing Strategy

### Unit Testing
- Test individual service methods for correct API calls
- Test data transformation functions for accuracy
- Test error handling logic for various failure scenarios
- Test UI components for correct state management

### Property-Based Testing
The system will use **fast-check** (JavaScript property-based testing library) for comprehensive testing:

- Each property-based test will run a minimum of 100 iterations
- Tests will be tagged with comments referencing design document properties
- Property tests will use the format: `**Feature: class-routine-synchronization, Property {number}: {property_text}**`

### Integration Testing
- Test complete CRUD workflows from frontend to database
- Test multi-user scenarios for data consistency
- Test error propagation through the entire stack
- Test real-time synchronization across multiple clients

### End-to-End Testing
- Test complete user workflows for routine management
- Test cross-device synchronization scenarios
- Test error recovery and retry mechanisms
- Test performance under concurrent user load