from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alumni', '0005_alumni_registrationsource_alumni_reviewstatus_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='alumni',
            name='coverImage',
            field=models.URLField(blank=True, null=True),
        ),
    ]
