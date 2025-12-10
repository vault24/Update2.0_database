"""
Authentication Tests
"""
from django.test import TestCase
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import from_model
from .models import SignupRequest, User
from apps.teacher_requests.models import TeacherSignupRequest
from apps.departments.models import Department
from .services import create_teacher_signup_request, register_teacher_with_signup_request
import string


# Hypothesis strategies for generating test data
@st.composite
def valid_signup_data(draw):
    """Generate valid signup request data"""
    username_chars = string.ascii_letters + string.digits + '_'
    return {
        'username': draw(st.text(min_size=3, max_size=150, alphabet=username_chars)),
        'email': draw(st.emails()),
        'first_name': draw(st.text(min_size=1, max_size=150, alphabet=string.ascii_letters + ' ')),
        'last_name': draw(st.text(min_size=1, max_size=150, alphabet=string.ascii_letters + ' ')),
        'password': draw(st.text(min_size=8, max_size=128)),
        'requested_role': draw(st.sampled_from(['registrar', 'institute_head'])),
        'mobile_number': draw(st.text(min_size=11, max_size=11, alphabet=string.digits))
    }


class SignupRequestModelPropertyTests(TestCase):
    """
    Property-based tests for SignupRequest model
    Feature: admin-signup-approval, Property 1: Valid signup creates pending request
    Validates: Requirements 1.1, 1.4
    """
    
    @settings(max_examples=100)
    @given(data=valid_signup_data())
    def test_valid_signup_creates_pending_request(self, data):
        """
        Property: For any valid signup data, creating a SignupRequest should:
        1. Create a record with status 'pending'
        2. Store all provided data correctly
        3. Hash the password
        """
        # Create SignupRequest
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password'])
        )
        
        # Verify status is pending
        self.assertEqual(signup_request.status, 'pending')
        
        # Verify all fields are stored correctly
        self.assertEqual(signup_request.username, data['username'])
        self.assertEqual(signup_request.email, data['email'])
        self.assertEqual(signup_request.first_name, data['first_name'])
        self.assertEqual(signup_request.last_name, data['last_name'])
        self.assertEqual(signup_request.mobile_number, data['mobile_number'])
        self.assertEqual(signup_request.requested_role, data['requested_role'])
        
        # Verify password is hashed (not stored in plain text)
        self.assertNotEqual(signup_request.password_hash, data['password'])
        self.assertTrue(check_password(data['password'], signup_request.password_hash))
        
        # Verify timestamps are set
        self.assertIsNotNone(signup_request.created_at)
        self.assertIsNotNone(signup_request.updated_at)
        
        # Verify reviewed fields are null for pending requests
        self.assertIsNone(signup_request.reviewed_by)
        self.assertIsNone(signup_request.reviewed_at)
        self.assertEqual(signup_request.rejection_reason, '')
        self.assertIsNone(signup_request.created_user)


class SignupRequestModelTests(TestCase):
    """
    Unit tests for SignupRequest model
    """
    
    def test_signup_request_str_representation(self):
        """Test string representation of SignupRequest"""
        signup_request = SignupRequest.objects.create(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            requested_role='registrar',
            password_hash=make_password('testpass123')
        )
        self.assertEqual(str(signup_request), 'testuser - Pending')
    
    def test_signup_request_default_status(self):
        """Test that default status is pending"""
        signup_request = SignupRequest.objects.create(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            requested_role='registrar',
            password_hash=make_password('testpass123')
        )
        self.assertEqual(signup_request.status, 'pending')
    
    def test_signup_request_unique_username(self):
        """Test that username must be unique"""
        SignupRequest.objects.create(
            username='testuser',
            email='test1@example.com',
            first_name='Test',
            last_name='User',
            requested_role='registrar',
            password_hash=make_password('testpass123')
        )
        
        with self.assertRaises(Exception):
            SignupRequest.objects.create(
                username='testuser',
                email='test2@example.com',
                first_name='Test',
                last_name='User',
                requested_role='registrar',
                password_hash=make_password('testpass123')
            )
    
    def test_signup_request_unique_email(self):
        """Test that email must be unique"""
        SignupRequest.objects.create(
            username='testuser1',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            requested_role='registrar',
            password_hash=make_password('testpass123')
        )
        
        with self.assertRaises(Exception):
            SignupRequest.objects.create(
                username='testuser2',
                email='test@example.com',
                first_name='Test',
                last_name='User',
                requested_role='registrar',
                password_hash=make_password('testpass123')
            )



