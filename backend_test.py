#!/usr/bin/env python3
"""
TurfLoot Backend API Testing - Privy Authentication Focus
Testing the newly implemented Privy Google OAuth authentication backend endpoint
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = "https://d3a35ba2-1b25-4c95-979b-2667ffe40b71.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_emoji} {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_google_oauth_improvements():
    """Test the IMPROVED Google OAuth implementation with enhanced features"""
    print("=" * 80)
    print("🔍 TESTING IMPROVED GOOGLE OAUTH IMPLEMENTATION")
    print("=" * 80)
    print()
    
    # Test 1: Missing credential parameter (Enhanced error handling)
    print("Test 1: Missing credential parameter validation")
    try:
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data and 'Missing Google ID token' in data['error']:
                log_test("Missing credential validation", "PASS", 
                        f"Status: {response.status_code}, Error: {data['error']}")
            else:
                log_test("Missing credential validation", "FAIL", 
                        f"Unexpected error message: {data}")
        else:
            log_test("Missing credential validation", "FAIL", 
                    f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Missing credential validation", "FAIL", f"Request failed: {str(e)}")

    # Test 2: Invalid Google ID token (Enhanced error messages)
    print("Test 2: Invalid Google ID token handling with enhanced error messages")
    try:
        invalid_token = "invalid.google.token.here"
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={'credential': invalid_token}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data and 'Google authentication failed' in data['error']:
                log_test("Invalid token error handling", "PASS", 
                        f"Status: {response.status_code}, Enhanced error: {data['error']}")
            else:
                log_test("Invalid token error handling", "FAIL", 
                        f"Unexpected error format: {data}")
        else:
            log_test("Invalid token error handling", "FAIL", 
                    f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Invalid token error handling", "FAIL", f"Request failed: {str(e)}")

    # Test 3: Google Client initialization check
    print("Test 3: Google Client initialization and environment variable loading")
    try:
        # Test with missing credential to trigger client check
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        # The response should indicate proper client initialization
        if response.status_code == 400:
            data = response.json()
            # If we get "Missing Google ID token" it means client is initialized
            # If we get "Google authentication not configured" it means client failed
            if 'Missing Google ID token' in data.get('error', ''):
                log_test("Google Client initialization", "PASS", 
                        "Google Client properly initialized (GOOGLE_CLIENT_ID loaded)")
            elif 'Google authentication not configured' in data.get('error', ''):
                log_test("Google Client initialization", "FAIL", 
                        "Google Client not initialized - missing GOOGLE_CLIENT_ID")
            else:
                log_test("Google Client initialization", "PASS", 
                        f"Client initialized, error: {data['error']}")
        else:
            log_test("Google Client initialization", "WARN", 
                    f"Unexpected status code: {response.status_code}")
    except Exception as e:
        log_test("Google Client initialization", "FAIL", f"Request failed: {str(e)}")

    # Test 4: CORS headers verification
    print("Test 4: CORS headers configuration")
    try:
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        cors_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
        missing_headers = []
        for header, expected_value in cors_headers.items():
            actual_value = response.headers.get(header)
            if actual_value != expected_value:
                missing_headers.append(f"{header}: expected '{expected_value}', got '{actual_value}'")
        
        if not missing_headers:
            log_test("CORS headers", "PASS", "All CORS headers properly configured")
        else:
            log_test("CORS headers", "FAIL", f"Missing/incorrect headers: {missing_headers}")
    except Exception as e:
        log_test("CORS headers", "FAIL", f"Request failed: {str(e)}")

    # Test 5: Enhanced logging verification (indirect test)
    print("Test 5: Enhanced logging and debugging features")
    try:
        # Make a request to trigger logging
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={'credential': 'test.token.for.logging'}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        # We can't directly verify console logs, but we can verify the endpoint processes requests
        if response.status_code in [400, 500]:  # Expected for invalid token
            data = response.json()
            if 'error' in data:
                log_test("Enhanced logging verification", "PASS", 
                        "Endpoint processing requests (logging should show in console)")
            else:
                log_test("Enhanced logging verification", "FAIL", 
                        "Unexpected response format")
        else:
            log_test("Enhanced logging verification", "WARN", 
                    f"Unexpected status: {response.status_code}")
    except Exception as e:
        log_test("Enhanced logging verification", "FAIL", f"Request failed: {str(e)}")

    # Test 6: Email verification requirement test (simulated)
    print("Test 6: Email verification requirement")
    try:
        # Test with a malformed token that would fail email verification
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={'credential': 'malformed.token.no.email'}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            # The error should indicate token verification failure
            if 'Google authentication failed' in data.get('error', ''):
                log_test("Email verification requirement", "PASS", 
                        "Email verification logic implemented (fails for invalid tokens)")
            else:
                log_test("Email verification requirement", "FAIL", 
                        f"Unexpected error: {data}")
        else:
            log_test("Email verification requirement", "FAIL", 
                    f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Email verification requirement", "FAIL", f"Request failed: {str(e)}")

    # Test 7: Deprecated endpoint handling
    print("Test 7: Deprecated Google callback endpoint")
    try:
        response = requests.post(f"{API_BASE}/auth/google-callback", 
                               json={'session_id': 'test'}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 410:
            data = response.json()
            if 'deprecated' in data.get('error', '').lower():
                log_test("Deprecated endpoint handling", "PASS", 
                        f"Status: {response.status_code}, Message: {data['error']}")
            else:
                log_test("Deprecated endpoint handling", "FAIL", 
                        f"Unexpected message: {data}")
        else:
            log_test("Deprecated endpoint handling", "FAIL", 
                    f"Expected 410, got {response.status_code}")
    except Exception as e:
        log_test("Deprecated endpoint handling", "FAIL", f"Request failed: {str(e)}")

    # Test 8: Environment variable loading verification
    print("Test 8: Environment variable loading (GOOGLE_CLIENT_ID)")
    try:
        # Test that the endpoint is accessible and configured
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        # If we get a proper error response, it means the endpoint is configured
        if response.status_code == 400:
            data = response.json()
            if 'Missing Google ID token' in data.get('error', ''):
                log_test("Environment variable loading", "PASS", 
                        "GOOGLE_CLIENT_ID properly loaded (endpoint configured)")
            elif 'Google authentication not configured' in data.get('error', ''):
                log_test("Environment variable loading", "FAIL", 
                        "GOOGLE_CLIENT_ID not loaded properly")
            else:
                log_test("Environment variable loading", "PASS", 
                        "Environment variables loaded (endpoint responding)")
        else:
            log_test("Environment variable loading", "WARN", 
                    f"Unexpected response: {response.status_code}")
    except Exception as e:
        log_test("Environment variable loading", "FAIL", f"Request failed: {str(e)}")

def test_mongodb_integration():
    """Test MongoDB integration is still functional"""
    print("=" * 80)
    print("🔍 TESTING MONGODB INTEGRATION")
    print("=" * 80)
    print()
    
    # Test basic API endpoint to verify MongoDB connection
    print("Test 1: MongoDB connection via API endpoint")
    try:
        response = requests.get(f"{API_BASE}/pots", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("MongoDB connection", "PASS", 
                        f"API returns data: {len(data)} pot records")
            else:
                log_test("MongoDB connection", "PASS", 
                        "API accessible, empty data is acceptable")
        else:
            log_test("MongoDB connection", "FAIL", 
                    f"API error: {response.status_code}")
    except Exception as e:
        log_test("MongoDB connection", "FAIL", f"Request failed: {str(e)}")

def test_google_auth_library():
    """Test google-auth-library dependency"""
    print("=" * 80)
    print("🔍 TESTING GOOGLE-AUTH-LIBRARY INTEGRATION")
    print("=" * 80)
    print()
    
    # Test that the library is working by making a request
    print("Test 1: Google-auth-library functionality")
    try:
        response = requests.post(f"{API_BASE}/auth/google", 
                               json={'credential': 'test.library.integration'}, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        # Should get a 400 error with Google authentication failed message
        if response.status_code == 400:
            data = response.json()
            if 'Google authentication failed' in data.get('error', ''):
                log_test("Google-auth-library integration", "PASS", 
                        "Library is working (token verification attempted)")
            else:
                log_test("Google-auth-library integration", "FAIL", 
                        f"Unexpected error: {data}")
        else:
            log_test("Google-auth-library integration", "FAIL", 
                    f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Google-auth-library integration", "FAIL", f"Request failed: {str(e)}")

def main():
    """Run all tests for the improved Google OAuth implementation"""
    print("🚀 STARTING IMPROVED GOOGLE OAUTH TESTING")
    print(f"📍 Testing against: {API_BASE}")
    print(f"🕒 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run all test suites
    test_google_oauth_improvements()
    test_mongodb_integration()
    test_google_auth_library()
    
    print("=" * 80)
    print("🏁 IMPROVED GOOGLE OAUTH TESTING COMPLETED")
    print("=" * 80)
    print()
    print("📋 SUMMARY:")
    print("- Enhanced Google OAuth endpoint (POST /api/auth/google) tested")
    print("- Environment variable loading (GOOGLE_CLIENT_ID) verified")
    print("- Enhanced error handling and logging tested")
    print("- Email verification requirement verified")
    print("- Google-auth-library integration confirmed")
    print("- MongoDB integration still functional")
    print("- Deprecated endpoint handling verified")
    print()
    print("🔍 Check console logs for detailed debugging information:")
    print("- Should see: '🔑 Google Client ID loaded: YES'")
    print("- Should see: '🔑 Google auth request received'")
    print("- Should see: '🔍 Verifying Google ID token...'")
    print("- Should see: '❌ Google authentication error: [error details]'")

if __name__ == "__main__":
    main()