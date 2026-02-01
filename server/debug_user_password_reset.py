#!/usr/bin/env python
"""
Debug script to check why OTP is not coming for mahadi379377@gmail.com
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from apps.authentication.services import EmailService, OTPService
from apps.authentication.models import OTPToken, PasswordResetAttempt

User = get_user_model()

def check_user_details():
    """Check the user details for mahadi379377@gmail.com"""
    print("🔍 Checking user details for mahadi379377@gmail.com...")
    
    try:
        user = User.objects.get(email='mahadi379377@gmail.com')
        print(f"✅ User found:")
        print(f"   ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   First Name: {user.first_name}")
        print(f"   Last Name: {user.last_name}")
        print(f"   Role: {user.role}")
        print(f"   Account Status: {user.account_status}")
        print(f"   Admission Status: {user.admission_status}")
        print(f"   Is Active: {user.is_active}")
        print(f"   Related Profile ID: {user.related_profile_id}")
        
        # Check if user can use student password reset
        if user.is_student_or_captain():
            print("✅ User is eligible for student password reset")
        else:
            print("❌ User is NOT eligible for student password reset")
            print(f"   User role '{user.role}' is not student or captain")
        
        return user
        
    except User.DoesNotExist:
        print("❌ User not found with email: mahadi379377@gmail.com")
        return None

def check_recent_attempts():
    """Check recent password reset attempts"""
    print("\n📊 Checking recent password reset attempts...")
    
    # Check recent attempts for this email
    recent_attempts = PasswordResetAttempt.objects.filter(
        email='mahadi379377@gmail.com'
    ).order_by('-created_at')[:10]
    
    if recent_attempts:
        print(f"Found {recent_attempts.count()} recent attempts:")
        for attempt in recent_attempts:
            print(f"   {attempt.created_at} - Success: {attempt.success} - IP: {attempt.ip_address}")
    else:
        print("No recent password reset attempts found")

def check_existing_otps():
    """Check existing OTP tokens"""
    print("\n🔐 Checking existing OTP tokens...")
    
    try:
        user = User.objects.get(email='mahadi379377@gmail.com')
        otps = OTPToken.objects.filter(user=user).order_by('-created_at')[:5]
        
        if otps:
            print(f"Found {otps.count()} OTP tokens:")
            for otp in otps:
                print(f"   Token: {otp.token} - Created: {otp.created_at} - Expires: {otp.expires_at}")
                print(f"   Used: {otp.is_used} - Expired: {otp.is_expired()} - Attempts: {otp.attempts}")
        else:
            print("No OTP tokens found for this user")
            
    except User.DoesNotExist:
        print("User not found")

def test_direct_email_send():
    """Test sending email directly to mahadi379377@gmail.com"""
    print("\n📧 Testing direct email send...")
    
    try:
        user = User.objects.get(email='mahadi379377@gmail.com')
        
        # Generate OTP
        otp_token = OTPService.create_otp_token(user)
        print(f"Generated OTP: {otp_token.token}")
        
        # Try to send email
        print("Attempting to send email...")
        email_sent = EmailService.send_otp_email(user, otp_token.token)
        
        if email_sent:
            print("✅ Email sent successfully!")
            print(f"   To: {user.email}")
            print(f"   OTP: {otp_token.token}")
            print("   Check the email inbox (including spam folder)")
        else:
            print("❌ Failed to send email")
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")

def test_api_endpoint():
    """Test the password reset API endpoint"""
    print("\n🌐 Testing password reset API endpoint...")
    
    client = Client()
    
    # Test the API endpoint
    response = client.post('/api/auth/students/password-reset/request/', {
        'email': 'mahadi379377@gmail.com'
    }, content_type='application/json')
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Response: {data}")
            
            if data.get('success'):
                print("✅ API request successful")
            else:
                print(f"❌ API request failed: {data.get('message')}")
        except:
            print("Response is not JSON")
            print(f"Response content: {response.content.decode()}")
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(f"Response: {response.content.decode()}")

def check_email_settings():
    """Check email settings"""
    print("\n⚙️ Checking email settings...")
    
    from django.conf import settings
    
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    
    # Test basic email functionality
    print("\nTesting basic email functionality...")
    try:
        from django.core.mail import send_mail
        
        result = send_mail(
            subject='Test Email - SIPI Password Reset Debug',
            message='This is a test email to verify email functionality.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['mahadi379377@gmail.com'],
            fail_silently=False
        )
        
        if result:
            print("✅ Basic email test successful")
        else:
            print("❌ Basic email test failed")
            
    except Exception as e:
        print(f"❌ Email test error: {str(e)}")

def main():
    print("🔧 SIPI Password Reset Debug for mahadi379377@gmail.com")
    print("=" * 60)
    
    # Check user details
    user = check_user_details()
    if not user:
        return
    
    # Check recent attempts
    check_recent_attempts()
    
    # Check existing OTPs
    check_existing_otps()
    
    # Check email settings
    check_email_settings()
    
    # Test direct email send
    test_direct_email_send()
    
    # Test API endpoint
    test_api_endpoint()
    
    print("\n" + "=" * 60)
    print("🔍 Debug Summary:")
    print("1. Check if user exists and has correct role")
    print("2. Check if there are rate limiting issues")
    print("3. Check if OTP is being generated")
    print("4. Check if email is being sent")
    print("5. Check spam folder in Gmail")
    print("\n💡 Common issues:")
    print("- Gmail might be filtering emails to spam")
    print("- Rate limiting might be blocking requests")
    print("- User role might not be 'student' or 'captain'")
    print("- Email address might be incorrect")

if __name__ == '__main__':
    main()