# Bugfix Requirements Document

## Introduction

The Django `createsuperuser` management command currently creates users with the default 'student' role instead of creating proper admin-side superusers. This prevents superusers from accessing admin functionality and causes the error "this user is for student-side only". The command should create admin-side superusers with appropriate privileges to manage the system.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN running `python manage.py createsuperuser` THEN the system creates a user with role 'student' (default role)

1.2 WHEN a superuser created by createsuperuser attempts to access admin functionality THEN the system shows error "this user is for student-side only"

1.3 WHEN a superuser created by createsuperuser attempts to access admin endpoints THEN the system denies access due to role-based middleware restrictions

### Expected Behavior (Correct)

2.1 WHEN running `python manage.py createsuperuser` THEN the system SHALL create a user with role 'institute_head' or 'registrar' (admin roles)

2.2 WHEN a superuser created by createsuperuser attempts to access admin functionality THEN the system SHALL grant full admin access without errors

2.3 WHEN a superuser created by createsuperuser attempts to access admin endpoints THEN the system SHALL allow access based on admin role privileges

### Unchanged Behavior (Regression Prevention)

3.1 WHEN students use the existing account creation system THEN the system SHALL CONTINUE TO create users with 'student' role

3.2 WHEN teachers use the existing account creation system THEN the system SHALL CONTINUE TO create users with 'teacher' role and pending status

3.3 WHEN existing admin users access admin functionality THEN the system SHALL CONTINUE TO work as before

3.4 WHEN role-based access control is applied to API endpoints THEN the system SHALL CONTINUE TO enforce proper access restrictions