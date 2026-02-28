"""
Data migration to fix teacher users with incorrect related_profile_id values
"""
from django.db import migrations


def fix_teacher_related_profile_ids(apps, schema_editor):
    """
    Fix teacher users that have incorrect related_profile_id values.
    This happens when old integer IDs were stored instead of UUIDs.
    """
    User = apps.get_model('authentication', 'User')
    Teacher = apps.get_model('teachers', 'Teacher')
    
    # Get all teacher users
    teacher_users = User.objects.filter(role='teacher')
    
    fixed_count = 0
    for user in teacher_users:
        # Try to find matching teacher profile by email
        try:
            teacher = Teacher.objects.get(email=user.email)
            
            # Check if related_profile_id needs updating
            if user.related_profile_id != teacher.id:
                old_id = user.related_profile_id
                user.related_profile_id = teacher.id
                user.save(update_fields=['related_profile_id'])
                fixed_count += 1
                print(f"✓ Fixed teacher user {user.email}: {old_id} -> {teacher.id}")
        except Teacher.DoesNotExist:
            print(f"✗ No teacher profile found for user {user.email}")
        except Teacher.MultipleObjectsReturned:
            print(f"✗ Multiple teacher profiles found for user {user.email}")
    
    print(f"\nFixed {fixed_count} teacher user(s)")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - no action needed as we're just fixing data
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0006_alter_user_managers_alter_user_mobile_number'),
        ('teachers', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fix_teacher_related_profile_ids, reverse_migration),
    ]
