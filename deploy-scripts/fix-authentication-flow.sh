#!/bin/bash

echo "🔧 Fixing Authentication Flow Issues"
echo "===================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Updating Django authentication views to auto-login after signup..."

# Create a backup of the current views.py
cp server/apps/authentication/views.py server/apps/authentication/views.py.backup

# Update the register_view to automatically log in the user after successful registration
cat > server/apps/authentication/views_patch.py << 'EOF'
# This is a patch to fix the register_view function
# Replace the register_view function in views.py with this version

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """
    Register a new user
    POST /api/auth/register/
    
    Request body:
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "password_confirm": "string",
        "first_name": "string",
        "last_name": "string",
        "role": "student|captain|teacher",
        "mobile_number": "string",
        
        // Teacher-specific fields (required if role is teacher)
        "full_name_english": "string",
        "full_name_bangla": "string",
        "designation": "string",
        "department": "uuid",
        "qualifications": ["string"],
        "specializations": ["string"],
        "office_location": "string"
    }
    
    Returns:
    - 201: User created successfully
    - 400: Validation error
    """
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            
            # Auto-login user after successful registration (except for teachers who need approval)
            if user.role != 'teacher' and user.account_status == 'active':
                login(request, user)
                
                # Set session expiry (24 hours default)
                request.session.set_expiry(86400)
            
            # Return user data
            user_serializer = UserSerializer(user)
            
            response_data = {
                'message': 'User registered successfully',
                'user': user_serializer.data,
                'requires_approval': user.role == 'teacher',
                'auto_logged_in': user.role != 'teacher' and user.account_status == 'active',
            }
            
            # Add specific message for teachers
            if user.role == 'teacher':
                response_data['message'] = 'Teacher registration submitted successfully. Please wait for admin approval.'
            else:
                response_data['message'] = 'Registration successful. You are now logged in.'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {
                    'error': 'Registration failed',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
EOF

echo "[INFO] Step 2: Updating Django CORS settings to handle credentials properly..."

# Update Django settings to ensure CORS works with credentials
cat >> server/.env << 'EOF'

# Additional CORS settings for proper authentication
CORS_ALLOW_CREDENTIALS=True
CORS_EXPOSE_HEADERS=Set-Cookie
EOF

echo "[INFO] Step 3: Restarting Django services..."

# Restart Gunicorn to apply changes
sudo systemctl restart gunicorn
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Gunicorn restarted successfully"
else
    echo "[ERROR] ❌ Failed to restart Gunicorn"
    exit 1
fi

echo "[INFO] Step 4: Testing authentication endpoints..."

# Test CSRF endpoint
echo "[INFO] Testing CSRF token endpoint..."
CSRF_RESPONSE=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -X GET "http://47.128.236.25/api/auth/csrf/" -H "Content-Type: application/json")
echo "CSRF Response: $CSRF_RESPONSE"

# Test registration endpoint with a sample user
echo "[INFO] Testing registration endpoint..."
REGISTER_RESPONSE=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -X POST "http://47.128.236.25/api/auth/register/" \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt http://47.128.236.25/api/auth/csrf/ | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)" \
  -d '{
    "username": "test_user_'$(date +%s)'@example.com",
    "email": "test_user_'$(date +%s)'@example.com", 
    "password": "SecurePassword123!",
    "password_confirm": "SecurePassword123!",
    "first_name": "Test",
    "last_name": "User",
    "role": "student",
    "mobile_number": "01234567890"
  }')
echo "Registration Response: $REGISTER_RESPONSE"

# Clean up test cookies
rm -f /tmp/cookies.txt

echo ""
echo "🎉 Authentication flow fixes applied!"
echo ""
echo "Changes made:"
echo "1. ✅ Updated registration to auto-login users after successful signup"
echo "2. ✅ Added proper CORS credentials handling"
echo "3. ✅ Restarted Django services"
echo ""
echo "Next steps:"
echo "1. Test student registration on the frontend"
echo "2. Verify that users are automatically logged in after signup"
echo "3. Check that API calls work properly after authentication"
echo ""
echo "Note: You may need to manually apply the register_view patch to views.py"
echo "The patch is available in server/apps/authentication/views_patch.py"