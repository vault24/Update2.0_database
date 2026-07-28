from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0003_applicationapproval_application_current_approver_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='current_shift',
            field=models.CharField(
                blank=True,
                choices=[('1st_shift', '1st Shift'), ('2nd_shift', '2nd Shift')],
                default='',
                help_text='Shift of the Department Head who should review (matches User.shift)',
                max_length=20,
            ),
        ),
    ]
