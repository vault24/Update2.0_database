# Generated migration for notifications app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('application_status', 'Application Status'), ('document_approval', 'Document Approval'), ('student_admission', 'Student Admission'), ('system_announcement', 'System Announcement'), ('deadline_reminder', 'Deadline Reminder'), ('account_activity', 'Account Activity')], max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('data', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[('unread', 'Unread'), ('read', 'Read'), ('archived', 'Archived'), ('deleted', 'Deleted')], default='unread', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('archived_at', models.DateTimeField(blank=True, null=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preference', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Notification Preferences',
            },
        ),
        migrations.CreateModel(
            name='NotificationPreferenceType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('application_status', 'Application Status'), ('document_approval', 'Document Approval'), ('student_admission', 'Student Admission'), ('system_announcement', 'System Announcement'), ('deadline_reminder', 'Deadline Reminder'), ('account_activity', 'Account Activity')], max_length=50)),
                ('enabled', models.BooleanField(default=True)),
                ('email_enabled', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('preference', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='type_preferences', to='notifications.notificationpreference')),
            ],
            options={
                'verbose_name_plural': 'Notification Preference Types',
                'unique_together': {('preference', 'notification_type')},
            },
        ),
        migrations.CreateModel(
            name='DeliveryLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('channel', models.CharField(choices=[('in_app', 'In-App'), ('email', 'Email')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('delivered', 'Delivered'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('retry_count', models.IntegerField(default=0)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notification', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_logs', to='notifications.notification')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', '-created_at'], name='notifications_recipient_created_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'status'], name='notifications_recipient_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['notification_type'], name='notifications_type_idx'),
        ),
        migrations.AddIndex(
            model_name='deliverylog',
            index=models.Index(fields=['notification', 'channel'], name='notifications_delivery_notif_channel_idx'),
        ),
        migrations.AddIndex(
            model_name='deliverylog',
            index=models.Index(fields=['status'], name='notifications_delivery_status_idx'),
        ),
    ]
