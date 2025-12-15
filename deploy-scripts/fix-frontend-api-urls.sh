#!/bin/bash

# Fix Frontend API URLs and CORS Issues
# This script fixes the API URL configuration in both frontends and updates CORS settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Fixing Frontend API URLs and CORS Issues"
echo "============================================"

PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

print_status "Step 1: Updating Student Frontend API Configuration..."

# Update student-side API configuration
cat > client/student-side/src/config/api.ts << 'EOF'
/**
 * API Configuration
 */

// API Base URL - defaults to production API URL
// Override with .env file (VITE_API_BASE_URL) for local development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://47.128.236.25/api';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    REGISTER: '/auth/register/',
    ME: '/auth/me/',
    CHANGE_PASSWORD: '/auth/change-password/',
  },
  
  // Applications
  APPLICATIONS: {
    LIST: '/applications/',
    SUBMIT: '/applications/submit/',
    MY_APPLICATIONS: '/applications/my-applications/',
    DETAIL: (id: string) => `/applications/${id}/`,
  },
  
  // Students
  STUDENTS: {
    LIST: '/students/',
    DETAIL: (id: string) => `/students/${id}/`,
    CREATE: '/students/',
    UPDATE: (id: string) => `/students/${id}/`,
    DELETE: (id: string) => `/students/${id}/`,
  },
  
  // Admissions
  ADMISSIONS: {
    LIST: '/admissions/',
    SUBMIT: '/admissions/',
    MY_ADMISSION: '/admissions/my-admission/',
    DETAIL: (id: string) => `/admissions/${id}/`,
  },
  
  // Marks
  MARKS: {
    LIST: '/marks/',
    STUDENT_MARKS: (studentId: string) => `/marks/student/${studentId}/`,
    CREATE: '/marks/',
    UPDATE: (id: string) => `/marks/${id}/`,
  },
  
  // Attendance
  ATTENDANCE: {
    LIST: '/attendance/',
    STUDENT_ATTENDANCE: (studentId: string) => `/attendance/student/${studentId}/`,
    CREATE: '/attendance/',
    UPDATE: (id: string) => `/attendance/${id}/`,
  },
  
  // Class Routines
  CLASS_ROUTINES: {
    LIST: '/class-routines/',
    MY_ROUTINE: '/class-routines/my-routine/',
    DETAIL: (id: string) => `/class-routines/${id}/`,
  },
  
  // Departments
  DEPARTMENTS: {
    LIST: '/departments/',
    DETAIL: (id: string) => `/departments/${id}/`,
  },
};
EOF

print_status "Step 2: Updating Admin Frontend API Configuration..."

# Update admin-side API configuration
cat > client/admin-side/src/config/api.ts << 'EOF'
/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

