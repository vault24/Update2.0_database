"""
Stipend Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.authentication.permissions import BlockStudentWrite
from django.db.models import Q, Avg, Count, F
from django.utils import timezone
from decimal import Decimal

from .models import StipendCriteria, StipendEligibility, StipendCriteriaSettings
from .serializers import (
    StipendCriteriaSerializer,
    StipendCriteriaSettingsSerializer,
    StipendEligibilitySerializer,
    StipendEligibilityDetailSerializer,
    EligibleStudentSerializer
)
from apps.students.models import Student


class StipendCriteriaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing stipend criteria
    """
    queryset = StipendCriteria.objects.all()
    serializer_class = StipendCriteriaSerializer
    permission_classes = [BlockStudentWrite]
    
    def perform_create(self, serializer):
        serializer.save(createdBy=self.request.user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active criteria"""
        criteria = self.queryset.filter(isActive=True)
        serializer = self.get_serializer(criteria, many=True)
        return Response(serializer.data)


class StipendCriteriaSettingsView(APIView):
    """
    GET/PUT the persisted Stipend Eligible page criteria settings (singleton).

    GET /api/stipends/settings/  -> current settings
    PUT /api/stipends/settings/  -> update and persist settings
    """
    permission_classes = [BlockStudentWrite]

    def get(self, request):
        settings_obj = StipendCriteriaSettings.get_settings()
        return Response(StipendCriteriaSettingsSerializer(settings_obj).data)

    def put(self, request):
        settings_obj = StipendCriteriaSettings.get_settings()
        serializer = StipendCriteriaSettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updatedBy=request.user)
        return Response(serializer.data)


class StipendEligibilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing stipend eligibility
    """
    queryset = StipendEligibility.objects.select_related('student', 'criteria', 'approvedBy')
    serializer_class = StipendEligibilitySerializer
    permission_classes = [BlockStudentWrite]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StipendEligibilityDetailSerializer
        return StipendEligibilitySerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by criteria
        criteria_id = self.request.query_params.get('criteria')
        if criteria_id:
            queryset = queryset.filter(criteria_id=criteria_id)
        
        # Filter by approval status
        is_approved = self.request.query_params.get('is_approved')
        if is_approved is not None:
            queryset = queryset.filter(isApproved=is_approved.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def calculate(self, request):
        """
        Calculate eligible students based on criteria
        """
        # Get criteria parameters
        min_attendance = Decimal(request.query_params.get('minAttendance', '75'))
        min_gpa = request.query_params.get('minGpa')
        if min_gpa:
            min_gpa = Decimal(min_gpa)
        pass_requirement = request.query_params.get('passRequirement', 'all_pass')
        
        # Optional filters
        department = request.query_params.get('department')
        semester = request.query_params.get('semester')
        shift = request.query_params.get('shift')
        session = request.query_params.get('session')
        search = request.query_params.get('search', '')
        
        # Start with active students
        students = Student.objects.filter(status='active').select_related('department')
        
        # Apply filters
        if department and department != 'all':
            students = students.filter(department__name=department)
        if semester and semester != 'all':
            students = students.filter(semester=int(semester))
        if shift and shift != 'all':
            students = students.filter(shift=shift)
        if session and session != 'all':
            students = students.filter(session=session)
        if search:
            students = students.filter(
                Q(fullNameEnglish__icontains=search) |
                Q(fullNameBangla__icontains=search) |
                Q(currentRollNumber__icontains=search)
            )
        
        # Calculate eligibility for each student
        eligible_students = []
        for student in students:
            # Calculate attendance
            attendance = self._calculate_attendance(student)
            
            # Get semester GPA (of the corresponding semester) and Final CGPA
            gpa, cgpa, gpa_semester = self._get_latest_gpa(student)
            
            # Get referred subjects count
            referred_count, total_subjects, passed_subjects = self._get_subject_status(student)
            
            # Check eligibility
            if attendance < min_attendance:
                continue
            if min_gpa and gpa < min_gpa:
                continue
            if not self._check_pass_requirement(referred_count, pass_requirement):
                continue
            
            # Add to eligible list
            eligible_students.append({
                'student': student,
                'attendance': attendance,
                'gpa': gpa,
                'gpaSemester': gpa_semester,
                'cgpa': cgpa,
                'referredSubjects': referred_count,
                'totalSubjects': total_subjects,
                'passedSubjects': passed_subjects,
            })
        
        # Sort by GPA (descending) and assign ranks
        eligible_students.sort(key=lambda x: (x['gpa'], x['attendance']), reverse=True)
        for idx, student_data in enumerate(eligible_students, start=1):
            student_data['rank'] = idx
        
        # Serialize the data
        serialized_data = []
        for student_data in eligible_students:
            student_obj = student_data['student']
            serialized_data.append({
                'id': str(student_obj.id),
                'name': student_obj.fullNameEnglish,
                'nameBangla': student_obj.fullNameBangla,
                'roll': student_obj.currentRollNumber,
                'department': student_obj.department.name if student_obj.department else 'Unknown',
                'semester': student_obj.semester,
                'session': student_obj.session,
                'shift': student_obj.shift,
                'photo': student_obj.profilePhoto,
                'attendance': float(student_data['attendance']),
                'gpa': float(student_data['gpa']),
                'gpaSemester': student_data['gpaSemester'],
                'cgpa': float(student_data['cgpa']),
                'referredSubjects': student_data['referredSubjects'],
                'totalSubjects': student_data['totalSubjects'],
                'passedSubjects': student_data['passedSubjects'],
                'rank': student_data['rank'],
            })
        
        # Calculate statistics
        total_eligible = len(serialized_data)
        avg_attendance = sum(s['attendance'] for s in serialized_data) / total_eligible if total_eligible > 0 else 0
        avg_gpa = sum(s['gpa'] for s in serialized_data) / total_eligible if total_eligible > 0 else 0
        all_pass_count = sum(1 for s in serialized_data if s['referredSubjects'] == 0)
        
        criteria_response = {
            'minAttendance': float(min_attendance),
            'passRequirement': pass_requirement,
        }
        if min_gpa:
            criteria_response['minGpa'] = float(min_gpa)
        
        return Response({
            'students': serialized_data,
            'statistics': {
                'totalEligible': total_eligible,
                'avgAttendance': round(avg_attendance, 2),
                'avgGpa': round(avg_gpa, 2),
                'allPassCount': all_pass_count,
                'referredCount': total_eligible - all_pass_count,
            },
            'criteria': criteria_response
        })
    
    @action(detail=False, methods=['post'])
    def save_eligibility(self, request):
        """
        Save eligibility records for students
        """
        criteria_id = request.data.get('criteriaId')
        student_ids = request.data.get('studentIds', [])
        
        if not criteria_id:
            return Response(
                {'error': 'Criteria ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            criteria = StipendCriteria.objects.get(id=criteria_id)
        except StipendCriteria.DoesNotExist:
            return Response(
                {'error': 'Criteria not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create or update eligibility records
        created_count = 0
        updated_count = 0
        
        for student_id in student_ids:
            try:
                student = Student.objects.get(id=student_id)
                
                # Calculate student data
                attendance = self._calculate_attendance(student)
                gpa, cgpa, _gpa_semester = self._get_latest_gpa(student)
                referred_count, total_subjects, passed_subjects = self._get_subject_status(student)
                
                # Create or update eligibility record
                eligibility, created = StipendEligibility.objects.update_or_create(
                    student=student,
                    criteria=criteria,
                    defaults={
                        'attendance': attendance,
                        'gpa': gpa,
                        'cgpa': cgpa,
                        'referredSubjects': referred_count,
                        'totalSubjects': total_subjects,
                        'passedSubjects': passed_subjects,
                        'isEligible': True,
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Student.DoesNotExist:
                continue
        
        # Assign ranks
        self._assign_ranks(criteria)
        
        return Response({
            'message': f'Successfully saved eligibility records',
            'created': created_count,
            'updated': updated_count,
        })
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a stipend eligibility"""
        eligibility = self.get_object()
        eligibility.isApproved = True
        eligibility.approvedBy = request.user
        eligibility.approvedAt = timezone.now()
        eligibility.save()
        
        serializer = self.get_serializer(eligibility)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def unapprove(self, request, pk=None):
        """Unapprove a stipend eligibility"""
        eligibility = self.get_object()
        eligibility.isApproved = False
        eligibility.approvedBy = None
        eligibility.approvedAt = None
        eligibility.save()
        
        serializer = self.get_serializer(eligibility)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """Bulk approve stipend eligibilities"""
        eligibility_ids = request.data.get('ids', [])
        
        updated = StipendEligibility.objects.filter(
            id__in=eligibility_ids
        ).update(
            isApproved=True,
            approvedBy=request.user,
            approvedAt=timezone.now()
        )
        
        return Response({
            'message': f'Successfully approved {updated} eligibility records',
            'count': updated
        })
    
    # Helper methods
    def _calculate_attendance(self, student):
        """Calculate average attendance for a student based on current semester"""
        if not student.semesterAttendance:
            return Decimal('0.00')
        
        # Get current semester attendance
        current_semester = student.semester
        for attendance_record in student.semesterAttendance:
            if attendance_record.get('semester') == current_semester:
                # Check if averagePercentage is provided
                if 'averagePercentage' in attendance_record:
                    return Decimal(str(attendance_record.get('averagePercentage', 0)))
                
                # Calculate from subjects if averagePercentage not provided
                subjects = attendance_record.get('subjects', [])
                if subjects:
                    total_present = sum(subj.get('present', 0) for subj in subjects)
                    total_classes = sum(subj.get('total', 0) for subj in subjects)
                    if total_classes > 0:
                        percentage = (total_present / total_classes) * 100
                        return Decimal(str(round(percentage, 2)))
                
                return Decimal('0.00')
        
        # If no attendance for current semester, return 0
        return Decimal('0.00')
    
    def _get_latest_gpa(self, student):
        """
        Get the student's semester GPA, the semester that GPA belongs to, and
        their Final CGPA.

        The GPA shown is always the GPA of the corresponding (most recently
        completed) semester — students promoted without published results keep
        the GPA of their latest completed semester.
        """
        final_cgpa = Decimal(str(student.finalCgpa)) if student.finalCgpa is not None else None

        if not student.semesterResults:
            return Decimal('0.00'), final_cgpa or Decimal('0.00'), None

        def _to_decimal(value):
            try:
                return Decimal(str(value))
            except Exception:  # noqa: BLE001 - tolerate malformed legacy data
                return Decimal('0.00')

        # Prefer the current semester's own result when it exists; otherwise
        # fall back to the highest completed semester with a GPA result.
        gpa_results = [
            r for r in student.semesterResults
            if r.get('gpa') is not None and r.get('semester') is not None
        ]
        if not gpa_results:
            return Decimal('0.00'), final_cgpa or Decimal('0.00'), None

        current = next(
            (r for r in gpa_results if r.get('semester') == student.semester), None
        )
        result = current or max(gpa_results, key=lambda r: r.get('semester') or 0)

        gpa = _to_decimal(result.get('gpa', 0))
        # Final CGPA field wins; legacy per-semester cgpa is only a fallback.
        cgpa = final_cgpa if final_cgpa is not None else _to_decimal(result.get('cgpa') or gpa)
        return gpa, cgpa, result.get('semester')
    
    def _get_subject_status(self, student):
        """Get referred subjects count for a student's corresponding semester"""
        if not student.semesterResults:
            return 0, 0, 0

        results = [r for r in student.semesterResults if r.get('semester') is not None]
        if not results:
            return 0, 6, 6  # Default: 6 subjects, all passed

        # Same "corresponding semester" rule as the GPA lookup: prefer the
        # current semester's result, otherwise the latest completed one.
        result = next(
            (r for r in results if r.get('semester') == student.semester), None
        ) or max(results, key=lambda r: r.get('semester') or 0)

        referred = len(result.get('referredSubjects') or [])
        subjects = result.get('subjects') or []
        total = len(subjects)
        passed = max(total - referred, 0)
        return referred, total, passed
    
    def _check_pass_requirement(self, referred_count, pass_requirement):
        """Check if student meets pass requirement"""
        if pass_requirement == 'all_pass':
            return referred_count == 0
        elif pass_requirement == '1_referred':
            return referred_count <= 1
        elif pass_requirement == '2_referred':
            return referred_count <= 2
        elif pass_requirement == 'any':
            return True
        return True
    
    def _assign_ranks(self, criteria):
        """Assign ranks to eligible students based on GPA"""
        eligibilities = StipendEligibility.objects.filter(
            criteria=criteria,
            isEligible=True
        ).order_by('-gpa', '-attendance')
        
        for idx, eligibility in enumerate(eligibilities, start=1):
            eligibility.rank = idx
            eligibility.save(update_fields=['rank'])
