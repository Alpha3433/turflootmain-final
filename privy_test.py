#!/usr/bin/env python3
"""
TurfLoot Backend API Testing - Privy Google OAuth Focus
Testing the new Privy Google OAuth authentication system and backend compatibility
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment - using localhost for testing
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_emoji} {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_privy_webhook_compatibility():
    """Test that existing Privy webhook still works correctly"""
    print("🔍 TESTING: Privy Webhook Compatibility")
    
    # Test different Privy webhook event types
    test_events = [
        {
            "event_type": "fiat_onramp.created",
            "data": {
                "id": "onramp_test_001",
                "user_id": "privy_user_123",
                "amount": 100.0,
                "currency": "USD",
                "status": "created"
            }
        },
        {
            "event_type": "fiat_onramp.completed",
            "data": {
                "id": "onramp_test_002", 
                "user_id": "privy_user_123",
                "amount": 100.0,
                "currency": "USD",
                "status": "completed",
                "transaction_hash": "0x123abc"
            }
        },
        {
            "event_type": "fiat_onramp.failed",
            "data": {
                "id": "onramp_test_003",
                "user_id": "privy_user_123", 
                "amount": 100.0,
                "currency": "USD",
                "status": "failed",
                "error": "Payment declined"
            }
        }
    ]
    
    for i, event in enumerate(test_events, 1):
        try:
            response = requests.post(
                f"{API_BASE}/onramp/webhook",
                json=event,
                headers={
                    "Content-Type": "application/json",
                    "x-privy-signature": "test_signature_123"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    log_test(f"Privy Webhook Event {i} ({event['event_type']})", "PASS", 
                           f"Event processed successfully: {data.get('message')}")
                else:
                    log_test(f"Privy Webhook Event {i}", "FAIL", 
                           f"Unexpected response: {data}")
            else:
                log_test(f"Privy Webhook Event {i}", "FAIL", 
                       f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            log_test(f"Privy Webhook Event {i}", "FAIL", f"Request failed: {str(e)}")

def test_privy_authentication_backend_support():
    """Test if there's backend support for Privy authentication tokens"""
    print("🔍 TESTING: Privy Authentication Backend Support")
    
    # Test 1: Check if there's a Privy auth endpoint
    try:
        response = requests.post(
            f"{API_BASE}/auth/privy",
            json={"access_token": "test_privy_token"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("Privy Auth Endpoint", "WARN", 
                   "No /api/auth/privy endpoint found - NEEDS IMPLEMENTATION for Privy integration")
        elif response.status_code == 200:
            log_test("Privy Auth Endpoint", "PASS", "Privy auth endpoint exists")
        else:
            log_test("Privy Auth Endpoint", "WARN", 
                   f"Unexpected response: HTTP {response.status_code}")
            
    except Exception as e:
        log_test("Privy Auth Endpoint", "FAIL", f"Request failed: {str(e)}")
    
    # Test 2: Check if there's a Privy user verification endpoint
    try:
        response = requests.post(
            f"{API_BASE}/auth/privy/verify",
            json={"privy_token": "test_privy_token", "user_id": "privy_user_123"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("Privy Token Verification Endpoint", "WARN", 
                   "No /api/auth/privy/verify endpoint found - may need implementation")
        elif response.status_code == 200:
            log_test("Privy Token Verification Endpoint", "PASS", "Privy verification endpoint exists")
        else:
            log_test("Privy Token Verification Endpoint", "WARN", 
                   f"Unexpected response: HTTP {response.status_code}")
            
    except Exception as e:
        log_test("Privy Token Verification Endpoint", "FAIL", f"Request failed: {str(e)}")

def test_deprecated_google_oauth():
    """Test that direct Google OAuth endpoints are properly deprecated"""
    print("🔍 TESTING: Deprecated Google OAuth Endpoints")
    
    # Test 1: Direct Google OAuth should be deprecated
    try:
        response = requests.post(
            f"{API_BASE}/auth/google",
            json={"credential": "fake_google_token"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("Direct Google OAuth Deprecation", "PASS", 
                   "Direct Google OAuth properly handles invalid tokens")
        else:
            log_test("Direct Google OAuth Deprecation", "WARN", 
                   f"Unexpected response: HTTP {response.status_code}")
            
    except Exception as e:
        log_test("Direct Google OAuth", "FAIL", f"Request failed: {str(e)}")
    
    # Test 2: Google callback should return deprecation message
    try:
        response = requests.post(
            f"{API_BASE}/auth/google-callback",
            json={"session_id": "test"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 410:
            data = response.json()
            if "deprecated" in data.get("error", "").lower():
                log_test("Google Callback Deprecation", "PASS", 
                       f"Properly deprecated: {data.get('error')}")
            else:
                log_test("Google Callback Deprecation", "WARN", 
                       f"Unexpected deprecation message: {data}")
        else:
            log_test("Google Callback Deprecation", "FAIL", 
                   f"Expected 410, got HTTP {response.status_code}")
            
    except Exception as e:
        log_test("Google Callback Deprecation", "FAIL", f"Request failed: {str(e)}")

def test_user_management_with_privy_data():
    """Test user creation and management with Privy-style data"""
    print("🔍 TESTING: User Management with Privy Data Structure")
    
    # Test creating a user with Privy-style data
    privy_user_data = {
        "wallet_address": f"privy_test_{int(time.time())}",
        "email": "privy.test@example.com",
        "username": "PrivyTestUser",
        "auth_method": "privy",
        "privy_id": "privy_user_12345",
        "profile": {
            "display_name": "Privy Test User",
            "avatar_url": "https://example.com/avatar.jpg"
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/users",
            json=privy_user_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            user_data = response.json()
            if user_data.get("id"):
                log_test("Privy User Creation", "PASS", 
                       f"User created with ID: {user_data.get('id')}")
                
                # Test retrieving the user
                user_id = user_data.get("wallet_address")
                get_response = requests.get(
                    f"{API_BASE}/users/{user_id}",
                    timeout=10
                )
                
                if get_response.status_code == 200:
                    retrieved_user = get_response.json()
                    if retrieved_user.get("auth_method") == "privy":
                        log_test("Privy User Retrieval", "PASS", 
                               "User retrieved with Privy auth method")
                    else:
                        log_test("Privy User Retrieval", "WARN", 
                               f"Auth method: {retrieved_user.get('auth_method')}")
                else:
                    log_test("Privy User Retrieval", "FAIL", 
                           f"HTTP {get_response.status_code}")
            else:
                log_test("Privy User Creation", "FAIL", 
                       f"No user ID in response: {user_data}")
        else:
            log_test("Privy User Creation", "FAIL", 
                   f"HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        log_test("Privy User Creation", "FAIL", f"Request failed: {str(e)}")

def test_jwt_token_compatibility():
    """Test JWT token generation and validation for authentication"""
    print("🔍 TESTING: JWT Token Compatibility")
    
    # Test using a different wallet address to avoid conflicts
    try:
        auth_data = {
            "wallet_address": f"test_wallet_{int(time.time())}",
            "signature": "test_signature",
            "message": "Sign this message to authenticate"
        }
        
        response = requests.post(
            f"{API_BASE}/auth/wallet",
            json=auth_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("token"):
                token = data.get("token")
                # Verify token has 3 parts (header.payload.signature)
                token_parts = token.split(".")
                if len(token_parts) == 3:
                    log_test("JWT Token Structure", "PASS", 
                           f"Valid JWT token with {len(token_parts)} parts")
                    
                    # Test token validation via /auth/me
                    me_response = requests.get(
                        f"{API_BASE}/auth/me",
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=10
                    )
                    
                    if me_response.status_code == 200:
                        log_test("JWT Token Validation", "PASS", 
                               "Token validated successfully via /auth/me")
                    else:
                        log_test("JWT Token Validation", "WARN", 
                               f"Token validation: HTTP {me_response.status_code}")
                else:
                    log_test("JWT Token Structure", "FAIL", 
                           f"Invalid JWT structure: {len(token_parts)} parts")
            else:
                log_test("JWT Token Generation", "FAIL", "No token in response")
        elif response.status_code == 500:
            error_data = response.json()
            log_test("JWT Token Generation", "WARN", 
                   f"Server error: {error_data.get('details', 'Unknown error')}")
        else:
            log_test("JWT Token Generation", "WARN", 
                   f"Auth endpoint: HTTP {response.status_code}")
            
    except Exception as e:
        log_test("JWT Token Testing", "FAIL", f"Request failed: {str(e)}")

def test_authentication_middleware():
    """Test that authentication middleware works with different auth methods"""
    print("🔍 TESTING: Authentication Middleware Compatibility")
    
    # Test protected endpoints without authentication
    protected_endpoints = [
        "/auth/me",
        "/games", 
        "/withdraw"
    ]
    
    for endpoint in protected_endpoints:
        try:
            response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
            
            if response.status_code == 401:
                log_test(f"Protected Endpoint {endpoint}", "PASS", 
                       "Properly requires authentication")
            elif response.status_code == 200:
                log_test(f"Protected Endpoint {endpoint}", "WARN", 
                       "Endpoint accessible without auth - may be issue")
            else:
                log_test(f"Protected Endpoint {endpoint}", "WARN", 
                       f"Unexpected response: HTTP {response.status_code}")
                
        except Exception as e:
            log_test(f"Protected Endpoint {endpoint}", "FAIL", 
                   f"Request failed: {str(e)}")

def main():
    """Run all Privy Google OAuth authentication tests"""
    print("=" * 80)
    print("🚀 TURFLOOT PRIVY GOOGLE OAUTH AUTHENTICATION TESTING")
    print("=" * 80)
    print(f"🌐 Testing against: {BASE_URL}")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # Run all tests in priority order
    test_privy_webhook_compatibility()
    test_privy_authentication_backend_support()
    test_deprecated_google_oauth()
    test_user_management_with_privy_data()
    test_jwt_token_compatibility()
    test_authentication_middleware()
    
    print("=" * 80)
    print("🏁 PRIVY GOOGLE OAUTH TESTING COMPLETED")
    print(f"⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

if __name__ == "__main__":
    main()