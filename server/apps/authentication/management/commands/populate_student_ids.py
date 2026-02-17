"""
Management command to populate student_id for existing users
"""
from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.students.models import Student
from django.db import transaction


class Command(BaseCommand):
    help = 'Populate student_id for existing users based on their SSC Board Roll'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Update even if student_id already exists',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("POPULATE STUDENT IDs"))
        self.stdout.write("=" * 70)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n🔍 DRY RUN MODE - No changes will be made\n"))
        
        # Get users that need student_id
        if force:
            users = User.objects.filter(role__in=['student', 'captain'])
            self.stdout.write(f"\n📋 Processing ALL {users.count()} student/captain users (force mode)\n")
        else:
            users = User.objects.filter(
                role__in=['student', 'captain'],
                student_id__isnull=True
            )
            self.stdout.write(f"\n📋 Processing {users.count()} users without student_id\n")
        
        if users.count() == 0:
            self.stdout.write(self.style.SUCCESS("\n✓ All users already have student_id!\n"))
            return
        
        # Statistics
        stats = {
            'updated': 0,
            'no_profile': 0,
            'no_ssc_roll': 0,
            'invalid_roll': 0,
            'errors': 0,
            'skipped': 0,
            'duplicates': 0
        }
        
        # Track student IDs being assigned in this run
        assigned_ids = set()
        
        with transaction.atomic():
            for user in users:
                try:
                    # Check if user has related profile
                    if not user.related_profile_id:
                        stats['no_profile'] += 1
                        self.stdout.write(
                            f"  ⚠ {user.email}: No related_profile_id"
                        )
                        continue
                    
                    # Get student profile
                    try:
                        student = Student.objects.get(id=user.related_profile_id)
                    except Student.DoesNotExist:
                        stats['no_profile'] += 1
                        self.stdout.write(
                            f"  ⚠ {user.email}: Student profile not found (ID: {user.related_profile_id})"
                        )
                        continue
                    
                    # Get SSC Board Roll
                    ssc_roll = student.rollNumber  # This is the SSC Board Roll from educational background
                    
                    if not ssc_roll:
                        stats['no_ssc_roll'] += 1
                        self.stdout.write(
                            f"  ⚠ {user.email}: No SSC Board Roll in student profile"
                        )
                        continue
                    
                    # Clean the roll number (remove any existing SIPI- prefix or other text)
                    ssc_roll_clean = str(ssc_roll).replace('SIPI-', '').replace('ROLL-', '').strip()
                    
                    # Validate it's numeric (or at least has some numbers)
                    if not any(char.isdigit() for char in ssc_roll_clean):
                        stats['invalid_roll'] += 1
                        self.stdout.write(
                            f"  ⚠ {user.email}: Invalid SSC Roll format: {ssc_roll}"
                        )
                        continue
                    
                    # Generate student_id
                    new_student_id = f"SIPI-{ssc_roll_clean}"
                    
                    # Check if this student_id already exists in database or in this run
                    existing = User.objects.filter(student_id=new_student_id).exclude(id=user.id).first()
                    if existing or new_student_id in assigned_ids:
                        # Try to add a suffix to make it unique
                        suffix = 1
                        base_id = new_student_id
                        while (User.objects.filter(student_id=f"{base_id}-{suffix}").exclude(id=user.id).exists() or 
                               f"{base_id}-{suffix}" in assigned_ids):
                            suffix += 1
                        new_student_id = f"{base_id}-{suffix}"
                        stats['duplicates'] += 1
                        self.stdout.write(
                            f"  ⚠ {user.email}: Duplicate roll detected, using {new_student_id}"
                        )
                    
                    # Add to tracking set
                    assigned_ids.add(new_student_id)
                    
                    # Update user
                    if not dry_run:
                        old_id = user.student_id
                        user.student_id = new_student_id
                        user.save(update_fields=['student_id'])
                        
                        if old_id:
                            self.stdout.write(
                                f"  ✓ {user.email}: Updated {old_id} → {new_student_id}"
                            )
                        else:
                            self.stdout.write(
                                f"  ✓ {user.email}: Set to {new_student_id}"
                            )
                    else:
                        self.stdout.write(
                            f"  ✓ {user.email}: Would set to {new_student_id}"
                        )
                    
                    stats['updated'] += 1
                    
                except Exception as e:
                    stats['errors'] += 1
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ {user.email}: Error - {str(e)}")
                    )
            
            # If dry run, rollback the transaction
            if dry_run:
                transaction.set_rollback(True)
        
        # Print summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("SUMMARY"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"✓ Successfully updated: {stats['updated']}")
        self.stdout.write(f"⚠ No profile linked: {stats['no_profile']}")
        self.stdout.write(f"⚠ No SSC Roll: {stats['no_ssc_roll']}")
        self.stdout.write(f"⚠ Invalid Roll format: {stats['invalid_roll']}")
        self.stdout.write(f"⚠ Duplicate rolls (added suffix): {stats['duplicates']}")
        self.stdout.write(f"⚠ Skipped: {stats['skipped']}")
        self.stdout.write(f"✗ Errors: {stats['errors']}")
        self.stdout.write("=" * 70)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n🔍 This was a DRY RUN - no changes were made"))
            self.stdout.write("Run without --dry-run to apply changes\n")
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Updated {stats['updated']} users successfully!\n"))
        
        # Recommendations
        if stats['no_ssc_roll'] > 0 or stats['invalid_roll'] > 0:
            self.stdout.write(self.style.WARNING("\n⚠ RECOMMENDATIONS:"))
            self.stdout.write("Some users don't have valid SSC Board Roll numbers.")
            self.stdout.write("You may need to manually update their student profiles with SSC rolls.\n")
