from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db import IntegrityError
from django.db.models import Count, Q
from django.utils import timezone
from .models import AttendanceRecord
from .serializers import (
    AttendanceRecordSerializer, 
    AttendanceCreateSerializer,
    BulkAttendanceCreateSerializer,
    AttendanceApprovalSerializer
)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'student', 'subject_code', 'semester', 'date', 
        'is_present', 'status', 'class_routine', 'recorded_by'
    ]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AttendanceCreateSerializer
        elif self.action == 'bulk_create':
            return BulkAttendanceCreateSerializer
        elif self.action == 'approve_attendance':
            return AttendanceApprovalSerializer
        return AttendanceRecordSerializer
    
    def update(self, request, *args, **kwargs):
        """Override update to send notifications"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_is_present = instance.is_present
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Send notification if attendance status changed
        new_is_present = serializer.instance.is_present
        if old_is_present != new_is_present:
            try:
                from apps.notifications.utils import create_attendance_notification
                from apps.authentication.models import User
                
                # Find student's user account
                student_user = User.objects.filter(
                    related_profile_id=serializer.instance.student.id,
                    role__in=['student', 'captain']
                ).first()
                
                if student_user:
                    create_attendance_notification(student_user, serializer.instance, action='updated')
            except Exception as e:
                print(f"Failed to send notification: {str(e)}")
        
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to send notifications"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def student_summary(self, request):
        """Get attendance summary for a student"""
        student_id = request.query_params.get('student')
        if not student_id:
            return Response(
                {'error': 'Student ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Count all non-rejected attendance so captain submissions (pending)
        # are reflected immediately in student-side totals.
        records = AttendanceRecord.objects.filter(
            student_id=student_id
        ).exclude(
            status__in=['rejected', 'draft']
        )
        
        summary = records.values('subject_code', 'subject_name').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(is_present=True))
        )
        
        for item in summary:
            item['percentage'] = (
                (item['present'] / item['total'] * 100) 
                if item['total'] > 0 else 0
            )
        
        return Response({'summary': list(summary)})
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create attendance records (for captain or teacher)"""
        # Log the incoming request data for debugging
        print("=== BULK CREATE REQUEST ===")
        print(f"Request data: {request.data}")
        print(f"Request user: {request.user}")
        print(f"User ID: {request.user.id if request.user else 'None'}")
        
        # Extract records and routine_id from request
        records_data = request.data.get('records', [])
        routine_id = request.data.get('class_routine_id')
        routine = None
        
        if not records_data:
            return Response(
                {'error': 'No records provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"Records count: {len(records_data)}")
        print(f"Routine ID: {routine_id}")
        request_user_id = getattr(request.user, 'id', None)

        # Validate routine once. Do not silently create records without routine linkage.
        if routine_id:
            from apps.class_routines.models import ClassRoutine
            try:
                routine = ClassRoutine.objects.get(id=routine_id)
            except ClassRoutine.DoesNotExist:
                return Response(
                    {'error': f'Class routine not found: {routine_id}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        created_records = []
        errors = []
        
        for idx, record_data in enumerate(records_data):
            try:
                print(f"\n--- Processing record {idx + 1} ---")
                print(f"Record data: {record_data}")
                
                # Convert camelCase to snake_case if needed
                processed_data = {
                    'student_id': record_data.get('student'),
                    'subject_code': record_data.get('subject_code') or record_data.get('subjectCode'),
                    'subject_name': record_data.get('subject_name') or record_data.get('subjectName'),
                    'semester': record_data.get('semester'),
                    'date': record_data.get('date'),
                    'is_present': record_data.get('is_present') if 'is_present' in record_data else record_data.get('isPresent'),
                    'status': record_data.get('status', 'direct'),
                    'notes': record_data.get('notes', ''),
                    'recorded_by': record_data.get('recorded_by') or record_data.get('recordedBy') or request_user_id,
                }
                
                # Add routine if provided
                if routine:
                    processed_data['class_routine_id'] = routine.id
                
                # Get recorded_by user object
                from apps.authentication.models import User
                if processed_data['recorded_by']:
                    try:
                        recorded_by_user = User.objects.get(id=processed_data['recorded_by'])
                        processed_data['recorded_by'] = recorded_by_user
                    except User.DoesNotExist:
                        processed_data['recorded_by'] = request.user if getattr(request.user, 'is_authenticated', False) else None
                else:
                    processed_data['recorded_by'] = request.user if getattr(request.user, 'is_authenticated', False) else None
                
                print(f"Processed data: {processed_data}")
                
                # Check if record already exists
                # Prefer routine-scoped identity to avoid cross-class overwrites.
                if processed_data.get('class_routine_id'):
                    existing = AttendanceRecord.objects.filter(
                        student_id=processed_data['student_id'],
                        class_routine_id=processed_data['class_routine_id'],
                        date=processed_data['date']
                    ).first()
                    # Backward-compat fallback for databases still on old uniqueness.
                    # Only relink legacy rows that have no routine set.
                    if not existing:
                        existing = AttendanceRecord.objects.filter(
                            student_id=processed_data['student_id'],
                            subject_code=processed_data['subject_code'],
                            date=processed_data['date'],
                            class_routine__isnull=True
                        ).first()
                else:
                    existing = AttendanceRecord.objects.filter(
                        student_id=processed_data['student_id'],
                        subject_code=processed_data['subject_code'],
                        date=processed_data['date']
                    ).first()
                
                if existing:
                    print(f"Updating existing record: {existing.id}")
                    # Update existing record
                    existing.subject_name = processed_data['subject_name']
                    existing.semester = processed_data['semester']
                    existing.is_present = processed_data['is_present']
                    existing.status = processed_data['status']
                    existing.notes = processed_data['notes']
                    existing.recorded_by = processed_data['recorded_by']
                    if 'class_routine_id' in processed_data:
                        existing.class_routine_id = processed_data['class_routine_id']
                    existing.save()
                    created_records.append(existing)
                else:
                    print(f"Creating new record")
                    # Create new record (fallback to update if legacy unique constraint conflicts)
                    try:
                        record = AttendanceRecord.objects.create(**processed_data)
                    except IntegrityError:
                        fallback_existing = AttendanceRecord.objects.filter(
                            student_id=processed_data['student_id'],
                            subject_code=processed_data['subject_code'],
                            date=processed_data['date'],
                            class_routine__isnull=True
                        ).first()
                        if not fallback_existing:
                            raise

                        fallback_existing.subject_name = processed_data['subject_name']
                        fallback_existing.semester = processed_data['semester']
                        fallback_existing.is_present = processed_data['is_present']
                        fallback_existing.status = processed_data['status']
                        fallback_existing.notes = processed_data['notes']
                        fallback_existing.recorded_by = processed_data['recorded_by']
                        if 'class_routine_id' in processed_data:
                            fallback_existing.class_routine_id = processed_data['class_routine_id']
                        fallback_existing.save()
                        created_records.append(fallback_existing)
                        continue
                    print(f"Created record: {record.id}")
                    created_records.append(record)
                    
            except Exception as e:
                print(f"Error processing record {idx + 1}: {str(e)}")
                import traceback
                traceback.print_exc()
                errors.append({
                    'student': str(record_data.get('student', '')),
                    'error': str(e)
                })
        
        # Send notifications to students
        print(f"\n=== SENDING NOTIFICATIONS ===")
        try:
            from apps.notifications.utils import send_bulk_attendance_notifications
            notifications = send_bulk_attendance_notifications(created_records, action='marked')
            print(f"Sent {len(notifications)} notifications successfully")
            for notif in notifications:
                print(f"  - Notification {notif.id} to user {notif.recipient.username}: {notif.title}")
        except Exception as e:
            print(f"Failed to send notifications: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Ensure all records are refreshed from database
        for record in created_records:
            record.refresh_from_db()
        
        # Debug: Print created records details
        print(f"\n=== CREATED RECORDS SUMMARY ===")
        for record in created_records:
            print(f"Record {record.id}: student={record.student_id}, subject={record.subject_code}, "
                  f"date={record.date}, status={record.status}, class_routine={record.class_routine_id}")
        
        # Verify records are in database
        if routine_id:
            verification_count = AttendanceRecord.objects.filter(
                class_routine_id=routine_id,
                date=records_data[0].get('date') if records_data else None
            ).count()
            print(f"\n✓ Verification: {verification_count} records found in database for this routine and date")
        
        response_serializer = AttendanceRecordSerializer(created_records, many=True)
        
        print(f"\n✓ Bulk create completed successfully: {len(created_records)} records")
        
        if errors and not created_records:
            return Response({
                'created': len(created_records),
                'errors': errors,
                'records': response_serializer.data
            }, status=status.HTTP_400_BAD_REQUEST)

        if errors:
            return Response({
                'created': len(created_records),
                'errors': errors,
                'records': response_serializer.data
            }, status=status.HTTP_207_MULTI_STATUS)

        return Response({
            'created': len(created_records),
            'errors': errors,
            'records': response_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def approve_attendance(self, request):
        """Approve or reject attendance records (for teachers)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        attendance_ids = serializer.validated_data['attendance_ids']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')
        
        records = AttendanceRecord.objects.filter(
            id__in=attendance_ids,
            status='pending'
        )
        
        if not records.exists():
            return Response(
                {'error': 'No pending records found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        updated_records = []
        updated_count = 0
        for record in records:
            if action_type == 'approve':
                record.status = 'approved'
                record.approved_by = request.user
                record.approved_at = timezone.now()
            else:  # reject
                record.status = 'rejected'
                record.rejection_reason = rejection_reason
                record.approved_by = request.user
                record.approved_at = timezone.now()
            
            record.save()
            updated_records.append(record)
            updated_count += 1
        
        # Send notifications to students
        try:
            from apps.notifications.utils import send_bulk_attendance_notifications
            send_bulk_attendance_notifications(updated_records, action=action_type + 'd')
        except Exception as e:
            print(f"Failed to send notifications: {str(e)}")
        
        return Response({
            'message': f'{updated_count} records {action_type}d successfully',
            'updated': updated_count
        })
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get pending attendance records for teacher approval"""
        # Filter by teacher's subjects if needed
        subject_code = request.query_params.get('subject_code')
        date = request.query_params.get('date')
        
        queryset = AttendanceRecord.objects.filter(status='pending')
        
        # Filter by logged-in teacher's classes
        # If user is a teacher, only show pending approvals for their classes
        if request.user.role == 'teacher' and request.user.related_profile_id:
            # Get all class routines for this teacher
            from apps.class_routines.models import ClassRoutine
            teacher_routines = ClassRoutine.objects.filter(teacher_id=request.user.related_profile_id)
            # Filter attendance records by these routines
            queryset = queryset.filter(class_routine__in=teacher_routines)
        
        if subject_code:
            queryset = queryset.filter(subject_code=subject_code)
        if date:
            queryset = queryset.filter(date=date)
        
        # Group by date and subject
        records = queryset.order_by('-date', 'subject_code')
        serializer = AttendanceRecordSerializer(records, many=True)
        
        return Response({
            'count': records.count(),
            'records': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def by_routine(self, request):
        """Get attendance records for a specific routine"""
        routine_id = request.query_params.get('routine_id')
        date = request.query_params.get('date')
        status_in = request.query_params.get('status_in')
        
        if not routine_id:
            return Response(
                {'error': 'Routine ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = AttendanceRecord.objects.filter(class_routine_id=routine_id)
        
        if date:
            queryset = queryset.filter(date=date)
        if status_in:
            statuses = [s.strip() for s in status_in.split(',') if s.strip()]
            if statuses:
                queryset = queryset.filter(status__in=statuses)
        
        serializer = AttendanceRecordSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def teacher_subject_summary(self, request):
        """Get attendance summary by subject for a teacher"""
        print("\n=== TEACHER SUBJECT SUMMARY REQUEST ===")
        
        # Get teacher's routines
        if request.user.role != 'teacher' or not request.user.related_profile_id:
            return Response(
                {'error': 'Teacher profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        teacher_id = request.user.related_profile_id
        print(f"Teacher ID: {teacher_id}")
        
        from apps.class_routines.models import ClassRoutine
        teacher_routines = ClassRoutine.objects.filter(teacher_id=teacher_id, is_active=True)
        print(f"Found {teacher_routines.count()} active routines")
        
        # Group by class identity (subject + department + semester + shift + session)
        # so same subject in different classes doesn't merge, and multiple periods
        # for the same class are aggregated correctly.
        subjects = {}
        routine_to_subject_key = {}
        for routine in teacher_routines:
            key = f"{routine.subject_code}::{routine.department_id}::{routine.semester}::{routine.shift}::{routine.session}"
            routine_id = str(routine.id)
            routine_to_subject_key[routine_id] = key
            if key not in subjects:
                subjects[key] = {
                    'subject_code': routine.subject_code,
                    'subject_name': routine.subject_name,
                    'department': routine.department.name,
                    'semester': routine.semester,
                    'shift': routine.shift,
                    'session': routine.session,
                    'routine_id': routine_id,
                    'routine_ids': set(),
                    'total_classes': 0,
                    'students': {},
                    'class_sessions': set(),
                }
            subjects[key]['routine_ids'].add(routine_id)
        
        print(f"Grouped into {len(subjects)} class groups")
        
        # Get all attendance records for these routines
        attendance_records = AttendanceRecord.objects.filter(
            class_routine__in=teacher_routines,
            status__in=['approved', 'direct']
        ).select_related('student', 'class_routine')
        
        print(f"Found {attendance_records.count()} attendance records")
        
        # Aggregate classes and student attendance per class group.
        # Use one attendance contribution per student per date to avoid
        # inflation from legacy duplicate records.
        seen_student_sessions = set()
        for record in attendance_records:
            if not record.class_routine_id:
                continue

            routine_key = str(record.class_routine_id)
            subject_key = routine_to_subject_key.get(routine_key)
            if not subject_key or subject_key not in subjects:
                continue

            student_id = str(record.student.id)
            # Count one class per routine per date so different periods for the
            # same subject/day are counted separately.
            session_key = f"{routine_key}::{record.date.isoformat()}"
            subjects[subject_key]['class_sessions'].add(session_key)
            # Deduplicate only exact duplicate rows of the same routine/date.
            student_session_key = f"{subject_key}::{student_id}::{session_key}"
            if student_session_key in seen_student_sessions:
                continue
            seen_student_sessions.add(student_session_key)
            
            if student_id not in subjects[subject_key]['students']:
                subjects[subject_key]['students'][student_id] = {
                    'student_id': student_id,
                    'student_name': record.student.fullNameEnglish,
                    'student_roll': record.student.currentRollNumber,
                    'present': 0,
                    'absent': 0,
                    'total': 0,
                    'percentage': 0
                }
            
            subjects[subject_key]['students'][student_id]['total'] += 1
            if record.is_present:
                subjects[subject_key]['students'][student_id]['present'] += 1
            else:
                subjects[subject_key]['students'][student_id]['absent'] += 1
        
        # Calculate percentages
        for subject in subjects.values():
            for student in subject['students'].values():
                if student['total'] > 0:
                    student['percentage'] = round((student['present'] / student['total']) * 100, 1)
            
            subject['total_classes'] = len(subject['class_sessions'])
            subject['routine_ids'] = sorted(list(subject['routine_ids']))
            subject.pop('class_sessions', None)
            # Convert students dict to list
            subject['students'] = list(subject['students'].values())
            # Sort by roll number
            subject['students'].sort(key=lambda x: x['student_roll'])
        
        return Response({
            'subjects': list(subjects.values())
        })
