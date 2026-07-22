from django.contrib import admin

from .models import (
    RoutineImport,
    RoutineParserIssue,
    RoutineSession,
    RoutineSubject,
)


@admin.register(RoutineImport)
class RoutineImportAdmin(admin.ModelAdmin):
    list_display = ('fileName', 'examType', 'regulationYear', 'status',
                    'isActive', 'createdAt')
    list_filter = ('examType', 'status', 'isActive', 'regulationYear')
    readonly_fields = ('fileSha256', 'stats')


class RoutineSubjectInline(admin.TabularInline):
    model = RoutineSubject
    extra = 0


@admin.register(RoutineSession)
class RoutineSessionAdmin(admin.ModelAdmin):
    list_display = ('examDate', 'startTime', 'slot', 'section', 'poboLabel', 'routine')
    list_filter = ('section', 'slot')
    inlines = [RoutineSubjectInline]


@admin.register(RoutineSubject)
class RoutineSubjectAdmin(admin.ModelAdmin):
    list_display = ('subjectCode', 'serial', 'session')
    search_fields = ('subjectCode',)


@admin.register(RoutineParserIssue)
class RoutineParserIssueAdmin(admin.ModelAdmin):
    list_display = ('severity', 'stage', 'code', 'routine')
    list_filter = ('severity', 'code')
