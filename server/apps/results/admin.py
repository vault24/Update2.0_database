from django.contrib import admin

from .models import (
    Exam,
    Institute,
    ParserIssue,
    ResultImport,
    ResultSubject,
    SemesterGPA,
    StudentResult,
)


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('semester', 'regulationYear', 'program', 'heldIn', 'publicationDate')
    list_filter = ('regulationYear', 'semester')


@admin.register(Institute)
class InstituteAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')


@admin.register(ResultImport)
class ResultImportAdmin(admin.ModelAdmin):
    list_display = ('fileName', 'status', 'pageCount', 'exam', 'createdAt')
    list_filter = ('status',)
    readonly_fields = ('fileSha256', 'stats')


class SemesterGPAInline(admin.TabularInline):
    model = SemesterGPA
    extra = 0


class ResultSubjectInline(admin.TabularInline):
    model = ResultSubject
    extra = 0


@admin.register(StudentResult)
class StudentResultAdmin(admin.ModelAdmin):
    list_display = ('rollNumber', 'resultType', 'cgpa', 'institute', 'exam')
    list_filter = ('resultType', 'exam')
    search_fields = ('rollNumber',)
    inlines = [SemesterGPAInline, ResultSubjectInline]


@admin.register(ParserIssue)
class ParserIssueAdmin(admin.ModelAdmin):
    list_display = ('severity', 'stage', 'code', 'rollNumber', 'importRecord')
    list_filter = ('severity', 'code')
