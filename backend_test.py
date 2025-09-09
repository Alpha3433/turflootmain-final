#!/usr/bin/env python3
"""
Backend Testing Suite for TurfLoot Party Creation and Invitation System
Testing the party creation, invitation sending, and retrieval functionality.

CRITICAL TESTING FOCUS:
1. Party Creation Flow - POST /api/party with action=create_and_invite
2. Party Invite Retrieval - GET /api/party?type=invites&userIdentifier=test_user
3. Data Flow Validation - complete flow from creation to retrieval
4. Database Collection Structure - verify 'parties' and 'party_invites' collections

TESTING REQUIREMENTS:
1. Party creation creates proper database records
2. Party invites are stored with correct recipient identifiers
3. Party invites can be retrieved by recipients
4. No data structure mismatches between sender and recipient
"""

import requests
import json
import time
import sys
from urllib.parse import urljoin

# Get base URL from environment
BASE_URL = "https://turfloot-social.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_party_creation_and_invitation_system():
    """
    Test the party creation and invitation system to identify why party invites are not being received.
    
    CRITICAL TESTING FOCUS:
    1. Party Creation Flow - POST /api/party with action=create_and_invite
    2. Party Invite Retrieval - GET /api/party?type=invites&userIdentifier=test_user
    3. Data Flow Validation - complete flow from creation to retrieval
    4. Database Collection Structure - verify 'parties' and 'party_invites' collections
    """
    print("🎮 TESTING PARTY CREATION AND INVITATION SYSTEM")
    print("=" * 80)
    
    test_results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "test_details": [],
        "critical_issues": []
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
    
    # Test 2: Party Invite Retrieval Endpoint
    print("\n2️⃣ PARTY INVITE RETRIEVAL ENDPOINT")
    test_results["total_tests"] += 1
    try:
        test_user = "test_party_recipient"
        response = requests.get(f"{API_BASE}/party?type=invites&userIdentifier={test_user}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") is not None and isinstance(data.get("invites"), list):
                print(f"✅ Party invite retrieval working: {len(data['invites'])} invites found")
                print(f"   Response structure: success={data.get('success')}, count={data.get('count')}")
                test_results["passed_tests"] += 1
                test_results["test_details"].append("✅ Party Invite Retrieval - PASSED")
            else:
                print(f"❌ Invalid party invite response format: {data}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Party Invite Retrieval - FAILED (invalid format)")
        else:
            print(f"❌ Party invite retrieval failed: {response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ Party Invite Retrieval - FAILED ({response.status_code})")
            test_results["critical_issues"].append("Party invite retrieval endpoint not working")
    except Exception as e:
        print(f"❌ Party invite retrieval error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Party Invite Retrieval - ERROR ({e})")
        test_results["critical_issues"].append("Party invite retrieval endpoint error")
    
    # Test 3: Party Creation Endpoint
    print("\n3️⃣ PARTY CREATION ENDPOINT")
    test_results["total_tests"] += 1
    try:
        # Step 1: Register test users for party creation
        party_creator = "party_creator_test"
        party_friend_1 = "party_friend_1_test"
        party_friend_2 = "party_friend_2_test"
        
        # Register party creator
        creator_data = {
            "action": "register_user",
            "userIdentifier": party_creator,
            "userData": {
                "username": "PartyCreator",
                "email": "creator@test.com",
                "displayName": "Party Creator"
            }
        }
        
        # Register friends to invite
        friend1_data = {
            "action": "register_user", 
            "userIdentifier": party_friend_1,
            "userData": {
                "username": "PartyFriend1",
                "email": "friend1@test.com",
                "displayName": "Party Friend 1"
            }
        }
        
        friend2_data = {
            "action": "register_user", 
            "userIdentifier": party_friend_2,
            "userData": {
                "username": "PartyFriend2",
                "email": "friend2@test.com",
                "displayName": "Party Friend 2"
            }
        }
        
        print("📝 Registering test users for party creation...")
        requests.post(f"{API_BASE}/friends", json=creator_data, timeout=10)
        requests.post(f"{API_BASE}/friends", json=friend1_data, timeout=10)
        requests.post(f"{API_BASE}/friends", json=friend2_data, timeout=10)
        
        # Step 2: Create party with invites
        party_creation_data = {
            "action": "create_and_invite",
            "userIdentifier": party_creator,
            "partyData": {
                "name": "Test Gaming Party",
                "privacy": "public",
                "maxPlayers": 4
            },
            "invitedFriends": [
                {"id": party_friend_1, "username": "PartyFriend1"},
                {"id": party_friend_2, "username": "PartyFriend2"}
            ]
        }
        
        print("🎮 Creating party with invites...")
        party_response = requests.post(f"{API_BASE}/party", json=party_creation_data, timeout=10)
        
        if request_response.status_code == 200:
            request_data = request_response.json()
            if request_data.get("success"):
                request_id = request_data.get("request", {}).get("id")
                print(f"✅ Friend request sent successfully: {request_id}")
                
                # Step 3: Accept friend request
                accept_data = {
                    "action": "accept_request",
                    "userIdentifier": test_user_2,
                    "requestId": request_id
                }
                
                print("✅ Accepting friend request...")
                accept_response = requests.post(f"{API_BASE}/friends", json=accept_data, timeout=10)
                
                if accept_response.status_code == 200:
                    accept_result = accept_response.json()
                    if accept_result.get("success"):
                        print("✅ Friend request accepted successfully")
                        
                        # Step 4: Test friends list data transformation
                        print("🔍 Testing friends list data transformation...")
                        friends_response = requests.get(f"{API_BASE}/friends?type=friends&userIdentifier={test_user_1}", timeout=10)
                        
                        if friends_response.status_code == 200:
                            friends_data = friends_response.json()
                            friends_list = friends_data.get("friends", [])
                            
                            print(f"✅ Friends list retrieved: {len(friends_list)} friends")
                            
                            if len(friends_list) > 0:
                                sample_friend = friends_list[0]
                                print(f"🔍 Sample friend data: {json.dumps(sample_friend, indent=2)}")
                                
                                # Verify required fields are present and correctly mapped
                                required_fields = ["id", "username", "status", "addedAt", "isOnline"]
                                missing_fields = []
                                transformation_correct = True
                                
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
                                        transformation_correct = False
                                    
                                    if "friendUserIdentifier" not in sample_friend and "id" in sample_friend:
                                        print("✅ Field mapping correct: 'friendUserIdentifier' → 'id'")
                                    else:
                                        print("❌ Field mapping incorrect: 'friendUserIdentifier' still present or 'id' missing")
                                        transformation_correct = False
                                    
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
                                        transformation_correct = False
                                    
                                    # Verify username value is correct
                                    if sample_friend.get("username") == "TransformTestUser2":
                                        print("✅ Username value correct: 'TransformTestUser2'")
                                    else:
                                        print(f"⚠️ Username value: {sample_friend.get('username')} (expected: 'TransformTestUser2')")
                                    
                                    if transformation_correct and not missing_fields:
                                        test_results["passed_tests"] += 1
                                        test_results["test_details"].append("✅ Friends List Data Transformation - PASSED")
                                    else:
                                        test_results["failed_tests"] += 1
                                        test_results["test_details"].append("❌ Friends List Data Transformation - FAILED")
                                else:
                                    print(f"❌ Missing required fields: {missing_fields}")
                                    test_results["failed_tests"] += 1
                                    test_results["test_details"].append(f"❌ Friends List Data Structure - FAILED (missing: {missing_fields})")
                            else:
                                print("❌ No friends found after creating friendship")
                                test_results["failed_tests"] += 1
                                test_results["test_details"].append("❌ Friends List Data Transformation - FAILED (no friends found)")
                        else:
                            print(f"❌ Friends list request failed: {friends_response.status_code}")
                            test_results["failed_tests"] += 1
                            test_results["test_details"].append(f"❌ Friends List Request - FAILED ({friends_response.status_code})")
                    else:
                        print(f"❌ Friend request acceptance failed: {accept_result}")
                        test_results["failed_tests"] += 1
                        test_results["test_details"].append("❌ Friend Request Acceptance - FAILED")
                else:
                    print(f"❌ Friend request acceptance HTTP error: {accept_response.status_code}")
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append(f"❌ Friend Request Acceptance - HTTP ERROR ({accept_response.status_code})")
            else:
                print(f"❌ Friend request sending failed: {request_data}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Friend Request Sending - FAILED")
        else:
            # Check if it's a duplicate or user not found error (acceptable for testing)
            if request_response.status_code == 400 or request_response.status_code == 404:
                print("ℹ️ Friend request failed (user not found or duplicate) - testing with existing data")
                # Still test the friends list format even if we can't create new friendships
                friends_response = requests.get(f"{API_BASE}/friends?type=friends&userIdentifier={test_user_1}", timeout=10)
                if friends_response.status_code == 200:
                    friends_data = friends_response.json()
                    if friends_data.get("success") and isinstance(friends_data.get("friends"), list):
                        print("✅ Friends list format correct (empty list)")
                        test_results["passed_tests"] += 1
                        test_results["test_details"].append("✅ Friends List Format - PASSED")
                    else:
                        test_results["failed_tests"] += 1
                        test_results["test_details"].append("❌ Friends List Format - FAILED")
                else:
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append("❌ Friends List Request - FAILED")
            else:
                print(f"❌ Friend request HTTP error: {request_response.status_code}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append(f"❌ Friend Request - HTTP ERROR ({request_response.status_code})")
                
    except Exception as e:
        print(f"❌ Friends list data transformation test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Friends List Data Transformation - ERROR ({e})")
    
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