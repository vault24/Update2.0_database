"""
Sidebar unread-badge endpoints.

GET  /api/badges/       -> { counts: { module: n, ... }, server_time: iso }
POST /api/badges/seen/  -> body { module } ; upserts last_seen=now -> { module, count: 0 }
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .badges import compute_badges, modules_for_user
from .models import ModuleSeen


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def badges_view(request):
    """Unread badge counts for every module relevant to the current user."""
    counts = compute_badges(request.user)
    return Response({'counts': counts, 'server_time': timezone.now().isoformat()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_module_seen_view(request):
    """
    Mark a module as seen (opening its page). Resets that module's badge to 0;
    future items start a fresh count.
    """
    module = (request.data.get('module') or '').strip()
    if not module:
        return Response({'error': 'module is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Ignore unknown modules so a stale client can never create junk rows.
    if module not in modules_for_user(request.user):
        return Response({'module': module, 'count': 0})

    ModuleSeen.objects.update_or_create(
        user=request.user,
        module=module,
        defaults={'last_seen_at': timezone.now()},
    )
    return Response({'module': module, 'count': 0})