@st.composite
def invalid_signup_data(draw):
    """Generate invalid signup request data with missing fields"""
    data = draw(valid_signup_data())
    # Randomly remove required fields
    required_fields = ['username', 'email', 'first_name', 'last_name', 'password', 'requested_role']
    field_to_remove = draw(st.sampled_from(required_fields))
    del data[field_to_remove]
    return data, field_to_remove


class SignupRequestSerializerPropertyTests(TestCase):
    """
    Property-based tests for SignupRequest serializers
    Feature: admin-signup-approval, Property 2: Invalid signup is rejected
    Validates: Requirements 1.2
    """
    
    @settings(max_examples=100)
    @given(data_tuple=invalid_signup_data())
    def test_invalid_signup_is_rejected(self, data_tuple):
        """
        Property: For any signup data with missing required fields,
        the serializer should reject the submission with validation errors
        """
        from .serializers import SignupRequestSerializer
        
        data, missing_field = data_tuple
        
        # Add password_confirm if password exists
        if 'password' in data:
            data['password_confirm'] = data['password']
        
        serializer = SignupRequestSerializer(data=data)
        
        # Verify serializer is invalid
        self.assertFalse(serializer.is_valid())
        
        # Verify error is related to missing field
        self.assertIn(missing_field, serializer.errors)
    
    @settings(max_examples=50)
    @given(data=valid_signup_data())
    def test_password_mismatch_rejected(self, data):
        """
        Property: For any valid signup data with mismatched passwords,
        the serializer should reject with password confirmation error
        """
        from .serializers import SignupRequestSerializer
        
        # Create mismatched password confirmation
        data['password_confirm'] = data['password'] + '_different'
        
        serializer = SignupRequestSerializer(data=data)
        
        # Verify serializer is invalid
        self.assertFalse(serializer.is_valid())
        
        # Verify password confirmation error
        self.assertIn('password_confirm', serializer.errors)



class DuplicateEmailRejectionPropertyTests(TestCase):
    """
    Property-based tests for duplicate email rejection
    Feature: admin-signup-approval, Property 3: Duplicate email rejection
    Validates: Requirements 1.3
    """
    
    @settings(max_examples=100)
    @given(data=valid_signup_data())
    def test_duplicate_email_in_signup_request_rejected(self, data):
        """
        Property: For any existing SignupRequest email,
        attempting to create a new SignupRequest with the same email should be rejected
        """
        from .serializers import SignupRequestSerializer
        
        # Create first signup request
        first_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password'])
        )
        
        # Try to create second request with same email but different username
        duplicate_data = data.copy()
        duplicate_data['username'] = data['username'] + '_different'
        duplicate_data['password_confirm'] = data['password']
        
        serializer = SignupRequestSerializer(data=duplicate_data)
        
        # Verify serializer is invalid
        self.assertFalse(serializer.is_valid())
        
        # Verify email error
        self.assertIn('email', serializer.errors)
    
    @settings(max_examples=100)
    @given(data=valid_signup_data())
    def test_duplicate_username_in_signup_request_rejected(self, data):
        """
        Property: For any existing SignupRequest username,
        attempting to create a new SignupRequest with the same username should be rejected
        """
        from .serializers import SignupRequestSerializer
        
        # Create first signup request
        first_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password'])
        )
        
        # Try to create second request with same username but different email
        duplicate_data = data.copy()
        duplicate_data['email'] = 'different_' + data['email']
        duplicate_data['password_confirm'] = data['password']
        
        serializer = SignupRequestSerializer(data=duplicate_data)
        
        # Verify serializer is invalid
        self.assertFalse(serializer.is_valid())
        
        # Verify username error
        self.assertIn('username', serializer.errors)
    
    @settings(max_examples=50)
    @given(data=valid_signup_data())
    def test_existing_user_email_rejected(self, data):
        """
        Property: For any existing User email,
        attempting to create a SignupRequest with the same email should be rejected
        """
        from .serializers import SignupRequestSerializer
        
        # Create user with the email
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name']
        )
        
        # Try to create signup request with same email
        signup_data = data.copy()
        signup_data['username'] = data['username'] + '_different'
        signup_data['password_confirm'] = data['password']
        
        serializer = SignupRequestSerializer(data=signup_data)
        
        # Verify serializer is invalid
        self.assertFalse(serializer.is_valid())
        
        # Verify email error
        self.assertIn('email', serializer.errors)



