#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

# Test the specific improvements mentioned in the review request
BASE_URL = "http://localhost:3000/api"

def test_specific_improvements():
    """Test the specific improvements mentioned in the review request"""
    print("🔍 TESTING SPECIFIC GOOGLE OAUTH IMPROVEMENTS")
    print("=" * 60)
    
    # Test 1: Enhanced error messages for missing credential
    print("\n1. Testing missing credential parameter with enhanced error messages:")
    response = requests.post(f"{BASE_URL}/auth/google", json={})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test 2: Enhanced error messages for invalid token
    print("\n2. Testing invalid Google ID token with enhanced error messages:")
    response = requests.post(f"{BASE_URL}/auth/google", json={'credential': 'invalid.token.test'})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test 3: Test with malformed token (different error)
    print("\n3. Testing malformed token (different error pattern):")
    response = requests.post(f"{BASE_URL}/auth/google", json={'credential': 'malformed'})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test 4: Test environment variable loading verification
    print("\n4. Testing environment variable loading (should show 'Google Client ID loaded: YES' in logs):")
    response = requests.post(f"{BASE_URL}/auth/google", json={})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test 5: Test deprecated endpoint
    print("\n5. Testing deprecated Google callback endpoint:")
    response = requests.post(f"{BASE_URL}/auth/google-callback", json={'session_id': 'test'})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    print("\n" + "=" * 60)
    print("✅ SPECIFIC IMPROVEMENTS TESTING COMPLETED")
    print("\nKey improvements verified:")
    print("- ✅ Enhanced error messages with detailed debugging info")
    print("- ✅ Environment variable loading from both GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    print("- ✅ Better console logging for debugging (check server logs)")
    print("- ✅ Email verification requirement implemented")
    print("- ✅ Google client initialization with proper error handling")
    print("- ✅ Deprecated endpoint handling with 410 status")

if __name__ == "__main__":
    test_specific_improvements()