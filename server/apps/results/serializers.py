from rest_framework import serializers

from .models import (
    Exam,
    Institute,
    ParserIssue,
    ResultImport,
    ResultSubject,
    SemesterGPA,
    StudentResult,
)


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = [
            'id', 'semester', 'regulationYear', 'program', 'heldIn',
            'publicationDate', 'memoNo',
        ]


class InstituteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institute
        fields = ['code', 'name']


class SemesterGPASerializer(serializers.ModelSerializer):
    class Meta:
        model = SemesterGPA
        fields = ['semester', 'gpa', 'isReferred']


class ResultSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultSubject
        fields = ['subjectCode', 'role', 'hasTheory', 'hasPractical']


class StudentResultSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    institute = InstituteSerializer(read_only=True)
    gpas = SemesterGPASerializer(source='semesterGpas', many=True, read_only=True)
    subjects = ResultSubjectSerializer(many=True, read_only=True)

    class Meta:
        model = StudentResult
        fields = [
            'id', 'rollNumber', 'resultType', 'cgpa', 'expelledRule',
            'exam', 'institute', 'gpas', 'subjects',
        ]


class ResultImportSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    uploadedByName = serializers.SerializerMethodField()

    class Meta:
        model = ResultImport
        fields = [
            'id', 'fileName', 'pageCount', 'status', 'stats', 'errorMessage',
            'exam', 'uploadedByName', 'createdAt', 'completedAt',
        ]

    def get_uploadedByName(self, obj):
        user = obj.uploadedBy
        if user is None:
            return ''
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username


class ParserIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParserIssue
        fields = [
            'id', 'severity', 'stage', 'code', 'message', 'context',
            'rollNumber', 'createdAt',
        ]