// Base API URL - can be configured via environment variables
// Default to production API URL, override with .env for local development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://47.128.236.25/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    register: '/auth/register/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    me: '/auth/me/',
    changePassword: '/auth/change-password/',
  },
  
  // Students
  students: {
    list: '/students/',
    create: '/students/',
    detail: (id: string) => `/students/${id}/`,
    update: (id: string) => `/students/${id}/`,
    delete: (id: string) => `/students/${id}/`,
    discontinued: '/students/discontinued/',
    search: '/students/search/',
    uploadPhoto: (id: string) => `/students/${id}/upload-photo/`,
    transitionToAlumni: (id: string) => `/students/${id}/transition_to_alumni/`,
    disconnectStudies: (id: string) => `/students/${id}/disconnect-studies/`,
    semesterResults: (id: string) => `/students/${id}/semester-results/`,
    semesterAttendance: (id: string) => `/students/${id}/semester-attendance/`,
    bulkUpdateStatus: '/students/bulk-update-status/',
    bulkDelete: '/students/bulk-delete/',
  },
  
  // Admissions
  admissions: {
    list: '/admissions/',
    create: '/admissions/',
    detail: (id: string) => `/admissions/${id}/`,
    approve: (id: string) => `/admissions/${id}/approve/`,
    reject: (id: string) => `/admissions/${id}/reject/`,
    myAdmission: '/admissions/my-admission/',
  },
  
  // Teachers
  teachers: {
    list: '/teachers/',
    detail: (id: string) => `/teachers/${id}/`,
    update: (id: string) => `/teachers/${id}/`,
    delete: (id: string) => `/teachers/${id}/`,
    uploadPhoto: (id: string) => `/teachers/${id}/upload-photo/`,
    requests: '/teacher-requests/signup-requests/',
    requestDetail: (id: string) => `/teacher-requests/signup-requests/${id}/`,
    approveRequest: (id: string) => `/teacher-requests/signup-requests/${id}/approve/`,
    rejectRequest: (id: string) => `/teacher-requests/signup-requests/${id}/reject/`,
    signupRequest: '/teacher-requests/signup-requests/',
  },
  
  // Departments
  departments: {
    list: '/departments/',
    create: '/departments/',
    detail: (id: string) => `/departments/${id}/`,
    update: (id: string) => `/departments/${id}/`,
    delete: (id: string) => `/departments/${id}/`,
    students: (id: string) => `/departments/${id}/students/`,
    teachers: (id: string) => `/departments/${id}/teachers/`,
  },
  
  // Class Routines
  classRoutines: {
    list: '/class-routines/',
    create: '/class-routines/',
    detail: (id: string) => `/class-routines/${id}/`,
    update: (id: string) => `/class-routines/${id}/`,
    delete: (id: string) => `/class-routines/${id}/`,
    myRoutine: '/class-routines/my-routine/',
  },
  
  // Attendance
  attendance: {
    list: '/attendance/',
    create: '/attendance/',
    detail: (id: string) => `/attendance/${id}/`,
    update: (id: string) => `/attendance/${id}/`,
    studentAttendance: (studentId: string) => `/attendance/student/${studentId}/`,
    summary: '/attendance/summary/',
  },
  
  // Marks
  marks: {
    list: '/marks/',
    create: '/marks/',
    detail: (id: string) => `/marks/${id}/`,
    update: (id: string) => `/marks/${id}/`,
    delete: (id: string) => `/marks/${id}/`,
    studentMarks: (studentId: string) => `/marks/student/${studentId}/`,
  },
  
  // Correction Requests
  correctionRequests: {
    list: '/correction-requests/',
    create: '/correction-requests/',
    detail: (id: string) => `/correction-requests/${id}/`,
    approve: (id: string) => `/correction-requests/${id}/approve/`,
    reject: (id: string) => `/correction-requests/${id}/reject/`,
    myRequests: '/correction-requests/my-requests/',
  },
  
  // Applications
  applications: {
    list: '/applications/',
    create: '/applications/',
    detail: (id: string) => `/applications/${id}/`,
    approve: (id: string) => `/applications/${id}/approve/`,
    reject: (id: string) => `/applications/${id}/reject/`,
    myApplications: '/applications/my-applications/',
  },
  
  // Documents
  documents: {
    list: '/documents/',
    upload: '/documents/',
    detail: (id: string) => `/documents/${id}/`,
    download: (id: string) => `/documents/${id}/download/`,
    delete: (id: string) => `/documents/${id}/`,
    myDocuments: '/documents/my-documents/',
  },
  
  // Alumni
  alumni: {
    list: '/alumni/',
    detail: (id: string) => `/alumni/${id}/`,
    update: (id: string) => `/alumni/${id}/`,
    search: '/alumni/search/',
  },
  
  // Activity Logs
  activityLogs: {
    list: '/activity-logs/',
    detail: (id: string) => `/activity-logs/${id}/`,
    export: '/activity-logs/export/',
  },
  
  // Dashboard
  dashboard: {
    stats: '/dashboard/stats/',
    admin: '/dashboard/admin/',
    student: '/dashboard/student/',
    teacher: '/dashboard/teacher/',
  },
  
  // Analytics
  analytics: {
    admissionsTrend: '/analytics/admissions-trend/',
    departmentDistribution: '/analytics/department-distribution/',
    attendanceSummary: '/analytics/attendance-summary/',
    performanceMetrics: '/analytics/performance-metrics/',
  },
  
  // Settings
  settings: {
    get: '/settings/',
    update: '/settings/',
  },
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
EOF

