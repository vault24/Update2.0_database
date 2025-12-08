"""
Management command to seed departments
"""
from django.core.management.base import BaseCommand
from apps.departments.models import Department


class Command(BaseCommand):
    help = 'Seed initial departments data'
    
    def handle(self, *args, **options):
        """Seed departments"""
        departments = [
            {'name': 'Computer Science and Technology', 'code': 'CST'},
            {'name': 'Civil Technology', 'code': 'CT'},
            {'name': 'Electrical Technology', 'code': 'ET'},
            {'name': 'Electronics Technology', 'code': 'ENT'},
            {'name': 'Mechanical Technology', 'code': 'MT'},
            {'name': 'Architecture and Interior Design', 'code': 'AID'},
            {'name': 'Chemical Technology', 'code': 'CHT'},
            {'name': 'Food Technology', 'code': 'FT'},
            {'name': 'Environmental Technology', 'code': 'EVT'},
            {'name': 'Textile Technology', 'code': 'TT'},
        ]
        
        created_count = 0
        skipped_count = 0
        
        for dept_data in departments:
            dept, created = Department.objects.get_or_create(
                code=dept_data['code'],
                defaults={'name': dept_data['name']}
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created department: {dept.name} ({dept.code})')
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Department already exists: {dept.name} ({dept.code})')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeeding complete! Created: {created_count}, Skipped: {skipped_count}'
            )
        )
