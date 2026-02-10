# Generated migration to add nationality field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='nationality',
            field=models.CharField(max_length=100, default='Bangladeshi', blank=True),
        ),
    ]
