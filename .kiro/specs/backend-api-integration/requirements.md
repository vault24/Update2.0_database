# Requirements Document

## Introduction

This document outlines the requirements for integrating all frontend pages with the backend API and removing all sample/mock data from the client applications. The system currently has many pages using hardcoded mock data that need to be connected to the real Sadhu PostgreSQL database through the Django REST API.

## Glossary

- **Frontend Application**: The React-based client applications (admin-side and student-side)
- **Backend API**: The Django REST Framework API server
- **Mock Data**: Hardcoded sample data used for UI development
- **Real Data**: Data fetched from the Sadhu PostgreSQL database
- **API Service**: TypeScript service layer that handles API communication
- **API Endpoint**: A specific URL path on the backend that handles requests

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want all admin-side pages to fetch data from the backend API, so that I can view and manage real institutional data.

#### Acceptance Criteria

1. WHEN an admin views the Activity Logs page THEN the system SHALL fetch activity log data from the backend API endpoint
2. WHEN an admin views the Alumni page THEN the system SHALL fetch alumni records from the backend API endpoint
3. WHEN an admin views the Analytics page THEN the system SHALL fetch analytics data from the backend API endpoint
4. WHEN an admin views the Attendance & Marks page THEN the system SHALL fetch attendance and marks data from the backend API endpoint
5. WHEN an admin views the Class Routine page THEN the system SHALL fetch class routine data from the backend API endpoint
6. WHEN an admin views the Dashboard page THEN the system SHALL fetch dashboard statistics from the backend API endpoint
7. WHEN an admin views the Discontinued Students page THEN the system SHALL fetch discontinued student records from the backend API endpoint
8. WHEN an admin views the Documents page THEN the system SHALL fetch document records from the backend API endpoint
9. WHEN an admin views the Settings page THEN the system SHALL fetch and update system settings through the backend API endpoint

### Requirement 2

**User Story:** As a student or teacher, I want all student-side pages to fetch data from the backend API, so that I can view my real academic information.

#### Acceptance Criteria

1. WHEN a user views the Attendance page THEN the system SHALL fetch attendance records from the backend API endpoint
2. WHEN a user views the Class Routine page THEN the system SHALL fetch class schedule from the backend API endpoint
3. WHEN a user views the Dashboard page THEN the system SHALL fetch dashboard data from the backend API endpoint
4. WHEN a teacher views the Add Attendance page THEN the system SHALL fetch student list and submit attendance through the backend API endpoint
5. WHEN a teacher views the Manage Marks page THEN the system SHALL fetch student marks and update them through the backend API endpoint
6. WHEN a student views the Marks page THEN the system SHALL fetch their marks from the backend API endpoint
7. WHEN a user views the Profile page THEN the system SHALL fetch user profile data from the backend API endpoint
8. WHEN a teacher views the Student List page THEN the system SHALL fetch student records from the backend API endpoint
9. WHEN a user views the Teacher Contacts page THEN the system SHALL fetch teacher contact information from the backend API endpoint

### Requirement 3

**User Story:** As a developer, I want all mock data removed from the codebase, so that the application only uses real data from the database.

#### Acceptance Criteria

1. WHEN reviewing the admin-side codebase THEN the system SHALL contain no hardcoded mock data arrays
2. WHEN reviewing the student-side codebase THEN the system SHALL contain no hardcoded mock data arrays
3. WHEN a page loads THEN the system SHALL display loading states while fetching data from the API
4. WHEN an API request fails THEN the system SHALL display appropriate error messages to the user
5. WHEN no data is returned from the API THEN the system SHALL display empty state messages

### Requirement 4

**User Story:** As a developer, I want API service layers for all data entities, so that API communication is centralized and reusable.

#### Acceptance Criteria

1. WHEN making API requests THEN the system SHALL use dedicated service files for each entity type
2. WHEN an API service is created THEN the system SHALL include methods for all CRUD operations
3. WHEN an API service makes a request THEN the system SHALL use the centralized API client with authentication
4. WHEN an API service encounters an error THEN the system SHALL handle errors consistently across all services
5. WHEN an API service returns data THEN the system SHALL use TypeScript interfaces for type safety

### Requirement 5

**User Story:** As a system administrator, I want the sample data creation script removed or disabled, so that the production database only contains real data.

#### Acceptance Criteria

1. WHEN deploying to production THEN the system SHALL not execute the sample data creation script
2. WHEN the sample data script exists THEN the system SHALL be clearly marked as development-only
3. WHEN setting up a new environment THEN the system SHALL provide clear documentation on data initialization
4. WHEN migrating data THEN the system SHALL preserve all real data from the Sadhu database
5. WHEN testing the system THEN the system SHALL use separate test data that does not affect production

### Requirement 6

**User Story:** As a user, I want smooth loading experiences when data is being fetched, so that I understand the application is working.

#### Acceptance Criteria

1. WHEN a page is loading data THEN the system SHALL display skeleton loaders or loading spinners
2. WHEN data is being submitted THEN the system SHALL disable form controls and show loading indicators
3. WHEN a long operation is in progress THEN the system SHALL provide progress feedback to the user
4. WHEN data loads successfully THEN the system SHALL smoothly transition from loading state to content
5. WHEN multiple requests are in flight THEN the system SHALL coordinate loading states appropriately

### Requirement 7

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. WHEN an API request fails due to network issues THEN the system SHALL display a network error message
2. WHEN an API request fails due to authentication THEN the system SHALL redirect to the login page
3. WHEN an API request fails due to validation errors THEN the system SHALL display field-specific error messages
4. WHEN an API request fails due to server errors THEN the system SHALL display a generic error message with retry option
5. WHEN an error occurs THEN the system SHALL log error details for debugging purposes

### Requirement 8

**User Story:** As a developer, I want consistent data fetching patterns across all pages, so that the codebase is maintainable and predictable.

#### Acceptance Criteria

1. WHEN fetching data on page load THEN the system SHALL use React hooks (useState, useEffect) consistently
2. WHEN managing complex data fetching THEN the system SHALL consider using React Query or SWR for caching
3. WHEN handling pagination THEN the system SHALL use consistent pagination patterns across all list pages
4. WHEN filtering or searching data THEN the system SHALL debounce user input before making API requests
5. WHEN updating data THEN the system SHALL optimistically update the UI and handle rollback on errors