class PendingRequestsFilteringPropertyTests(TestCase):
    """
    Property-based tests for pending requests filtering
    Feature: admin-signup-approval, Property 4: Pending requests filtering
    Validates: Requirements 2.1, 2.4
    """
    
    @settings(max_examples=50)
    @given(st.lists(valid_signup_data(), min_size=3, max_size=10))
    def test_pending_requests_filtering(self, signup_data_list):
        """
        Property: For any set of SignupRequests with mixed statuses,
        querying for pending requests should return only those with status "pending",
        ordered by creation date (newest first)
        """
        # Create signup requests with different statuses
        pending_requests = []
        non_pending_requests = []
        
        for i, data in enumerate(signup_data_list):
            # Make usernames and emails unique
            data['username'] = f"{data['username']}_{i}"
            data['email'] = f"{i}_{data['email']}"
            
            signup_request = SignupRequest.objects.create(
                username=data['username'],
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                mobile_number=data['mobile_number'],
                requested_role=data['requested_role'],
                password_hash=make_password(data['password'])
            )
            
            # Randomly set status
            if i % 3 == 0:
                signup_request.status = 'approved'
                signup_request.save()
                non_pending_requests.append(signup_request)
            elif i % 3 == 1:
                signup_request.status = 'rejected'
                signup_request.save()
                non_pending_requests.append(signup_request)
            else:
                # Keep as pending
                pending_requests.append(signup_request)
        
        # Query for pending requests
        pending_queryset = SignupRequest.objects.filter(status='pending').order_by('-created_at')
        
        # Verify only pending requests are returned
        self.assertEqual(pending_queryset.count(), len(pending_requests))
        
        # Verify all returned requests have pending status
        for request in pending_queryset:
            self.assertEqual(request.status, 'pending')
        
        # Verify ordering (newest first)
        if pending_queryset.count() > 1:
            for i in range(len(pending_queryset) - 1):
                self.assertGreaterEqual(
                    pending_queryset[i].created_at,
                    pending_queryset[i + 1].created_at
                )



class RequestDisplayCompletenessPropertyTests(TestCase):
    """
    Property-based tests for request display completeness
    Feature: admin-signup-approval, Property 5: Request display completeness
    Validates: Requirements 2.2
    """
    
    @settings(max_examples=100)
    @given(data=valid_signup_data())
    def test_request_display_completeness(self, data):
        """
        Property: For any SignupRequest, the serialized response should include
        username, email, first_name, last_name, requested_role, status, and created_at fields
        """
        from .serializers import SignupRequestListSerializer
        
        # Create signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password'])
        )
        
        # Serialize
        serializer = SignupRequestListSerializer(signup_request)
        serialized_data = serializer.data
        
        # Verify all required fields are present
        required_fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'requested_role', 'status', 'created_at'
        ]
        
        for field in required_fields:
            self.assertIn(field, serialized_data)
            self.assertIsNotNone(serialized_data[field])
        
        # Verify field values match
        self.assertEqual(serialized_data['username'], data['username'])
        self.assertEqual(serialized_data['email'], data['email'])
        self.assertEqual(serialized_data['first_name'], data['first_name'])
        self.assertEqual(serialized_data['last_name'], data['last_name'])
        self.assertEqual(serialized_data['requested_role'], data['requested_role'])
        self.assertEqual(serialized_data['status'], 'pending')



