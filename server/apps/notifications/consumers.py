"""
WebSocket consumers for real-time notification delivery
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Notification, DeliveryLog


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time notifications"""

    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close()
            return

        # Create a unique group name for this user
        self.user_group_name = f"notifications_{self.user.id}"

        # Join the user's notification group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'mark_as_read':
                notification_id = data.get('notification_id')
                await self.mark_notification_as_read(notification_id)

            elif message_type == 'archive':
                notification_id = data.get('notification_id')
                await self.archive_notification(notification_id)

            elif message_type == 'delete':
                notification_id = data.get('notification_id')
                await self.delete_notification(notification_id)

            elif message_type == 'get_unread_count':
                count = await self.get_unread_count()
                await self.send(text_data=json.dumps({
                    'type': 'unread_count',
                    'count': count
                }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def notification_created(self, event):
        """Handle notification created event"""
        notification = event['notification']
        
        await self.send(text_data=json.dumps({
            'type': 'notification_created',
            'notification': notification
        }))

    async def notification_updated(self, event):
        """Handle notification updated event"""
        notification = event['notification']
        
        await self.send(text_data=json.dumps({
            'type': 'notification_updated',
            'notification': notification
        }))

    @database_sync_to_async
    def mark_notification_as_read(self, notification_id):
        """Mark a notification as read"""
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def archive_notification(self, notification_id):
        """Archive a notification"""
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.archive()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def delete_notification(self, notification_id):
        """Delete a notification"""
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.delete_notification()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def get_unread_count(self):
        """Get count of unread notifications"""
        return Notification.objects.filter(
            recipient=self.user,
            status='unread'
        ).count()
