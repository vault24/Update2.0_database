# Requirements Document

## Introduction

The student-side React application is unable to connect to the Django backend API due to CORS (Cross-Origin Resource Sharing) configuration issues. The frontend is running on port 8081 but the backend only allows requests from specific ports (3000, 5173, 8080), causing authentication and API requests to fail.

## Glossary

- **CORS**: Cross-Origin Resource Sharing - a security feature that restricts web pages from making requests to a different domain, protocol, or port
- **Student_Frontend**: The React application for students running on port 8081
- **Django_Backend**: The Django REST API server running on port 8000
- **CSRF**: Cross-Site Request Forgery protection mechanism
- **Preflight_Request**: An HTTP OPTIONS request sent by browsers before certain cross-origin requests

## Requirements

### Requirement 1: CORS Configuration Update

**User Story:** As a student, I want to access the student portal from my browser, so that I can view my academic information and interact with the system.

#### Acceptance Criteria

1. WHEN the Student_Frontend makes a request to Django_Backend THEN the request SHALL be allowed through CORS policy
2. WHEN a preflight request is sent from port 8081 THEN the Django_Backend SHALL respond with appropriate CORS headers
3. THE Django_Backend SHALL include http://localhost:8081 and http://127.0.0.1:8081 in CORS_ALLOWED_ORIGINS
4. THE Django_Backend SHALL include http://localhost:8081 and http://127.0.0.1:8081 in CSRF_TRUSTED_ORIGINS
5. WHEN CORS configuration is updated THEN existing functionality for admin-side (ports 3000, 5173) SHALL remain unaffected

### Requirement 2: Environment Configuration Consistency

**User Story:** As a developer, I want consistent CORS configuration across environment files, so that the application works reliably in different environments.

#### Acceptance Criteria

1. WHEN CORS origins are defined in Django settings THEN they SHALL include all required frontend ports
2. WHEN environment variables are used for CORS configuration THEN they SHALL be properly parsed and applied
3. THE server/.env file SHALL contain the updated CORS_ALLOWED_ORIGINS with port 8081
4. THE Django settings SHALL properly load and apply the CORS configuration from environment variables

### Requirement 3: Authentication Flow Restoration

**User Story:** As a student, I want to log in and sign up through the student portal, so that I can access my account and academic information.

#### Acceptance Criteria

1. WHEN a student submits login credentials THEN the CSRF token request SHALL succeed
2. WHEN a student submits login credentials THEN the authentication request SHALL succeed
3. WHEN a student attempts to sign up THEN the registration request SHALL succeed
4. WHEN authentication requests are made THEN they SHALL include proper CORS and CSRF headers
5. THE Student_Frontend SHALL be able to fetch CSRF tokens from /api/auth/csrf/ endpoint

### Requirement 4: API Request Functionality

**User Story:** As a student, I want all API requests from the student portal to work properly, so that I can access all available features and data.

#### Acceptance Criteria

1. WHEN the Student_Frontend makes GET requests to any API endpoint THEN they SHALL succeed
2. WHEN the Student_Frontend makes POST requests with CSRF tokens THEN they SHALL succeed
3. WHEN the Student_Frontend makes PUT/PATCH/DELETE requests THEN they SHALL succeed
4. THE Django_Backend SHALL respond with appropriate Access-Control-Allow-Origin headers for port 8081
5. THE Django_Backend SHALL handle preflight OPTIONS requests correctly for port 8081