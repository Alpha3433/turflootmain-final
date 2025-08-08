#!/usr/bin/env python3
"""
Backend API Testing for TurfLoot - Custom Name Update Endpoint Debug
Focus: Debugging HTTP 500 error for user james.paradisius@gmail.com updating username to "quoc"
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://1129be5f-620c-46b6-bfba-476a3eb10829.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_custom_name_update_debug():
    """
    Debug the specific HTTP 500 error for custom name update endpoint
    Test data from review request:
    - userId: "did:privy:cm1234567890abcdef"
    - customName: "quoc"
    - privyId: "did:privy:cm1234567890abcdef"
    - email: "james.paradisius@gmail.com"
    """
    print("🔍 DEBUGGING CUSTOM NAME UPDATE ENDPOINT - HTTP 500 ERROR")
    print("=" * 80)
    
    # Test data from the review request
    test_data = {
        "userId": "did:privy:cm1234567890abcdef",
        "customName": "quoc", 
        "privyId": "did:privy:cm1234567890abcdef",
        "email": "james.paradisius@gmail.com"
    }
    
    print(f"📝 Test Data: {json.dumps(test_data, indent=2)}")
    print()
    
    # Test 1: Exact reproduction of the failing scenario
    print("TEST 1: Exact reproduction with provided test data")
    print("-" * 50)
    
    try:
        response = requests.post(
            f"{API_BASE}/users/profile/update-name",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 500:
            print("❌ REPRODUCED: HTTP 500 ERROR CONFIRMED")
            print(f"Error Response: {response.text}")
        else:
            print(f"✅ Status: {response.status_code}")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    
    print()
    
    # Test 2: Test with minimal required fields only
    print("TEST 2: Minimal required fields (userId + customName)")
    print("-" * 50)
    
    minimal_data = {
        "userId": "did:privy:cm1234567890abcdef",
        "customName": "quoc"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/users/profile/update-name",
            json=minimal_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 500:
            print("❌ STILL FAILING: HTTP 500 ERROR WITH MINIMAL DATA")
            print(f"Error Response: {response.text}")
        else:
            print(f"✅ Status: {response.status_code}")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    print()
    
    # Test 3: Test with email as userId (alternative scenario)
    print("TEST 3: Using email as userId")
    print("-" * 50)
    
    email_data = {
        "userId": "james.paradisius@gmail.com",
        "customName": "quoc",
        "privyId": "did:privy:cm1234567890abcdef"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/users/profile/update-name",
            json=email_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 500:
            print("❌ STILL FAILING: HTTP 500 ERROR WITH EMAIL AS USERID")
            print(f"Error Response: {response.text}")
        else:
            print(f"✅ Status: {response.status_code}")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    print()
    
    # Test 4: Test validation errors (missing fields)
    print("TEST 4: Validation test - missing required fields")
    print("-" * 50)
    
    invalid_data = {
        "userId": "did:privy:cm1234567890abcdef"
        # Missing customName
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/users/profile/update-name",
            json=invalid_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 400:
            print("✅ VALIDATION WORKING: Proper 400 error for missing fields")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    print()
    
    # Test 5: Test database connectivity by checking other endpoints
    print("TEST 5: Database connectivity check via other endpoints")
    print("-" * 50)
    
    try:
        # Test root endpoint
        response = requests.get(f"{API_BASE}/", timeout=30)
        print(f"Root endpoint status: {response.status_code}")
        
        # Test pots endpoint (uses database)
        response = requests.get(f"{API_BASE}/pots", timeout=30)
        print(f"Pots endpoint status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ DATABASE CONNECTIVITY: Other endpoints working")
        else:
            print("❌ DATABASE CONNECTIVITY: Other endpoints also failing")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Database connectivity test failed: {e}")
    
    print()
    
    # Test 6: Test with different user scenarios
    print("TEST 6: Test with existing vs new user scenarios")
    print("-" * 50)
    
    # First create a user via the users endpoint
    print("6a. Creating a test user first...")
    create_user_data = {
        "wallet_address": "test_wallet_for_name_update_debug",
        "email": "debug.test@turfloot.com"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/users",
            json=create_user_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"User creation status: {response.status_code}")
        if response.status_code == 200:
            try:
                user_data = response.json()
                created_user_id = user_data.get('id')
                print(f"✅ User created with ID: {created_user_id}")
                
                # Now try to update the name for this existing user
                print("6b. Updating name for existing user...")
                update_data = {
                    "userId": created_user_id,
                    "customName": "debug_test_name"
                }
                
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json=update_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                
                print(f"Name update for existing user status: {response.status_code}")
                if response.status_code == 500:
                    print("❌ STILL FAILING: HTTP 500 ERROR EVEN FOR EXISTING USER")
                    print(f"Error Response: {response.text}")
                else:
                    print(f"✅ Existing user update status: {response.status_code}")
                    try:
                        response_data = response.json()
                        print(f"Response: {json.dumps(response_data, indent=2)}")
                    except:
                        print(f"Raw Response: {response.text}")
                        
            except Exception as e:
                print(f"❌ Error processing user creation response: {e}")
        else:
            print(f"❌ User creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ User creation request failed: {e}")
    
    print()
    print("🔍 DEBUGGING SUMMARY")
    print("=" * 80)
    print("The custom name update endpoint is being tested with the specific")
    print("failing data from user james.paradisius@gmail.com trying to update")
    print("username to 'quoc'. Check the test results above for:")
    print("1. HTTP 500 error reproduction")
    print("2. Database connectivity issues")
    print("3. MongoDB query problems")
    print("4. Request data format validation")
    print("5. Existing vs new user scenarios")
    print()

def test_mongodb_connection():
    """Test MongoDB connection and basic operations"""
    print("🔍 MONGODB CONNECTION DIAGNOSTIC")
    print("=" * 80)
    
    # Test if we can reach any MongoDB-dependent endpoint
    endpoints_to_test = [
        "/pots",
        "/stats/live-players", 
        "/stats/global-winnings"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{API_BASE}{endpoint}", timeout=30)
            print(f"✅ {endpoint}: Status {response.status_code}")
            if response.status_code != 200:
                print(f"   Response: {response.text[:200]}...")
        except Exception as e:
            print(f"❌ {endpoint}: Failed - {e}")
    
    print()

def main():
    """Main test execution"""
    print(f"🚀 TURFLOOT BACKEND API TESTING - CUSTOM NAME UPDATE DEBUG")
    print(f"📍 Base URL: {BASE_URL}")
    print(f"📍 API Base: {API_BASE}")
    print(f"🕒 Test Time: {datetime.now().isoformat()}")
    print("=" * 80)
    print()
    
    # Test MongoDB connectivity first
    test_mongodb_connection()
    
    # Test the specific custom name update issue
    test_custom_name_update_debug()
    
    print("🏁 TESTING COMPLETED")
    print("=" * 80)

if __name__ == "__main__":
    main()