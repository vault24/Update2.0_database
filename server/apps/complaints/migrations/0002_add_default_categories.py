# Generated migration to add default complaint categories and subcategories

from django.db import migrations
import uuid


def create_default_categories(apps, schema_editor):
    """Create default complaint categories and subcategories"""
    ComplaintCategory = apps.get_model('complaints', 'ComplaintCategory')
    ComplaintSubcategory = apps.get_model('complaints', 'ComplaintSubcategory')
    
    # Use fixed UUIDs for these core categories so they're consistent across installations
    ACADEMIC_UUID = uuid.UUID('11111111-1111-1111-1111-111111111111')
    WEBSITE_UUID = uuid.UUID('22222222-2222-2222-2222-222222222222')
    FACILITY_UUID = uuid.UUID('33333333-3333-3333-3333-333333333333')
    
    # Create categories (use get_or_create to avoid duplicates on re-run)
    academic_cat, _ = ComplaintCategory.objects.get_or_create(
        id=ACADEMIC_UUID,
        defaults={
            'name': 'academic',
            'label': 'Academic Issues',
            'description': 'Issues related to classes, exams, and academic matters',
            'icon': 'GraduationCap',
            'color': 'from-blue-500 to-indigo-600',
            'is_active': True,
            'sort_order': 1
        }
    )
    
    website_cat, _ = ComplaintCategory.objects.get_or_create(
        id=WEBSITE_UUID,
        defaults={
            'name': 'website',
            'label': 'Website & System',
            'description': 'Technical issues with the website or portal',
            'icon': 'Monitor',
            'color': 'from-purple-500 to-pink-600',
            'is_active': True,
            'sort_order': 2
        }
    )
    
    facility_cat, _ = ComplaintCategory.objects.get_or_create(
        id=FACILITY_UUID,
        defaults={
            'name': 'facility',
            'label': 'Facility Issues',
            'description': 'Issues related to campus facilities and infrastructure',
            'icon': 'Building',
            'color': 'from-orange-500 to-red-600',
            'is_active': True,
            'sort_order': 3
        }
    )
    
    # Create subcategories for Academic (use get_or_create to avoid duplicates)
    ComplaintSubcategory.objects.get_or_create(
        category=academic_cat,
        name='Class Schedule',
        defaults={
            'description': 'Issues with class timings or schedule conflicts',
            'is_active': True,
            'sort_order': 1
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=academic_cat,
        name='Exam Related',
        defaults={
            'description': 'Issues related to examinations',
            'is_active': True,
            'sort_order': 2
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=academic_cat,
        name='Course Content',
        defaults={
            'description': 'Issues with course materials or syllabus',
            'is_active': True,
            'sort_order': 3
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=academic_cat,
        name='Teacher Related',
        defaults={
            'description': 'Issues related to teaching or faculty',
            'is_active': True,
            'sort_order': 4
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=academic_cat,
        name='Marks & Results',
        defaults={
            'description': 'Issues with marks, grades, or results',
            'is_active': True,
            'sort_order': 5
        }
    )
    
    # Create subcategories for Website
    ComplaintSubcategory.objects.get_or_create(
        category=website_cat,
        name='Login Issues',
        defaults={
            'description': 'Problems with logging in or authentication',
            'is_active': True,
            'sort_order': 1
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=website_cat,
        name='Portal Features',
        defaults={
            'description': 'Issues with portal features or functionality',
            'is_active': True,
            'sort_order': 2
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=website_cat,
        name='Document Upload',
        defaults={
            'description': 'Problems uploading or accessing documents',
            'is_active': True,
            'sort_order': 3
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=website_cat,
        name='Performance Issues',
        defaults={
            'description': 'Slow loading or performance problems',
            'is_active': True,
            'sort_order': 4
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=website_cat,
        name='Bug Report',
        defaults={
            'description': 'Report a bug or technical error',
            'is_active': True,
            'sort_order': 5
        }
    )
    
    # Create subcategories for Facility
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Classroom',
        defaults={
            'description': 'Issues with classroom facilities',
            'is_active': True,
            'sort_order': 1
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Laboratory',
        defaults={
            'description': 'Issues with lab equipment or facilities',
            'is_active': True,
            'sort_order': 2
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Library',
        defaults={
            'description': 'Issues related to library services',
            'is_active': True,
            'sort_order': 3
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Canteen',
        defaults={
            'description': 'Issues with canteen or food services',
            'is_active': True,
            'sort_order': 4
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Washroom',
        defaults={
            'description': 'Issues with washroom facilities',
            'is_active': True,
            'sort_order': 5
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Maintenance',
        defaults={
            'description': 'General maintenance issues',
            'is_active': True,
            'sort_order': 6
        }
    )
    
    ComplaintSubcategory.objects.get_or_create(
        category=facility_cat,
        name='Safety & Security',
        defaults={
            'description': 'Safety or security concerns',
            'is_active': True,
            'sort_order': 7
        }
    )


def reverse_categories(apps, schema_editor):
    """Remove default categories and subcategories"""
    ComplaintCategory = apps.get_model('complaints', 'ComplaintCategory')
    ComplaintSubcategory = apps.get_model('complaints', 'ComplaintSubcategory')
    
    ComplaintSubcategory.objects.all().delete()
    ComplaintCategory.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('complaints', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_categories, reverse_categories),
    ]
