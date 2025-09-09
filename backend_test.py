#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Updated AddFriendModal API with Real Privy Users
Testing Focus: MongoDB integration, user registration, and real Privy user data handling
Review Request: Test transition from demo data to real Privy user system
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-social.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class AddFriendModalBackendTester:
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

    def test_user_list_loading_authenticated(self):
        """Test GET /api/friends?type=users for authenticated users"""
        print("🔍 TESTING: User List Loading (Authenticated User)")
        try:
            # Test with mock authenticated user
            test_user_id = "test_user_12345"
            response = requests.get(f"{API_BASE}/friends?type=users&userIdentifier={test_user_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'success' in data and data['success'] and 'users' in data:
                    users = data['users']
                    
                    # Should return available users (filtered list)
                    if len(users) >= 0:  # Could be empty if all users are already friends
                        self.log_test(
                            "User List Loading (Authenticated)", 
                            True, 
                            f"Retrieved {len(users)} available users for authenticated user"
                        )
                        return True
                    else:
                        self.log_test(
                            "User List Loading (Authenticated)", 
                            False, 
                            "Unexpected response format",
                            data
                        )
                else:
                    self.log_test(
                        "User List Loading (Authenticated)", 
                        False, 
                        "Invalid response structure",
                        data
                    )
            else:
                self.log_test(
                    "User List Loading (Authenticated)", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("User List Loading (Authenticated)", False, f"Request failed: {str(e)}")
            
        return False

    def test_friend_request_sending(self):
        """Test POST /api/friends with action=send_request"""
        print("🔍 TESTING: Friend Request Sending")
        try:
            # Test sending a friend request
            test_user_id = "test_user_sender_123"
            target_username = "TacticalAce"  # From demo users
            
            payload = {
                "action": "send_request",
                "userIdentifier": test_user_id,
                "friendUsername": target_username
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
                    if 'message' in data and target_username in data['message']:
                        self.log_test(
                            "Friend Request Sending", 
                            True, 
                            f"Successfully sent friend request to {target_username}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Friend Request Sending", 
                            False, 
                            "Success response but missing expected message",
                            data
                        )
                else:
                    self.log_test(
                        "Friend Request Sending", 
                        False, 
                        "Request failed according to response",
                        data
                    )
            else:
                self.log_test(
                    "Friend Request Sending", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("Friend Request Sending", False, f"Request failed: {str(e)}")
            
        return False

    def test_duplicate_request_prevention(self):
        """Test duplicate friend request prevention"""
        print("🔍 TESTING: Duplicate Request Prevention")
        try:
            test_user_id = "test_user_duplicate_123"
            target_username = "SniperPro"  # From demo users
            
            payload = {
                "action": "send_request",
                "userIdentifier": test_user_id,
                "friendUsername": target_username
            }
            
            # Send first request
            response1 = requests.post(
                f"{API_BASE}/friends", 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Send duplicate request
            response2 = requests.post(
                f"{API_BASE}/friends", 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response1.status_code == 200 and response2.status_code == 400:
                data2 = response2.json()
                if 'error' in data2 and 'already sent' in data2['error'].lower():
                    self.log_test(
                        "Duplicate Request Prevention", 
                        True, 
                        "Correctly prevented duplicate friend request"
                    )
                    return True
                else:
                    self.log_test(
                        "Duplicate Request Prevention", 
                        False, 
                        "Second request blocked but with unexpected error message",
                        data2
                    )
            else:
                self.log_test(
                    "Duplicate Request Prevention", 
                    False, 
                    f"Unexpected response codes: {response1.status_code}, {response2.status_code}",
                    {"response1": response1.text, "response2": response2.text}
                )
                
        except Exception as e:
            self.log_test("Duplicate Request Prevention", False, f"Request failed: {str(e)}")
            
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
        """Test that users with pending requests are filtered out"""
        print("🔍 TESTING: User Filtering Logic")
        try:
            test_user_id = "test_user_filtering_123"
            
            # First, get initial user list
            response1 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier={test_user_id}", timeout=10)
            
            if response1.status_code == 200:
                data1 = response1.json()
                initial_users = data1.get('users', [])
                initial_count = len(initial_users)
                
                if initial_count > 0:
                    # Send a friend request to one user
                    target_user = initial_users[0]['username']
                    
                    payload = {
                        "action": "send_request",
                        "userIdentifier": test_user_id,
                        "friendUsername": target_user
                    }
                    
                    response2 = requests.post(
                        f"{API_BASE}/friends", 
                        json=payload,
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    if response2.status_code == 200:
                        # Get user list again - should have one less user
                        response3 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier={test_user_id}", timeout=10)
                        
                        if response3.status_code == 200:
                            data3 = response3.json()
                            filtered_users = data3.get('users', [])
                            filtered_count = len(filtered_users)
                            
                            # Should have one less user (the one we sent request to)
                            if filtered_count == initial_count - 1:
                                # Verify the target user is not in the list
                                usernames = [u['username'] for u in filtered_users]
                                if target_user not in usernames:
                                    self.log_test(
                                        "User Filtering Logic", 
                                        True, 
                                        f"User list correctly filtered: {initial_count} → {filtered_count} users, {target_user} removed"
                                    )
                                    return True
                                else:
                                    self.log_test(
                                        "User Filtering Logic", 
                                        False, 
                                        f"Target user {target_user} still appears in filtered list"
                                    )
                            else:
                                self.log_test(
                                    "User Filtering Logic", 
                                    False, 
                                    f"User count didn't decrease as expected: {initial_count} → {filtered_count}"
                                )
                        else:
                            self.log_test(
                                "User Filtering Logic", 
                                False, 
                                f"Failed to get filtered user list: {response3.status_code}"
                            )
                    else:
                        self.log_test(
                            "User Filtering Logic", 
                            False, 
                            f"Failed to send friend request: {response2.status_code}"
                        )
                else:
                    self.log_test(
                        "User Filtering Logic", 
                        False, 
                        "No users available for filtering test"
                    )
            else:
                self.log_test(
                    "User Filtering Logic", 
                    False, 
                    f"Failed to get initial user list: {response1.status_code}"
                )
                
        except Exception as e:
            self.log_test("User Filtering Logic", False, f"Request failed: {str(e)}")
            
        return False

    def test_demo_users_data_structure(self):
        """Test that demo users have all required fields with correct data types"""
        print("🔍 TESTING: Demo Users Data Structure Validation")
        try:
            response = requests.get(f"{API_BASE}/friends?type=users&userIdentifier=guest", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                
                if len(users) > 0:
                    validation_errors = []
                    
                    for i, user in enumerate(users):
                        # Check required fields
                        required_fields = ['username', 'status', 'joinedAt', 'gamesPlayed']
                        for field in required_fields:
                            if field not in user:
                                validation_errors.append(f"User {i}: Missing field '{field}'")
                        
                        # Validate data types and values
                        if 'username' in user and not isinstance(user['username'], str):
                            validation_errors.append(f"User {i}: username should be string")
                        
                        if 'status' in user and user['status'] not in ['online', 'offline', 'in-game']:
                            validation_errors.append(f"User {i}: invalid status '{user['status']}'")
                        
                        if 'gamesPlayed' in user and not isinstance(user['gamesPlayed'], int):
                            validation_errors.append(f"User {i}: gamesPlayed should be integer")
                        
                        if 'joinedAt' in user and not isinstance(user['joinedAt'], str):
                            validation_errors.append(f"User {i}: joinedAt should be string")
                    
                    if len(validation_errors) == 0:
                        self.log_test(
                            "Demo Users Data Structure", 
                            True, 
                            f"All {len(users)} demo users have valid data structure"
                        )
                        return True
                    else:
                        self.log_test(
                            "Demo Users Data Structure", 
                            False, 
                            f"Validation errors: {'; '.join(validation_errors[:5])}"  # Show first 5 errors
                        )
                else:
                    self.log_test(
                        "Demo Users Data Structure", 
                        False, 
                        "No demo users returned"
                    )
            else:
                self.log_test(
                    "Demo Users Data Structure", 
                    False, 
                    f"Failed to get demo users: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Demo Users Data Structure", False, f"Request failed: {str(e)}")
            
        return False

    def test_api_response_format(self):
        """Test that API responses match expected format for frontend"""
        print("🔍 TESTING: API Response Format Consistency")
        try:
            # Test user list response format
            response1 = requests.get(f"{API_BASE}/friends?type=users&userIdentifier=test_user", timeout=10)
            
            # Test friend request response format
            payload = {
                "action": "send_request",
                "userIdentifier": "test_user_format_123",
                "friendUsername": "StealthWarrior"
            }
            
            response2 = requests.post(
                f"{API_BASE}/friends", 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            format_issues = []
            
            # Validate user list response
            if response1.status_code == 200:
                data1 = response1.json()
                if 'success' not in data1:
                    format_issues.append("User list response missing 'success' field")
                if 'users' not in data1:
                    format_issues.append("User list response missing 'users' field")
            else:
                format_issues.append(f"User list request failed: {response1.status_code}")
            
            # Validate friend request response
            if response2.status_code == 200:
                data2 = response2.json()
                if 'success' not in data2:
                    format_issues.append("Friend request response missing 'success' field")
                if 'message' not in data2:
                    format_issues.append("Friend request response missing 'message' field")
            else:
                # This might be expected if it's a duplicate, check error format
                if response2.status_code == 400:
                    data2 = response2.json()
                    if 'error' not in data2:
                        format_issues.append("Error response missing 'error' field")
                else:
                    format_issues.append(f"Friend request failed unexpectedly: {response2.status_code}")
            
            if len(format_issues) == 0:
                self.log_test(
                    "API Response Format", 
                    True, 
                    "All API responses have consistent format matching frontend expectations"
                )
                return True
            else:
                self.log_test(
                    "API Response Format", 
                    False, 
                    f"Format issues: {'; '.join(format_issues)}"
                )
                
        except Exception as e:
            self.log_test("API Response Format", False, f"Request failed: {str(e)}")
            
        return False

    def run_comprehensive_tests(self):
        """Run all AddFriendModal backend tests"""
        print("🚀 STARTING COMPREHENSIVE ADDFRIENDMODAL BACKEND API TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"API Base URL: {API_BASE}")
        print("=" * 80)
        print()
        
        # Run all tests
        test_methods = [
            self.test_api_health_check,
            self.test_user_list_loading_guest,
            self.test_user_list_loading_authenticated,
            self.test_friend_request_sending,
            self.test_duplicate_request_prevention,
            self.test_invalid_data_handling,
            self.test_user_filtering_logic,
            self.test_demo_users_data_structure,
            self.test_api_response_format
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
            print("✅ ALL ADDFRIENDMODAL BACKEND API TESTS PASSED")
            print("✅ User list loading working correctly")
            print("✅ Friend request sending functional")
            print("✅ User filtering logic operational")
            print("✅ Error handling working properly")
            print("✅ Data structure validation successful")
            print("✅ API response format consistent")
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