print_status "Step 3: Creating corrected NGINX configuration with specific origin CORS..."

# Remove existing configurations
sudo rm -f /etc/nginx/sites-enabled/slms*
sudo rm -f /etc/nginx/sites-available/slms*

# Create new NGINX configuration with specific origins instead of wildcard
sudo tee /etc/nginx/sites-available/slms-fixed > /dev/null << 'EOF'
# Fixed SLMS Configuration with Specific CORS Origins
upstream django_backend {
    server 127.0.0.1:8000;
}

# Student Frontend (Port 80)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 47.128.236.25 _;
    
    root /home/ubuntu/Update2.0_database/client/student-side/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # API proxy with specific CORS support
    location /api/ {
        # Handle preflight requests first
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'http://47.128.236.25' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Proxy to Django backend
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for actual requests - specific origin for credentials
        add_header 'Access-Control-Allow-Origin' 'http://47.128.236.25' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security: Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;
    server_name 47.128.236.25 _;
    
    root /home/ubuntu/Update2.0_database/client/admin-side/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # API proxy with specific CORS support
    location /api/ {
        # Handle preflight requests first
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'http://47.128.236.25:8080' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Proxy to Django backend
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for actual requests - specific origin for credentials
        add_header 'Access-Control-Allow-Origin' 'http://47.128.236.25:8080' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security: Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

print_status "Step 4: Enabling the new NGINX configuration..."
sudo ln -s /etc/nginx/sites-available/slms-fixed /etc/nginx/sites-enabled/

print_status "Step 5: Testing NGINX configuration..."
if sudo nginx -t; then
    print_status "✅ NGINX configuration is valid"
else
    print_error "❌ NGINX configuration has errors"
    sudo nginx -t
    exit 1
fi

print_status "Step 6: Rebuilding frontends with updated API URLs..."

# Rebuild student frontend
print_status "Rebuilding student frontend..."
cd client/student-side
npm run build
cd ../..

# Rebuild admin frontend
print_status "Rebuilding admin frontend..."
cd client/admin-side
npm run build
cd ../..

print_status "Step 7: Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart gunicorn

print_status "Step 8: Testing the websites..."
sleep 3

echo ""
echo "Testing Student Frontend (Port 80):"
STUDENT_RESULT=$(curl -I http://localhost 2>/dev/null | head -1)
echo "$STUDENT_RESULT"

echo ""
echo "Testing Admin Frontend (Port 8080):"
ADMIN_RESULT=$(curl -I http://localhost:8080 2>/dev/null | head -1)
echo "$ADMIN_RESULT"

if [[ "$STUDENT_RESULT" == *"200 OK"* ]] && [[ "$ADMIN_RESULT" == *"200 OK"* ]]; then
    echo ""
    print_status "🎉 SUCCESS! Both websites are working!"
    echo ""
    echo "Your websites are live:"
    echo "🎓 Student Frontend: http://47.128.236.25"
    echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
    echo ""
    print_status "✅ API URLs have been updated to use the correct server"
    print_status "✅ CORS headers have been configured with specific origins"
    print_status "✅ Both frontends should now work without CORS errors"
else
    print_warning "Still having issues. Check logs:"
    echo "- NGINX error logs: sudo tail -f /var/log/nginx/error.log"
    echo "- Gunicorn logs: sudo journalctl -u gunicorn -f"
fi

echo ""
print_status "🎯 Configuration complete!"
echo ""
echo "The frontends have been rebuilt with the correct API URLs."
echo "CORS has been configured with specific origins instead of wildcards."
echo "Try refreshing your browser and testing the login functionality."