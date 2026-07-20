"""
Keep student profiles in sync with imported board results — automatically.

The importer syncs matched profiles right after a PDF import. These signals
cover the other direction: when an admin *edits a student's roll number*
(or a new student is created with a roll that already has imported results),
the profile picks up the matching results immediately — no re-import, no
manual step.
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.students.models import Student

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Student, dispatch_uid='results_flag_roll_change')
def flag_roll_change(sender, instance, **kwargs):
    """Remember whether this save changes the roll number (checked pre-save,
    while the old value is still in the database)."""
    if getattr(instance, '_result_sync_in_progress', False):
        return
    if instance.pk:
        old_roll = (
            Student.objects.filter(pk=instance.pk)
            .values_list('currentRollNumber', flat=True)
            .first()
        )
        instance._result_roll_changed = old_roll != instance.currentRollNumber
    else:
        instance._result_roll_changed = True


@receiver(post_save, sender=Student, dispatch_uid='results_sync_on_roll_change')
def sync_results_on_roll_change(sender, instance, created, **kwargs):
    if getattr(instance, '_result_sync_in_progress', False):
        return
    if not (created or getattr(instance, '_result_roll_changed', False)):
        return
    instance._result_roll_changed = False
    try:
        from .sync import sync_student

        sync_student(instance)
    except Exception:
        # Result sync must never break a student save.
        logger.exception(
            'Auto result-sync failed for student %s (roll %s)',
            instance.pk, instance.currentRollNumber,
        )
