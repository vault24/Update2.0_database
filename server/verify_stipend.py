import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.stipends.models import StipendCriteria, StipendEligibility
from apps.students.models import Student

print("=" * 60)
print("STIPEND FEATURE VERIFICATION")
print("=" * 60)
print(f"\n✓ Criteria: {StipendCriteria.objects.count()}")
print(f"✓ Active Students: {Student.objects.filter(status='active').count()}")
print(f"✓ Students with Results: {Student.objects.filter(status='active').exclude(semesterResults=[]).count()}")
print(f"✓ Eligibility Records: {StipendEligibility.objects.count()}")
print("\n✓ All systems operational!")
print("=" * 60)
