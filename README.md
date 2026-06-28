# Student Learning Management System
### Sher-e-Bangla Institute of Polytechnic Institute (SIPI)

A full-stack college management system built for SIPI. It covers the entire student lifecycle — from online admission applications through graduation — plus teacher management, attendance, marks, documents, real-time notifications, and more.

---

## Table of Contents

- [What This Project Does](#what-this-project-does)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Full Project Structure](#full-project-structure)
- [Backend — Django Apps](#backend--django-apps)
- [Admin Frontend — Pages & Features](#admin-frontend--pages--features)
- [Student Frontend — Pages & Features](#student-frontend--pages--features)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Production Deployment (AWS)](#production-deployment-aws)
- [Database Setup](#database-setup)

---

## What This Project Does

| Area | What it handles |
|------|----------------|
| Admissions | Online applications, review workflow, approve/reject, transition to enrolled student |
| Students | Full CRUD, profile photos, department assignment, discontinuation tracking |
| Alumni | Career positions, support categories, alumni profile pages |
| Teachers | Teacher profiles, subject assignments, teacher requests |
| Attendance | Teachers record attendance; students view their own records |
| Marks & Grades | Grade entry, correction request workflow |
| Class Routines | Timetable management per department/semester |
| Documents | Secure file upload/serving, size/type validation |
| Certificates | HTML-template-based PDF generation (ID cards, certificates, testimonials) |
| Notices | Institute-wide notice board |
| Notifications | Real-time WebSocket notifications via Django Channels + Redis |
| Complaints | Student complaint and allegation system |
| Stipends | Stipend eligibility tracking |
| Learning Hub | Study materials and resources |
| Live Classes | Live class scheduling |
| Activity Logs | Full audit trail of admin actions |
| Dashboard | Aggregate statistics for admins |
| Auth | Role-based access (student, teacher, admin), OTP password reset via email |

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.x | Runtime |
| Django | 4.2.7 | Web framework |
| Django REST Framework | 3.14.0 | REST API |
| PostgreSQL | 14+ | Database |
| Django Channels | 4.0.0 | WebSocket support |
| Daphne | 4.0.0 | ASGI server |
| Redis | latest | Channel layer for WebSockets |
| Gunicorn | 21.2.0 | Production WSGI server |
| python-decouple | 3.8 | Environment variable management |
| Pillow | 12.1.1 | Image processing |
| django-cors-headers | 4.3.1 | CORS handling |

### Frontend (Both Admin & Student)
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui + Radix UI | latest | Component library |
| TanStack React Query | 5.x | Server state / data fetching |
| React Router DOM | 6.x | Client-side routing |
| React Hook Form + Zod | latest | Form handling & validation |
| Recharts | 2.x | Charts and analytics |
| jsPDF + html2canvas | latest | PDF generation (admin only) |
| Framer Motion | 12.x | Animations |

---

## Architecture Overview

```
                        ┌─────────────────────────────┐
                        │         NGINX (Reverse Proxy) │
                        └────────────┬────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
     ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
     │  Admin Frontend  │   │ Student Frontend │   │  Django Backend  │
     │  React + Vite    │   │  React + Vite    │   │  (Gunicorn/      │
     │  Port :8080      │   │  Port :80        │   │   Daphne :8000)  │
     └─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                           │
                                          ┌────────────────┼────────┐
                                          │                         │
                                 ┌────────▼────────┐   ┌───────────▼──┐
                                 │   PostgreSQL     │   │    Redis      │
                                 │   (sipi_db)      │   │  (WebSockets) │
                                 └─────────────────┘   └──────────────┘
```

- The **Admin frontend** (port 8080) is for institute staff to manage everything.
- The **Student frontend** (port 80) is for enrolled students to view their data.
- Both frontends talk to the same **Django REST API** at `/api/`.
- **WebSocket** connections (notifications) go through Django Channels backed by Redis.
- **NGINX** serves the built React bundles and proxies `/api/` requests to the backend.

---

## Full Project Structure

```
Update2.0_database/
│
├── 📄 README.md                        ← This file
├── 📄 LOCAL_DEVELOPMENT_GUIDE.md       ← Step-by-step local setup
├── 📄 AWS_PRODUCTION_GUIDE.md          ← Full AWS EC2 deployment guide
├── 📄 .env                             ← Root env (VITE_API_BASE_URL)
├── 📄 .env.example                     ← Root env template
├── 📄 nginx.conf                       ← NGINX production config
├── 📄 nginx-sipi-admin.conf            ← NGINX admin config
├── 📄 bun.lockb
│
├── 📁 server/                          ← Django backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── setup_postgres.sql              ← DB creation script
│   ├── gunicorn_config.py
│   ├── gunicorn.service                ← Systemd service file
│   ├── .env                            ← Backend secrets (not in git)
│   ├── .env.example                    ← Backend env template
│   │
│   ├── 📁 slms_core/                   ← Django project config
│   │   ├── settings.py                 ← All Django settings
│   │   ├── urls.py                     ← Root URL router
│   │   ├── asgi.py                     ← ASGI entry (WebSockets)
│   │   ├── wsgi.py                     ← WSGI entry (HTTP)
│   │   └── pagination.py
│   │
│   ├── 📁 apps/                        ← All Django feature apps
│   │   ├── activity_logs/              ← Audit trail middleware
│   │   ├── admissions/                 ← Admissions workflow
│   │   ├── alumni/                     ← Alumni management
│   │   ├── applications/               ← Public application submissions
│   │   ├── attendance/                 ← Attendance tracking
│   │   ├── authentication/             ← Users, roles, OTP, middleware
│   │   ├── class_routines/             ← Class timetables
│   │   ├── complaints/                 ← Complaint system
│   │   ├── correction_requests/        ← Mark correction requests
│   │   ├── dashboard/                  ← Statistics aggregation
│   │   ├── departments/                ← Department management
│   │   ├── documents/                  ← File upload & secure serving
│   │   ├── learning_hub/               ← Study resources
│   │   ├── live_classes/               ← Live class scheduling
│   │   ├── marks/                      ← Grades management
│   │   ├── motivations/                ← Motivational content
│   │   ├── notices/                    ← Notice board
│   │   ├── notifications/              ← Real-time WebSocket notifications
│   │   ├── stipends/                   ← Stipend eligibility
│   │   ├── students/                   ← Student CRUD & lifecycle
│   │   ├── system_settings/            ← Configurable system settings
│   │   ├── teacher_requests/           ← Teacher request handling
│   │   └── teachers/                   ← Teacher profiles
│   │
│   ├── 📁 utils/                       ← Shared utilities
│   │   ├── file_handler.py
│   │   ├── file_storage.py
│   │   ├── structured_file_storage.py
│   │   └── duplicate_detector.py
│   │
│   ├── 📁 storage/                     ← Uploaded files (not in git)
│   │   └── Documents/Student_Documents/ <- Hear student raw document will be storeed like : nid, crificate,dof etc all 
│   ├── 📁 media/                       ← Django media files
│   ├── 📁 staticfiles/                 ← Collected static files
│   └── 📁 logs/
│
├── 📁 client/
│   │
│   ├── 📁 admin-side/                  ← Admin React app
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── .env                        ← VITE_API_BASE_URL
│   │   ├── .env.example
│   │   ├── copy-templates.js           ← Copies HTML templates to dist on build
│   │   │
│   │   ├── 📁 public/
│   │   │   ├── favicon.ico
│   │   │   └── templates/              ← HTML certificate/document templates
│   │   │       ├── Certificate.html
│   │   │       ├── characterCertificate.html
│   │   │       ├── CourseCompletionCertificate.html
│   │   │       ├── EligibilityStatement.html
│   │   │       ├── IdCard.html
│   │   │       ├── Prottayon.html
│   │   │       ├── Testimonial.html
│   │   │       └── Sallu_certificate.html
│   │   │
│   │   └── 📁 src/
│   │       ├── App.tsx                 ← Route definitions
│   │       ├── main.tsx                ← React entry point
│   │       ├── index.css
│   │       ├── vite-env.d.ts
│   │       │
│   │       ├── 📁 pages/              ← Full-page route components
│   │       ├── 📁 components/
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── documents/
│   │       │   ├── layout/             ← Sidebar, header
│   │       │   ├── templates/          ← Certificate preview/print UI
│   │       │   └── ui/                 ← shadcn/ui components
│   │       ├── 📁 config/api.ts        ← API base URL
│   │       ├── 📁 contexts/            ← AuthContext, ThemeContext
│   │       ├── 📁 hooks/               ← Custom hooks
│   │       ├── 📁 services/            ← API service layer (per entity)
│   │       ├── 📁 types/               ← TypeScript interfaces
│   │       └── 📁 utils/
│   │
│   └── 📁 student-side/                ← Student React app
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       ├── .env                        ← VITE_API_BASE_URL
│       ├── .env.example
│       │
│       └── 📁 src/
│           ├── App.tsx
│           ├── main.tsx
│           │
│           ├── 📁 pages/              ← Full-page route components
│           ├── 📁 components/
│           │   ├── admission/
│           │   ├── allegations/
│           │   ├── alumni/
│           │   ├── assignments/
│           │   ├── auth/               ← AdmissionGuard, AuthPage
│           │   ├── class-activities/
│           │   ├── dashboard/
│           │   ├── layout/
│           │   ├── live-classes/
│           │   ├── messages/
│           │   ├── profile/
│           │   ├── routine/
│           │   ├── study-materials/
│           │   ├── teacher/
│           │   ├── test/
│           │   └── ui/                 ← shadcn/ui components
│           ├── 📁 config/api.ts
│           ├── 📁 contexts/            ← AuthContext, ThemeContext
│           ├── 📁 data/                ← Fallback mock data
│           ├── 📁 hooks/
│           ├── 📁 lib/                 ← api.ts, utils.ts
│           ├── 📁 services/            ← API service layer
│           ├── 📁 types/
│           └── 📁 utils/
│
└── 📁 deploy-scripts/                  ← Shell scripts for deployment
```

---

## Backend — Django Apps

Each app under `server/apps/` is a self-contained Django module with its own `models.py`, `views.py`, `serializers.py`, and `urls.py`.

| App | API Prefix | Responsibility |
|-----|-----------|----------------|
| `authentication` | `/api/auth/` | Custom User model, login, logout, session, OTP password reset, role-based middleware |
| `admissions` | `/api/admissions/` | Manage new student admission records |
| `applications` | `/api/applications/` | Public application form submissions, admin review & approval |
| `students` | `/api/` | Student CRUD, photo upload, transition to alumni |
| `alumni` | `/api/` | Alumni records, career history, support categories |
| `teachers` | `/api/teachers/` | Teacher profiles, subjects, departments |
| `teacher_requests` | `/api/teacher-requests/` | Teacher signup/request workflow |
| `departments` | `/api/departments/` | Department management |
| `attendance` | `/api/attendance/` | Record and query attendance |
| `marks` | `/api/marks/` | Grades entry and reporting |
| `correction_requests` | `/api/correction-requests/` | Marks correction request workflow |
| `class_routines` | `/api/class-routines/` | Class timetable management |
| `documents` | `/api/documents/` | File upload, download, secure serving, thumbnails |
| `notices` | `/api/` | Notice board CRUD |
| `notifications` | `/api/` | Real-time WebSocket notifications (via Channels) |
| `complaints` | `/api/complaints/` | Student complaint/allegation system |
| `stipends` | `/api/stipends/` | Stipend eligibility tracking |
| `motivations` | `/api/motivations/` | Motivational content management |
| `learning_hub` | — | Study resources and materials |
| `live_classes` | — | Live class scheduling |
| `activity_logs` | `/api/activity-logs/` | Full audit trail of all actions |
| `system_settings` | `/api/settings/` | Configurable system-wide settings |
| `dashboard` | `/api/dashboard/` | Aggregate stats (student count, attendance rates, etc.) |

---

## Admin Frontend — Pages & Features

The admin app (`client/admin-side/`) is for institute staff and management.

| Page | File | What it does |
|------|------|-------------|
| Dashboard | `Dashboard.tsx` | Overview statistics, charts |
| Students List | `StudentsList.tsx` | Browse, search, filter all students |
| Add Student | `AddStudent.tsx` | Manual student enrollment form |
| Edit Student | `EditStudent.tsx` | Update student details |
| Student Details | `StudentDetails.tsx` | Full student profile view |
| Discontinued | `DiscontinuedStudents.tsx` | Students who left |
| Admissions | `Admissions.tsx` / `AdmissionsNew.tsx` | Manage admission records |
| Admission Details | `AdmissionDetails.tsx` | Single admission review |
| Applications | `Applications.tsx` | Review public application submissions |
| Alumni | `Alumni.tsx` | Alumni list |
| Alumni Details | `AlumniDetails.tsx` | Single alumni profile |
| Teachers | `Teachers.tsx` | Teacher list |
| Teacher Profile | `TeacherProfile.tsx` | Individual teacher view |
| Signup Requests | `SignupRequests.tsx` | Approve new teacher accounts |
| Departments | `Departments.tsx` | Department list |
| Department View | `DepartmentView.tsx` | Department details and students |
| Attendance & Marks | `AttendanceMarks.tsx` | Attendance and grade management |
| Correction Requests | `CorrectionRequests.tsx` | Handle grade correction requests |
| Class Routine | `ClassRoutine.tsx` | Timetable management |
| Documents | `Documents.tsx` | Document/file management |
| Notices | `Notices.tsx` | Post and manage notices |
| Complaints | `Complaints.tsx` | Review student complaints |
| Stipend Eligible | `StipendEligible.tsx` | Students eligible for stipends |
| Motivation | `MotivationManagement.tsx` | Manage motivational content |
| Analytics | `Analytics.tsx` | Detailed analytics and reports |
| Activity Logs | `ActivityLogs.tsx` | Admin action audit trail |
| System Reports | `SystemActivityReports.tsx` | System-level reports |
| Settings | `Settings.tsx` | System configuration |
| Auth | `Auth.tsx` | Login page |
| Password Reset | `PasswordReset.tsx` | OTP-based password reset |

---

## Student Frontend — Pages & Features

The student app (`client/student-side/`) is the portal for enrolled students.

| Page | File | What it does |
|------|------|-------------|
| Dashboard | `Dashboard.tsx` | Personal overview, quick stats |
| Admission | `AdmissionPage.tsx` | New applicant admission flow |
| Attendance | `AttendancePage.tsx` | View own attendance records |
| Add Attendance | `AddAttendancePage.tsx` | (Teacher role) Record attendance |
| Marks | `MarksPage.tsx` | View own grades |
| Manage Marks | `ManageMarksPage.tsx` | (Teacher role) Enter marks |
| Class Routine | `ClassRoutinePage.tsx` | View class timetable |
| Documents | `DocumentsPage.tsx` | View/download own documents |
| Notices | `NoticesPage.tsx` | Institute notice board |
| Notifications | `NotificationsPage.tsx` | Real-time notification history |
| Applications | `ApplicationsPage.tsx` | Track application status |
| Alumni Profile | `AlumniProfilePage.tsx` | View alumni profile |
| Profile | `ProfilePage.tsx` | Personal profile management |
| Public Student Profile | `PublicStudentProfilePage.tsx` | Viewable student profile |
| Public Teacher Profile | `PublicTeacherProfilePage.tsx` | View teacher profile |
| Student List | `StudentListPage.tsx` | Browse enrolled students |
| Student Details | `StudentDetailsPage.tsx` | Single student detail view |
| Study Materials | `StudyMaterialsPage.tsx` | Access study resources |
| Learning Hub | `LearningHubPage.tsx` | Learning resources browser |
| Live Classes | `LiveClassesPage.tsx` | Live class schedule |
| Assignments | `AssignmentsPage.tsx` | Assignments list |
| Assignment Detail | `TeacherAssignmentDetailPage.tsx` | Single assignment view |
| Class Activities | `ClassActivitiesPage.tsx` | Class activity logs |
| Teacher Subjects | `TeacherSubjectActivitiesPage.tsx` | Subject-wise activities |
| Teacher Contacts | `TeacherContactsPage.tsx` | Reach out to teachers |
| Teacher Admin | `TeacherAdminPage.tsx` | Teacher administration view |
| Teacher Attendance | `TeacherAttendancePage.tsx` | Teacher's attendance view |
| Complaints | `ComplaintsPage.tsx` | Submit/view complaints |
| Student Allegations | `StudentAllegationsPage.tsx` | Student-submitted allegations |
| Teacher Allegations | `TeacherAllegationsPage.tsx` | Teacher-submitted allegations |
| Messages | `MessagesPage.tsx` | Messaging/communications |
| Settings | `SettingsPage.tsx` | Account settings |
| Password Reset | `PasswordResetPage.tsx` | OTP-based password reset |

---

## API Endpoints

All endpoints are prefixed with `/api/`.

```
Auth
  POST   /api/auth/login/
  POST   /api/auth/logout/
  POST   /api/auth/password-reset/
  POST   /api/auth/password-reset/verify/

Students
  GET    /api/students/
  POST   /api/students/
  GET    /api/students/{id}/
  PUT    /api/students/{id}/
  DELETE /api/students/{id}/
  POST   /api/students/{id}/upload-photo/
  POST   /api/students/{id}/transition-to-alumni/

Alumni
  GET    /api/alumni/
  GET    /api/alumni/{id}/
  PUT    /api/alumni/{id}/
  POST   /api/alumni/{id}/add-career-position/
  GET    /api/alumni/stats/

Applications
  GET    /api/applications/
  POST   /api/applications/submit/        ← Public, no auth required
  GET    /api/applications/{id}/
  PUT    /api/applications/{id}/review/

Admissions        GET/POST/PUT/DELETE  /api/admissions/
Teachers          GET/POST/PUT/DELETE  /api/teachers/
Teacher Requests  GET/POST/PUT         /api/teacher-requests/
Departments       GET/POST/PUT/DELETE  /api/departments/
Attendance        GET/POST             /api/attendance/
Marks             GET/POST/PUT         /api/marks/
Correction Reqs   GET/POST/PUT         /api/correction-requests/
Class Routines    GET/POST/PUT/DELETE  /api/class-routines/
Documents         GET/POST/DELETE      /api/documents/
Notices           GET/POST/PUT/DELETE  /api/ (notices endpoints)
Notifications     GET/WebSocket        /api/ (notifications endpoints)
Complaints        GET/POST/PUT         /api/complaints/
Stipends          GET/PUT              /api/stipends/
Motivations       GET/POST/PUT/DELETE  /api/motivations/
Activity Logs     GET                  /api/activity-logs/
System Settings   GET/PUT              /api/settings/
Dashboard Stats   GET                  /api/dashboard/stats/

Secure File Serving
  GET    /files/{file_path}               ← Auth-protected file download
  GET    /files/thumbnail/{document_id}/  ← Document thumbnail
```

---

## Environment Variables

### Backend — `server/.env`

```env
# Database
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-long-random-secret-key
DEBUG=True                              # False in production
ALLOWED_HOSTS=localhost,127.0.0.1

# Email (Gmail SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=SIPI <your-email@gmail.com>
EMAIL_TIMEOUT=30

# OTP (Password Reset)
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
PASSWORD_RESET_RATE_LIMIT_PER_HOUR=3

# Security (set True when using HTTPS)
CSRF_COOKIE_SECURE=False
SESSION_COOKIE_SECURE=False
```

### Frontend — `client/admin-side/.env` and `client/student-side/.env`

```env
# Local development
VITE_API_BASE_URL=http://127.0.0.1:8000/api

# Production
VITE_API_BASE_URL=http://13.250.99.61/api
```

---

## Local Development Setup

You need 3 terminals running at the same time.

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL 14+
- Redis (for WebSockets — optional for basic dev)

### 1. Database

```bash
psql -U postgres
```
```sql
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
ALTER USER sipi_web CREATEDB;
\q
```

### 2. Backend (Terminal 1)

```bash
cd server
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then edit .env with your DB credentials

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at: **http://127.0.0.1:8000**  
Django Admin: **http://127.0.0.1:8000/admin/**

### 3. Admin Frontend (Terminal 2)

```bash
cd client/admin-side
npm install
# create .env with: VITE_API_BASE_URL=http://127.0.0.1:8000/api
npm run dev
```

Admin frontend runs at: **http://localhost:5173**

### 4. Student Frontend (Terminal 3)

```bash
cd client/student-side
npm install
# create .env with: VITE_API_BASE_URL=http://127.0.0.1:8000/api
npm run dev
```

Student frontend runs at: **http://localhost:5174**

---

## Production Deployment (AWS)

The app is deployed on an **AWS EC2 Ubuntu** instance.

| URL | Service |
|-----|---------|
| http://13.250.99.61 | Student portal |
| http://13.250.99.61:8080 | Admin portal |
| http://13.250.99.61/api/ | REST API (proxied by NGINX) |
| https://spistudent.errorburner.site | Student portal (Cloudflare Tunnel) |
| https://spiadmin.errorburner.site | Admin portal (Cloudflare Tunnel) |

**Stack on server:**
- NGINX — serves React builds, reverse proxies `/api/` to Gunicorn
- Gunicorn — runs Django (3 workers)
- Daphne — handles WebSocket connections
- Redis — channel layer for Django Channels
- PostgreSQL — main database
- systemd — manages Gunicorn as a background service

See `AWS_PRODUCTION_GUIDE.md` for the full step-by-step deployment walkthrough.

**Quick redeploy after a code push:**
```bash
/home/ubuntu/deploy.sh
```

---

## Database Setup

**Database:** PostgreSQL  
**Name:** `sipi_db`  
**User:** `sipi_web`

The file `server/setup_postgres.sql` contains the full setup script. To run it:

```bash
psql -U postgres -f server/setup_postgres.sql
```

After DB setup, run Django migrations:

```bash
cd server
python manage.py migrate
```

File storage limits (configured in `settings.py`):
- Images: 5 MB max (`jpg`, `jpeg`, `png`, `gif`, `webp`)
- Documents: 10 MB max (`pdf`, `doc`, `docx`, `txt`)
- Videos: 50 MB max

---

## Role-Based Access

Access is enforced on **both** the frontend (menu visibility + route guards) and the
backend (`RoleBasedAccessMiddleware` in `server/apps/authentication/middleware.py`).
A user can never reach a feature outside their role — even by typing the URL or
calling the API directly.

### Admin-panel roles

The admin panel supports three roles, each with a completely separate permission set:

| Role (`role` value) | Label | Access |
|---------------------|-------|--------|
| `institute_head` | **Principal** (super user) | Full, unrestricted access to every feature |
| `department_head` | **Department Head** | Departments, students, admissions, teachers, class routine, stipends, alumni, correction requests, complaints |
| `registrar` | **Registrar** | Students, admissions, teachers, documents, applications, alumni, correction requests |

The frontend permission map lives in `client/admin-side/src/config/permissions.ts`
and mirrors the backend policy.

### Interface mode (Simple / Advanced)

Every admin can switch between **Simple** and **Advanced** mode from
**Settings → Appearance → Interface Mode**. The choice is stored on the user
(`User.interface_mode`) and applied instantly (no reload):

- **Simple Mode** — a clean, distraction-free menu with only the essentials for that role.
- **Advanced Mode** — reveals every feature the role permits.

Mode only changes *menu visibility*. It never expands permissions: route and API
access are always evaluated against the role's full (advanced) permission set.

### Other roles

| Role | Access |
|------|--------|
| `teacher` | Attendance, marks, class activities for their subjects |
| `student` / `captain` | Read-only access to own data |

---

*Built for SIPI — Sirajganj Polytechnic Institute*