class ApprovalCreatesActiveUserPropertyTests(TestCase):
    """
    Property-based tests for approval creating active user
    Feature: admin-signup-approval, Property 6: Approval creates active user
    Validates: Requirements 3.1, 3.4
    """
    
    @settings(max_examples=100)
    @given(data=valid_signup_data())
    def test_approval_creates_active_user(self, data):
        """
        Property: For any pending SignupRequest, approving it should:
        1. Create a User account with account_status "active"
        2. Match credentials from the signup request
        3. Link the created user to the SignupRequest
        """
        # Create admin user
        admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='registrar',
            account_status='active'
        )
        
        # Create pending signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='pending'
        )
        
        # Approve the request
        signup_request.status = 'approved'
        signup_request.reviewed_by = admin
        signup_request.reviewed_at = timezone.now()
        
        # Create user from signup request
        user = User(
            username=signup_request.username,
            email=signup_request.email,
            first_name=signup_request.first_name,
            last_name=signup_request.last_name,
            role=signup_request.requested_role,
            mobile_number=signup_request.mobile_number,
            account_status='active',
            password=signup_request.password_hash
        )
        user.save()
        
        signup_request.created_user = user
        signup_request.save()
        
        # Verify user was created with active status
        self.assertEqual(user.account_status, 'active')
        
        # Verify credentials match
        self.assertEqual(user.username, data['username'])
        self.assertEqual(user.email, data['email'])
        self.assertEqual(user.first_name, data['first_name'])
        self.assertEqual(user.last_name, data['last_name'])
        self.assertEqual(user.role, data['requested_role'])
        self.assertEqual(user.mobile_number, data['mobile_number'])
        
        # Verify password is correct
        self.assertTrue(check_password(data['password'], user.password))
        
        # Verify link to signup request
        self.assertEqual(signup_request.created_user, user)
        self.assertEqual(signup_request.status, 'approved')



class StatusTransitionPropertyTests(TestCase):
    """
    Property-based tests for status transition on approval/rejection
    Feature: admin-signup-approval, Property 7: Status transition on approval/rejection
    Validates: Requirements 3.2, 4.1, 6.2
    """
    
    @settings(max_examples=50)
    @given(data=valid_signup_data(), action=st.sampled_from(['approve', 'reject']))
    def test_status_transition_records_reviewer(self, data, action):
        """
        Property: For any pending SignupRequest, approving or rejecting it should:
        1. Update status to "approved" or "rejected"
        2. Record reviewed_by
        3. Record reviewed_at timestamp
        """
        # Create admin user
        admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='registrar',
            account_status='active'
        )
        
        # Create pending signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='pending'
        )
        
        # Verify initial state
        self.assertEqual(signup_request.status, 'pending')
        self.assertIsNone(signup_request.reviewed_by)
        self.assertIsNone(signup_request.reviewed_at)
        
        # Perform action
        if action == 'approve':
            signup_request.status = 'approved'
            # Create user for approved request
            user = User(
                username=signup_request.username,
                email=signup_request.email,
                first_name=signup_request.first_name,
                last_name=signup_request.last_name,
                role=signup_request.requested_role,
                mobile_number=signup_request.mobile_number,
                account_status='active',
                password=signup_request.password_hash
            )
            user.save()
            signup_request.created_user = user
        else:
            signup_request.status = 'rejected'
        
        signup_request.reviewed_by = admin
        signup_request.reviewed_at = timezone.now()
        signup_request.save()
        
        # Verify status updated
        expected_status = 'approved' if action == 'approve' else 'rejected'
        self.assertEqual(signup_request.status, expected_status)
        
        # Verify reviewed_by recorded
        self.assertEqual(signup_request.reviewed_by, admin)
        
        # Verify reviewed_at recorded
        self.assertIsNotNone(signup_request.reviewed_at)
        self.assertLessEqual(
            (timezone.now() - signup_request.reviewed_at).total_seconds(),
            5  # Should be within 5 seconds
        )



class RejectionPreventsUserCreationPropertyTests(TestCase):
    """
    Property-based tests for rejection preventing user creation
    Feature: admin-signup-approval, Property 9: Rejection prevents user creation
    Validates: Requirements 4.2
    """
    
    @settings(max_examples=100)
    @given(data=valid_signup_data())
    def test_rejection_prevents_user_creation(self, data):
        """
        Property: For any SignupRequest that is rejected,
        no User account should exist with the username or email from that request
        """
        # Create admin user
        admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='registrar',
            account_status='active'
        )
        
        # Create pending signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='pending'
        )
        
        # Reject the request
        signup_request.status = 'rejected'
        signup_request.reviewed_by = admin
        signup_request.reviewed_at = timezone.now()
        signup_request.rejection_reason = 'Test rejection'
        signup_request.save()
        
        # Verify no user account exists with that username
        self.assertFalse(
            User.objects.filter(username=data['username']).exists(),
            f"User account should not exist for rejected signup request with username {data['username']}"
        )
        
        # Verify no user account exists with that email
        self.assertFalse(
            User.objects.filter(email=data['email']).exists(),
            f"User account should not exist for rejected signup request with email {data['email']}"
        )
        
        # Verify signup request status is rejected
        self.assertEqual(signup_request.status, 'rejected')
        
        # Verify created_user is None
        self.assertIsNone(signup_request.created_user)



