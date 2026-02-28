"""
Dashboard Views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Avg
from django.contrib.auth import get_user_model
from apps.students.models import Student
from apps.alumni.models import Alumni
from apps.applications.models import Application
from apps.admissions.models import Admission
from apps.teachers.models import Teacher
from apps.departments.models import Department
from apps.attendance.models import AttendanceRecord
from apps.marks.models import MarksRecord
from apps.class_routines.models import ClassRoutine
from uuid import UUID

User = get_user_model()

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
            recent_admissions = Admission.objects.filter(status='pending').order_by('-submitted_at')[:5]
            recent_applications = Application.objects.filter(status='pending').order_by('-submitted_at')[:5]
            
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

    def _to_float(self, value):
        """Safely parse numeric values from JSON fields."""
        try:
            if value is None:
                return None
            number = float(value)
            if number < 0:
                return None
            return number
        except (TypeError, ValueError):
            return None

    def _extract_current_gpa(self, student):
        """
        Extract student's current GPA from semester results.
        Uses the latest semester GPA record (falls back to CGPA only if GPA missing).
        """
        semester_results = student.semesterResults or []
        if not isinstance(semester_results, list):
            return None

        best_semester = -1
        best_gpa = None

        for result in semester_results:
            if not isinstance(result, dict):
                continue

            if str(result.get('resultType', '')).lower() != 'gpa':
                continue

            try:
                semester_value = int(result.get('semester', 0))
            except (TypeError, ValueError):
                semester_value = 0

            gpa_value = self._to_float(result.get('gpa'))
            if gpa_value is None:
                gpa_value = self._to_float(result.get('cgpa'))

            if gpa_value is None:
                continue

            if semester_value > best_semester:
                best_semester = semester_value
                best_gpa = gpa_value

        if best_gpa is None:
            return None

        return round(best_gpa, 2)

    def _calculate_class_rank(self, student):
        """
        Rank student by current GPA within same department + semester + shift.
        Rank formula: sorted index (0-based) + 1.
        """
        peers = Student.objects.filter(
            department=student.department,
            semester=student.semester,
            shift=student.shift,
            status='active'
        ).only('id', 'currentRollNumber', 'semesterResults')

        cohort_size = peers.count()
        ranked_students = []

        for peer in peers:
            peer_gpa = self._extract_current_gpa(peer)
            if peer_gpa is None:
                continue
            ranked_students.append({
                'id': peer.id,
                'roll': peer.currentRollNumber or '',
                'gpa': peer_gpa
            })

        ranked_students.sort(key=lambda row: (-row['gpa'], row['roll']))

        class_rank = None
        student_current_gpa = self._extract_current_gpa(student)

        if student_current_gpa is not None:
            for index, row in enumerate(ranked_students):
                if row['id'] == student.id:
                    class_rank = index + 1
                    break

        return {
            'current_gpa': student_current_gpa,
            'class_rank': class_rank,
            'cohort_size': cohort_size,
            'ranked_students': len(ranked_students),
        }
    
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
                # Keep student dashboard aligned with attendance page logic:
                # count pending/approved/direct and exclude rejected/draft.
                attendance_records = AttendanceRecord.objects.filter(
                    student=student
                ).exclude(
                    status__in=['rejected', 'draft']
                )
                total_classes = attendance_records.count()
                present_classes = attendance_records.filter(is_present=True).count()
                attendance_percentage = (present_classes / total_classes * 100) if total_classes > 0 else 0

                # Fallback to semesterAttendance when there are no attendance records
                if total_classes == 0:
                    semester_attendance = student.semesterAttendance or []
                    current_semester_record = None

                    for record in semester_attendance:
                        if isinstance(record, dict) and record.get('semester') == student.semester:
                            current_semester_record = record
                            break

                    if not current_semester_record and semester_attendance:
                        current_semester_record = max(
                            [r for r in semester_attendance if isinstance(r, dict)],
                            key=lambda r: r.get('semester', 0),
                            default=None
                        )

                    if current_semester_record:
                        subjects = current_semester_record.get('subjects', [])
                        total_present = 0
                        total_subject_classes = 0

                        for subject in subjects:
                            if not isinstance(subject, dict):
                                continue
                            total_present += subject.get('present', 0)
                            total_subject_classes += subject.get('total', 0)

                        if total_subject_classes > 0:
                            total_classes = total_subject_classes
                            present_classes = total_present
                            attendance_percentage = (total_present / total_subject_classes * 100)
                        else:
                            average_percentage = current_semester_record.get('averagePercentage')
                            if average_percentage is not None:
                                attendance_percentage = float(average_percentage)
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

            # GPA + class rank within department/semester/shift
            performance = self._calculate_class_rank(student)
            
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
                },
                'performance': {
                    'currentGpa': performance['current_gpa'],
                    'classRank': performance['class_rank'],
                    'cohortSize': performance['cohort_size'],
                    'rankedStudents': performance['ranked_students'],
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
    
    def _resolve_teacher_profile_id(self, request, raw_teacher_id):
        """
        Resolve teacher profile UUID from:
        1) authenticated teacher session,
        2) direct teacher UUID query param,
        3) legacy numeric auth user ID query param.
        """
        if request.user.is_authenticated and request.user.role == 'teacher':
            if request.user.related_profile_id:
                return str(request.user.related_profile_id)
            teacher_by_email = Teacher.objects.filter(email=request.user.email).only('id').first()
            if teacher_by_email:
                return str(teacher_by_email.id)

        if not raw_teacher_id:
            return None

        # Direct teacher UUID
        try:
            return str(UUID(str(raw_teacher_id)))
        except (TypeError, ValueError):
            pass

        # Legacy fallback: numeric auth user id -> related teacher profile UUID
        if str(raw_teacher_id).isdigit():
            teacher_user = User.objects.filter(
                id=int(raw_teacher_id),
                role='teacher'
            ).only('related_profile_id', 'email').first()
            if teacher_user:
                if teacher_user.related_profile_id:
                    return str(teacher_user.related_profile_id)
                teacher_by_email = Teacher.objects.filter(email=teacher_user.email).only('id').first()
                if teacher_by_email:
                    return str(teacher_by_email.id)

        return None

    def get(self, request):
        """Get teacher dashboard data"""
        teacher_id = request.query_params.get('teacher')
        resolved_teacher_id = self._resolve_teacher_profile_id(request, teacher_id)
        if not resolved_teacher_id:
            return Response(
                {'error': 'Valid teacher ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            teacher = Teacher.objects.get(id=resolved_teacher_id)
            
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
                # Admissions over time (last 6 months)
                from datetime import datetime, timedelta
                from django.db.models.functions import TruncMonth
                
                six_months_ago = datetime.now() - timedelta(days=180)
                admissions_by_month = Admission.objects.filter(
                    submitted_at__gte=six_months_ago
                ).annotate(
                    month=TruncMonth('submitted_at')
                ).values('month').annotate(
                    pending=Count('id', filter=Q(status='pending')),
                    approved=Count('id', filter=Q(status='approved'))
                ).order_by('month')
                
                # Format data for chart
                chart_data = []
                for item in admissions_by_month:
                    month_name = item['month'].strftime('%b')
                    chart_data.append({
                        'name': month_name,
                        'pending': item['pending'],
                        'approved': item['approved']
                    })
                
                return Response({
                    'type': 'admissions-trend',
                    'data': chart_data
                })
            
            elif analytics_type == 'department-distribution':
                # Student distribution by department
                distribution = Student.objects.filter(
                    status='active'
                ).values(
                    'department__name', 'department__code'
                ).annotate(count=Count('id')).order_by('-count')
                
                # Format data for pie chart
                chart_data = []
                colors = [
                    'hsl(187, 92%, 35%)',
                    'hsl(199, 89%, 48%)',
                    'hsl(38, 92%, 50%)',
                    'hsl(142, 76%, 36%)',
                    'hsl(270, 70%, 55%)',
                    'hsl(340, 75%, 55%)',
                ]
                for idx, item in enumerate(distribution):
                    chart_data.append({
                        'name': item['department__name'] or 'Unknown',
                        'value': item['count'],
                        'color': colors[idx % len(colors)]
                    })
                
                return Response({
                    'type': 'department-distribution',
                    'data': chart_data
                })
            
            elif analytics_type == 'attendance-by-semester':
                # Average attendance by semester
                attendance_by_semester = []
                
                for semester in range(1, 9):
                    students_in_semester = Student.objects.filter(
                        semester=semester,
                        status='active'
                    )
                    
                    if students_in_semester.count() == 0:
                        continue
                    
                    # Calculate average attendance from semesterAttendance JSON field
                    total_percentage = 0
                    count = 0
                    
                    for student in students_in_semester:
                        if student.semesterAttendance:
                            for record in student.semesterAttendance:
                                if isinstance(record, dict) and record.get('semester') == semester:
                                    avg_pct = record.get('averagePercentage')
                                    if avg_pct is not None:
                                        try:
                                            total_percentage += float(avg_pct)
                                            count += 1
                                        except (TypeError, ValueError):
                                            pass
                    
                    avg_attendance = round(total_percentage / count, 2) if count > 0 else 0
                    
                    attendance_by_semester.append({
                        'semester': f'Sem {semester}',
                        'attendance': avg_attendance if avg_attendance > 0 else 85  # Default fallback
                    })
                
                return Response({
                    'type': 'attendance-by-semester',
                    'data': attendance_by_semester
                })
            
            elif analytics_type == 'gpa-trend':
                # Average GPA trend by year
                from datetime import datetime
                
                gpa_by_year = []
                current_year = datetime.now().year
                
                for year in range(current_year - 5, current_year + 1):
                    students = Student.objects.filter(status__in=['active', 'graduated'])
                    
                    total_gpa = 0
                    count = 0
                    
                    for student in students:
                        if student.semesterResults:
                            for result in student.semesterResults:
                                if isinstance(result, dict):
                                    result_type = str(result.get('resultType', '')).lower()
                                    if result_type == 'gpa':
                                        gpa_value = result.get('gpa') or result.get('cgpa')
                                        if gpa_value:
                                            try:
                                                total_gpa += float(gpa_value)
                                                count += 1
                                            except (TypeError, ValueError):
                                                pass
                    
                    avg_gpa = round(total_gpa / count, 2) if count > 0 else 3.2
                    
                    gpa_by_year.append({
                        'year': str(year),
                        'gpa': avg_gpa
                    })
                
                return Response({
                    'type': 'gpa-trend',
                    'data': gpa_by_year
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
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
