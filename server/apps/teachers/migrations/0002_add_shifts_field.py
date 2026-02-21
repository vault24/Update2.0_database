# Generated migration for adding shifts field to Teacher model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('teachers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='teacher',
            name='shifts',
            field=models.JSONField(default=list),
        ),
    ]