class RejectionReasonStoragePropertyTests(TestCase):
    """
    Property-based tests for rejection reason storage
    Feature: admin-signup-approval, Property 10: Rejection reason storage
    Validates: Requirements 4.5
    """
    
    @settings(max_examples=100)
    @given(
        data=valid_signup_data(),
        reason=st.text(min_size=1, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'P', 'Z')))
    )
    def test_rejection_reason_storage(self, data, reason):
        """
        Property: For any SignupRequest rejection with a provided reason,
        the rejection_reason field should be stored correctly
        """
        # Create admin user
        admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='registrar',
            account_status='active'
        )
        
        # Create pending signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='pending'
        )
        
        # Reject with reason
        signup_request.status = 'rejected'
        signup_request.reviewed_by = admin
        signup_request.reviewed_at = timezone.now()
        signup_request.rejection_reason = reason
        signup_request.save()
        
        # Verify rejection reason is stored
        self.assertEqual(signup_request.rejection_reason, reason)
        
        # Verify status is rejected
        self.assertEqual(signup_request.status, 'rejected')
        
        # Retrieve from database and verify persistence
        retrieved_request = SignupRequest.objects.get(id=signup_request.id)
        self.assertEqual(retrieved_request.rejection_reason, reason)



class LoginBehaviorByRequestStatusPropertyTests(TestCase):
    """
    Property-based tests for login behavior by request status
    Feature: admin-signup-approval, Property 11: Login behavior by request status
    Validates: Requirements 5.1, 5.2, 5.3
    """
    
    @settings(max_examples=50)
    @given(data=valid_signup_data())
    def test_login_with_pending_request(self, data):
        """
        Property: For any SignupRequest with status pending,
        login attempts should return "awaiting approval" message
        """
        from .serializers import LoginSerializer
        
        # Create pending signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='pending'
        )
        
        # Attempt login
        serializer = LoginSerializer(data={
            'username': data['username'],
            'password': data['password']
        })
        
        # Verify login is rejected with pending message
        self.assertFalse(serializer.is_valid())
        self.assertIn('pending approval', str(serializer.errors).lower())
    
    @settings(max_examples=50)
    @given(data=valid_signup_data())
    def test_login_with_rejected_request(self, data):
        """
        Property: For any SignupRequest with status rejected,
        login attempts should return "signup rejected" message
        """
        from .serializers import LoginSerializer
        
        # Create admin user
        admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='registrar',
            account_status='active'
        )
        
        # Create rejected signup request
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='rejected',
            reviewed_by=admin,
            reviewed_at=timezone.now(),
            rejection_reason='Test rejection'
        )
        
        # Attempt login
        serializer = LoginSerializer(data={
            'username': data['username'],
            'password': data['password']
        })
        
        # Verify login is rejected with rejection message
        self.assertFalse(serializer.is_valid())
        self.assertIn('rejected', str(serializer.errors).lower())
    
    @settings(max_examples=50)
    @given(data=valid_signup_data())
    def test_login_with_approved_request(self, data):
        """
        Property: For any SignupRequest with status approved,
        login attempts should authenticate successfully
        """
        from .serializers import LoginSerializer
        
        # Create admin user
        admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='registrar',
            account_status='active'
        )
        
        # Create approved signup request with user
        signup_request = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            mobile_number=data['mobile_number'],
            requested_role=data['requested_role'],
            password_hash=make_password(data['password']),
            status='approved',
            reviewed_by=admin,
            reviewed_at=timezone.now()
        )
        
        # Create user from approved request
        user = User(
            username=signup_request.username,
            email=signup_request.email,
            first_name=signup_request.first_name,
            last_name=signup_request.last_name,
            role=signup_request.requested_role,
            mobile_number=signup_request.mobile_number,
            account_status='active',
            password=signup_request.password_hash
        )
        user.save()
        
        signup_request.created_user = user
        signup_request.save()
        
        # Attempt login
        serializer = LoginSerializer(data={
            'username': data['username'],
            'password': data['password']
        })
        
        # Verify login is successful
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['user'], user)


