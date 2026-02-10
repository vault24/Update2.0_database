from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('class_routines', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='classroutine',
            name='class_type',
            field=models.CharField(choices=[('Theory', 'Theory'), ('Lab', 'Lab')], default='Theory', max_length=10),
        ),
        migrations.AddField(
            model_name='classroutine',
            name='lab_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
