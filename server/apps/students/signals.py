"""
Student Signals
Handles automatic updates when student data changes
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Student


@receiver(pre_save, sender=Student)
def update_semester_on_results_change(sender, instance, **kwargs):
    """
    Update current semester when semester results are updated
    """
    # Only process if this is an update (not a new student)
    if instance.pk:
        try:
            # Get the current instance from database
            old_instance = Student.objects.get(pk=instance.pk)
            
            # Check if semesterResults have changed
            old_results = old_instance.semesterResults or []
            new_results = instance.semesterResults or []
            
            # If semester results have changed, update current semester
            if old_results != new_results:
                # Update current semester based on completed results
                semester_updated = instance.update_current_semester()
                
                if semester_updated:
                    print(f"Updated current semester for student {instance.fullNameEnglish} to semester {instance.semester}")
                    
        except Student.DoesNotExist:
            # This is a new student, no need to update semester
            pass
        except Exception as e:
            print(f"Error updating semester for student {instance.pk}: {e}")


@receiver(post_save, sender=Student)
def log_semester_update(sender, instance, created, **kwargs):
    """
    Log when a student's semester is updated
    """
    if not created and hasattr(instance, '_semester_updated'):
        print(f"Student {instance.fullNameEnglish} (Roll: {instance.currentRollNumber}) "
              f"has been promoted to semester {instance.semester}")