# Teacher Registration Property Tests

@st.composite
def valid_teacher_registration_data(draw):
    """Generate valid teacher registration data"""
    username_chars = string.ascii_letters + string.digits + '_@.'
    return {
        'username': draw(st.emails()),  # Use email as username
        'email': draw(st.emails()),
        'password': draw(st.text(min_size=8, max_size=128)),
        'first_name': draw(st.text(min_size=1, max_size=150, alphabet=string.ascii_letters + ' ')),
        'last_name': draw(st.text(min_size=1, max_size=150, alphabet=string.ascii_letters + ' ')),
        'role': 'teacher',
        'mobile_number': draw(st.text(min_size=11, max_size=11, alphabet=string.digits)),
        'full_name_english': draw(st.text(min_size=1, max_size=255, alphabet=string.ascii_letters + ' ')),
        'full_name_bangla': draw(st.text(min_size=1, max_size=255, alphabet='অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃ ্া ি ী ু ূ ৃ ে ৈ ো ৌ')),
        'designation': draw(st.text(min_size=1, max_size=100, alphabet=string.ascii_letters + ' ')),
        'qualifications': draw(st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=5)),
        'specializations': draw(st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=5)),
        'office_location': draw(st.text(min_size=0, max_size=255, alphabet=string.ascii_letters + string.digits + ' -'))
    }


