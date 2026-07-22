from rest_framework import serializers

from .models import RoutineImport, RoutineParserIssue


class RoutineImportSerializer(serializers.ModelSerializer):
    uploadedByName = serializers.SerializerMethodField()

    class Meta:
        model = RoutineImport
        fields = [
            'id', 'fileName', 'examType', 'regulationYear', 'examSession',
            'memoNo', 'publicationDate', 'examStartDate', 'examEndDate',
            'pageCount', 'status', 'isActive', 'stats', 'errorMessage',
            'uploadedByName', 'createdAt', 'completedAt',
        ]

    def get_uploadedByName(self, obj):
        user = obj.uploadedBy
        if user is None:
            return ''
        full = f'{user.first_name} {user.last_name}'.strip()
        return full or user.username


class RoutineParserIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutineParserIssue
        fields = ['id', 'severity', 'stage', 'code', 'message', 'context', 'createdAt']
