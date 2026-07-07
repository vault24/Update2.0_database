"""
Correction Request Views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.authentication.permissions import IsAdminRole
from .models import CorrectionRequest
from .serializers import (
    CorrectionRequestSerializer,
    CorrectionRequestCreateSerializer,
    CorrectionRequestReviewSerializer
)


# Student fields a correction request may change once approved. Intentionally
# EXCLUDES academic / identity keys (currentRollNumber, semester, department,
# status, finalCgpa, gpa, session, shift, …): those are never self-correctable,
# only editable by an admin through the student-management screens. Approving a
# correction can therefore never tamper with grades, promotion or enrolment.
ALLOWED_CORRECTION_FIELDS = {
    'fullNameEnglish', 'fullNameBangla', 'fatherName', 'motherName',
    'fatherNID', 'motherNID', 'dateOfBirth', 'birthCertificateNo',
    'nidNumber', 'gender', 'religion', 'bloodGroup', 'nationality',
    'maritalStatus', 'mobileStudent', 'guardianMobile', 'email',
    'emergencyContact', 'presentAddress', 'permanentAddress',
}


class CorrectionRequestViewSet(viewsets.ModelViewSet):
    queryset = CorrectionRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'status', 'field_name']

    def get_permissions(self):
        # Only admins may approve/reject (and thereby write to student records).
        if self.action in ('approve', 'reject'):
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return CorrectionRequestCreateSerializer
        elif self.action in ['approve', 'reject']:
            return CorrectionRequestReviewSerializer
        return CorrectionRequestSerializer

    def _student_profile(self, user):
        if getattr(user, 'role', None) not in ('student', 'captain'):
            return None
        pid = getattr(user, 'related_profile_id', None)
        if not pid:
            return None
        from apps.students.models import Student
        return Student.objects.filter(id=pid).first()

    def get_queryset(self):
        """Students/captains see only their OWN correction requests; admins all."""
        qs = CorrectionRequest.objects.all()
        user = self.request.user
        if not (user and user.is_authenticated):
            return qs.none()
        if user.is_superuser or user.is_staff or user.is_admin():
            return qs
        if user.role in ('student', 'captain'):
            student = self._student_profile(user)
            return qs.filter(student=student) if student else qs.none()
        return qs.none()

    def perform_create(self, serializer):
        """
        A student/captain may only file a correction for their OWN record — the
        target student is forced to their linked profile, never trusted from the
        request body (which previously let them target any student).
        """
        user = self.request.user
        if user.is_superuser or user.is_staff or user.is_admin():
            serializer.save(requested_by=user)
            return
        student = self._student_profile(user)
        if not student:
            raise PermissionDenied('Only a student may file a correction request.')
        serializer.save(requested_by=user, student=student)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        correction_request = self.get_object()

        if correction_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        field_name = correction_request.field_name
        if field_name not in ALLOWED_CORRECTION_FIELDS:
            return Response(
                {'error': f'The field "{field_name}" cannot be changed through a '
                          f'correction request.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        correction_request.status = 'approved'
        correction_request.reviewed_at = timezone.now()
        correction_request.reviewed_by = request.user
        correction_request.review_notes = serializer.validated_data.get('review_notes', '')
        correction_request.save()

        # Apply the correction to the student record (whitelisted field only).
        student = correction_request.student
        if student and hasattr(student, field_name):
            setattr(student, field_name, correction_request.requested_value)
            student.save(update_fields=[field_name])

        return Response(
            CorrectionRequestSerializer(correction_request).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        correction_request = self.get_object()

        if correction_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        correction_request.status = 'rejected'
        correction_request.reviewed_at = timezone.now()
        correction_request.reviewed_by = request.user
        correction_request.review_notes = serializer.validated_data.get('review_notes', '')
        correction_request.save()

        return Response(
            CorrectionRequestSerializer(correction_request).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """The caller's own correction requests only (no arbitrary student id)."""
        user = request.user
        if user.is_superuser or user.is_staff or user.is_admin():
            student_id = request.query_params.get('student')
            requests = CorrectionRequest.objects.all()
            if student_id:
                requests = requests.filter(student_id=student_id)
        else:
            student = self._student_profile(user)
            if not student:
                return Response({'requests': []})
            requests = CorrectionRequest.objects.filter(student=student)

        serializer = CorrectionRequestSerializer(requests, many=True)
        return Response({'requests': serializer.data})
