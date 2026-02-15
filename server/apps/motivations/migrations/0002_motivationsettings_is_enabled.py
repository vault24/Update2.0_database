from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("motivations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="motivationsettings",
            name="is_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable or disable motivation display system",
            ),
        ),
    ]
