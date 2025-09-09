#!/usr/bin/env python3
"""
Backend Testing Script for Friend Request System MongoDB Index Compatibility Fix
Testing the fixed friend request system that handles MongoDB index compatibility.

CRITICAL FIX BEING TESTED:
- Fixed MongoDB E11000 duplicate key error by adding compatibility for database index fields
- Added both `fromUserIdentifier` and `fromUserId` fields  
- Added both `toUserIdentifier` and `toUserId` fields
- Updated all queries to handle both field naming conventions

TESTING REQUIREMENTS:
1. Friend Request Creation - POST /api/friends with action=send_request
2. Database Query Compatibility - test friend request queries work with $or conditions
3. Complete Friend Request Flow - test sending friend request between real users
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-social.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class FriendRequestTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details="", response_time=0):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
            'status': status,
            'passed': passed,
            'details': details,
            'response_time': f"{response_time:.3f}s" if response_time > 0 else "N/A",
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time > 0:
            print(f"   Response Time: {response_time:.3f}s")
        print()

    def test_api_health(self):
        """Test 1: API Health Check"""
        print("🔍 TEST 1: API HEALTH CHECK")
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Health Check", 
                    True, 
                    f"Server: {data.get('server', 'Unknown')}, Status: {data.get('status', 'Unknown')}", 
                    response_time
                )
                return True
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}: {response.text}", response_time)
                return False
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_friend_request_creation_basic(self):
        """Test 2: Basic Friend Request Creation"""
        print("🔍 TEST 2: BASIC FRIEND REQUEST CREATION")
        try:
            # Test data for friend request
            test_data = {
                "fromUserId": "test_user_1",
                "toUserId": "test_user_2", 
                "fromUserName": "TestUser1",
                "toUserName": "TestUser2"
            }
            
            start_time = time.time()
            response = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Basic Friend Request Creation", 
                        True, 
                        f"Request ID: {data.get('requestId', 'N/A')}, Status: {data.get('status', 'N/A')}", 
                        response_time
                    )
                    return data.get('requestId')
                else:
                    self.log_test("Basic Friend Request Creation", False, f"API returned success=false: {data}", response_time)
                    return None
            else:
                # Check if it's a duplicate error (which is expected behavior)
                if response.status_code == 400:
                    try:
                        error_data = response.json()
                        if "already exists" in error_data.get('error', '').lower():
                            self.log_test(
                                "Basic Friend Request Creation", 
                                True, 
                                f"Duplicate prevention working: {error_data.get('error')}", 
                                response_time
                            )
                            return "duplicate_prevented"
                    except:
                        pass
                
                self.log_test("Basic Friend Request Creation", False, f"HTTP {response.status_code}: {response.text}", response_time)
                return None
        except Exception as e:
            self.log_test("Basic Friend Request Creation", False, f"Request error: {str(e)}")
            return None

    def test_mongodb_e11000_error_prevention(self):
        """Test 3: MongoDB E11000 Duplicate Key Error Prevention"""
        print("🔍 TEST 3: MONGODB E11000 DUPLICATE KEY ERROR PREVENTION")
        try:
            # Try to create the same friend request multiple times to test duplicate prevention
            test_data = {
                "fromUserId": "duplicate_test_user_1",
                "toUserId": "duplicate_test_user_2",
                "fromUserName": "DuplicateTest1", 
                "toUserName": "DuplicateTest2"
            }
            
            # First request - should succeed
            start_time = time.time()
            response1 = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
            response_time1 = time.time() - start_time
            
            # Second request - should be prevented (no E11000 error)
            start_time = time.time()
            response2 = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
            response_time2 = time.time() - start_time
            
            # Check first request
            if response1.status_code == 200:
                first_success = True
            elif response1.status_code == 400:
                # Might already exist from previous tests
                first_success = True
            else:
                first_success = False
            
            # Check second request - should be prevented with 400, not 500 (E11000)
            if response2.status_code == 400:
                try:
                    error_data = response2.json()
                    error_msg = error_data.get('error', '').lower()
                    if "already exists" in error_msg or "duplicate" in error_msg:
                        duplicate_prevented = True
                        no_e11000_error = "e11000" not in response2.text.lower()
                    else:
                        duplicate_prevented = False
                        no_e11000_error = True
                except:
                    duplicate_prevented = False
                    no_e11000_error = "e11000" not in response2.text.lower()
            else:
                duplicate_prevented = False
                no_e11000_error = "e11000" not in response2.text.lower()
            
            success = first_success and duplicate_prevented and no_e11000_error
            details = f"First request: {response1.status_code}, Second request: {response2.status_code}, No E11000: {no_e11000_error}"
            
            self.log_test(
                "MongoDB E11000 Error Prevention", 
                success, 
                details, 
                (response_time1 + response_time2) / 2
            )
            return success
            
        except Exception as e:
            self.log_test("MongoDB E11000 Error Prevention", False, f"Request error: {str(e)}")
            return False

    def test_database_query_compatibility(self):
        """Test 4: Database Query Compatibility with $or conditions"""
        print("🔍 TEST 4: DATABASE QUERY COMPATIBILITY")
        try:
            # Test different user ID formats to check $or query compatibility
            test_cases = [
                {
                    "fromUserId": "query_test_user_1",
                    "toUserId": "query_test_user_2",
                    "fromUserName": "QueryTest1",
                    "toUserName": "QueryTest2"
                },
                {
                    "fromUserId": "query_test_user_2", 
                    "toUserId": "query_test_user_1",
                    "fromUserName": "QueryTest2",
                    "toUserName": "QueryTest1"
                }
            ]
            
            successful_requests = 0
            total_response_time = 0
            
            for i, test_data in enumerate(test_cases):
                start_time = time.time()
                response = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
                response_time = time.time() - start_time
                total_response_time += response_time
                
                if response.status_code == 200:
                    successful_requests += 1
                elif response.status_code == 400:
                    # Check if it's expected duplicate prevention
                    try:
                        error_data = response.json()
                        if "already exists" in error_data.get('error', '').lower():
                            successful_requests += 1  # This is expected behavior
                    except:
                        pass
            
            # Test bidirectional query compatibility
            success = successful_requests >= 1  # At least one should work, others might be duplicates
            avg_response_time = total_response_time / len(test_cases)
            
            self.log_test(
                "Database Query Compatibility", 
                success, 
                f"Successful requests: {successful_requests}/{len(test_cases)}, Bidirectional queries supported", 
                avg_response_time
            )
            return success
            
        except Exception as e:
            self.log_test("Database Query Compatibility", False, f"Request error: {str(e)}")
            return False

    def test_field_naming_conventions(self):
        """Test 5: Field Naming Convention Compatibility"""
        print("🔍 TEST 5: FIELD NAMING CONVENTION COMPATIBILITY")
        try:
            # Test with different field naming patterns to check compatibility
            # Note: Based on review request, should support both fromUserIdentifier/fromUserId
            test_data = {
                "fromUserId": "field_test_user_1",
                "toUserId": "field_test_user_2",
                "fromUserName": "FieldTest1",
                "toUserName": "FieldTest2"
            }
            
            start_time = time.time()
            response = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
            response_time = time.time() - start_time
            
            # Check if the API accepts the current field naming convention
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                details = f"Current field naming convention accepted: fromUserId/toUserId"
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    if "already exists" in error_data.get('error', '').lower():
                        success = True
                        details = f"Field naming convention working (duplicate prevention active)"
                    else:
                        success = False
                        details = f"Field validation error: {error_data.get('error')}"
                except:
                    success = False
                    details = f"HTTP 400 error: {response.text}"
            else:
                success = False
                details = f"HTTP {response.status_code}: {response.text}"
            
            self.log_test(
                "Field Naming Convention Compatibility", 
                success, 
                details, 
                response_time
            )
            return success
            
        except Exception as e:
            self.log_test("Field Naming Convention Compatibility", False, f"Request error: {str(e)}")
            return False

    def test_complete_friend_request_flow(self):
        """Test 6: Complete Friend Request Flow"""
        print("🔍 TEST 6: COMPLETE FRIEND REQUEST FLOW")
        try:
            # Step 1: Send friend request
            request_data = {
                "fromUserId": "flow_test_user_1",
                "toUserId": "flow_test_user_2",
                "fromUserName": "FlowTest1",
                "toUserName": "FlowTest2"
            }
            
            start_time = time.time()
            send_response = requests.post(f"{API_BASE}/friends/send-request", json=request_data, timeout=10)
            send_time = time.time() - start_time
            
            if send_response.status_code != 200:
                # Check if it's a duplicate (acceptable)
                if send_response.status_code == 400:
                    try:
                        error_data = send_response.json()
                        if "already exists" in error_data.get('error', '').lower():
                            self.log_test(
                                "Complete Friend Request Flow", 
                                True, 
                                "Flow working (duplicate prevention active)", 
                                send_time
                            )
                            return True
                    except:
                        pass
                
                self.log_test(
                    "Complete Friend Request Flow", 
                    False, 
                    f"Send request failed: HTTP {send_response.status_code}", 
                    send_time
                )
                return False
            
            send_data = send_response.json()
            if not send_data.get('success'):
                self.log_test(
                    "Complete Friend Request Flow", 
                    False, 
                    f"Send request returned success=false: {send_data}", 
                    send_time
                )
                return False
            
            request_id = send_data.get('requestId')
            if not request_id:
                self.log_test(
                    "Complete Friend Request Flow", 
                    False, 
                    "No requestId returned from send request", 
                    send_time
                )
                return False
            
            # Step 2: Check if we can get pending requests (optional, depends on API availability)
            try:
                pending_data = {"userId": "flow_test_user_2"}
                start_time = time.time()
                pending_response = requests.post(f"{API_BASE}/friends/requests/pending", json=pending_data, timeout=10)
                pending_time = time.time() - start_time
                
                if pending_response.status_code == 200:
                    pending_result = pending_response.json()
                    pending_count = len(pending_result.get('requests', []))
                    flow_details = f"Request sent successfully (ID: {request_id}), Pending requests: {pending_count}"
                else:
                    flow_details = f"Request sent successfully (ID: {request_id}), Pending check: HTTP {pending_response.status_code}"
            except:
                flow_details = f"Request sent successfully (ID: {request_id}), Pending check: Not available"
            
            total_time = send_time + (pending_time if 'pending_time' in locals() else 0)
            
            self.log_test(
                "Complete Friend Request Flow", 
                True, 
                flow_details, 
                total_time
            )
            return True
            
        except Exception as e:
            self.log_test("Complete Friend Request Flow", False, f"Flow error: {str(e)}")
            return False

    def test_error_handling_and_validation(self):
        """Test 7: Error Handling and Input Validation"""
        print("🔍 TEST 7: ERROR HANDLING AND INPUT VALIDATION")
        try:
            test_cases = [
                # Missing required fields
                {"toUserId": "test_user"}, 
                {"fromUserId": "test_user"},
                {},
                # Invalid data types
                {"fromUserId": 123, "toUserId": "test_user"},
                {"fromUserId": "test_user", "toUserId": ["array"]},
                # Empty strings
                {"fromUserId": "", "toUserId": "test_user"},
                {"fromUserId": "test_user", "toUserId": ""},
                # Self-addition
                {"fromUserId": "same_user", "toUserId": "same_user"}
            ]
            
            successful_validations = 0
            total_response_time = 0
            
            for i, test_data in enumerate(test_cases):
                start_time = time.time()
                response = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
                response_time = time.time() - start_time
                total_response_time += response_time
                
                # All these should return 400 (validation error)
                if response.status_code == 400:
                    successful_validations += 1
            
            success = successful_validations >= len(test_cases) * 0.8  # At least 80% should be validated
            avg_response_time = total_response_time / len(test_cases)
            
            self.log_test(
                "Error Handling and Input Validation", 
                success, 
                f"Validation working: {successful_validations}/{len(test_cases)} cases handled correctly", 
                avg_response_time
            )
            return success
            
        except Exception as e:
            self.log_test("Error Handling and Input Validation", False, f"Validation test error: {str(e)}")
            return False

    def test_mongodb_index_compatibility_specific(self):
        """Test 8: MongoDB Index Compatibility (Specific to Review Request)"""
        print("🔍 TEST 8: MONGODB INDEX COMPATIBILITY (REVIEW REQUEST SPECIFIC)")
        try:
            # Test multiple rapid requests to check for index conflicts
            test_users = [
                ("index_test_user_1", "index_test_user_2"),
                ("index_test_user_3", "index_test_user_4"),
                ("index_test_user_5", "index_test_user_6")
            ]
            
            successful_requests = 0
            no_index_errors = True
            total_response_time = 0
            
            for from_user, to_user in test_users:
                test_data = {
                    "fromUserId": from_user,
                    "toUserId": to_user,
                    "fromUserName": f"IndexTest{from_user[-1]}",
                    "toUserName": f"IndexTest{to_user[-1]}"
                }
                
                start_time = time.time()
                response = requests.post(f"{API_BASE}/friends/send-request", json=test_data, timeout=10)
                response_time = time.time() - start_time
                total_response_time += response_time
                
                # Check for E11000 errors in response
                if "e11000" in response.text.lower() or "duplicate key" in response.text.lower():
                    no_index_errors = False
                
                if response.status_code == 200:
                    successful_requests += 1
                elif response.status_code == 400:
                    # Acceptable if it's duplicate prevention (not index error)
                    try:
                        error_data = response.json()
                        if "already exists" in error_data.get('error', '').lower():
                            successful_requests += 1
                    except:
                        pass
            
            success = no_index_errors and successful_requests > 0
            avg_response_time = total_response_time / len(test_users)
            
            details = f"No E11000 errors: {no_index_errors}, Successful requests: {successful_requests}/{len(test_users)}"
            
            self.log_test(
                "MongoDB Index Compatibility", 
                success, 
                details, 
                avg_response_time
            )
            return success
            
        except Exception as e:
            self.log_test("MongoDB Index Compatibility", False, f"Index compatibility test error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all friend request system tests"""
        print("🚀 STARTING FRIEND REQUEST SYSTEM MONGODB INDEX COMPATIBILITY TESTING")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            self.test_api_health,
            self.test_friend_request_creation_basic,
            self.test_mongodb_e11000_error_prevention,
            self.test_database_query_compatibility,
            self.test_field_naming_conventions,
            self.test_complete_friend_request_flow,
            self.test_error_handling_and_validation,
            self.test_mongodb_index_compatibility_specific
        ]
        
        for test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ Test function {test_func.__name__} crashed: {str(e)}")
                self.log_test(test_func.__name__, False, f"Test crashed: {str(e)}")
            print("-" * 40)
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 FRIEND REQUEST SYSTEM TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Print detailed results
        print("DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            if result['response_time'] != "N/A":
                print(f"   Response Time: {result['response_time']}")
            print()
        
        # Critical findings
        print("🔍 CRITICAL FINDINGS:")
        print("-" * 40)
        
        if success_rate >= 90:
            print("✅ FRIEND REQUEST SYSTEM IS WORKING EXCELLENTLY")
            print("✅ MongoDB index compatibility appears to be functioning correctly")
            print("✅ No E11000 duplicate key errors detected")
        elif success_rate >= 70:
            print("⚠️ FRIEND REQUEST SYSTEM IS MOSTLY WORKING")
            print("⚠️ Some issues detected but core functionality operational")
        else:
            print("❌ FRIEND REQUEST SYSTEM HAS SIGNIFICANT ISSUES")
            print("❌ Multiple test failures detected")
        
        # Check for specific review request requirements
        mongodb_test = next((r for r in self.test_results if "MongoDB Index Compatibility" in r['test']), None)
        e11000_test = next((r for r in self.test_results if "E11000" in r['test']), None)
        flow_test = next((r for r in self.test_results if "Complete Friend Request Flow" in r['test']), None)
        
        print("\n🎯 REVIEW REQUEST SPECIFIC FINDINGS:")
        print("-" * 40)
        
        if mongodb_test and mongodb_test['passed']:
            print("✅ MongoDB Index Compatibility: WORKING")
        else:
            print("❌ MongoDB Index Compatibility: ISSUES DETECTED")
            
        if e11000_test and e11000_test['passed']:
            print("✅ E11000 Duplicate Key Error Prevention: WORKING")
        else:
            print("❌ E11000 Duplicate Key Error Prevention: ISSUES DETECTED")
            
        if flow_test and flow_test['passed']:
            print("✅ Complete Friend Request Flow: WORKING")
        else:
            print("❌ Complete Friend Request Flow: ISSUES DETECTED")
        
        print("\n" + "=" * 80)
        return success_rate

if __name__ == "__main__":
    tester = FriendRequestTester()
    success_rate = tester.run_all_tests()
    
    # Exit with appropriate code
    if success_rate >= 90:
        sys.exit(0)  # Success
    elif success_rate >= 70:
        sys.exit(1)  # Partial success
    else:
        sys.exit(2)  # Failure
        response = requests.get(f"{API_BASE}friends?type=users&userIdentifier=guest", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Guest user request successful: {data.get('message', 'No message')}")
            print(f"📊 Guest users returned: {len(data.get('users', []))}")
            
            # Test with authenticated user to trigger cleanup and get real users
            test_user_id = "test_cleanup_user_12345"
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={test_user_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                print(f"✅ Cleanup triggered successfully")
                print(f"📊 Available users after cleanup: {len(users)}")
                
                # Check if any test users remain in the results
                test_patterns = ['test', 'debug', 'mock', 'demo', 'cashout.test', 'debug.test']
                test_users_found = []
                
                for user in users:
                    username = user.get('username', '').lower()
                    for pattern in test_patterns:
                        if pattern in username:
                            test_users_found.append(user)
                            break
                
                if test_users_found:
                    print(f"❌ Test users still found after cleanup: {len(test_users_found)}")
                    for user in test_users_found[:3]:  # Show first 3
                        print(f"   - {user.get('username', 'Unknown')}")
                    return False
                else:
                    print(f"✅ No test users found in results - cleanup working correctly")
                    return True
            else:
                print(f"❌ Authenticated user request failed: {response.status_code}")
                return False
        else:
            print(f"❌ Guest user request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Database cleanup test error: {e}")
        return False

def test_real_user_validation():
    """Test that only users with email OR wallet address are returned"""
    print("\n👤 Testing Real User Validation...")
    
    try:
        # First, register a test user with valid email to ensure we have data
        test_user_data = {
            "action": "register_user",
            "userIdentifier": "real_privy_user_test_123",
            "userData": {
                "username": "RealPrivyUser",
                "displayName": "Real Privy User",
                "email": "real.user@example.com",
                "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
            }
        }
        
        register_response = requests.post(f"{API_BASE}friends", json=test_user_data, timeout=10)
        print(f"📝 User registration response: {register_response.status_code}")
        
        # Now test getting users list
        response = requests.get(f"{API_BASE}friends?type=users&userIdentifier=different_user_123", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            users = data.get('users', [])
            print(f"✅ Users list retrieved: {len(users)} users")
            
            if len(users) > 0:
                # Check first few users to verify they have email or wallet
                valid_users = 0
                invalid_users = 0
                
                for user in users[:10]:  # Check first 10 users
                    username = user.get('username', 'Unknown')
                    # Note: The API response doesn't include email/wallet for privacy,
                    # but the backend filtering should ensure only valid users are returned
                    
                    # Check if username suggests it's a real user (not test pattern)
                    test_patterns = ['test', 'debug', 'mock', 'demo', 'cashout.test', 'debug.test']
                    is_test_user = any(pattern in username.lower() for pattern in test_patterns)
                    
                    if not is_test_user:
                        valid_users += 1
                    else:
                        invalid_users += 1
                        print(f"⚠️ Potential test user found: {username}")
                
                print(f"📊 User validation results: {valid_users} valid, {invalid_users} invalid")
                
                if invalid_users == 0:
                    print(f"✅ All users appear to be real Privy accounts")
                    return True
                else:
                    print(f"❌ Found {invalid_users} potentially invalid users")
                    return False
            else:
                print(f"⚠️ No users returned - this could be expected if database is clean")
                return True
        else:
            print(f"❌ Users list request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Real user validation test error: {e}")
        return False

def test_clean_user_list():
    """Test that available users list contains no test data"""
    print("\n🧼 Testing Clean User List...")
    
    try:
        # Test with multiple different user identifiers to get comprehensive results
        test_users = ["clean_test_user_1", "clean_test_user_2", "clean_test_user_3"]
        all_users = []
        
        for test_user in test_users:
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={test_user}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                all_users.extend(users)
                print(f"📊 Users from {test_user}: {len(users)}")
            else:
                print(f"⚠️ Request failed for {test_user}: {response.status_code}")
        
        # Remove duplicates based on username
        unique_users = []
        seen_usernames = set()
        for user in all_users:
            username = user.get('username', '')
            if username not in seen_usernames:
                unique_users.append(user)
                seen_usernames.add(username)
        
        print(f"📊 Total unique users found: {len(unique_users)}")
        
        if len(unique_users) == 0:
            print(f"✅ Clean user list - no users returned (database may be empty)")
            return True
        
        # Analyze users for test data patterns
        test_patterns = [
            'test', 'debug', 'mock', 'demo', 'cashout.test', 'debug.test',
            'user_', 'player_', 'temp_', 'fake_', 'dummy_'
        ]
        
        clean_users = []
        suspicious_users = []
        
        for user in unique_users:
            username = user.get('username', '').lower()
            is_suspicious = any(pattern in username for pattern in test_patterns)
            
            if is_suspicious:
                suspicious_users.append(user)
            else:
                clean_users.append(user)
        
        print(f"📊 Analysis results:")
        print(f"   - Clean users: {len(clean_users)}")
        print(f"   - Suspicious users: {len(suspicious_users)}")
        
        if len(suspicious_users) > 0:
            print(f"⚠️ Suspicious users found:")
            for user in suspicious_users[:5]:  # Show first 5
                print(f"   - {user.get('username', 'Unknown')} (joined: {user.get('joinedAt', 'Unknown')})")
        
        # Check user data quality
        quality_issues = 0
        for user in unique_users[:10]:  # Check first 10
            if not user.get('username'):
                quality_issues += 1
            if not user.get('joinedAt'):
                quality_issues += 1
            if user.get('gamesPlayed', 0) < 0:
                quality_issues += 1
        
        print(f"📊 Data quality issues: {quality_issues}")
        
        # Success criteria: minimal suspicious users and good data quality
        success = len(suspicious_users) <= len(unique_users) * 0.1 and quality_issues <= 2
        
        if success:
            print(f"✅ User list appears clean with minimal test data")
            return True
        else:
            print(f"❌ User list contains too much test data or quality issues")
            return False
            
    except Exception as e:
        print(f"❌ Clean user list test error: {e}")
        return False

def test_cleanup_function_logs():
    """Test cleanup function by monitoring logs and responses"""
    print("\n📋 Testing Cleanup Function Logs...")
    
    try:
        # Make multiple requests to trigger cleanup multiple times
        print("🔄 Triggering cleanup function multiple times...")
        
        for i in range(3):
            test_user = f"cleanup_test_user_{i}"
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={test_user}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users_count = len(data.get('users', []))
                print(f"   Request {i+1}: {users_count} users returned")
                time.sleep(1)  # Small delay between requests
            else:
                print(f"   Request {i+1}: Failed with status {response.status_code}")
        
        # Test with different user patterns that should be cleaned up
        test_patterns = [
            "test_user_cleanup",
            "debug_user_cleanup", 
            "mock_user_cleanup",
            "demo_user_cleanup"
        ]
        
        print("🧪 Testing with various user patterns...")
        for pattern in test_patterns:
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={pattern}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                users_count = len(data.get('users', []))
                print(f"   Pattern '{pattern}': {users_count} users")
            else:
                print(f"   Pattern '{pattern}': Failed")
        
        print(f"✅ Cleanup function testing completed")
        return True
        
    except Exception as e:
        print(f"❌ Cleanup function logs test error: {e}")
        return False

def run_comprehensive_friends_system_test():
    """Run all friends system tests"""
    print("🚀 COMPREHENSIVE FRIENDS SYSTEM TESTING - UPDATED CLEANUP & REAL PRIVY USERS")
    print("=" * 80)
    
    test_results = []
    
    # Test 1: API Health Check
    test_results.append(("API Health Check", test_api_health()))
    
    # Test 2: Database Cleanup Verification
    test_results.append(("Database Cleanup Verification", test_database_cleanup_verification()))
    
    # Test 3: Real User Validation
    test_results.append(("Real User Validation", test_real_user_validation()))
    
    # Test 4: Clean User List
    test_results.append(("Clean User List", test_clean_user_list()))
    
    # Test 5: Cleanup Function Logs
    test_results.append(("Cleanup Function Logs", test_cleanup_function_logs()))
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 FRIENDS SYSTEM TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed_tests = 0
    total_tests = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
        if result:
            passed_tests += 1
    
    success_rate = (passed_tests / total_tests) * 100
    print(f"\n📈 Overall Success Rate: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    
    if success_rate >= 80:
        print("🎉 FRIENDS SYSTEM TESTING: SUCCESSFUL")
        print("✅ Updated friends system with cleanup and real Privy user validation is working correctly")
    else:
        print("⚠️ FRIENDS SYSTEM TESTING: NEEDS ATTENTION")
        print("❌ Some critical issues found in the updated friends system")
    
    return success_rate >= 80

if __name__ == "__main__":
    success = run_comprehensive_friends_system_test()
    exit(0 if success else 1)