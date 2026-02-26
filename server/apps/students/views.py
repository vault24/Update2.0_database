"""
Student Views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Student
from .serializers import (
    StudentListSerializer,
    StudentDetailSerializer,
    StudentCreateSerializer,
    StudentUpdateSerializer
)


class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Student CRUD operations
    
    Provides:
    - list: GET /api/students/
    - create: POST /api/students/
    - retrieve: GET /api/students/{id}/
    - update: PUT /api/students/{id}/
    - partial_update: PATCH /api/students/{id}/
    - destroy: DELETE /api/students/{id}/
    
    Custom actions:
    - upload_photo: POST /api/students/{id}/upload-photo/
    - transition_to_alumni: POST /api/students/{id}/transition-to-alumni/
    - disconnect_studies: POST /api/students/{id}/disconnect-studies/
    """
    queryset = Student.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'semester', 'status', 'shift', 'session']
    search_fields = ['fullNameEnglish', 'fullNameBangla', 'currentRollNumber', 'currentRegistrationNumber', 'email']
    ordering_fields = ['createdAt', 'fullNameEnglish', 'semester', 'currentRollNumber']
    ordering = ['-createdAt']
    
    def get_queryset(self):
        """
        Optimize queryset with select_related for department
        """
        return Student.objects.select_related('department').all()
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action
        """
        if self.action == 'list':
            return StudentListSerializer
        elif self.action == 'create':
            return StudentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return StudentUpdateSerializer
        else:
            return StudentDetailSerializer
    
    def list(self, request, *args, **kwargs):
        """
        List students with pagination and filtering
        GET /api/students/
        """
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new student
        POST /api/students/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return complete student data
        student = Student.objects.get(pk=serializer.instance.pk)
        response_serializer = StudentDetailSerializer(student)
        
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get student details
        GET /api/students/{id}/
        """
        return super().retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Update student
        PUT /api/students/{id}/
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return complete student data
        student = Student.objects.get(pk=instance.pk)
        response_serializer = StudentDetailSerializer(student)
        
        return Response(response_serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete student (with alumni check)
        DELETE /api/students/{id}/
        """
        instance = self.get_object()
        
        # Check if student has alumni record
        if hasattr(instance, 'alumni'):
            return Response(
                {
                    'error': 'Cannot delete student with alumni record',
                    'details': 'This student has been transitioned to alumni and cannot be deleted.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def discontinued(self, request):
        """
        Get all discontinued students
        GET /api/students/discontinued/
        
        Supports filtering by department, semester, and search
        """
        students = Student.objects.select_related('department').filter(status='discontinued')
        
        # Apply filters
        department = request.query_params.get('department')
        if department:
            students = students.filter(department_id=department)
        
        semester = request.query_params.get('semester')
        if semester:
            students = students.filter(lastSemester=semester)
        
        search = request.query_params.get('search')
        if search:
            students = students.filter(
                Q(fullNameEnglish__icontains=search) |
                Q(fullNameBangla__icontains=search) |
                Q(currentRollNumber__icontains=search)
            )
        
        # Paginate results
        page = self.paginate_queryset(students)
        if page is not None:
            serializer = StudentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search students by name, roll number, or registration number
        GET /api/students/search/?q={query}
        """
        query = request.query_params.get('q', '')
        
        if not query:
            return Response(
                {'error': 'Search query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Search in multiple fields (case-insensitive)
        students = Student.objects.select_related('department').filter(
            Q(fullNameEnglish__icontains=query) |
            Q(fullNameBangla__icontains=query) |
            Q(currentRollNumber__icontains=query) |
            Q(currentRegistrationNumber__icontains=query)
        )
        
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_identifier(self, request, identifier=None):
        """
        Get student by ID or roll number (public endpoint)
        GET /api/students/by-identifier/{id_or_roll}/
        
        This endpoint supports:
        - UUID (student database ID)
        - Roll number (currentRollNumber - college roll number)
        - Application ID (user.student_id - like SIPI-202030)
        """
        if not identifier:
            return Response(
                {'error': 'Identifier is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find student by ID first (UUID format)
        try:
            from uuid import UUID
            # Try to parse as UUID
            UUID(identifier)
            student = Student.objects.select_related('department').get(id=identifier)
            serializer = StudentDetailSerializer(student, context={'request': request})
            return Response(serializer.data)
        except (Student.DoesNotExist, ValueError):
            pass  # Continue to other search methods
        
        # Try by current roll number (college roll number)
        try:
            student = Student.objects.select_related('department').get(currentRollNumber=identifier)
            serializer = StudentDetailSerializer(student, context={'request': request})
            return Response(serializer.data)
        except Student.DoesNotExist:
            pass  # Continue to other search methods
        
        # Try by application ID (user.student_id like SIPI-202030)
        try:
            from apps.authentication.models import User
            from django.db import models
            
            # Find user with this student_id
            user = User.objects.get(student_id=identifier)
            
            # Try to find student by related_profile_id
            if user.related_profile_id:
                try:
                    student = Student.objects.select_related('department').get(id=user.related_profile_id)
                    serializer = StudentDetailSerializer(student, context={'request': request})
                    return Response(serializer.data)
                except Student.DoesNotExist:
                    # related_profile_id exists but student not found
                    return Response(
                        {
                            'error': 'Student profile not found',
                            'details': f'User {identifier} has related_profile_id but student record is missing. Please contact administration.'
                        },
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # User exists but related_profile_id is not set
                return Response(
                    {
                        'error': 'Student profile not linked',
                        'details': f'User {identifier} exists but is not linked to a student profile. The admission may still be pending or the profile was not created properly.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
        except User.DoesNotExist:
            pass  # Continue to final error
        
        # If not found by any method, return error
        return Response(
            {
                'error': 'Student not found',
                'details': f'No student found with ID or roll number: {identifier}'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'])
    def upload_photo(self, request, pk=None):
        """
        Upload student profile photo
        POST /api/students/{id}/upload-photo/
        
        Accepts: multipart/form-data with 'photo' field
        Validates: file type (jpg, png) and size (max 5MB)
        Returns: Updated student with new photo path
        """
        from utils.file_handler import (
            save_uploaded_file,
            validate_file_type,
            validate_file_size,
            delete_file
        )
        
        student = self.get_object()
        
        # Check if photo file is in request
        if 'photo' not in request.FILES:
            return Response(
                {'error': 'No photo file provided', 'details': 'Please include a photo file in the request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        photo_file = request.FILES['photo']
        
        # Validate file type (jpg, png)
        if not validate_file_type(photo_file, ['jpg', 'jpeg', 'png']):
            return Response(
                {'error': 'Invalid file type', 'details': 'Only JPG and PNG images are allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 5MB)
        if not validate_file_size(photo_file, 5):
            return Response(
                {'error': 'File too large', 'details': 'Maximum file size is 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old photo if exists
        if student.profilePhoto:
            delete_file(student.profilePhoto)
        
        # Save new photo
        try:
            relative_path = save_uploaded_file(photo_file, 'students')
            student.profilePhoto = relative_path
            student.save()
            
            # Return updated student
            serializer = StudentDetailSerializer(student)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': 'Failed to upload photo', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def transition_to_alumni(self, request, pk=None):
        """
        Transition student to alumni
        POST /api/students/{id}/transition-to-alumni/
        
        Validates:
        - Student has completed all 8 semesters
        - Student is not already an alumni
        
        Creates:
        - Alumni record with initial data
        - Updates student status to 'graduated'
        - Adds initial support history entry
        
        Returns: Created alumni record with student details
        """
        from apps.alumni.models import Alumni
        from apps.alumni.serializers import AlumniSerializer
        from django.utils import timezone
        from datetime import datetime
        
        student = self.get_object()
        
        # Check if student already has alumni record
        if hasattr(student, 'alumni'):
            return Response(
                {
                    'error': 'Student already transitioned to alumni',
                    'details': 'This student has already been transitioned to alumni status'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate 8 semesters completion
        if not student.has_completed_eighth_semester():
            return Response(
                {
                    'error': 'Cannot transition to alumni',
                    'details': 'Student must complete all 8 semesters before transitioning to alumni'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get graduation year from request or calculate from enrollment
        graduation_year = request.data.get('graduationYear')
        if not graduation_year:
            # Calculate from current year
            graduation_year = datetime.now().year
        
        # Create alumni record
        try:
            alumni = Alumni.objects.create(
                student=student,
                alumniType='recent',
                graduationYear=graduation_year,
                currentSupportCategory='no_support_needed',
                transitionDate=timezone.now()
            )
            
            # Add initial support history entry
            alumni.supportHistory = [{
                'date': timezone.now().isoformat(),
                'previousCategory': None,
                'newCategory': 'no_support_needed',
                'notes': 'Initial transition to alumni'
            }]
            alumni.save()
            
            # Update student status to graduated
            student.status = 'graduated'
            student.save()
            
            # Return alumni record
            serializer = AlumniSerializer(alumni)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': 'Failed to create alumni record', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def disconnect_studies(self, request, pk=None):
        """
        Mark student as discontinued
        POST /api/students/{id}/disconnect-studies/
        
        Required fields:
        - discontinuedReason: Reason for discontinuation
        - lastSemester: Last semester completed (optional)
        """
        student = self.get_object()
        
        # Check if student is already discontinued
        if student.status == 'discontinued':
            return Response(
                {
                    'error': 'Student already discontinued',
                    'details': 'This student has already been marked as discontinued'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get discontinuation reason from request
        discontinued_reason = request.data.get('discontinuedReason')
        if not discontinued_reason or not discontinued_reason.strip():
            return Response(
                {
                    'error': 'Reason required',
                    'details': 'Please provide a reason for discontinuation'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get last semester (optional, defaults to current semester)
        last_semester = request.data.get('lastSemester', student.semester)
        
        # Validate last semester
        if last_semester:
            try:
                last_semester = int(last_semester)
                if last_semester < 1 or last_semester > 8:
                    return Response(
                        {
                            'error': 'Invalid semester',
                            'details': 'Last semester must be between 1 and 8'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {
                        'error': 'Invalid semester',
                        'details': 'Last semester must be a valid integer'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update student status
        student.status = 'discontinued'
        student.discontinuedReason = discontinued_reason.strip()
        student.lastSemester = last_semester
        student.save()
        
        # Return updated student
        serializer = StudentDetailSerializer(student)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def semester_results(self, request, pk=None):
        """
        Get all semester results for a student
        GET /api/students/{id}/semester-results/
        
        Returns: List of semester results with GPA/CGPA or referred subjects
        """
        student = self.get_object()
        
        return Response({
            'studentId': student.id,
            'studentName': student.fullNameEnglish,
            'semesterResults': student.semesterResults
        })
    
    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """
        Bulk update student status
        POST /api/students/bulk-update-status/
        
        Request body:
        {
            "student_ids": ["uuid1", "uuid2", ...],
            "status": "active|inactive|graduated|discontinued"
        }
        """
        student_ids = request.data.get('student_ids', [])
        new_status = request.data.get('status')
        
        if not student_ids:
            return Response({
                'error': 'No students selected',
                'details': 'Please provide student_ids array'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not new_status or new_status not in ['active', 'inactive', 'graduated', 'discontinued']:
            return Response({
                'error': 'Invalid status',
                'details': 'Status must be one of: active, inactive, graduated, discontinued'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update students
        updated_count = Student.objects.filter(id__in=student_ids).update(status=new_status)
        
        return Response({
            'message': f'Successfully updated {updated_count} student(s)',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Bulk delete students
        POST /api/students/bulk-delete/
        
        Request body:
        {
            "student_ids": ["uuid1", "uuid2", ...]
        }
        """
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
            return Response({
                'error': 'No students selected',
                'details': 'Please provide student_ids array'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for alumni records
        students_with_alumni = Student.objects.filter(
            id__in=student_ids,
            alumni__isnull=False
        ).count()
        
        if students_with_alumni > 0:
            return Response({
                'error': 'Cannot delete students with alumni records',
                'details': f'{students_with_alumni} student(s) have alumni records and cannot be deleted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete students
        deleted_count, _ = Student.objects.filter(id__in=student_ids).delete()
        
        return Response({
            'message': f'Successfully deleted {deleted_count} student(s)',
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def semester_attendance(self, request, pk=None):
        """
        Get all semester attendance for a student
        GET /api/students/{id}/semester-attendance/
        
        Returns: List of semester attendance with subject-wise present/total counts
        and calculated average attendance percentage
        """
        from .validators import calculate_average_attendance
        
        student = self.get_object()
        
        # Calculate average attendance
        average_attendance = calculate_average_attendance(student.semesterAttendance)
        
        return Response({
            'studentId': student.id,
            'studentName': student.fullNameEnglish,
            'semesterAttendance': student.semesterAttendance,
            'averageAttendance': average_attendance
        })
    
    @action(detail=True, methods=['post'])
    def update_semester_results(self, request, pk=None):
        """
        Update semester results and automatically update current semester
        POST /api/students/{id}/update-semester-results/
        
        Request body:
        {
            "semester": 1,
            "year": 2024,
            "resultType": "gpa",
            "gpa": 3.75,
            "cgpa": 3.50,
            "subjects": [
                {
                    "code": "MATH-101",
                    "name": "Mathematics-I",
                    "credit": 3,
                    "grade": "A",
                    "gradePoint": 4.0
                }
            ]
        }
        """
        student = self.get_object()
        
        # Validate required fields
        semester = request.data.get('semester')
        year = request.data.get('year')
        result_type = request.data.get('resultType')
        
        if not semester or not year or not result_type:
            return Response({
                'error': 'Missing required fields',
                'details': 'semester, year, and resultType are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate semester range
        if not (1 <= semester <= 8):
            return Response({
                'error': 'Invalid semester',
                'details': 'Semester must be between 1 and 8'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate result type
        if result_type not in ['gpa', 'referred', 'pass', 'fail']:
            return Response({
                'error': 'Invalid result type',
                'details': 'resultType must be one of: gpa, referred, pass, fail'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new semester result
        new_result = {
            'semester': semester,
            'year': year,
            'resultType': result_type
        }
        
        # Add type-specific fields
        if result_type == 'gpa':
            gpa = request.data.get('gpa')
            cgpa = request.data.get('cgpa')
            subjects = request.data.get('subjects', [])
            
            if gpa is None:
                return Response({
                    'error': 'Missing GPA',
                    'details': 'GPA is required for gpa result type'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            new_result.update({
                'gpa': float(gpa),
                'cgpa': float(cgpa) if cgpa is not None else None,
                'subjects': subjects
            })
            
        elif result_type == 'referred':
            referred_subjects = request.data.get('referredSubjects', [])
            new_result['referredSubjects'] = referred_subjects
        
        # Initialize semesterResults if it doesn't exist
        if not student.semesterResults:
            student.semesterResults = []
        
        # Check if result for this semester already exists
        existing_index = None
        for i, result in enumerate(student.semesterResults):
            if result.get('semester') == semester and result.get('year') == year:
                existing_index = i
                break
        
        # Update or add the result
        if existing_index is not None:
            student.semesterResults[existing_index] = new_result
        else:
            student.semesterResults.append(new_result)
        
        # Save the student (this will trigger the signal to update current semester)
        student.save()
        
        # Return updated student data
        serializer = StudentDetailSerializer(student)
        return Response({
            'message': 'Semester results updated successfully',
            'student': serializer.data,
            'updatedResult': new_result
        })
    
    @action(detail=True, methods=['post'])
    def calculate_semester_result_from_marks(self, request, pk=None):
        """
        Calculate and update semester result based on marks records
        POST /api/students/{id}/calculate-semester-result-from-marks/
        
        Request body:
        {
            "semester": 1,
            "year": 2024
        }
        """
        from apps.marks.models import MarksRecord
        from decimal import Decimal
        
        student = self.get_object()
        
        semester = request.data.get('semester')
        year = request.data.get('year')
        
        if not semester or not year:
            return Response({
                'error': 'Missing required fields',
                'details': 'semester and year are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all marks for this student and semester
        marks_records = MarksRecord.objects.filter(
            student=student,
            semester=semester
        )
        
        if not marks_records.exists():
            return Response({
                'error': 'No marks found',
                'details': f'No marks records found for semester {semester}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Group marks by subject
        subjects_data = {}
        for mark in marks_records:
            subject_code = mark.subject_code
            if subject_code not in subjects_data:
                subjects_data[subject_code] = {
                    'code': subject_code,
                    'name': mark.subject_name,
                    'marks': {},
                    'total_marks': 0,
                    'total_possible': 0
                }
            
            # Add marks based on exam type
            subjects_data[subject_code]['marks'][mark.exam_type] = {
                'obtained': mark.marks_obtained,
                'total': mark.total_marks
            }
            subjects_data[subject_code]['total_marks'] += mark.marks_obtained
            subjects_data[subject_code]['total_possible'] += mark.total_marks
        
        # Calculate grades and GPA for each subject
        subjects = []
        total_grade_points = 0
        total_credits = 0
        
        for subject_code, subject_data in subjects_data.items():
            # Calculate percentage
            percentage = (subject_data['total_marks'] / subject_data['total_possible']) * 100 if subject_data['total_possible'] > 0 else 0
            
            # Calculate grade and grade point (standard 4.0 scale)
            if percentage >= 80:
                grade = 'A+'
                grade_point = 4.0
            elif percentage >= 75:
                grade = 'A'
                grade_point = 3.75
            elif percentage >= 70:
                grade = 'A-'
                grade_point = 3.5
            elif percentage >= 65:
                grade = 'B+'
                grade_point = 3.25
            elif percentage >= 60:
                grade = 'B'
                grade_point = 3.0
            elif percentage >= 55:
                grade = 'B-'
                grade_point = 2.75
            elif percentage >= 50:
                grade = 'C+'
                grade_point = 2.5
            elif percentage >= 45:
                grade = 'C'
                grade_point = 2.25
            elif percentage >= 40:
                grade = 'D'
                grade_point = 2.0
            else:
                grade = 'F'
                grade_point = 0.0
            
            # Assume 3 credits per subject (this can be made configurable)
            credit = 3
            
            subjects.append({
                'code': subject_code,
                'name': subject_data['name'],
                'credit': credit,
                'grade': grade,
                'gradePoint': grade_point,
                'percentage': round(percentage, 2),
                'totalMarks': subject_data['total_marks'],
                'totalPossible': subject_data['total_possible']
            })
            
            total_grade_points += grade_point * credit
            total_credits += credit
        
        # Calculate semester GPA
        semester_gpa = total_grade_points / total_credits if total_credits > 0 else 0.0
        
        # Calculate CGPA (simplified - average of all semester GPAs)
        existing_results = student.semesterResults or []
        total_gpa_sum = semester_gpa
        semester_count = 1
        
        for result in existing_results:
            if result.get('resultType') == 'gpa' and result.get('gpa') and result.get('semester') != semester:
                total_gpa_sum += result.get('gpa', 0)
                semester_count += 1
        
        cgpa = total_gpa_sum / semester_count if semester_count > 0 else semester_gpa
        
        # Create semester result
        semester_result = {
            'semester': semester,
            'year': year,
            'resultType': 'gpa',
            'gpa': round(semester_gpa, 2),
            'cgpa': round(cgpa, 2),
            'subjects': subjects
        }
        
        # Update student's semester results
        if not student.semesterResults:
            student.semesterResults = []
        
        # Check if result for this semester already exists
        existing_index = None
        for i, result in enumerate(student.semesterResults):
            if result.get('semester') == semester:
                existing_index = i
                break
        
        # Update or add the result
        if existing_index is not None:
            student.semesterResults[existing_index] = semester_result
        else:
            student.semesterResults.append(semester_result)
        
        # Save the student (this will trigger the signal to update current semester)
        student.save()
        
        return Response({
            'message': 'Semester result calculated and updated successfully',
            'semesterResult': semester_result,
            'currentSemester': student.semester,
            'status': student.status
        })
