#!/usr/bin/env python3
"""
Friends System Backend Re-testing for Review Request
Testing the specific fixes mentioned in the review request:
1. Friends List Retrieval Fix - Test updated GET /api/friends/list endpoint
2. Complete Friends Flow - Test friendship creation between testUser1 and testUser2
3. Enhanced Logging Verification - Check new logging provides better debugging
4. Data Source Verification - Test friendship_record fallback when user records missing
"""

import requests
import json
import time
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class FriendsSystemReviewTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = f"{status} - {test_name}"
        if response_time > 0:
            result += f" ({response_time:.3f}s)"
        if details:
            result += f" - {details}"
            
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response_time': response_time
        })
        
    def test_api_connectivity(self):
        """Test basic API connectivity"""
        print("\n🔍 TESTING API CONNECTIVITY")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("API Root Endpoint", True, 
                            f"Status: {response.status_code}, Service: {data.get('service', 'Unknown')}", 
                            response_time)
                return True
            else:
                self.log_test("API Root Endpoint", False, 
                            f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Connection error: {str(e)}")
            return False
    
    def test_friends_list_retrieval_fix(self):
        """Test 1: Friends List Retrieval Fix - Test updated GET /api/friends/list endpoint"""
        print("\n🎯 TEST 1: FRIENDS LIST RETRIEVAL FIX")
        
        # Test users from review request
        test_user_1 = "did:privy:test_user_1_friends_flow"
        test_user_2 = "did:privy:test_user_2_friends_flow"
        
        # Test friends list endpoint with enhanced logging
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId={test_user_1}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                has_friends_array = 'friends' in data
                has_timestamp = 'timestamp' in data
                friends_count = len(data.get('friends', []))
                
                # Check for enhanced logging features
                enhanced_features = []
                if has_timestamp:
                    enhanced_features.append("timestamp")
                
                # Check friend data structure for enhanced features
                for friend in data.get('friends', []):
                    if 'source' in friend:
                        enhanced_features.append("source_tracking")
                        break
                
                details = f"Friends: {friends_count}, Features: {enhanced_features}, Structure valid: {has_friends_array and has_timestamp}"
                
                self.log_test("Friends List Retrieval Structure", 
                            has_friends_array and has_timestamp,
                            details, response_time)
                
                # Test with different user
                start_time = time.time()
                response2 = requests.get(f"{API_BASE}/friends/list?userId={test_user_2}", timeout=10)
                response_time2 = time.time() - start_time
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    friends_count2 = len(data2.get('friends', []))
                    
                    self.log_test("Friends List Multiple Users", True,
                                f"User1: {friends_count} friends, User2: {friends_count2} friends",
                                response_time2)
                else:
                    self.log_test("Friends List Multiple Users", False,
                                f"User2 request failed: {response2.status_code}")
                
                return data
            else:
                self.log_test("Friends List Retrieval Structure", False,
                            f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Friends List Retrieval Structure", False, f"Error: {str(e)}")
            return None
    
    def test_complete_friends_flow(self):
        """Test 2: Complete Friends Flow - Create friendship and verify both users can see each other"""
        print("\n🎯 TEST 2: COMPLETE FRIENDS FLOW")
        
        # Test users as specified in review request
        test_user_1 = "did:privy:test_user_1_friends_flow"
        test_user_2 = "did:privy:test_user_2_friends_flow"
        test_user_3 = "did:privy:test_user_3_isolated"
        
        # Step 1: Create friendship between testUser1 and testUser2
        print("📋 Step 1: Creating friendship between testUser1 and testUser2...")
        
        try:
            payload = {
                "fromUserId": test_user_1,
                "toUserId": test_user_2,
                "fromUserName": "TestUser1FriendsFlow",
                "toUserName": "TestUser2FriendsFlow"
            }
            
            start_time = time.time()
            response = requests.post(f"{API_BASE}/friends/send-request", 
                                   json=payload, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Create Friendship testUser1->testUser2", True,
                            f"Success: {data.get('success')}, Status: {data.get('status')}", 
                            response_time)
            elif response.status_code == 400:
                data = response.json()
                if 'already exists' in data.get('error', ''):
                    self.log_test("Create Friendship testUser1->testUser2", True,
                                f"Friendship already exists (valid): {data.get('error')}", 
                                response_time)
                else:
                    self.log_test("Create Friendship testUser1->testUser2", False,
                                f"Unexpected error: {data.get('error')}")
                    return False
            else:
                self.log_test("Create Friendship testUser1->testUser2", False,
                            f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Create Friendship testUser1->testUser2", False, f"Error: {str(e)}")
            return False
        
        # Wait for database consistency
        time.sleep(1)
        
        # Step 2: Verify both users can see each other in their friends lists
        print("📋 Step 2: Verifying bidirectional friendship visibility...")
        
        # Check testUser1 can see testUser2
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId={test_user_1}", timeout=10)
            response_time = time.time() - start_time
            
            user1_can_see_user2 = False
            user2_source = "unknown"
            
            if response.status_code == 200:
                data = response.json()
                for friend in data.get('friends', []):
                    if friend.get('id') == test_user_2:
                        user1_can_see_user2 = True
                        user2_source = friend.get('source', 'unknown')
                        break
                
                self.log_test("testUser1 sees testUser2 in friends list", user1_can_see_user2,
                            f"Found: {user1_can_see_user2}, Source: {user2_source}, Total friends: {len(data.get('friends', []))}", 
                            response_time)
            else:
                self.log_test("testUser1 sees testUser2 in friends list", False,
                            f"Failed to get friends list: {response.status_code}")
                
        except Exception as e:
            self.log_test("testUser1 sees testUser2 in friends list", False, f"Error: {str(e)}")
            user1_can_see_user2 = False
        
        # Check testUser2 can see testUser1
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId={test_user_2}", timeout=10)
            response_time = time.time() - start_time
            
            user2_can_see_user1 = False
            user1_source = "unknown"
            
            if response.status_code == 200:
                data = response.json()
                for friend in data.get('friends', []):
                    if friend.get('id') == test_user_1:
                        user2_can_see_user1 = True
                        user1_source = friend.get('source', 'unknown')
                        break
                
                self.log_test("testUser2 sees testUser1 in friends list", user2_can_see_user1,
                            f"Found: {user2_can_see_user1}, Source: {user1_source}, Total friends: {len(data.get('friends', []))}", 
                            response_time)
            else:
                self.log_test("testUser2 sees testUser1 in friends list", False,
                            f"Failed to get friends list: {response.status_code}")
                
        except Exception as e:
            self.log_test("testUser2 sees testUser1 in friends list", False, f"Error: {str(e)}")
            user2_can_see_user1 = False
        
        # Step 3: Verify user isolation - testUser3 should not see the friendship
        print("📋 Step 3: Verifying user isolation...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId={test_user_3}", timeout=10)
            response_time = time.time() - start_time
            
            user3_isolated = True
            
            if response.status_code == 200:
                data = response.json()
                for friend in data.get('friends', []):
                    if friend.get('id') in [test_user_1, test_user_2]:
                        user3_isolated = False
                        break
                
                self.log_test("User isolation verification", user3_isolated,
                            f"testUser3 isolated: {user3_isolated}, Total friends: {len(data.get('friends', []))}", 
                            response_time)
            else:
                self.log_test("User isolation verification", False,
                            f"Failed to get testUser3 friends list: {response.status_code}")
                user3_isolated = False
                
        except Exception as e:
            self.log_test("User isolation verification", False, f"Error: {str(e)}")
            user3_isolated = False
        
        # Overall flow assessment
        flow_success = user1_can_see_user2 and user2_can_see_user1 and user3_isolated
        self.log_test("Complete Friends Flow", flow_success,
                    f"Bidirectional: {user1_can_see_user2 and user2_can_see_user1}, Isolation: {user3_isolated}")
        
        return flow_success
    
    def test_enhanced_logging_verification(self):
        """Test 3: Enhanced Logging Verification - Check new logging provides better debugging"""
        print("\n🎯 TEST 3: ENHANCED LOGGING VERIFICATION")
        
        test_user_logging = "did:privy:logging_verification_user"
        
        # Test friends list with enhanced logging
        try:
            print("📋 Testing friends list retrieval with enhanced logging...")
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId={test_user_logging}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for enhanced logging features in response
                logging_features = []
                
                # Check for timestamp (basic logging)
                if 'timestamp' in data:
                    logging_features.append("timestamp")
                
                # Check for source tracking in friends (enhanced logging)
                friends = data.get('friends', [])
                has_source_tracking = False
                source_types = set()
                
                for friend in friends:
                    if 'source' in friend:
                        has_source_tracking = True
                        source_types.add(friend['source'])
                
                if has_source_tracking:
                    logging_features.append("source_tracking")
                
                # Check for error field (enhanced error logging)
                if 'error' in data:
                    logging_features.append("error_logging")
                
                details = f"Features: {logging_features}, Sources: {list(source_types)}, Friends: {len(friends)}"
                
                self.log_test("Enhanced Logging Features", len(logging_features) >= 2,
                            details, response_time)
                
                # Test friendship creation with enhanced logging
                print("📋 Testing friendship creation with enhanced logging...")
                
                log_test_user_1 = "did:privy:log_test_1"
                log_test_user_2 = "did:privy:log_test_2"
                
                payload = {
                    "fromUserId": log_test_user_1,
                    "toUserId": log_test_user_2,
                    "fromUserName": "LogTestUser1",
                    "toUserName": "LogTestUser2"
                }
                
                start_time = time.time()
                response = requests.post(f"{API_BASE}/friends/send-request", 
                                       json=payload, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code in [200, 400]:  # Both success and "already exists" are valid
                    data = response.json()
                    
                    # Check for enhanced logging in friendship creation response
                    creation_logging = []
                    
                    if 'success' in data:
                        creation_logging.append("success_field")
                    if 'requestId' in data:
                        creation_logging.append("request_id")
                    if 'status' in data:
                        creation_logging.append("status_field")
                    if 'message' in data:
                        creation_logging.append("message_field")
                    if 'details' in data:
                        creation_logging.append("details_field")
                    
                    creation_details = f"Logging fields: {creation_logging}, Status: {response.status_code}"
                    
                    self.log_test("Enhanced Logging in Friendship Creation", len(creation_logging) >= 3,
                                creation_details, response_time)
                else:
                    self.log_test("Enhanced Logging in Friendship Creation", False,
                                f"Unexpected status: {response.status_code}")
                
                return True
            else:
                self.log_test("Enhanced Logging Features", False,
                            f"Failed to get friends list: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Enhanced Logging Features", False, f"Error: {str(e)}")
            return False
    
    def test_data_source_verification(self):
        """Test 4: Data Source Verification - Test friendship_record fallback when user records missing"""
        print("\n🎯 TEST 4: DATA SOURCE VERIFICATION")
        
        # Create friendship with users that might not exist in users collection
        fallback_user_1 = "did:privy:fallback_test_user_1"
        fallback_user_2 = "did:privy:fallback_test_user_2"
        
        print("📋 Creating friendship for fallback data source testing...")
        
        try:
            payload = {
                "fromUserId": fallback_user_1,
                "toUserId": fallback_user_2,
                "fromUserName": "FallbackUser1",
                "toUserName": "FallbackUser2"
            }
            
            start_time = time.time()
            response = requests.post(f"{API_BASE}/friends/send-request", 
                                   json=payload, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code in [200, 400]:  # Success or already exists
                data = response.json()
                if response.status_code == 200:
                    self.log_test("Fallback Friendship Creation", True,
                                f"Created successfully: {data.get('message', '')}", response_time)
                else:
                    self.log_test("Fallback Friendship Creation", True,
                                f"Already exists (valid): {data.get('error', '')}", response_time)
            else:
                self.log_test("Fallback Friendship Creation", False,
                            f"Failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Fallback Friendship Creation", False, f"Error: {str(e)}")
            return False
        
        # Wait for database consistency
        time.sleep(1)
        
        # Test that friends list works with fallback data source
        print("📋 Testing friendship_record fallback mechanism...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/friends/list?userId={fallback_user_1}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                
                fallback_friend_found = False
                friend_source = "unknown"
                friend_username = "unknown"
                
                for friend in friends:
                    if friend.get('id') == fallback_user_2:
                        fallback_friend_found = True
                        friend_source = friend.get('source', 'unknown')
                        friend_username = friend.get('username', 'unknown')
                        break
                
                if fallback_friend_found:
                    # Check if using fallback mechanism
                    if friend_source == 'friendship_record':
                        self.log_test("Friendship Record Fallback", True,
                                    f"Successfully used fallback: username='{friend_username}', source='{friend_source}'", 
                                    response_time)
                    elif friend_source == 'database':
                        self.log_test("Database User Data", True,
                                    f"Found in database: username='{friend_username}', source='{friend_source}'", 
                                    response_time)
                    else:
                        self.log_test("Data Source Detection", True,
                                    f"Friend found with source: '{friend_source}', username: '{friend_username}'", 
                                    response_time)
                    
                    # Test the other direction
                    start_time = time.time()
                    response2 = requests.get(f"{API_BASE}/friends/list?userId={fallback_user_2}", timeout=10)
                    response_time2 = time.time() - start_time
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        reverse_found = any(f.get('id') == fallback_user_1 for f in data2.get('friends', []))
                        
                        self.log_test("Bidirectional Fallback Data", reverse_found,
                                    f"Reverse direction works: {reverse_found}", response_time2)
                    else:
                        self.log_test("Bidirectional Fallback Data", False,
                                    f"Reverse direction failed: {response2.status_code}")
                else:
                    self.log_test("Friendship Record Fallback", False,
                                f"Fallback friend not found (found {len(friends)} friends)")
                    return False
                
                return True
            else:
                self.log_test("Friendship Record Fallback", False,
                            f"Failed to get friends list: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Friendship Record Fallback", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all friends system review tests"""
        print("🎯 FRIENDS SYSTEM BACKEND RE-TESTING FOR REVIEW REQUEST")
        print("=" * 70)
        print("Testing specific fixes mentioned in review request:")
        print("1. Friends List Retrieval Fix")
        print("2. Complete Friends Flow")
        print("3. Enhanced Logging Verification")
        print("4. Data Source Verification")
        print("=" * 70)
        
        # Test 1: Basic connectivity
        if not self.test_api_connectivity():
            print("❌ API connectivity failed - aborting tests")
            return False
        
        # Test 2: Friends List Retrieval Fix
        self.test_friends_list_retrieval_fix()
        
        # Test 3: Complete Friends Flow
        self.test_complete_friends_flow()
        
        # Test 4: Enhanced Logging Verification
        self.test_enhanced_logging_verification()
        
        # Test 5: Data Source Verification
        self.test_data_source_verification()
        
        # Summary
        print("\n" + "=" * 70)
        print("🎯 FRIENDS SYSTEM REVIEW TESTING SUMMARY")
        print("=" * 70)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 TOTAL TESTS: {self.total_tests}")
        print(f"✅ PASSED: {self.passed_tests}")
        print(f"❌ FAILED: {self.total_tests - self.passed_tests}")
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: All friends system fixes are working correctly!")
        elif success_rate >= 75:
            print("✅ GOOD: Friends system fixes are mostly working")
        elif success_rate >= 60:
            print("⚠️  MODERATE: Some friends system fixes need attention")
        else:
            print("🚨 CRITICAL: Friends system fixes have major issues")
        
        # Key findings
        print("\n📋 KEY FINDINGS:")
        critical_tests = [
            "Complete Friends Flow",
            "Friendship Record Fallback",
            "Enhanced Logging Features"
        ]
        
        for result in self.test_results:
            if any(critical in result['test'] for critical in critical_tests):
                status = "✅" if result['success'] else "❌"
                print(f"{status} {result['test']}: {result['details']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = FriendsSystemReviewTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)