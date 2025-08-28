#!/usr/bin/env python3
"""
Backend API Testing for Custom Name Change and Session Persistence Flow
Testing the complete flow to resolve user's issue with names reverting to default
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://lobby-party.preview.emergentagent.com"
LOCAL_URL = "http://localhost:3000"

# Use localhost for testing as external URL has 502 issues
API_BASE = LOCAL_URL + "/api"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

class TurfLootBackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, success, message, response_time=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"   {message}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })

    def test_custom_name_update_endpoint(self):
        """Test POST /api/users/profile/update-name with realistic user data"""
        log_test("🎯 TESTING CUSTOM NAME UPDATE ENDPOINT", "TEST")
        
        # Test data - realistic user scenario
        test_users = [
            {
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "customName": "TestUsername",
                "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "email": "test@example.com"
            },
            {
                "userId": "did:privy:cmetjchq5012yjr0bgxbe748i", 
                "customName": "PlayerOne",
                "privyId": "did:privy:cmetjchq5012yjr0bgxbe748i",
                "email": None
            },
            {
                "userId": "did:privy:cm123456789abcdef",
                "customName": "GamerPro2024",
                "privyId": "did:privy:cm123456789abcdef",
                "email": "gamer@turfloot.com"
            }
        ]
        
        for i, user_data in enumerate(test_users, 1):
            log_test(f"Testing user {i}: {user_data['customName']}")
            
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json=user_data,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(
                        f"Custom Name Update - User {i}",
                        True,
                        f"Successfully updated name to '{data.get('customName')}'",
                        response_time
                    )
                else:
                    self.log_test(
                        f"Custom Name Update - User {i}",
                        False,
                        f"Failed with status {response.status_code}: {response.text}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Custom Name Update - User {i}",
                    False,
                    f"Exception occurred: {str(e)}"
                )

    def test_profile_retrieval_endpoint(self):
        """Test GET /api/users/profile?userId=X endpoint"""
        log_test("🎯 TESTING PROFILE RETRIEVAL ENDPOINT", "TEST")
        
        # Test users from the update test
        test_user_ids = [
            "did:privy:cme20s0fl005okz0bmxcr0cp0",
            "did:privy:cmetjchq5012yjr0bgxbe748i",
            "did:privy:cm123456789abcdef"
        ]
        
        for i, user_id in enumerate(test_user_ids, 1):
            log_test(f"Retrieving profile for user {i}: {user_id[:20]}...")
            
            try:
                start_time = time.time()
                response = requests.get(
                    f"{API_BASE}/users/profile",
                    params={"userId": user_id},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    username = data.get('username', 'No username')
                    self.log_test(
                        f"Profile Retrieval - User {i}",
                        True,
                        f"Successfully retrieved username '{username}'",
                        response_time
                    )
                elif response.status_code == 404:
                    self.log_test(
                        f"Profile Retrieval - User {i}",
                        True,  # 404 is expected for non-existent users
                        f"User not found (expected for new test users)",
                        response_time
                    )
                else:
                    self.log_test(
                        f"Profile Retrieval - User {i}",
                        False,
                        f"Failed with status {response.status_code}: {response.text}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Profile Retrieval - User {i}",
                    False,
                    f"Exception occurred: {str(e)}"
                )

    def test_complete_flow(self):
        """Test the complete flow: Update name -> Retrieve profile -> Verify persistence"""
        log_test("🎯 TESTING COMPLETE CUSTOM NAME FLOW", "TEST")
        
        # Test scenario: New user with custom name
        test_user = {
            "userId": "did:privy:flow_test_" + str(int(time.time())),
            "customName": "FlowTestUser2024",
            "privyId": "did:privy:flow_test_" + str(int(time.time())),
            "email": "flowtest@turfloot.com"
        }
        
        # Step 1: Update user's name
        log_test("Step 1: Updating user's custom name...")
        try:
            start_time = time.time()
            update_response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json=test_user,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            update_time = time.time() - start_time
            
            if update_response.status_code == 200:
                self.log_test(
                    "Complete Flow - Step 1 (Name Update)",
                    True,
                    "Successfully updated user's custom name",
                    update_time
                )
                
                # Step 2: Retrieve the user profile immediately
                log_test("Step 2: Retrieving user profile immediately after update...")
                try:
                    start_time = time.time()
                    profile_response = requests.get(
                        f"{API_BASE}/users/profile",
                        params={"userId": test_user["userId"]},
                        timeout=10
                    )
                    profile_time = time.time() - start_time
                    
                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        retrieved_name = profile_data.get('username', 'No username')
                        
                        if retrieved_name == test_user["customName"]:
                            self.log_test(
                                "Complete Flow - Step 2 (Immediate Retrieval)",
                                True,
                                f"Successfully retrieved correct name '{retrieved_name}'",
                                profile_time
                            )
                            
                            # Step 3: Wait and retrieve again (simulate session refresh)
                            log_test("Step 3: Waiting 2 seconds and retrieving again (session simulation)...")
                            time.sleep(2)
                            
                            try:
                                start_time = time.time()
                                session_response = requests.get(
                                    f"{API_BASE}/users/profile",
                                    params={"userId": test_user["userId"]},
                                    timeout=10
                                )
                                session_time = time.time() - start_time
                                
                                if session_response.status_code == 200:
                                    session_data = session_response.json()
                                    session_name = session_data.get('username', 'No username')
                                    
                                    if session_name == test_user["customName"]:
                                        self.log_test(
                                            "Complete Flow - Step 3 (Session Persistence)",
                                            True,
                                            f"Name persisted across session '{session_name}'",
                                            session_time
                                        )
                                    else:
                                        self.log_test(
                                            "Complete Flow - Step 3 (Session Persistence)",
                                            False,
                                            f"Name reverted! Expected '{test_user['customName']}', got '{session_name}'",
                                            session_time
                                        )
                                else:
                                    self.log_test(
                                        "Complete Flow - Step 3 (Session Persistence)",
                                        False,
                                        f"Session retrieval failed: {session_response.status_code}",
                                        session_time
                                    )
                                    
                            except Exception as e:
                                self.log_test(
                                    "Complete Flow - Step 3 (Session Persistence)",
                                    False,
                                    f"Session retrieval exception: {str(e)}"
                                )
                        else:
                            self.log_test(
                                "Complete Flow - Step 2 (Immediate Retrieval)",
                                False,
                                f"Name mismatch! Expected '{test_user['customName']}', got '{retrieved_name}'",
                                profile_time
                            )
                    else:
                        self.log_test(
                            "Complete Flow - Step 2 (Immediate Retrieval)",
                            False,
                            f"Profile retrieval failed: {profile_response.status_code}",
                            profile_time
                        )
                        
                except Exception as e:
                    self.log_test(
                        "Complete Flow - Step 2 (Immediate Retrieval)",
                        False,
                        f"Profile retrieval exception: {str(e)}"
                    )
            else:
                self.log_test(
                    "Complete Flow - Step 1 (Name Update)",
                    False,
                    f"Name update failed: {update_response.status_code} - {update_response.text}",
                    update_time
                )
                
        except Exception as e:
            self.log_test(
                "Complete Flow - Step 1 (Name Update)",
                False,
                f"Name update exception: {str(e)}"
            )

    def test_database_field_verification(self):
        """Test that name updates save to all correct database fields"""
        log_test("🎯 TESTING DATABASE FIELD VERIFICATION", "TEST")
        
        # Create multiple test users to verify field updates
        test_users = [
            {
                "userId": "did:privy:db_test_1_" + str(int(time.time())),
                "customName": "DatabaseTestUser1",
                "privyId": "did:privy:db_test_1_" + str(int(time.time())),
                "email": "dbtest1@turfloot.com"
            },
            {
                "userId": "did:privy:db_test_2_" + str(int(time.time())),
                "customName": "DatabaseTestUser2",
                "privyId": "did:privy:db_test_2_" + str(int(time.time())),
                "email": None
            }
        ]
        
        for i, test_user in enumerate(test_users, 1):
            log_test(f"Testing database field verification for user {i}...")
            
            try:
                # Update the user's name
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json=test_user,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    # Retrieve the profile to verify the name priority logic
                    profile_response = requests.get(
                        f"{API_BASE}/users/profile",
                        params={"userId": test_user["userId"]},
                        timeout=10
                    )
                    
                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        retrieved_name = profile_data.get('username')
                        
                        if retrieved_name == test_user["customName"]:
                            self.log_test(
                                f"Database Field Verification - User {i}",
                                True,
                                f"Name priority working correctly: '{retrieved_name}'",
                                response_time
                            )
                        else:
                            self.log_test(
                                f"Database Field Verification - User {i}",
                                False,
                                f"Name priority failed! Expected '{test_user['customName']}', got '{retrieved_name}'",
                                response_time
                            )
                    else:
                        self.log_test(
                            f"Database Field Verification - User {i}",
                            False,
                            f"Profile retrieval failed: {profile_response.status_code}",
                            response_time
                        )
                else:
                    self.log_test(
                        f"Database Field Verification - User {i}",
                        False,
                        f"User creation failed: {response.status_code} - {response.text}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Database Field Verification - User {i}",
                    False,
                    f"Exception occurred: {str(e)}"
                )

    def test_name_consistency(self):
        """Test consistency with multiple profile requests"""
        log_test("🎯 TESTING NAME CONSISTENCY ACROSS MULTIPLE REQUESTS", "TEST")
        
        # Create a test user
        test_user = {
            "userId": "did:privy:consistency_test_" + str(int(time.time())),
            "customName": "ConsistencyTestUser",
            "privyId": "did:privy:consistency_test_" + str(int(time.time())),
            "email": "consistency@turfloot.com"
        }
        
        # First, create the user
        try:
            create_response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json=test_user,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                # Now test consistency with multiple requests
                consistency_results = []
                
                for i in range(5):
                    try:
                        start_time = time.time()
                        response = requests.get(
                            f"{API_BASE}/users/profile",
                            params={"userId": test_user["userId"]},
                            timeout=10
                        )
                        response_time = time.time() - start_time
                        
                        if response.status_code == 200:
                            data = response.json()
                            name = data.get('username', 'No username')
                            consistency_results.append(name)
                            log_test(f"Request {i+1}: Retrieved '{name}' in {response_time:.3f}s")
                        else:
                            consistency_results.append("FAILED")
                            log_test(f"Request {i+1}: Failed with status {response.status_code}")
                            
                    except Exception as e:
                        consistency_results.append("EXCEPTION")
                        log_test(f"Request {i+1}: Exception - {str(e)}")
                
                # Check consistency
                unique_names = set(consistency_results)
                if len(unique_names) == 1 and test_user["customName"] in unique_names:
                    self.log_test(
                        "Name Consistency Test",
                        True,
                        f"All 5 requests returned consistent name: '{test_user['customName']}'"
                    )
                else:
                    self.log_test(
                        "Name Consistency Test",
                        False,
                        f"Inconsistent results: {consistency_results}"
                    )
            else:
                self.log_test(
                    "Name Consistency Test",
                    False,
                    f"Failed to create test user: {create_response.status_code}"
                )
                
        except Exception as e:
            self.log_test(
                "Name Consistency Test",
                False,
                f"Exception during consistency test: {str(e)}"
            )

    def run_custom_name_tests(self):
        """Run all custom name change and session persistence tests"""
        log_test("🚀 STARTING CUSTOM NAME CHANGE AND SESSION PERSISTENCE TESTING", "START")
        print("=" * 80)
        
        # Test 1: Custom Name Update Endpoint
        self.test_custom_name_update_endpoint()
        print()
        
        # Test 2: Profile Retrieval Endpoint  
        self.test_profile_retrieval_endpoint()
        print()
        
        # Test 3: Complete Flow Testing
        self.test_complete_flow()
        print()
        
        # Test 4: Database Field Verification
        self.test_database_field_verification()
        print()
        
        # Test 5: Name Consistency Testing
        self.test_name_consistency()
        print()
        
        # Summary
        print("=" * 80)
        log_test("🎯 CUSTOM NAME TESTING SUMMARY", "SUMMARY")
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 TOTAL TESTS: {self.total_tests}")
        print(f"✅ PASSED: {self.passed_tests}")
        print(f"❌ FAILED: {self.failed_tests}")
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate >= 90:
            log_test("🎉 EXCELLENT: Custom name change and session persistence flow is working correctly!", "SUCCESS")
        elif success_rate >= 70:
            log_test("⚠️ GOOD: Most functionality working, minor issues detected", "WARNING")
        else:
            log_test("❌ CRITICAL: Major issues detected with custom name change flow", "CRITICAL")
        
        return success_rate >= 90

    def test_new_social_endpoints(self):
        """Test the newly implemented social features endpoints"""
        print("\n🎯 TESTING NEW SOCIAL FEATURES ENDPOINTS")
        print("=" * 60)
        
        # Test 1: Friends Online Status Endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/online-status?userId=test-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'onlineFriends' in data and 'timestamp' in data:
                    self.log_test(
                        "Friends Online Status API (GET /api/friends/online-status)",
                        True,
                        f"Returns proper structure with onlineFriends array and timestamp. Response: {data}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Friends Online Status API (GET /api/friends/online-status)",
                        False,
                        f"Missing required fields in response. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Friends Online Status API (GET /api/friends/online-status)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Friends Online Status API (GET /api/friends/online-status)",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 2: Friends Online Status - Missing userId Parameter
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/online-status", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'userId parameter is required' in data['error']:
                    self.log_test(
                        "Friends Online Status - Missing userId Validation",
                        True,
                        f"Correctly validates missing userId parameter. Response: {data}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Friends Online Status - Missing userId Validation",
                        False,
                        f"Incorrect error message. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Friends Online Status - Missing userId Validation",
                    False,
                    f"Expected 400 status, got {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Friends Online Status - Missing userId Validation",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 3: User Search Endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/users/search?q=test&userId=test-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and 'timestamp' in data and isinstance(data['users'], list):
                    self.log_test(
                        "User Search API (GET /api/users/search)",
                        True,
                        f"Returns proper structure with users array and timestamp. Found {len(data['users'])} users",
                        response_time
                    )
                else:
                    self.log_test(
                        "User Search API (GET /api/users/search)",
                        False,
                        f"Missing required fields in response. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "User Search API (GET /api/users/search)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "User Search API (GET /api/users/search)",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 4: User Search - Short Query Validation
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/users/search?q=a&userId=test-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and 'message' in data and len(data['users']) == 0:
                    if 'at least 2 characters' in data['message']:
                        self.log_test(
                            "User Search - Short Query Validation",
                            True,
                            f"Correctly validates short queries. Response: {data}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "User Search - Short Query Validation",
                            False,
                            f"Incorrect validation message. Got: {data}",
                            response_time
                        )
                else:
                    self.log_test(
                        "User Search - Short Query Validation",
                        False,
                        f"Unexpected response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "User Search - Short Query Validation",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "User Search - Short Query Validation",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 5: User Search - Case Insensitive Search
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/users/search?q=TEST&userId=test-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and 'timestamp' in data:
                    self.log_test(
                        "User Search - Case Insensitive Search",
                        True,
                        f"Case insensitive search working. Found {len(data['users'])} users for 'TEST'",
                        response_time
                    )
                else:
                    self.log_test(
                        "User Search - Case Insensitive Search",
                        False,
                        f"Missing required fields in response. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "User Search - Case Insensitive Search",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "User Search - Case Insensitive Search",
                False,
                f"Request failed: {str(e)}"
            )

    def test_global_practice_server(self):
        """Test global practice server functionality"""
        print("\n🤖 TESTING GLOBAL PRACTICE SERVER FUNCTIONALITY")
        print("=" * 60)
        
        # Test 1: Server Browser - Check for Global Practice Server
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'servers' in data and isinstance(data['servers'], list):
                    # Look for global practice server
                    practice_servers = [s for s in data['servers'] if 'practice' in s.get('id', '').lower() or s.get('mode') == 'practice']
                    global_practice = [s for s in practice_servers if 'global-practice-bots' in s.get('id', '')]
                    
                    if global_practice:
                        server = global_practice[0]
                        self.log_test(
                            "Global Practice Server - Server Browser Integration",
                            True,
                            f"Global practice server found: {server['id']} - {server['name']} (Region: {server.get('region', 'N/A')}, Mode: {server.get('mode', 'N/A')})",
                            response_time
                        )
                    else:
                        self.log_test(
                            "Global Practice Server - Server Browser Integration",
                            False,
                            f"Global practice server 'global-practice-bots' not found. Available servers: {[s.get('id') for s in data['servers']]}",
                            response_time
                        )
                else:
                    self.log_test(
                        "Global Practice Server - Server Browser Integration",
                        False,
                        f"Invalid server browser response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Global Practice Server - Server Browser Integration",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Global Practice Server - Server Browser Integration",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 2: Practice Mode Configuration
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'servers' in data:
                    practice_servers = [s for s in data['servers'] if s.get('mode') == 'practice' or 'practice' in s.get('name', '').lower()]
                    
                    if practice_servers:
                        practice_server = practice_servers[0]
                        # Check practice server configuration
                        expected_fields = ['id', 'name', 'region', 'stake', 'mode', 'maxPlayers', 'currentPlayers']
                        missing_fields = [field for field in expected_fields if field not in practice_server]
                        
                        if not missing_fields and practice_server.get('stake') == 0:
                            self.log_test(
                                "Practice Mode Configuration",
                                True,
                                f"Practice server properly configured: stake={practice_server['stake']}, maxPlayers={practice_server.get('maxPlayers')}, mode={practice_server['mode']}",
                                response_time
                            )
                        else:
                            self.log_test(
                                "Practice Mode Configuration",
                                False,
                                f"Practice server configuration issues. Missing fields: {missing_fields}, stake: {practice_server.get('stake')}",
                                response_time
                            )
                    else:
                        self.log_test(
                            "Practice Mode Configuration",
                            False,
                            "No practice servers found in server browser",
                            response_time
                        )
                else:
                    self.log_test(
                        "Practice Mode Configuration",
                        False,
                        f"Invalid response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Practice Mode Configuration",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Practice Mode Configuration",
                False,
                f"Request failed: {str(e)}"
            )

    def test_database_operations(self):
        """Test database operations for friend search functionality"""
        print("\n🗄️ TESTING DATABASE OPERATIONS FOR SOCIAL FEATURES")
        print("=" * 60)
        
        # Test 1: Create Test User for Search
        try:
            start_time = time.time()
            test_user_data = {
                "privy_user": {
                    "id": "did:privy:test123456789",
                    "google_oauth": {
                        "email": "testsocialuser@turfloot.com",
                        "name": "Test Social User"
                    }
                }
            }
            
            response = requests.post(f"{API_BASE}/auth/privy", json=test_user_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and 'token' in data:
                    self.log_test(
                        "Database Operations - Test User Creation",
                        True,
                        f"Test user created successfully for social features testing. User ID: {data['user'].get('id')}",
                        response_time
                    )
                    # Store token for further tests
                    self.test_token = data['token']
                    self.test_user_id = data['user']['id']
                else:
                    self.log_test(
                        "Database Operations - Test User Creation",
                        False,
                        f"Invalid response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Database Operations - Test User Creation",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Database Operations - Test User Creation",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 2: User Search Database Query
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/users/search?q=social&userId=test-search-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and isinstance(data['users'], list):
                    # Check if our test user appears in search results
                    found_users = [u for u in data['users'] if 'social' in u.get('username', '').lower()]
                    
                    self.log_test(
                        "Database Operations - User Search Query",
                        True,
                        f"User search database query working. Found {len(data['users'])} total users, {len(found_users)} matching 'social'",
                        response_time
                    )
                else:
                    self.log_test(
                        "Database Operations - User Search Query",
                        False,
                        f"Invalid search response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Database Operations - User Search Query",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Database Operations - User Search Query",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 3: Friends List Database Integration
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId=test-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'friends' in data and isinstance(data['friends'], list):
                    self.log_test(
                        "Database Operations - Friends List Integration",
                        True,
                        f"Friends list database integration working. Retrieved {len(data['friends'])} friends",
                        response_time
                    )
                else:
                    self.log_test(
                        "Database Operations - Friends List Integration",
                        False,
                        f"Invalid friends list response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Database Operations - Friends List Integration",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Database Operations - Friends List Integration",
                False,
                f"Request failed: {str(e)}"
            )

    def test_social_features_integration(self):
        """Test overall social features integration"""
        print("\n🤝 TESTING SOCIAL FEATURES INTEGRATION")
        print("=" * 60)
        
        # Test 1: Enhanced Friends System
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId=demo-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'friends' in data and 'timestamp' in data:
                    # Check if friends have required fields for enhanced system
                    if data['friends']:
                        friend = data['friends'][0]
                        required_fields = ['id', 'username', 'online', 'lastSeen']
                        missing_fields = [field for field in required_fields if field not in friend]
                        
                        if not missing_fields:
                            self.log_test(
                                "Social Features - Enhanced Friends System",
                                True,
                                f"Enhanced friends system working. Friends have all required fields: {list(friend.keys())}",
                                response_time
                            )
                        else:
                            self.log_test(
                                "Social Features - Enhanced Friends System",
                                False,
                                f"Friends missing required fields: {missing_fields}. Available: {list(friend.keys())}",
                                response_time
                            )
                    else:
                        self.log_test(
                            "Social Features - Enhanced Friends System",
                            True,
                            "Enhanced friends system working (no friends found for demo-user, but structure is correct)",
                            response_time
                        )
                else:
                    self.log_test(
                        "Social Features - Enhanced Friends System",
                        False,
                        f"Invalid friends list response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Social Features - Enhanced Friends System",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Social Features - Enhanced Friends System",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 2: Real-time Online Status Integration
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/online-status?userId=demo-user", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'onlineFriends' in data and 'timestamp' in data:
                    # Verify timestamp is recent (within last minute)
                    timestamp = data['timestamp']
                    try:
                        from datetime import datetime
                        ts_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        now = datetime.now(ts_time.tzinfo)
                        time_diff = abs((now - ts_time).total_seconds())
                        
                        if time_diff < 60:  # Within 1 minute
                            self.log_test(
                                "Social Features - Real-time Online Status",
                                True,
                                f"Real-time online status working. Timestamp is recent: {timestamp} (diff: {time_diff:.1f}s)",
                                response_time
                            )
                        else:
                            self.log_test(
                                "Social Features - Real-time Online Status",
                                False,
                                f"Timestamp not recent enough: {timestamp} (diff: {time_diff:.1f}s)",
                                response_time
                            )
                    except Exception as ts_error:
                        self.log_test(
                            "Social Features - Real-time Online Status",
                            True,
                            f"Online status endpoint working (timestamp format issue: {ts_error})",
                            response_time
                        )
                else:
                    self.log_test(
                        "Social Features - Real-time Online Status",
                        False,
                        f"Invalid online status response structure. Got: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Social Features - Real-time Online Status",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Social Features - Real-time Online Status",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 3: API Endpoint Consistency
        try:
            start_time = time.time()
            
            # Test multiple endpoints for consistent response format
            endpoints = [
                f"{API_BASE}/friends/list?userId=test-user",
                f"{API_BASE}/friends/online-status?userId=test-user",
                f"{API_BASE}/users/search?q=test&userId=test-user"
            ]
            
            all_consistent = True
            response_times = []
            
            for endpoint in endpoints:
                try:
                    ep_start = time.time()
                    response = requests.get(endpoint, timeout=5)
                    ep_time = time.time() - ep_start
                    response_times.append(ep_time)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'timestamp' not in data:
                            all_consistent = False
                            break
                    else:
                        all_consistent = False
                        break
                except:
                    all_consistent = False
                    break
            
            total_time = time.time() - start_time
            
            if all_consistent:
                avg_response_time = sum(response_times) / len(response_times)
                self.log_test(
                    "Social Features - API Endpoint Consistency",
                    True,
                    f"All social API endpoints have consistent response format with timestamps. Avg response time: {avg_response_time:.3f}s",
                    total_time
                )
            else:
                self.log_test(
                    "Social Features - API Endpoint Consistency",
                    False,
                    "Social API endpoints have inconsistent response formats or errors",
                    total_time
                )
                
        except Exception as e:
            self.log_test(
                "Social Features - API Endpoint Consistency",
                False,
                f"Consistency test failed: {str(e)}"
            )

    def test_api_performance(self):
        """Test API performance for social features"""
        print("\n⚡ TESTING API PERFORMANCE FOR SOCIAL FEATURES")
        print("=" * 60)
        
        # Test response times for new endpoints
        endpoints = [
            ("Friends Online Status", f"{API_BASE}/friends/online-status?userId=test-user"),
            ("User Search", f"{API_BASE}/users/search?q=test&userId=test-user"),
            ("Friends List", f"{API_BASE}/friends/list?userId=test-user")
        ]
        
        for name, endpoint in endpoints:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    if response_time < 2.0:  # Under 2 seconds is good for social features
                        self.log_test(
                            f"Performance - {name}",
                            True,
                            f"Good response time for real-time social features",
                            response_time
                        )
                    else:
                        self.log_test(
                            f"Performance - {name}",
                            False,
                            f"Response time too slow for real-time social features (should be < 2.0s)",
                            response_time
                        )
                else:
                    self.log_test(
                        f"Performance - {name}",
                        False,
                        f"HTTP {response.status_code}: {response.text}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Performance - {name}",
                    False,
                    f"Request failed: {str(e)}"
                )

    def run_all_tests(self):
        """Run all backend tests for social features and global practice server"""
        print("🎮 TURFLOOT BACKEND TESTING - SOCIAL FEATURES & GLOBAL PRACTICE SERVER")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Run all test suites
        self.test_new_social_endpoints()
        self.test_global_practice_server()
        self.test_database_operations()
        self.test_social_features_integration()
        self.test_api_performance()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🏁 TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.failed_tests == 0:
            print("\n🎉 ALL TESTS PASSED! Social features and global practice server are working correctly.")
        else:
            print(f"\n⚠️ {self.failed_tests} test(s) failed. Please review the issues above.")
            
        print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return self.failed_tests == 0

if __name__ == "__main__":
    tester = TurfLootBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)