class TeacherRegistrationCompletenessPropertyTests(TestCase):
    """
    Property-based tests for teacher registration completeness
    Feature: teacher-signup-approval-fix, Property 1: Teacher Registration Completeness
    Validates: Requirements 1.1
    """
    
    def setUp(self):
        """Set up test department"""
        self.department = Department.objects.create(
            name='Test Department',
            code='TD',
            description='Test department for property tests'
        )
    
    @settings(max_examples=100)
    @given(data=valid_teacher_registration_data())
    def test_teacher_registration_creates_both_user_and_request(self, data):
        """
        Property: For any valid teacher registration data, the system should create both:
        1. A User account with status='pending' and role='teacher'
        2. A corresponding TeacherSignupRequest record with proper linking
        """
        # Make email and username unique for this test
        unique_suffix = str(hash(str(data)))[-8:]
        data['username'] = f"test_{unique_suffix}@example.com"
        data['email'] = f"test_{unique_suffix}@example.com"
        
        # Add department to teacher data
        teacher_data = {
            'full_name_english': data['full_name_english'],
            'full_name_bangla': data['full_name_bangla'],
            'designation': data['designation'],
            'department': str(self.department.id),
            'qualifications': data['qualifications'],
            'specializations': data['specializations'],
            'office_location': data['office_location']
        }
        
        # Create user data
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': data['role'],
            'mobile_number': data['mobile_number']
        }
        
        try:
            # Test the registration service
            user, teacher_signup_request = register_teacher_with_signup_request(user_data, teacher_data)
            
            # Verify User was created correctly
            self.assertIsNotNone(user)
            self.assertEqual(user.username, data['username'])
            self.assertEqual(user.email, data['email'])
            self.assertEqual(user.role, 'teacher')
            self.assertEqual(user.account_status, 'pending')
            self.assertEqual(user.first_name, data['first_name'])
            self.assertEqual(user.last_name, data['last_name'])
            self.assertEqual(user.mobile_number, data['mobile_number'])
            
            # Verify TeacherSignupRequest was created correctly
            self.assertIsNotNone(teacher_signup_request)
            self.assertEqual(teacher_signup_request.user, user)
            self.assertEqual(teacher_signup_request.full_name_english, data['full_name_english'])
            self.assertEqual(teacher_signup_request.full_name_bangla, data['full_name_bangla'])
            self.assertEqual(teacher_signup_request.email, data['email'])
            self.assertEqual(teacher_signup_request.mobile_number, data['mobile_number'])
            self.assertEqual(teacher_signup_request.designation, data['designation'])
            self.assertEqual(teacher_signup_request.department, self.department)
            self.assertEqual(teacher_signup_request.qualifications, data['qualifications'])
            self.assertEqual(teacher_signup_request.specializations, data['specializations'])
            self.assertEqual(teacher_signup_request.office_location, data['office_location'])
            self.assertEqual(teacher_signup_request.status, 'pending')
            
            # Verify relationship integrity
            self.assertEqual(user.teacher_signup_request, teacher_signup_request)
            
            # Verify timestamps are set
            self.assertIsNotNone(teacher_signup_request.submitted_at)
            self.assertIsNotNone(teacher_signup_request.created_at)
            self.assertIsNotNone(teacher_signup_request.updated_at)
            
            # Verify pending teacher cannot login
            self.assertFalse(user.can_login())
            self.assertIn('pending approval', user.get_login_error_message().lower())
            
        finally:
            # Clean up test data
            User.objects.filter(username=data['username']).delete()
            TeacherSignupRequest.objects.filter(email=data['email']).delete()
    
    @settings(max_examples=50)
    @given(data=valid_teacher_registration_data())
    def test_teacher_registration_atomicity(self, data):
        """
        Property: For any teacher registration, if TeacherSignupRequest creation fails,
        the User account should not be created (atomic transaction)
        """
        # Make email and username unique for this test
        unique_suffix = str(hash(str(data)))[-8:]
        data['username'] = f"atomic_{unique_suffix}@example.com"
        data['email'] = f"atomic_{unique_suffix}@example.com"
        
        # Create invalid teacher data (missing department)
        teacher_data = {
            'full_name_english': data['full_name_english'],
            'full_name_bangla': data['full_name_bangla'],
            'designation': data['designation'],
            'department': 'invalid-uuid',  # This will cause failure
            'qualifications': data['qualifications'],
            'specializations': data['specializations'],
            'office_location': data['office_location']
        }
        
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': data['role'],
            'mobile_number': data['mobile_number']
        }
        
        try:
            # This should fail due to invalid department
            with self.assertRaises(Exception):
                register_teacher_with_signup_request(user_data, teacher_data)
            
            # Verify no User was created
            self.assertFalse(
                User.objects.filter(username=data['username']).exists(),
                "User should not exist when TeacherSignupRequest creation fails"
            )
            
            # Verify no TeacherSignupRequest was created
            self.assertFalse(
                TeacherSignupRequest.objects.filter(email=data['email']).exists(),
                "TeacherSignupRequest should not exist when creation fails"
            )
            
        finally:
            # Clean up any potential test data
            User.objects.filter(username=data['username']).delete()
            TeacherSignupRequest.objects.filter(email=data['email']).delete()
    
    @settings(max_examples=50)
    @given(data=valid_teacher_registration_data())
    def test_teacher_registration_data_consistency(self, data):
        """
        Property: For any teacher registration, the data in User and TeacherSignupRequest
        should be consistent (email, mobile_number match)
        """
        # Make email and username unique for this test
        unique_suffix = str(hash(str(data)))[-8:]
        data['username'] = f"consistency_{unique_suffix}@example.com"
        data['email'] = f"consistency_{unique_suffix}@example.com"
        
        teacher_data = {
            'full_name_english': data['full_name_english'],
            'full_name_bangla': data['full_name_bangla'],
            'designation': data['designation'],
            'department': str(self.department.id),
            'qualifications': data['qualifications'],
            'specializations': data['specializations'],
            'office_location': data['office_location']
        }
        
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': data['role'],
            'mobile_number': data['mobile_number']
        }
        
        try:
            user, teacher_signup_request = register_teacher_with_signup_request(user_data, teacher_data)
            
            # Verify data consistency between User and TeacherSignupRequest
            self.assertEqual(user.email, teacher_signup_request.email)
            self.assertEqual(user.mobile_number, teacher_signup_request.mobile_number)
            
            # Verify one-to-one relationship
            self.assertEqual(user.teacher_signup_request, teacher_signup_request)
            self.assertEqual(teacher_signup_request.user, user)
            
            # Verify both records exist in database
            db_user = User.objects.get(username=data['username'])
            db_request = TeacherSignupRequest.objects.get(email=data['email'])
            
            self.assertEqual(db_user, user)
            self.assertEqual(db_request, teacher_signup_request)
            self.assertEqual(db_user.teacher_signup_request, db_request)
            
        finally:
            # Clean up test data
            User.objects.filter(username=data['username']).delete()
            TeacherSignupRequest.objects.filter(email=data['email']).delete()