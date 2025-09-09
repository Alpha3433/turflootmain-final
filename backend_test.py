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
        
        print(f"   Party creation response status: {party_response.status_code}")
        print(f"   Party creation response: {party_response.text}")
        
        if party_response.status_code == 200:
            party_data = party_response.json()
            if party_data.get("success"):
                party_id = party_data.get("party", {}).get("id")
                print(f"✅ Party created successfully: {party_id}")
                print(f"   Party name: {party_data.get('party', {}).get('name')}")
                print(f"   Invites sent: {party_data.get('party', {}).get('invitesSent')}")
                
                # Step 3: Wait for data to propagate
                print("⏳ Waiting for party invites to propagate...")
                time.sleep(2)
                
                # Step 4: Check if invites were received
                invite_check_response = requests.get(f"{API_BASE}/party?type=invites&userIdentifier={party_friend_1}", timeout=10)
                
                if invite_check_response.status_code == 200:
                    invite_data = invite_check_response.json()
                    invites_received = invite_data.get("invites", [])
                    
                    print(f"✅ Party invite check completed: {len(invites_received)} invites found")
                    
                    if len(invites_received) > 0:
                        sample_invite = invites_received[0]
                        print(f"🔍 Sample party invite data: {json.dumps(sample_invite, indent=2)}")
                        
                        # Verify required fields are present in party invite
                        required_invite_fields = ["id", "partyId", "partyName", "fromUserIdentifier", "toUserIdentifier", "status"]
                        missing_invite_fields = []
                        invite_structure_correct = True
                        
                        for field in required_invite_fields:
                            if field not in sample_invite:
                                missing_invite_fields.append(field)
                        
                        if not missing_invite_fields:
                            print("✅ All required fields present in party invite")
                            
                            # Verify field values
                            if sample_invite.get("toUserIdentifier") == party_friend_1:
                                print("✅ toUserIdentifier correct: matches recipient")
                            else:
                                print(f"❌ toUserIdentifier mismatch: {sample_invite.get('toUserIdentifier')} != {party_friend_1}")
                                invite_structure_correct = False
                            
                            if sample_invite.get("fromUserIdentifier") == party_creator:
                                print("✅ fromUserIdentifier correct: matches creator")
                            else:
                                print(f"❌ fromUserIdentifier mismatch: {sample_invite.get('fromUserIdentifier')} != {party_creator}")
                                invite_structure_correct = False
                            
                            if sample_invite.get("status") == "pending":
                                print("✅ Status field correct: 'pending'")
                            else:
                                print(f"⚠️ Status field: {sample_invite.get('status')} (expected: 'pending')")
                            
                            if sample_invite.get("partyName") == "Test Gaming Party":
                                print("✅ Party name correct: 'Test Gaming Party'")
                            else:
                                print(f"⚠️ Party name: {sample_invite.get('partyName')} (expected: 'Test Gaming Party')")
                            
                            if invite_structure_correct and not missing_invite_fields:
                                test_results["passed_tests"] += 1
                                test_results["test_details"].append("✅ Party Creation and Invitation - PASSED")
                            else:
                                test_results["failed_tests"] += 1
                                test_results["test_details"].append("❌ Party Creation and Invitation - FAILED")
                                test_results["critical_issues"].append("Party invite data structure issues")
                        else:
                            print(f"❌ Missing required fields in party invite: {missing_invite_fields}")
                            test_results["failed_tests"] += 1
                            test_results["test_details"].append(f"❌ Party Invite Structure - FAILED (missing: {missing_invite_fields})")
                            test_results["critical_issues"].append("Party invite missing required fields")
                    else:
                        print("❌ No party invites found after party creation")
                        test_results["failed_tests"] += 1
                        test_results["test_details"].append("❌ Party Creation and Invitation - FAILED (no invites received)")
                        test_results["critical_issues"].append("Party invites not being stored or retrieved correctly")
                else:
                    print(f"❌ Party invite check failed: {invite_check_response.status_code}")
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append(f"❌ Party Invite Check - FAILED ({invite_check_response.status_code})")
                    test_results["critical_issues"].append("Cannot retrieve party invites after creation")
            else:
                print(f"❌ Party creation failed: {party_data}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Party Creation - FAILED")
                test_results["critical_issues"].append("Party creation endpoint not working correctly")
        else:
            # Check if it's a user not found error or other issue
            if party_response.status_code == 404 and "User not found" in party_response.text:
                print("⚠️ Party creation failed - User not found in database")
                print("   ROOT CAUSE IDENTIFIED: Party creation requires users to exist in 'users' collection")
                print("   This explains why party invites are not appearing - creation fails at user lookup")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Party Creation - FAILED (user not found)")
                test_results["critical_issues"].append("Party creation requires users to be registered in database first")
            elif party_response.status_code == 401:
                print("⚠️ Party creation failed - authentication required")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Party Creation - FAILED (authentication required)")
                test_results["critical_issues"].append("Party creation authentication issue")
            elif party_response.status_code == 404:
                print("❌ Party creation endpoint not found")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Party Creation - FAILED (endpoint not found)")
                test_results["critical_issues"].append("Party creation endpoint not implemented")
            else:
                print(f"❌ Party creation HTTP error: {party_response.status_code}")
                print(f"   Response: {party_response.text}")
                test_results["failed_tests"] += 1
                test_results["test_details"].append(f"❌ Party Creation - HTTP ERROR ({party_response.status_code})")
                test_results["critical_issues"].append("Party creation endpoint error")
                
    except Exception as e:
        print(f"❌ Friends list data transformation test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Friends List Data Transformation - ERROR ({e})")
    
    # Test 4: Database Collections Verification
    print("\n4️⃣ DATABASE COLLECTIONS VERIFICATION")
    test_results["total_tests"] += 1
    try:
        # Test if parties collection exists by checking parties/live endpoint
        parties_response = requests.get(f"{API_BASE}/parties/live", timeout=10)
        
        if parties_response.status_code == 200:
            parties_data = parties_response.json()
            if parties_data.get("success") is not None and isinstance(parties_data.get("parties"), list):
                print(f"✅ Parties collection accessible: {len(parties_data.get('parties', []))} active parties")
                print(f"   - Database connection working for parties collection")
                test_results["passed_tests"] += 1
                test_results["test_details"].append("✅ Database Collections - PASSED")
            else:
                print("❌ Parties collection response format invalid")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Database Collections - FAILED (invalid format)")
        else:
            print(f"❌ Parties collection test failed: {parties_response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append(f"❌ Database Collections - FAILED ({parties_response.status_code})")
            test_results["critical_issues"].append("Cannot access parties collection")
    except Exception as e:
        print(f"❌ Database collections test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Database Collections - ERROR ({e})")
        test_results["critical_issues"].append("Database connection issues")
    
    # Test 5: Complete Party Flow Validation
    print("\n5️⃣ COMPLETE PARTY FLOW VALIDATION")
    test_results["total_tests"] += 1
    try:
        # Test the complete flow: create party → send invites → retrieve invites
        flow_test_creator = "flow_test_creator"
        flow_test_recipient = "flow_test_recipient"
        
        # Step 1: Create a simple party with one invite
        simple_party_data = {
            "action": "create_and_invite",
            "userIdentifier": flow_test_creator,
            "partyData": {
                "name": "Flow Test Party",
                "privacy": "public",
                "maxPlayers": 2
            },
            "invitedFriends": [
                {"id": flow_test_recipient, "username": "FlowTestRecipient"}
            ]
        }
        
        print("🔄 Testing complete party flow...")
        flow_party_response = requests.post(f"{API_BASE}/party", json=simple_party_data, timeout=10)
        
        if flow_party_response.status_code == 200:
            flow_party_data = flow_party_response.json()
            if flow_party_data.get("success"):
                print("✅ Step 1: Party creation successful")
                
                # Step 2: Wait and check for invites
                time.sleep(1)
                flow_invite_response = requests.get(f"{API_BASE}/party?type=invites&userIdentifier={flow_test_recipient}", timeout=10)
                
                if flow_invite_response.status_code == 200:
                    flow_invite_data = flow_invite_response.json()
                    flow_invites = flow_invite_data.get("invites", [])
                    
                    if len(flow_invites) > 0:
                        print("✅ Step 2: Party invite retrieval successful")
                        print(f"   Complete flow working: create → store → retrieve")
                        test_results["passed_tests"] += 1
                        test_results["test_details"].append("✅ Complete Party Flow - PASSED")
                    else:
                        print("❌ Step 2: No invites found after party creation")
                        test_results["failed_tests"] += 1
                        test_results["test_details"].append("❌ Complete Party Flow - FAILED (no invites)")
                        test_results["critical_issues"].append("Party invites not being stored correctly")
                else:
                    print(f"❌ Step 2: Invite retrieval failed: {flow_invite_response.status_code}")
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append("❌ Complete Party Flow - FAILED (retrieval error)")
            else:
                print("❌ Step 1: Party creation failed")
                test_results["failed_tests"] += 1
                test_results["test_details"].append("❌ Complete Party Flow - FAILED (creation failed)")
        else:
            print(f"❌ Step 1: Party creation HTTP error: {flow_party_response.status_code}")
            test_results["failed_tests"] += 1
            test_results["test_details"].append("❌ Complete Party Flow - FAILED (HTTP error)")
            
    except Exception as e:
        print(f"❌ Complete party flow test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ Complete Party Flow - ERROR ({e})")
    
    # Test 6: UserIdentifier Format Consistency Check
    print("\n6️⃣ USERIDENTIFIER FORMAT CONSISTENCY CHECK")
    test_results["total_tests"] += 1
    try:
        # Test different userIdentifier formats to identify potential mismatches
        test_formats = [
            "test_user_format_1",
            "0x1234567890abcdef1234567890abcdef12345678",  # Ethereum address format
            "user@example.com",  # Email format
            "privy:did:123456789"  # Privy DID format
        ]
        
        format_test_results = []
        
        for test_format in test_formats:
            print(f"   Testing format: {test_format}")
            
            # Test party invite retrieval with different formats
            format_response = requests.get(f"{API_BASE}/party?type=invites&userIdentifier={test_format}", timeout=10)
            
            if format_response.status_code == 200:
                format_data = format_response.json()
                if format_data.get("success") is not None:
                    format_test_results.append(f"✅ {test_format[:20]}... - WORKING")
                else:
                    format_test_results.append(f"❌ {test_format[:20]}... - INVALID RESPONSE")
            else:
                format_test_results.append(f"❌ {test_format[:20]}... - HTTP ERROR ({format_response.status_code})")
        
        print("✅ UserIdentifier format consistency test completed")
        for result in format_test_results:
            print(f"   {result}")
        
        # All formats should work (return success=true even if empty)
        working_formats = [r for r in format_test_results if "WORKING" in r]
        if len(working_formats) == len(test_formats):
            test_results["passed_tests"] += 1
            test_results["test_details"].append("✅ UserIdentifier Format Consistency - PASSED")
        else:
            test_results["failed_tests"] += 1
            test_results["test_details"].append("❌ UserIdentifier Format Consistency - FAILED")
            test_results["critical_issues"].append("Some userIdentifier formats not supported")
            
    except Exception as e:
        print(f"❌ UserIdentifier format test error: {e}")
        test_results["failed_tests"] += 1
        test_results["test_details"].append(f"❌ UserIdentifier Format Consistency - ERROR ({e})")
    
    # Print final results
    print("\n" + "=" * 80)
    print("🏁 PARTY CREATION AND INVITATION SYSTEM TEST RESULTS")
    print("=" * 80)
    
    success_rate = (test_results["passed_tests"] / test_results["total_tests"]) * 100 if test_results["total_tests"] > 0 else 0
    
    print(f"📊 SUMMARY:")
    print(f"   Total Tests: {test_results['total_tests']}")
    print(f"   Passed: {test_results['passed_tests']} ✅")
    print(f"   Failed: {test_results['failed_tests']} ❌")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    print(f"\n📋 DETAILED RESULTS:")
    for detail in test_results["test_details"]:
        print(f"   {detail}")
    
    if test_results["critical_issues"]:
        print(f"\n🚨 CRITICAL ISSUES IDENTIFIED:")
        for issue in test_results["critical_issues"]:
            print(f"   • {issue}")
    
    # Determine overall test result and provide specific findings
    if test_results["failed_tests"] == 0:
        print(f"\n🎉 ALL TESTS PASSED - Party creation and invitation system is working correctly!")
        print("✅ Party invites should appear in REQUESTS & INVITES section")
        return True
    else:
        print(f"\n⚠️ {test_results['failed_tests']} TEST(S) FAILED - Issues found with party system")
        
        # Provide specific diagnosis based on critical issues
        if "Party invites not being stored correctly" in test_results["critical_issues"]:
            print("\n🔍 ROOT CAUSE ANALYSIS:")
            print("   The party creation endpoint works, but invites are not being stored")
            print("   or retrieved correctly. This explains why party invites don't appear")
            print("   in the REQUESTS & INVITES section.")
        elif "Party creation requires database user registration" in test_results["critical_issues"]:
            print("\n🔍 ROOT CAUSE ANALYSIS:")
            print("   Party creation requires users to be registered in the database first.")
            print("   The system may be failing because test users don't exist in the")
            print("   'users' collection, causing authentication failures.")
        
        return False

if __name__ == "__main__":
    print("🚀 Starting Party Creation and Invitation System Backend Testing")
    print(f"🌐 Testing against: {BASE_URL}")
    print(f"📡 API Base URL: {API_BASE}")
    print("\n🎯 TESTING FOCUS:")
    print("   1. Party Creation Flow - POST /api/party with action=create_and_invite")
    print("   2. Party Invite Retrieval - GET /api/party?type=invites&userIdentifier=test_user")
    print("   3. Data Flow Validation - complete flow from creation to retrieval")
    print("   4. Database Collection Structure - verify 'parties' and 'party_invites' collections")
    
    success = test_party_creation_and_invitation_system()
    
    if success:
        print("\n✅ TESTING COMPLETED SUCCESSFULLY")
        print("🎉 Party system is working correctly!")
        sys.exit(0)
    else:
        print("\n❌ TESTING COMPLETED WITH FAILURES")
        print("🔍 Issues identified that may explain why party invites are not appearing")
        sys.exit(1)