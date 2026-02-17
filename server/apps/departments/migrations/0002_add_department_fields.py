# Generated migration for adding head, established_year, and photo fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='department',
            name='head',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='department',
            name='established_year',
            field=models.CharField(blank=True, max_length=4, null=True),
        ),
        migrations.AddField(
            model_name='department',
            name='photo',
            field=models.ImageField(blank=True, null=True, upload_to='departments/'),
        ),
    ]
