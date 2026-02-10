"""
Management command to create sample stipend criteria
"""
from django.core.management.base import BaseCommand
from apps.stipends.models import StipendCriteria
from apps.authentication.models import User


class Command(BaseCommand):
    help = 'Create sample stipend criteria for testing'

    def handle(self, *args, **options):
        # Get or create admin user
        admin_user = User.objects.filter(is_superuser=True).first()
        
        if not admin_user:
            self.stdout.write(self.style.WARNING('No admin user found. Creating default admin...'))
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin123'
            )
        
        # Create sample criteria
        criteria_data = [
            {
                'name': 'General Stipend 2024',
                'description': 'General stipend eligibility for all departments',
                'minAttendance': 75.0,
                'minGpa': 2.5,
                'passRequirement': 'all_pass',
                'isActive': True,
            },
            {
                'name': 'Merit Stipend 2024',
                'description': 'Merit-based stipend for high achievers',
                'minAttendance': 85.0,
                'minGpa': 3.5,
                'passRequirement': 'all_pass',
                'isActive': True,
            },
            {
                'name': 'Need-Based Stipend 2024',
                'description': 'Need-based stipend with relaxed criteria',
                'minAttendance': 70.0,
                'minGpa': 2.0,
                'passRequirement': '1_referred',
                'isActive': True,
            },
        ]
        
        created_count = 0
        for data in criteria_data:
            criteria, created = StipendCriteria.objects.get_or_create(
                name=data['name'],
                defaults={**data, 'createdBy': admin_user}
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created criteria: {criteria.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Criteria already exists: {criteria.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully created {created_count} new criteria')
        )
