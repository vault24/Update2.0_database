#!/usr/bin/env python3
"""
Test script to verify admin password reset functionality
"""
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/auth/admin/password-reset"
TEST_EMAIL = "admin@example.com"  # Change this to a real admin email

def test_password_reset_request():
    """Test the password reset request endpoint"""
    print("Testing password reset request...")
    
    url = f"{BASE_URL}/request/"
    data = {"email": TEST_EMAIL}
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Password reset request successful!")
            return True
        else:
            print("❌ Password reset request failed!")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_otp_verification():
    """Test OTP verification (requires manual OTP input)"""
    print("\nTesting OTP verification...")
    
    otp = input("Enter the OTP you received (or press Enter to skip): ").strip()
    if not otp:
        print("Skipping OTP verification test")
        return True
    
    url = f"{BASE_URL}/verify/"
    data = {"email": TEST_EMAIL, "otp": otp}
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ OTP verification successful!")
            return True
        else:
            print("❌ OTP verification failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🔐 Admin Password Reset Functionality Test")
    print("=" * 50)
    
    # Test password reset request
    if not test_password_reset_request():
        sys.exit(1)
    
    # Test OTP verification (optional)
    test_otp_verification()
    
    print("\n✅ Basic password reset functionality is working!")
    print("\nTo complete the test:")
    print("1. Check your email for the OTP")
    print("2. Use the admin frontend at http://localhost:3000/password-reset")
    print("3. Follow the password reset flow")

if __name__ == "__main__":
    main()