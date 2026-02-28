"""
Management command to fix users with missing/broken related_profile_id.
"""
from django.core.management.base import BaseCommand

from apps.authentication.models import User
from apps.students.models import Student
from apps.teachers.models import Teacher


class Command(BaseCommand):
    help = "Fix users with missing/broken related_profile_id by linking them to profiles"

    def _student_profile_exists(self, profile_id):
        if not profile_id:
            return False
        return Student.objects.filter(id=profile_id).exists()

    def _teacher_profile_exists(self, profile_id):
        if not profile_id:
            return False
        return Teacher.objects.filter(id=profile_id).exists()

    def handle(self, *args, **options):
        self.stdout.write("Fixing users with missing/broken related_profile_id...\n")

        student_users = User.objects.filter(role__in=["student", "captain"])
        fixed_students = 0
        unresolved_students = 0

        for user in student_users:
            if self._student_profile_exists(user.related_profile_id):
                continue

            student = Student.objects.filter(email__iexact=user.email).first()
            if not student:
                unresolved_students += 1
                self.stdout.write(self.style.WARNING(f"  No student profile found for {user.email}"))
                continue

            user.related_profile_id = student.id
            user.save(update_fields=["related_profile_id"])
            fixed_students += 1
            self.stdout.write(f"  Fixed student/captain user {user.email} -> {student.id}")

        teacher_users = User.objects.filter(role="teacher")
        fixed_teachers = 0
        unresolved_teachers = 0

        for user in teacher_users:
            profile_is_valid = self._teacher_profile_exists(user.related_profile_id)
            teacher = None

            if profile_is_valid:
                teacher = Teacher.objects.filter(id=user.related_profile_id).first()
            else:
                teacher = (
                    Teacher.objects.filter(user=user).first()
                    or Teacher.objects.filter(email__iexact=user.email).first()
                )

            if not teacher:
                unresolved_teachers += 1
                self.stdout.write(self.style.WARNING(f"  No teacher profile found for {user.email}"))
                continue

            if teacher.user_id and teacher.user_id != user.id:
                unresolved_teachers += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  Teacher profile {teacher.id} belongs to user_id={teacher.user_id}; skipped {user.email}"
                    )
                )
                continue

            updated = False

            if teacher.user_id is None:
                teacher.user = user
                teacher.save(update_fields=["user"])
                updated = True

            if user.related_profile_id != teacher.id:
                user.related_profile_id = teacher.id
                user.save(update_fields=["related_profile_id"])
                updated = True

            if updated:
                fixed_teachers += 1
                self.stdout.write(f"  Fixed teacher user {user.email} -> {teacher.id}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nFixed {fixed_students} student/captain users and {fixed_teachers} teacher users"
            )
        )

        if unresolved_students or unresolved_teachers:
            self.stdout.write(
                self.style.WARNING(
                    f"Unresolved: {unresolved_students} student/captain users, "
                    f"{unresolved_teachers} teacher users"
                )
            )
