"""
Management command to test attendance submission flow
Usage: python manage.py test_attendance_flow
"""
from django.core.management.base import BaseCommand
from apps.attendance.models import AttendanceRecord
from apps.students.models import Student
from apps.authentication.models import User
from apps.class_routines.models import ClassRoutine
from apps.notifications.models import Notification
from datetime import date


class Command(BaseCommand):
    help = 'Test attendance submission and notification flow'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== Testing Attendance Flow ===\n'))
        
        # 1. Check if we have students
        students = Student.objects.filter(status='active')[:2]
        if not students:
            self.stdout.write(self.style.ERROR('No active students found!'))
            return
        
        self.stdout.write(f'Found {students.count()} students:')
        for student in students:
            self.stdout.write(f'  - {student.fullNameEnglish} (ID: {student.id})')
            
            # Check if student has a user account
            user = User.objects.filter(
                related_profile_id=student.id,
                role__in=['student', 'captain']
            ).first()
            
            if user:
                self.stdout.write(self.style.SUCCESS(f'    ✓ Has user account: {user.username} (ID: {user.id})'))
            else:
                self.stdout.write(self.style.WARNING(f'    ✗ No user account found'))
        
        # 2. Check if we have class routines
        routines = ClassRoutine.objects.filter(is_active=True)[:1]
        if not routines:
            self.stdout.write(self.style.ERROR('\nNo active class routines found!'))
            return
        
        routine = routines[0]
        self.stdout.write(f'\nFound routine:')
        self.stdout.write(f'  - {routine.subject_name} ({routine.subject_code})')
        self.stdout.write(f'  - Teacher: {routine.teacher.fullNameEnglish if routine.teacher else "None"}')
        self.stdout.write(f'  - Department: {routine.department.name}')
        self.stdout.write(f'  - Semester: {routine.semester}')
        
        # 3. Check if teacher has a user account
        if routine.teacher:
            teacher_user = User.objects.filter(
                related_profile_id=routine.teacher.id,
                role='teacher'
            ).first()
            
            if teacher_user:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Teacher has user account: {teacher_user.username}'))
            else:
                self.stdout.write(self.style.WARNING(f'  ✗ Teacher has no user account'))
        
        # 4. Create test attendance records
        self.stdout.write(f'\n=== Creating Test Attendance Records ===')
        
        test_date = date.today()
        created_count = 0
        
        for student in students:
            # Check if record already exists
            existing = AttendanceRecord.objects.filter(
                student=student,
                subject_code=routine.subject_code,
                date=test_date
            ).first()
            
            if existing:
                self.stdout.write(f'  - Record already exists for {student.fullNameEnglish}, updating...')
                existing.is_present = True
                existing.status = 'direct'
                existing.class_routine = routine
                existing.save()
                record = existing
            else:
                self.stdout.write(f'  - Creating new record for {student.fullNameEnglish}...')
                record = AttendanceRecord.objects.create(
                    student=student,
                    subject_code=routine.subject_code,
                    subject_name=routine.subject_name,
                    semester=routine.semester,
                    date=test_date,
                    is_present=True,
                    status='direct',
                    class_routine=routine,
                    recorded_by=teacher_user if routine.teacher and teacher_user else None
                )
            
            self.stdout.write(self.style.SUCCESS(f'    ✓ Record created/updated: {record.id}'))
            self.stdout.write(f'      - Status: {record.status}')
            self.stdout.write(f'      - Class Routine: {record.class_routine_id}')
            created_count += 1
        
        # 5. Test notification creation
        self.stdout.write(f'\n=== Testing Notification Creation ===')
        
        from apps.notifications.utils import send_bulk_attendance_notifications
        
        records = AttendanceRecord.objects.filter(
            subject_code=routine.subject_code,
            date=test_date
        )
        
        try:
            notifications = send_bulk_attendance_notifications(list(records), action='marked')
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(notifications)} notifications'))
            
            for notif in notifications:
                self.stdout.write(f'  - Notification {notif.id}')
                self.stdout.write(f'    To: {notif.recipient.username}')
                self.stdout.write(f'    Title: {notif.title}')
                self.stdout.write(f'    Status: {notif.status}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Failed to create notifications: {str(e)}'))
            import traceback
            traceback.print_exc()
        
        # 6. Verify records appear in teacher summary
        self.stdout.write(f'\n=== Checking Teacher Summary ===')
        
        summary_records = AttendanceRecord.objects.filter(
            class_routine=routine,
            status__in=['approved', 'direct']
        )
        
        self.stdout.write(f'Found {summary_records.count()} records in teacher summary')
        for record in summary_records:
            self.stdout.write(f'  - {record.student.fullNameEnglish}: {record.date} - {"Present" if record.is_present else "Absent"}')
        
        self.stdout.write(self.style.SUCCESS('\n=== Test Complete ===\n'))
