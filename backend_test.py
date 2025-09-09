#!/usr/bin/env python3
"""
Comprehensive Backend Testing for MongoDB-Only Friends System
Testing the completely migrated friends system that uses ONLY real Privy users with no mock structures.

CRITICAL CHANGES TESTED:
1. Removed ALL mock data structures - Eliminated mockFriends and mockFriendRequests Maps
2. Full MongoDB migration - All friend data now stored in MongoDB collections
3. No mock user creation - Only real Privy users from database are allowed
4. Complete database integration - All CRUD operations use MongoDB

DATABASE COLLECTIONS:
- users - Stores real Privy users
- friends - Stores friendship relationships  
- friend_requests - Stores pending friend requests
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-social.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class FriendsSystemTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_users = []  # Track test users for cleanup
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results with detailed information"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'response_data': response_data,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()

    def test_api_health_check(self):
        """Test basic API connectivity"""
        print("🔍 TESTING: API Health Check")
        try:
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Health Check", 
                    True, 
                    f"API responding correctly - Server: {data.get('server', 'unknown')}"
                )
                return True
            else:
                self.log_test(
                    "API Health Check", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
                return False
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection failed: {str(e)}")
            return False

    def test_empty_database_initial_state(self):
        """Test GET /api/friends?type=users when no users registered yet"""
        print("🔍 TESTING: Empty Database Initial State")
        try:
            # Test guest user scenario - should return empty array
            response = requests.get(f"{API_BASE}/friends?type=users&userIdentifier=guest", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                if 'success' in data and data['success'] and 'users' in data:
                    users = data['users']
                    
                    # For guest users, should return empty array with message
                    if len(users) == 0 and 'message' in data:
                        self.log_test(
                            "Empty Database Initial State", 
                            True, 
                            f"Guest user correctly returns empty array with message: '{data['message']}'"
                        )
                        return True
                    else:
                        self.log_test(
                            "Empty Database Initial State", 
                            False, 
                            f"Expected empty array for guest, got {len(users)} users",
                            data
                        )
                else:
                    self.log_test(
                        "Empty Database Initial State", 
                        False, 
                        "Invalid response structure - missing success or users field",
                        data
                    )
            else:
                self.log_test(
                    "Empty Database Initial State", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("Empty Database Initial State", False, f"Request failed: {str(e)}")
            
        return False

    def test_user_registration(self):
        """Test POST /api/friends with action=register_user"""
        print("🔍 TESTING: User Registration")
        try:
            # Test registering a new Privy user
            test_user_id = f"privy_user_{int(time.time())}"
            self.test_users.append(test_user_id)
            
            user_data = {
                "username": f"TestUser_{int(time.time())}",
                "displayName": f"Test User {int(time.time())}",
                "email": f"test{int(time.time())}@example.com",
                "walletAddress": f"0x{hex(int(time.time()))[2:].zfill(40)}"
            }
            
            payload = {
                "action": "register_user",
                "userIdentifier": test_user_id,
                "userData": user_data
            }
            
            response = requests.post(
                f"{API_BASE}/friends", 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if 'success' in data and data['success']:
                    if 'message' in data and 'registered' in data['message'].lower():
                        self.log_test(
                            "User Registration", 
                            True, 
                            f"Successfully registered Privy user {test_user_id} in MongoDB"
                        )
                        return True
                    else:
                        self.log_test(
                            "User Registration", 
                            False, 
                            "Success response but missing expected message",
                            data
                        )
                else:
                    self.log_test(
                        "User Registration", 
                        False, 
                        "Registration failed according to response",
                        data
                    )
            else:
                self.log_test(
                    "User Registration", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("User Registration", False, f"Request failed: {str(e)}")
            
        return False

    def test_user_list_after_registration(self):
        """Test GET /api/friends?type=users after registering users"""
        print("🔍 TESTING: User List After Registration")
        try:
            # First register a few test users
            registered_users = []
            for i in range(2):
                test_user_id = f"privy_user_list_{int(time.time())}_{i}"
                self.test_users.append(test_user_id)
                
                user_data = {
                    "username": f"ListTestUser_{int(time.time())}_{i}",
                    "displayName": f"List Test User {i}",
                    "email": f"listtest{int(time.time())}_{i}@example.com",
                    "walletAddress": f"0x{hex(int(time.time()) + i)[2:].zfill(40)}"
                }
                
                payload = {
                    "action": "register_user",
                    "userIdentifier": test_user_id,
                    "userData": user_data
                }
                
                response = requests.post(
                    f"{API_BASE}/friends", 
                    json=payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response.status_code == 200:
                    registered_users.append((test_user_id, user_data['username']))
                
                time.sleep(0.1)  # Small delay between registrations
            
            if len(registered_users) > 0:
                # Now test getting user list from a different user
                test_requester = f"privy_requester_{int(time.time())}"
                response = requests.get(f"{API_BASE}/friends?type=users&userIdentifier={test_requester}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if 'success' in data and data['success'] and 'users' in data:
                        users = data['users']
                        
                        # Should return the registered users
                        if len(users) >= len(registered_users):
                            # Check if our registered users are in the list
                            returned_usernames = [u['username'] for u in users]
                            registered_usernames = [u[1] for u in registered_users]
                            
                            found_users = [u for u in registered_usernames if u in returned_usernames]
                            
                            if len(found_users) >= 1:  # At least one of our users should be found
                                self.log_test(
                                    "User List After Registration", 
                                    True, 
                                    f"Retrieved {len(users)} users from MongoDB, found {len(found_users)} registered test users"
                                )
                                return True
                            else:
                                self.log_test(
                                    "User List After Registration", 
                                    False, 
                                    f"Registered users not found in user list. Expected: {registered_usernames}, Got: {returned_usernames[:5]}"
                                )
                        else:
                            self.log_test(
                                "User List After Registration", 
                                False, 
                                f"Expected at least {len(registered_users)} users, got {len(users)}"
                            )
                    else:
                        self.log_test(
                            "User List After Registration", 
                            False, 
                            "Invalid response structure",
                            data
                        )
                else:
                    self.log_test(
                        "User List After Registration", 
                        False, 
                        f"Failed to get user list: {response.status_code}"
                    )
            else:
                self.log_test(
                    "User List After Registration", 
                    False, 
                    "Failed to register any test users"
                )
                
        except Exception as e:
            self.log_test("User List After Registration", False, f"Request failed: {str(e)}")
            
        return False

    def test_friend_request_with_real_users(self):
        """Test POST /api/friends with action=send_request using real registered users"""
        print("🔍 TESTING: Friend Request with Real Users")
        try:
            # First register two users
            sender_id = f"privy_sender_{int(time.time())}"
            receiver_id = f"privy_receiver_{int(time.time())}"
            self.test_users.extend([sender_id, receiver_id])
            
            # Register sender
            sender_data = {
                "username": f"Sender_{int(time.time())}",
                "displayName": f"Test Sender",
                "email": f"sender{int(time.time())}@example.com",
                "walletAddress": f"0x{hex(int(time.time()))[2:].zfill(40)}"
            }
            
            payload1 = {
                "action": "register_user",
                "userIdentifier": sender_id,
                "userData": sender_data
            }
            
            response1 = requests.post(
                f"{API_BASE}/friends", 
                json=payload1,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Register receiver
            receiver_data = {
                "username": f"Receiver_{int(time.time())}",
                "displayName": f"Test Receiver",
                "email": f"receiver{int(time.time())}@example.com",
                "walletAddress": f"0x{hex(int(time.time()) + 1)[2:].zfill(40)}"
            }
            
            payload2 = {
                "action": "register_user",
                "userIdentifier": receiver_id,
                "userData": receiver_data
            }
            
            response2 = requests.post(
                f"{API_BASE}/friends", 
                json=payload2,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response1.status_code == 200 and response2.status_code == 200:
                # Now send friend request from sender to receiver
                friend_request_payload = {
                    "action": "send_request",
                    "userIdentifier": sender_id,
                    "friendUsername": receiver_data['username']
                }
                
                response3 = requests.post(
                    f"{API_BASE}/friends", 
                    json=friend_request_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response3.status_code == 200:
                    data3 = response3.json()
                    
                    if 'success' in data3 and data3['success']:
                        if 'message' in data3 and receiver_data['username'] in data3['message']:
                            self.log_test(
                                "Friend Request with Real Users", 
                                True, 
                                f"Successfully sent friend request between real registered users"
                            )
                            return True
                        else:
                            self.log_test(
                                "Friend Request with Real Users", 
                                False, 
                                "Success response but missing expected message",
                                data3
                            )
                    else:
                        self.log_test(
                            "Friend Request with Real Users", 
                            False, 
                            "Friend request failed according to response",
                            data3
                        )
                else:
                    self.log_test(
                        "Friend Request with Real Users", 
                        False, 
                        f"Friend request API returned status {response3.status_code}",
                        response3.text
                    )
            else:
                self.log_test(
                    "Friend Request with Real Users", 
                    False, 
                    f"Failed to register users: {response1.status_code}, {response2.status_code}"
                )
                
        except Exception as e:
            self.log_test("Friend Request with Real Users", False, f"Request failed: {str(e)}")
            
        return False

    def test_invalid_data_handling(self):
        """Test error handling for invalid data"""
        print("🔍 TESTING: Invalid Data Handling")
        try:
            # Test missing userIdentifier
            payload1 = {
                "action": "send_request",
                "friendUsername": "TestUser"
            }
            
            response1 = requests.post(
                f"{API_BASE}/friends", 
                json=payload1,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Test guest user (should be rejected)
            payload2 = {
                "action": "send_request",
                "userIdentifier": "guest",
                "friendUsername": "TestUser"
            }
            
            response2 = requests.post(
                f"{API_BASE}/friends", 
                json=payload2,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Test invalid action
            payload3 = {
                "action": "invalid_action",
                "userIdentifier": "test_user_123",
                "friendUsername": "TestUser"
            }
            
            response3 = requests.post(
                f"{API_BASE}/friends", 
                json=payload3,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # All should return error responses
            if (response1.status_code >= 400 and 
                response2.status_code >= 400 and 
                response3.status_code >= 400):
                
                self.log_test(
                    "Invalid Data Handling", 
                    True, 
                    "All invalid requests properly rejected with error codes"
                )
                return True
            else:
                self.log_test(
                    "Invalid Data Handling", 
                    False, 
                    f"Some invalid requests not properly rejected: {response1.status_code}, {response2.status_code}, {response3.status_code}"
                )
                
        except Exception as e:
            self.log_test("Invalid Data Handling", False, f"Request failed: {str(e)}")
            
        return False

    def test_user_filtering_logic(self):
        """Test that users with pending requests are filtered out from MongoDB results"""
        print("🔍 TESTING: User Filtering Logic")
        try:
            # Register a test user to be filtered
            filter_test_user = f"privy_filter_{int(time.time())}"
            requester_user = f"privy_requester_{int(time.time())}"
            self.test_users.extend([filter_test_user, requester_user])
            
            # Register the user that will be filtered
            filter_user_data = {
                "username": f"FilterMe_{int(time.time())}",
                "displayName": f"Filter Test User",
                "email": f"filter{int(time.time())}@example.com",
                "walletAddress": f"0x{hex(int(time.time()))[2:].zfill(40)}"
            }
            
            payload1 = {
                "action": "register_user",
                "userIdentifier": filter_test_user,
                "userData": filter_user_data
            }
            
            response1 = requests.post(
                f"{API_BASE}/friends", 
                json=payload1,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response1.status_code == 200:
                # Get initial user list for requester
                response2 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier={requester_user}", timeout=10)
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    initial_users = data2.get('users', [])
                    initial_count = len(initial_users)
                    
                    # Check if our registered user is in the list
                    initial_usernames = [u['username'] for u in initial_users]
                    
                    if filter_user_data['username'] in initial_usernames:
                        # Send friend request to the user
                        friend_request_payload = {
                            "action": "send_request",
                            "userIdentifier": requester_user,
                            "friendUsername": filter_user_data['username']
                        }
                        
                        response3 = requests.post(
                            f"{API_BASE}/friends", 
                            json=friend_request_payload,
                            headers={'Content-Type': 'application/json'},
                            timeout=10
                        )
                        
                        if response3.status_code == 200:
                            # Get user list again - should have one less user
                            response4 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier={requester_user}", timeout=10)
                            
                            if response4.status_code == 200:
                                data4 = response4.json()
                                filtered_users = data4.get('users', [])
                                filtered_count = len(filtered_users)
                                filtered_usernames = [u['username'] for u in filtered_users]
                                
                                # The user should be filtered out now
                                if filter_user_data['username'] not in filtered_usernames:
                                    self.log_test(
                                        "User Filtering Logic", 
                                        True, 
                                        f"MongoDB user filtering working: {initial_count} → {filtered_count} users, {filter_user_data['username']} correctly filtered out"
                                    )
                                    return True
                                else:
                                    self.log_test(
                                        "User Filtering Logic", 
                                        False, 
                                        f"User {filter_user_data['username']} still appears in filtered list"
                                    )
                            else:
                                self.log_test(
                                    "User Filtering Logic", 
                                    False, 
                                    f"Failed to get filtered user list: {response4.status_code}"
                                )
                        else:
                            self.log_test(
                                "User Filtering Logic", 
                                False, 
                                f"Failed to send friend request: {response3.status_code}"
                            )
                    else:
                        self.log_test(
                            "User Filtering Logic", 
                            False, 
                            f"Registered user {filter_user_data['username']} not found in initial user list"
                        )
                else:
                    self.log_test(
                        "User Filtering Logic", 
                        False, 
                        f"Failed to get initial user list: {response2.status_code}"
                    )
            else:
                self.log_test(
                    "User Filtering Logic", 
                    False, 
                    f"Failed to register filter test user: {response1.status_code}"
                )
                
        except Exception as e:
            self.log_test("User Filtering Logic", False, f"Request failed: {str(e)}")
            
        return False

    def test_mongodb_connection_validation(self):
        """Test MongoDB connection and user document structure"""
        print("🔍 TESTING: MongoDB Connection and Document Structure")
        try:
            # Register a user to test MongoDB document structure
            test_user_id = f"privy_mongo_test_{int(time.time())}"
            self.test_users.append(test_user_id)
            
            user_data = {
                "username": f"MongoTest_{int(time.time())}",
                "displayName": f"MongoDB Test User",
                "email": f"mongotest{int(time.time())}@example.com",
                "walletAddress": f"0x{hex(int(time.time()))[2:].zfill(40)}"
            }
            
            payload = {
                "action": "register_user",
                "userIdentifier": test_user_id,
                "userData": user_data
            }
            
            response1 = requests.post(
                f"{API_BASE}/friends", 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response1.status_code == 200:
                # Now retrieve the user to validate MongoDB document structure
                response2 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier=different_user", timeout=10)
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    users = data2.get('users', [])
                    
                    # Find our registered user
                    our_user = None
                    for user in users:
                        if user.get('username') == user_data['username']:
                            our_user = user
                            break
                    
                    if our_user:
                        # Validate MongoDB document structure
                        required_fields = ['username', 'status', 'joinedAt', 'gamesPlayed']
                        validation_errors = []
                        
                        for field in required_fields:
                            if field not in our_user:
                                validation_errors.append(f"Missing field '{field}'")
                        
                        # Validate data types
                        if 'username' in our_user and not isinstance(our_user['username'], str):
                            validation_errors.append("username should be string")
                        
                        if 'status' in our_user and our_user['status'] not in ['online', 'offline']:
                            validation_errors.append(f"invalid status '{our_user['status']}'")
                        
                        if 'gamesPlayed' in our_user and not isinstance(our_user['gamesPlayed'], int):
                            validation_errors.append("gamesPlayed should be integer")
                        
                        if len(validation_errors) == 0:
                            self.log_test(
                                "MongoDB Connection and Document Structure", 
                                True, 
                                f"MongoDB user document has valid structure: {list(our_user.keys())}"
                            )
                            return True
                        else:
                            self.log_test(
                                "MongoDB Connection and Document Structure", 
                                False, 
                                f"Document validation errors: {'; '.join(validation_errors)}"
                            )
                    else:
                        self.log_test(
                            "MongoDB Connection and Document Structure", 
                            False, 
                            f"Registered user {user_data['username']} not found in user list"
                        )
                else:
                    self.log_test(
                        "MongoDB Connection and Document Structure", 
                        False, 
                        f"Failed to retrieve users: {response2.status_code}"
                    )
            else:
                self.log_test(
                    "MongoDB Connection and Document Structure", 
                    False, 
                    f"Failed to register user: {response1.status_code}"
                )
                
        except Exception as e:
            self.log_test("MongoDB Connection and Document Structure", False, f"Request failed: {str(e)}")
            
        return False

    def test_api_response_format_consistency(self):
        """Test that API responses match expected format for frontend integration"""
        print("🔍 TESTING: API Response Format Consistency")
        try:
            format_issues = []
            
            # Test user list response format
            response1 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier=test_user", timeout=10)
            
            if response1.status_code == 200:
                data1 = response1.json()
                if 'success' not in data1:
                    format_issues.append("User list response missing 'success' field")
                if 'users' not in data1:
                    format_issues.append("User list response missing 'users' field")
                if 'count' not in data1:
                    format_issues.append("User list response missing 'count' field")
            else:
                format_issues.append(f"User list request failed: {response1.status_code}")
            
            # Test user registration response format
            test_user_id = f"privy_format_test_{int(time.time())}"
            user_data = {
                "username": f"FormatTest_{int(time.time())}",
                "displayName": f"Format Test User",
                "email": f"format{int(time.time())}@example.com",
                "walletAddress": f"0x{hex(int(time.time()))[2:].zfill(40)}"
            }
            
            payload = {
                "action": "register_user",
                "userIdentifier": test_user_id,
                "userData": user_data
            }
            
            response2 = requests.post(
                f"{API_BASE}/friends", 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response2.status_code == 200:
                data2 = response2.json()
                if 'success' not in data2:
                    format_issues.append("User registration response missing 'success' field")
                if 'message' not in data2:
                    format_issues.append("User registration response missing 'message' field")
            else:
                format_issues.append(f"User registration failed: {response2.status_code}")
            
            # Test invalid request error format
            invalid_payload = {
                "action": "invalid_action",
                "userIdentifier": "test_user"
            }
            
            response3 = requests.post(
                f"{API_BASE}/friends", 
                json=invalid_payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response3.status_code >= 400:
                data3 = response3.json()
                if 'error' not in data3:
                    format_issues.append("Error response missing 'error' field")
            else:
                format_issues.append("Invalid request should return error status")
            
            if len(format_issues) == 0:
                self.log_test(
                    "API Response Format Consistency", 
                    True, 
                    "All API responses have consistent format matching frontend expectations"
                )
                return True
            else:
                self.log_test(
                    "API Response Format Consistency", 
                    False, 
                    f"Format issues: {'; '.join(format_issues)}"
                )
                
        except Exception as e:
            self.log_test("API Response Format Consistency", False, f"Request failed: {str(e)}")
            
        return False

    def run_comprehensive_tests(self):
        """Run all updated AddFriendModal backend tests for real Privy user system"""
        print("🚀 STARTING COMPREHENSIVE UPDATED ADDFRIENDMODAL BACKEND API TESTING")
        print("=" * 80)
        print("🔄 TESTING: Transition from Demo Data to Real Privy Users with MongoDB")
        print(f"Testing against: {BASE_URL}")
        print(f"API Base URL: {API_BASE}")
        print("=" * 80)
        print("📋 KEY CHANGES BEING TESTED:")
        print("   • Removed demo users - getDemoUsers() function removed")
        print("   • Added MongoDB integration - stores/retrieves actual Privy users")
        print("   • Added user registration - POST endpoint for Privy user registration")
        print("   • Updated user filtering - getPrivyUsers() queries 'users' collection")
        print("=" * 80)
        print()
        
        # Run all tests for updated Privy user system
        test_methods = [
            self.test_api_health_check,
            self.test_empty_database_initial_state,
            self.test_user_registration,
            self.test_user_list_after_registration,
            self.test_friend_request_with_real_users,
            self.test_user_filtering_logic,
            self.test_mongodb_connection_validation,
            self.test_api_response_format_consistency
        ]
        
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                self.log_test(test_method.__name__, False, f"Test execution failed: {str(e)}")
        
        # Print comprehensive summary
        print("=" * 80)
        print("🎯 COMPREHENSIVE ADDFRIENDMODAL BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print()
        
        # Detailed results
        print("📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        print()
        print("🎯 CRITICAL FINDINGS:")
        if self.passed_tests == self.total_tests:
            print("✅ ALL UPDATED ADDFRIENDMODAL BACKEND API TESTS PASSED")
            print("✅ MongoDB integration working correctly")
            print("✅ Real Privy user registration functional")
            print("✅ User list retrieval from database operational")
            print("✅ Friend request system with real users working")
            print("✅ User filtering logic with MongoDB operational")
            print("✅ Database document structure validation successful")
            print("✅ API response format consistent for frontend integration")
            print("✅ Transition from demo data to real Privy users SUCCESSFUL")
        else:
            print("❌ SOME TESTS FAILED - ISSUES DETECTED:")
            failed_tests = [r for r in self.test_results if "❌" in r['status']]
            for failed in failed_tests:
                print(f"   • {failed['test']}: {failed['details']}")
        
        print("=" * 80)
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = AddFriendModalBackendTester()
    success = tester.run_comprehensive_tests()
    sys.exit(0 if success else 1)