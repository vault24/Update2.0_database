from django.db import migrations


def fix_superuser_roles(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    admin_roles = ['registrar', 'institute_head']

    User.objects.filter(
        is_superuser=True,
    ).exclude(
        role__in=admin_roles
    ).update(
        role='institute_head',
    )

    User.objects.filter(
        is_superuser=True,
        is_staff=False
    ).update(
        is_staff=True
    )

    User.objects.filter(
        is_superuser=True
    ).exclude(
        account_status='active'
    ).update(
        account_status='active'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_add_student_id_field'),
    ]

    operations = [
        migrations.RunPython(fix_superuser_roles, migrations.RunPython.noop),
    ]

