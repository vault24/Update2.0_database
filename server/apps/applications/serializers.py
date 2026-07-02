"""
Application Serializers
"""
from rest_framework import serializers
from .models import Application, ApplicationApproval


ROLE_LABELS = {
    'registrar': 'Registrar',
    'institute_head': 'Principal',
    'department_head': 'Department Head',
}


class ApplicationApprovalSerializer(serializers.ModelSerializer):
    """One step of the approval history (drives the tracking timeline + signatures)."""
    approver_role_label = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationApproval
        fields = [
            'id', 'action', 'approver_role', 'approver_role_label', 'approver_name',
            'notes', 'forwarded_to_role', 'forwarded_to_name',
            'signature_url', 'order', 'created_at',
        ]

    def get_approver_role_label(self, obj):
        return ROLE_LABELS.get(obj.approver_role, obj.approver_role or '')

    def get_signature_url(self, obj):
        if not obj.approver or not getattr(obj.approver, 'signature', None):
            return None
        url = obj.approver.signature.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url


class ApplicationSubmitSerializer(serializers.ModelSerializer):
    """
    Serializer for public application submissions.

    `template` accepts a DocumentTemplate slug or id. Workflow routing
    (initial_assignee / department) is handled in the view.
    """
    template = serializers.CharField(required=False, allow_blank=True, write_only=True)
    # Document templates are admin-managed and dynamic, so applicationType carries
    # the chosen template's display name (e.g. "Bonafide Certificate"). Override the
    # model's fixed ChoiceField so any current/future template name is accepted.
    applicationType = serializers.CharField(max_length=50)

    class Meta:
        model = Application
        fields = [
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'department',
            'session',
            'shift',
            'rollNumber',
            'registrationNumber',
            'email',
            'applicationType',
            'subject',
            'message',
            'selectedDocuments',
            'template',
        ]

    def validate_email(self, value):
        if value and '@' not in value:
            raise serializers.ValidationError("Enter a valid email address.")
        return value


class ApplicationSerializer(serializers.ModelSerializer):
    """Complete serializer for application data (includes workflow + history)."""
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    template_slug = serializers.CharField(source='template.slug', read_only=True, default=None)
    current_approver_label = serializers.SerializerMethodField()
    current_holder = serializers.SerializerMethodField()
    current_department_name = serializers.CharField(source='current_department.name', read_only=True, default=None)
    approvals = ApplicationApprovalSerializer(many=True, read_only=True)
    can_download = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id',
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'department',
            'session',
            'shift',
            'rollNumber',
            'registrationNumber',
            'email',
            'applicationType',
            'subject',
            'message',
            'selectedDocuments',
            'status',
            'template', 'template_name', 'template_slug',
            'current_approver_role', 'current_approver_label', 'current_holder',
            'current_department', 'current_department_name', 'stage',
            'approvals', 'can_download',
            'submittedAt',
            'reviewedAt',
            'reviewedBy',
            'reviewNotes',
        ]
        read_only_fields = ['id', 'submittedAt']

    def get_current_approver_label(self, obj):
        return ROLE_LABELS.get(obj.current_approver_role, obj.current_approver_role or '')

    def get_current_holder(self, obj):
        """Human-readable description of who currently holds the application."""
        if obj.status == 'approved':
            return 'Completed'
        if obj.status == 'rejected':
            return 'Rejected'
        label = ROLE_LABELS.get(obj.current_approver_role, obj.current_approver_role or '')
        if obj.current_approver_role == 'department_head' and obj.current_department_id:
            return f"{label} — {obj.current_department.name}"
        return label

    def get_can_download(self, obj):
        return obj.status == 'approved'


class ApplicationReviewSerializer(serializers.Serializer):
    """Legacy review serializer (kept for back-compat)."""
    status = serializers.ChoiceField(choices=['approved', 'rejected'], required=True)
    reviewedBy = serializers.CharField(max_length=255, required=True)
    reviewNotes = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError("Status must be either 'approved' or 'rejected'.")
        return value
