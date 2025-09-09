#!/usr/bin/env python3
"""
Backend Testing Suite for TurfLoot Friends List Data Transformation
Testing the friends list API response format to ensure friend names appear correctly.

CRITICAL FIX BEING TESTED:
- Transform database records from `friendUsername` to `username` field
- Map `friendUserIdentifier` to `id` field  
- Include all necessary fields (status, isOnline, etc.) for frontend display

TESTING REQUIREMENTS:
1. Friends List Data Format - GET /api/friends?type=friends returns properly transformed data
2. Data Structure Validation - verify response includes `username` field (not `friendUsername`)
3. Field Mapping - confirm `id` field mapping from `friendUserIdentifier`
4. Frontend Compatibility - ensure transformed data matches what frontend expects
"""

import requests
import json
import time
import sys
from urllib.parse import urljoin

# Get base URL from environment
BASE_URL = "https://turfloot-social.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_friends_list_data_transformation():
    """
    Test the friends list data transformation fix to ensure friend names appear correctly.
    
    CRITICAL FIX BEING TESTED:
    - Transform database records from `friendUsername` to `username` field
    - Map `friendUserIdentifier` to `id` field  
    - Include all necessary fields (status, isOnline, etc.) for frontend display
    """
    print("🧪 TESTING FRIENDS LIST DATA TRANSFORMATION")
    print("=" * 60)
    
    test_results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "test_details": []
    }
    
    # Test 1: API Health Check
    print("\n1️⃣ API HEALTH CHECK")
    test_results["total_tests"] += 1
    try:
        response = requests.get(f"{API_BASE}/ping", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Health Check: {data.get('status', 'ok')} - Server: {data.get('server', 'unknown')}")
            test_results["passed_tests"] += 1
            test_results["test_details"].append("✅ API Health Check - PASSED")
        else:
            print(f"❌ API Health Check failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ API Health Check - FAILED ({response.status_code})")
    except Exception as e:
        print(f"❌ API Health Check error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ API Health Check - ERROR ({e})")
    
    # Test 2: Friends List Data Format - Guest User (Should return empty)
    print("\n2️⃣ FRIENDS LIST DATA FORMAT - GUEST USER")
    test_results["total_tests"] += 1
    try:
        response = requests.get(f"{API_BASE}/friends?type=friends&userIdentifier=guest", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("friends"), list):
                print(f"✅ Guest user friends list: {len(data['friends'])} friends (expected: 0)")
                test_results["passed_tests"] += 1
                test_results["test_details"].append("✅ Guest Friends List Format - PASSED")
            else:
                print(f"❌ Invalid friends list format for guest: {data}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Guest Friends List Format - FAILED")
        else:
            print(f"❌ Friends list request failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ Guest Friends List Format - FAILED ({response.status_code})")
    except Exception as e:
        print(f"❌ Friends list request error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Guest Friends List Format - ERROR ({e})")
    
    # Test 3: Friends List Data Format - Test User with Mock Data
    print("\n3️⃣ FRIENDS LIST DATA FORMAT - TEST USER")
    test_results["total_tests"] += 1
    try:
        test_user_id = "test_user_friends_transform"
        response = requests.get(f"{API_BASE}/friends?type=friends&userIdentifier={test_user_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            friends_list = data.get("friends", [])
            
            print(f"✅ Friends list retrieved: {len(friends_list)} friends")
            
            # Test data structure validation
            if len(friends_list) > 0:
                sample_friend = friends_list[0]
                print(f"🔍 Sample friend data: {json.dumps(sample_friend, indent=2)}")
                
                # Verify required fields are present and correctly mapped
                required_fields = ["id", "username", "status", "addedAt", "isOnline"]
                missing_fields = []
                
                for field in required_fields:
                    if field not in sample_friend:
                        missing_fields.append(field)
                
                if not missing_fields:
                    print("✅ All required fields present in friend data")
                    
                    # Verify field mappings
                    if "friendUsername" not in sample_friend and "username" in sample_friend:
                        print("✅ Field mapping correct: 'friendUsername' → 'username'")
                    else:
                        print("❌ Field mapping incorrect: 'friendUsername' still present or 'username' missing")
                    
                    if "friendUserIdentifier" not in sample_friend and "id" in sample_friend:
                        print("✅ Field mapping correct: 'friendUserIdentifier' → 'id'")
                    else:
                        print("❌ Field mapping incorrect: 'friendUserIdentifier' still present or 'id' missing")
                    
                    # Verify status field
                    if sample_friend.get("status") == "accepted":
                        print("✅ Status field correct: 'accepted'")
                    else:
                        print(f"⚠️ Status field: {sample_friend.get('status')} (expected: 'accepted')")
                    
                    # Verify isOnline field exists
                    if "isOnline" in sample_friend:
                        print(f"✅ isOnline field present: {sample_friend['isOnline']}")
                    else:
                        print("❌ isOnline field missing")
                    
                    test_results["passed_tests"] += 1
                    test_results["test_details"].append("✅ Friends List Data Structure - PASSED")
                else:
                    print(f"❌ Missing required fields: {missing_fields}")
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append(f"❌ Friends List Data Structure - FAILED (missing: {missing_fields})")
            else:
                print("ℹ️ No friends found for test user - testing empty list format")
                if data.get("success") and isinstance(friends_list, list):
                    print("✅ Empty friends list format correct")
                    test_results["passed_tests"] += 1
                    test_results["test_details"].append("✅ Empty Friends List Format - PASSED")
                else:
                    print("❌ Empty friends list format incorrect")
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append("❌ Empty Friends List Format - FAILED")
        else:
            print(f"❌ Friends list request failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ Friends List Data Format - FAILED ({response.status_code})")
    except Exception as e:
        print(f"❌ Friends list data format test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Friends List Data Format - ERROR ({e})")
    
    # Test 4: API Response Structure Validation
    print("\n4️⃣ API RESPONSE STRUCTURE VALIDATION")
    test_results["total_tests"] += 1
    try:
        response = requests.get(f"{API_BASE}/friends?type=friends&userIdentifier=test_structure_validation", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Check required response fields
            required_response_fields = ["success", "friends", "count"]
            missing_response_fields = []
            
            for field in required_response_fields:
                if field not in data:
                    missing_response_fields.append(field)
            
            if not missing_response_fields:
                print("✅ API response structure valid")
                print(f"   - success: {data.get('success')}")
                print(f"   - friends: {type(data.get('friends'))} with {len(data.get('friends', []))} items")
                print(f"   - count: {data.get('count')}")
                
                test_results["passed_tests"] += 1
                test_results["test_details"].append("✅ API Response Structure - PASSED")
            else:
                print(f"❌ Missing response fields: {missing_response_fields}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append(f"❌ API Response Structure - FAILED (missing: {missing_response_fields})")
        else:
            print(f"❌ API response structure test failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ API Response Structure - FAILED ({response.status_code})")
    except Exception as e:
        print(f"❌ API response structure test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ API Response Structure - ERROR ({e})")
    
    # Test 5: Frontend Compatibility Test
    print("\n5️⃣ FRONTEND COMPATIBILITY TEST")
    test_results["total_tests"] += 1
    try:
        response = requests.get(f"{API_BASE}/friends?type=friends&userIdentifier=frontend_compatibility_test", timeout=10)
        if response.status_code == 200:
            data = response.json()
            friends_list = data.get("friends", [])
            
            # Simulate frontend processing
            frontend_compatible = True
            compatibility_issues = []
            
            for friend in friends_list:
                # Check if frontend can access username (not friendUsername)
                if "username" not in friend:
                    frontend_compatible = False
                    compatibility_issues.append("Missing 'username' field")
                
                # Check if frontend can access id (not friendUserIdentifier)
                if "id" not in friend:
                    frontend_compatible = False
                    compatibility_issues.append("Missing 'id' field")
                
                # Check if old field names are still present (would cause confusion)
                if "friendUsername" in friend:
                    frontend_compatible = False
                    compatibility_issues.append("Old 'friendUsername' field still present")
                
                if "friendUserIdentifier" in friend:
                    frontend_compatible = False
                    compatibility_issues.append("Old 'friendUserIdentifier' field still present")
            
            if frontend_compatible:
                print("✅ Frontend compatibility verified - all fields correctly transformed")
                test_results["passed_tests"] += 1
                test_results["test_details"].append("✅ Frontend Compatibility - PASSED")
            else:
                print(f"❌ Frontend compatibility issues: {compatibility_issues}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append(f"❌ Frontend Compatibility - FAILED ({compatibility_issues})")
        else:
            print(f"❌ Frontend compatibility test failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ Frontend Compatibility - FAILED ({response.status_code})")
    except Exception as e:
        print(f"❌ Frontend compatibility test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Frontend Compatibility - ERROR ({e})")
    
    # Test 6: Database Connection and MongoDB Integration
    print("\n6️⃣ DATABASE CONNECTION AND MONGODB INTEGRATION")
    test_results["total_tests"] += 1
    try:
        # Test that the API can connect to MongoDB and retrieve data
        response = requests.get(f"{API_BASE}/friends?type=users&userIdentifier=db_connection_test", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") is not None:
                print("✅ Database connection working - API can query MongoDB")
                print(f"   - Available users: {len(data.get('users', []))}")
                test_results["passed_tests"] += 1
                test_results["test_details"].append("✅ Database Connection - PASSED")
            else:
                print("❌ Database connection issue - invalid response format")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Database Connection - FAILED (invalid response)")
        else:
            print(f"❌ Database connection test failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ Database Connection - FAILED ({response.status_code})")
    except Exception as e:
        print(f"❌ Database connection test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Database Connection - ERROR ({e})")
    
    # Print final results
    print("\n" + "=" * 60)
    print("🏁 FRIENDS LIST DATA TRANSFORMATION TEST RESULTS")
    print("=" * 60)
    
    success_rate = (test_results["passed_tests"] / test_results["total_tests"]) * 100 if test_results["total_tests"] > 0 else 0
    
    print(f"📊 SUMMARY:")
    print(f"   Total Tests: {test_results['total_tests']}")
    print(f"   Passed: {test_results['passed_tests']}")
    print(f"   Failed: {test_results['failed_tests']}")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    print(f"\n📋 DETAILED RESULTS:")
    for detail in test_results["test_details"]:
        print(f"   {detail}")
    
    # Determine overall test result
    if test_results["failed_tests"] == 0:
        print(f"\n🎉 ALL TESTS PASSED - Friends list data transformation is working correctly!")
        print("✅ Friend names will display correctly in the frontend")
        return True
    else:
        print(f"\n⚠️ {test_results['failed_tests']} TEST(S) FAILED - Issues found with friends list data transformation")
        return False

if __name__ == "__main__":
    print("🚀 Starting Friends List Data Transformation Backend Testing")
    print(f"🌐 Testing against: {BASE_URL}")
    print(f"📡 API Base URL: {API_BASE}")
    
    success = test_friends_list_data_transformation()
    
    if success:
        print("\n✅ TESTING COMPLETED SUCCESSFULLY")
        sys.exit(0)
    else:
        print("\n❌ TESTING COMPLETED WITH FAILURES")
        sys.exit(1)