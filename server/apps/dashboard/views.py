"""
Dashboard Views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Avg
from apps.students.models import Student
from apps.alumni.models import Alumni
from apps.applications.models import Application
from apps.admissions.models import Admission
from apps.teachers.models import Teacher
from apps.departments.models import Department
from apps.attendance.models import AttendanceRecord
from apps.marks.models import MarksRecord
from apps.class_routines.models import ClassRoutine


class DashboardStatsView(APIView):
    """
    API view for dashboard statistics
    
    GET /api/dashboard/stats/
    """
    
    def get(self, request):
        """
        Get comprehensive dashboard statistics
        """
        try:
            # Total students count
            total_students = Student.objects.count()
            active_students = Student.objects.filter(status='active').count()
            graduated_students = Student.objects.filter(status='graduated').count()
            discontinued_students = Student.objects.filter(status='discontinued').count()
            
            # Student statistics by status
            student_stats_by_status = list(Student.objects.values('status').annotate(
                count=Count('id')
            ).order_by('status'))
            
            # Student statistics by department
            student_stats_by_department = list(Student.objects.values(
                'department__name', 'department__code'
            ).annotate(
                count=Count('id')
            ).order_by('department__name'))
            
            # Student statistics by semester
            student_stats_by_semester = list(Student.objects.values('semester').annotate(
                count=Count('id')
            ).order_by('semester'))
            
            # Alumni statistics
            total_alumni = Alumni.objects.count()
            recent_alumni = Alumni.objects.filter(alumniType='recent').count()
            established_alumni = Alumni.objects.filter(alumniType='established').count()
            
            # Convert support categories to dict format
            support_dict = {}
            alumni_by_support = Alumni.objects.values('currentSupportCategory').annotate(
                count=Count('student_id')
            )
            for item in alumni_by_support:
                support_dict[item['currentSupportCategory']] = item['count']
            
            # Convert years to dict format
            year_dict = {}
            alumni_by_year = Alumni.objects.values('graduationYear').annotate(
                count=Count('student_id')
            ).order_by('-graduationYear')
            for item in alumni_by_year:
                year_dict[str(item['graduationYear'])] = item['count']
            
            # Application statistics
            total_applications = Application.objects.count()
            pending_applications = Application.objects.filter(status='pending').count()
            approved_applications = Application.objects.filter(status='approved').count()
            rejected_applications = Application.objects.filter(status='rejected').count()
            
            applications_by_status = list(Application.objects.values('status').annotate(
                count=Count('id')
            ).order_by('status'))
            
            applications_by_type = list(Application.objects.values('applicationType').annotate(
                count=Count('id')
            ).order_by('applicationType'))
            
            # Admission statistics
            total_admissions = Admission.objects.count()
            pending_admissions = Admission.objects.filter(status='pending').count()
            approved_admissions = Admission.objects.filter(status='approved').count()
            rejected_admissions = Admission.objects.filter(status='rejected').count()
            
            # Teacher statistics
            total_teachers = Teacher.objects.count()
            
            # Department statistics
            total_departments = Department.objects.count()
            
            # Compile all statistics
            stats = {
                'students': {
                    'total': total_students,
                    'active': active_students,
                    'graduated': graduated_students,
                    'discontinued': discontinued_students,
                    'byStatus': student_stats_by_status,
                    'byDepartment': student_stats_by_department,
                    'bySemester': student_stats_by_semester,
                },
                'alumni': {
                    'total': total_alumni,
                    'recent': recent_alumni,
                    'established': established_alumni,
                    'bySupport': support_dict,
                    'byYear': year_dict,
                },
                'applications': {
                    'total': total_applications,
                    'pending': pending_applications,
                    'approved': approved_applications,
                    'rejected': rejected_applications,
                    'byStatus': applications_by_status,
                    'byType': applications_by_type,
                },
                'admissions': {
                    'total': total_admissions,
                    'pending': pending_admissions,
                    'approved': approved_admissions,
                    'rejected': rejected_admissions,
                },
                'teachers': {
                    'total': total_teachers,
                },
                'departments': {
                    'total': total_departments,
                }
            }
            
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminDashboardView(APIView):
    """
    Admin dashboard with KPI calculations
    
    GET /api/dashboard/admin/
    """
    
    def get(self, request):
        """Get admin dashboard data with KPIs"""
        try:
            # Apply filters if provided
            department_filter = request.query_params.get('department')
            
            # Base querysets
            students_qs = Student.objects.all()
            if department_filter:
                students_qs = students_qs.filter(department_id=department_filter)
            
            # KPIs
            kpis = {
                'totalStudents': students_qs.count(),
                'activeStudents': students_qs.filter(status='active').count(),
                'totalTeachers': Teacher.objects.count(),
                'totalDepartments': Department.objects.count(),
                'pendingAdmissions': Admission.objects.filter(status='pending').count(),
                'pendingApplications': Application.objects.filter(status='pending').count(),
            }
            
            # Department summaries
            department_summaries = list(Department.objects.annotate(
                student_count=Count('students'),
                teacher_count=Count('teachers')
            ).values('id', 'name', 'code', 'student_count', 'teacher_count'))
            
            # Recent activities (would come from activity logs)
            recent_admissions = Admission.objects.filter(status='pending').order_by('-submittedAt')[:5]
            recent_applications = Application.objects.filter(status='pending').order_by('-submittedAt')[:5]
            
            data = {
                'kpis': kpis,
                'departmentSummaries': department_summaries,
                'recentAdmissions': recent_admissions.count(),
                'recentApplications': recent_applications.count(),
            }
            
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StudentDashboardView(APIView):
    """
    Student dashboard with personalized data
    
    GET /api/dashboard/student/?student={student_id}
    """
    
    def get(self, request):
        """Get student dashboard data"""
        student_id = request.query_params.get('student')
        if not student_id:
            return Response(
                {'error': 'Student ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            
            # Attendance summary with error handling
            try:
                attendance_records = AttendanceRecord.objects.filter(student=student)
                total_classes = attendance_records.count()
                present_classes = attendance_records.filter(is_present=True).count()
                attendance_percentage = (present_classes / total_classes * 100) if total_classes > 0 else 0
            except Exception as e:
                print(f"Error fetching attendance: {e}")
                total_classes = 0
                present_classes = 0
                attendance_percentage = 0
            
            # Marks summary with error handling
            try:
                marks_records = MarksRecord.objects.filter(student=student)
                marks_count = marks_records.count()
            except Exception as e:
                print(f"Error fetching marks: {e}")
                marks_count = 0
            
            # Applications with error handling
            try:
                pending_applications = Application.objects.filter(
                    rollNumber=student.currentRollNumber,
                    status='pending'
                ).count()
            except Exception as e:
                print(f"Error fetching applications: {e}")
                pending_applications = 0
            
            # Class routine with error handling
            try:
                routine_count = ClassRoutine.objects.filter(
                    department=student.department,
                    semester=student.semester,
                    shift=student.shift
                ).count()
            except Exception as e:
                print(f"Error fetching routine: {e}")
                routine_count = 0
            
            data = {
                'student': {
                    'id': str(student.id),
                    'name': student.fullNameEnglish,
                    'rollNumber': student.currentRollNumber,
                    'department': student.department.name if student.department else 'N/A',
                    'semester': student.semester,
                },
                'attendance': {
                    'totalClasses': total_classes,
                    'presentClasses': present_classes,
                    'percentage': round(attendance_percentage, 2),
                },
                'marks': {
                    'totalRecords': marks_count,
                },
                'applications': {
                    'pending': pending_applications,
                },
                'routine': {
                    'totalClasses': routine_count,
                }
            }
            
            return Response(data, status=status.HTTP_200_OK)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TeacherDashboardView(APIView):
    """
    Teacher dashboard with assigned classes
    
    GET /api/dashboard/teacher/?teacher={teacher_id}
    """
    
    def get(self, request):
        """Get teacher dashboard data"""
        teacher_id = request.query_params.get('teacher')
        if not teacher_id:
            return Response(
                {'error': 'Teacher ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            teacher = Teacher.objects.get(id=teacher_id)
            
            # Assigned classes
            assigned_classes = ClassRoutine.objects.filter(teacher=teacher)
            
            # Get unique departments and semesters
            departments = assigned_classes.values('department__name').distinct()
            semesters = assigned_classes.values('semester').distinct()
            
            # Count students in assigned classes
            total_students = 0
            for routine in assigned_classes:
                student_count = Student.objects.filter(
                    department=routine.department,
                    semester=routine.semester,
                    shift=routine.shift,
                    status='active'
                ).count()
                total_students += student_count
            
            data = {
                'teacher': {
                    'id': str(teacher.id),
                    'name': teacher.fullNameEnglish,
                    'designation': teacher.designation,
                    'department': teacher.department.name if teacher.department else None,
                },
                'assignedClasses': {
                    'total': assigned_classes.count(),
                    'departments': list(departments),
                    'semesters': list(semesters),
                },
                'students': {
                    'total': total_students,
                }
            }
            
            return Response(data, status=status.HTTP_200_OK)
        except Teacher.DoesNotExist:
            return Response(
                {'error': 'Teacher not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalyticsView(APIView):
    """
    Analytics endpoints for trends and distributions
    
    GET /api/dashboard/analytics/?type={type}
    """
    
    def get(self, request):
        """Get analytics data"""
        analytics_type = request.query_params.get('type', 'admissions-trend')
        
        try:
            if analytics_type == 'admissions-trend':
                # Admissions over time
                admissions_by_month = Admission.objects.extra(
                    select={'month': "DATE_TRUNC('month', \"submittedAt\")"}
                ).values('month').annotate(count=Count('id')).order_by('month')
                
                return Response({
                    'type': 'admissions-trend',
                    'data': list(admissions_by_month)
                })
            
            elif analytics_type == 'department-distribution':
                # Student distribution by department
                distribution = Student.objects.values(
                    'department__name', 'department__code'
                ).annotate(count=Count('id')).order_by('-count')
                
                return Response({
                    'type': 'department-distribution',
                    'data': list(distribution)
                })
            
            elif analytics_type == 'attendance-summary':
                # Overall attendance statistics
                total_records = AttendanceRecord.objects.count()
                present_records = AttendanceRecord.objects.filter(is_present=True).count()
                percentage = (present_records / total_records * 100) if total_records > 0 else 0
                
                return Response({
                    'type': 'attendance-summary',
                    'data': {
                        'totalRecords': total_records,
                        'presentRecords': present_records,
                        'percentage': round(percentage, 2)
                    }
                })
            
            elif analytics_type == 'performance-metrics':
                # Academic performance metrics
                avg_marks = MarksRecord.objects.aggregate(
                    avg_obtained=Avg('marks_obtained'),
                    avg_total=Avg('total_marks')
                )
                
                return Response({
                    'type': 'performance-metrics',
                    'data': avg_marks
                })
            
            else:
                return Response(
                    {'error': 'Invalid analytics type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
