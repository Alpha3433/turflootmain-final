#!/usr/bin/env python3
"""
Friends System Backend Testing
Testing the updated friends system backend endpoints for:
1. User-Specific Friend Lists
2. Self-Addition Prevention  
3. Friendship Isolation
4. Duplicate Prevention
5. Data Integrity
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"  # Using localhost as per instructions
API_BASE = f"{BASE_URL}/api"

# Test users for isolation testing
TEST_USERS = {
    "user1": {
        "userId": "testUser1",
        "userName": "TestUser1"
    },
    "user2": {
        "userId": "testUser2", 
        "userName": "TestUser2"
    },
    "user3": {
        "userId": "testUser3",
        "userName": "TestUser3"
    }
}

class FriendsSystemTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details=""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = f"{status} - {test_name}"
        if details:
            result += f" | {details}"
            
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        try:
            url = f"{API_BASE}/{endpoint}"
            
            if method.upper() == 'GET':
                response = requests.get(url, params=params, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None
            
    def test_user_specific_friend_lists(self):
        """Test 1: User-Specific Friend Lists - Verify friends lists are isolated per user"""
        print("\n🔍 TEST 1: USER-SPECIFIC FRIEND LISTS")
        
        # Test getting friend list for user1 (should be empty initially)
        response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user1']['userId']})
        
        if response and response.status_code == 200:
            data = response.json()
            friends_count = len(data.get('friends', []))
            self.log_test(
                "Get User1 Friend List", 
                True,
                f"Retrieved {friends_count} friends for user1"
            )
        else:
            self.log_test(
                "Get User1 Friend List", 
                False, 
                f"Failed to get friend list - Status: {response.status_code if response else 'No response'}"
            )
            
        # Test getting friend list for user2 (should be empty initially)  
        response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user2']['userId']})
        
        if response and response.status_code == 200:
            data = response.json()
            friends_count = len(data.get('friends', []))
            self.log_test(
                "Get User2 Friend List", 
                True,
                f"Retrieved {friends_count} friends for user2"
            )
        else:
            self.log_test(
                "Get User2 Friend List", 
                False,
                f"Failed to get friend list - Status: {response.status_code if response else 'No response'}"
            )
            
        # Test without userId parameter (should return empty list)
        response = self.make_request('GET', 'friends/list')
        
        if response and response.status_code == 200:
            data = response.json()
            friends_count = len(data.get('friends', []))
            self.log_test(
                "Get Friend List Without UserId", 
                friends_count == 0,
                f"Returned {friends_count} friends (should be 0)"
            )
        else:
            self.log_test(
                "Get Friend List Without UserId", 
                False,
                f"Failed to get friend list - Status: {response.status_code if response else 'No response'}"
            )
            
    def test_self_addition_prevention(self):
        """Test 2: Self-Addition Prevention - Ensure users cannot add themselves as friends"""
        print("\n🔍 TEST 2: SELF-ADDITION PREVENTION")
        
        # Try to send friend request to self
        request_data = {
            'fromUserId': TEST_USERS['user1']['userId'],
            'toUserId': TEST_USERS['user1']['userId'],  # Same user
            'fromUserName': TEST_USERS['user1']['userName'],
            'toUserName': TEST_USERS['user1']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data)
        
        if response and response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', '')
            self.log_test(
                "Self-Addition Prevention", 
                'Cannot add yourself' in error_msg or 'send friend requests to themselves' in error_msg,
                f"Correctly rejected self-addition: {error_msg}"
            )
        else:
            self.log_test(
                "Self-Addition Prevention", 
                False,
                f"Should have returned 400 error - Status: {response.status_code if response else 'No response'}"
            )
            
    def test_friendship_isolation(self):
        """Test 3: Friendship Isolation - Test friend requests between different users"""
        print("\n🔍 TEST 3: FRIENDSHIP ISOLATION")
        
        # Send friend request from user1 to user2
        request_data = {
            'fromUserId': TEST_USERS['user1']['userId'],
            'toUserId': TEST_USERS['user2']['userId'],
            'fromUserName': TEST_USERS['user1']['userName'],
            'toUserName': TEST_USERS['user2']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test(
                "Send Friend Request User1->User2", 
                data.get('success', False),
                f"Request sent successfully: {data.get('message', '')}"
            )
            
            # Wait a moment for database update
            time.sleep(0.5)
            
            # Check user1's friend list (should now include user2)
            response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user1']['userId']})
            
            if response and response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                user2_in_list = any(friend.get('id') == TEST_USERS['user2']['userId'] for friend in friends)
                self.log_test(
                    "User1 Friend List Contains User2", 
                    user2_in_list,
                    f"User1 has {len(friends)} friends, User2 in list: {user2_in_list}"
                )
            else:
                self.log_test(
                    "User1 Friend List Contains User2", 
                    False,
                    "Failed to retrieve User1's friend list"
                )
                
            # Check user2's friend list (should now include user1)
            response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user2']['userId']})
            
            if response and response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                user1_in_list = any(friend.get('id') == TEST_USERS['user1']['userId'] for friend in friends)
                self.log_test(
                    "User2 Friend List Contains User1", 
                    user1_in_list,
                    f"User2 has {len(friends)} friends, User1 in list: {user1_in_list}"
                )
            else:
                self.log_test(
                    "User2 Friend List Contains User1", 
                    False,
                    "Failed to retrieve User2's friend list"
                )
                
            # Check user3's friend list (should be empty - no connection to user1/user2)
            response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user3']['userId']})
            
            if response and response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                self.log_test(
                    "User3 Friend List Isolation", 
                    len(friends) == 0,
                    f"User3 has {len(friends)} friends (should be 0 - isolated from user1/user2 friendship)"
                )
            else:
                self.log_test(
                    "User3 Friend List Isolation", 
                    False,
                    "Failed to retrieve User3's friend list"
                )
        else:
            self.log_test(
                "Send Friend Request User1->User2", 
                False,
                f"Failed to send friend request - Status: {response.status_code if response else 'No response'}"
            )
            
    def test_duplicate_prevention(self):
        """Test 4: Duplicate Prevention - Test sending multiple friend requests between same users"""
        print("\n🔍 TEST 4: DUPLICATE PREVENTION")
        
        # Try to send the same friend request again (user1 -> user2)
        request_data = {
            'fromUserId': TEST_USERS['user1']['userId'],
            'toUserId': TEST_USERS['user2']['userId'],
            'fromUserName': TEST_USERS['user1']['userName'],
            'toUserName': TEST_USERS['user2']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data)
        
        if response and response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', '')
            self.log_test(
                "Duplicate Request Prevention", 
                'already exists' in error_msg or 'already friends' in error_msg,
                f"Correctly rejected duplicate request: {error_msg}"
            )
        else:
            self.log_test(
                "Duplicate Request Prevention", 
                False,
                f"Should have returned 400 error for duplicate - Status: {response.status_code if response else 'No response'}"
            )
            
        # Try reverse direction (user2 -> user1) - should also be rejected
        request_data_reverse = {
            'fromUserId': TEST_USERS['user2']['userId'],
            'toUserId': TEST_USERS['user1']['userId'],
            'fromUserName': TEST_USERS['user2']['userName'],
            'toUserName': TEST_USERS['user1']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data_reverse)
        
        if response and response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', '')
            self.log_test(
                "Reverse Duplicate Prevention", 
                'already exists' in error_msg or 'already friends' in error_msg,
                f"Correctly rejected reverse duplicate: {error_msg}"
            )
        else:
            self.log_test(
                "Reverse Duplicate Prevention", 
                False,
                f"Should have returned 400 error for reverse duplicate - Status: {response.status_code if response else 'No response'}"
            )
            
    def test_data_integrity(self):
        """Test 5: Data Integrity - Verify friends data is properly isolated per user"""
        print("\n🔍 TEST 5: DATA INTEGRITY")
        
        # Create a new friendship between user2 and user3
        request_data = {
            'fromUserId': TEST_USERS['user2']['userId'],
            'toUserId': TEST_USERS['user3']['userId'],
            'fromUserName': TEST_USERS['user2']['userName'],
            'toUserName': TEST_USERS['user3']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data)
        
        if response and response.status_code == 200:
            self.log_test(
                "Create User2->User3 Friendship", 
                True,
                "Successfully created friendship between User2 and User3"
            )
            
            time.sleep(0.5)  # Wait for database update
            
            # Verify each user's friend list is correct and isolated
            
            # User1 should only have User2 as friend
            response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user1']['userId']})
            if response and response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                friend_ids = [friend.get('id') for friend in friends]
                
                has_user2 = TEST_USERS['user2']['userId'] in friend_ids
                has_user3 = TEST_USERS['user3']['userId'] in friend_ids
                
                self.log_test(
                    "User1 Data Integrity", 
                    has_user2 and not has_user3 and len(friends) == 1,
                    f"User1 friends: {friend_ids} (should only have User2)"
                )
            else:
                self.log_test("User1 Data Integrity", False, "Failed to get User1 friend list")
                
            # User2 should have both User1 and User3 as friends
            response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user2']['userId']})
            if response and response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                friend_ids = [friend.get('id') for friend in friends]
                
                has_user1 = TEST_USERS['user1']['userId'] in friend_ids
                has_user3 = TEST_USERS['user3']['userId'] in friend_ids
                
                self.log_test(
                    "User2 Data Integrity", 
                    has_user1 and has_user3 and len(friends) == 2,
                    f"User2 friends: {friend_ids} (should have User1 and User3)"
                )
            else:
                self.log_test("User2 Data Integrity", False, "Failed to get User2 friend list")
                
            # User3 should only have User2 as friend
            response = self.make_request('GET', 'friends/list', params={'userId': TEST_USERS['user3']['userId']})
            if response and response.status_code == 200:
                data = response.json()
                friends = data.get('friends', [])
                friend_ids = [friend.get('id') for friend in friends]
                
                has_user1 = TEST_USERS['user1']['userId'] in friend_ids
                has_user2 = TEST_USERS['user2']['userId'] in friend_ids
                
                self.log_test(
                    "User3 Data Integrity", 
                    not has_user1 and has_user2 and len(friends) == 1,
                    f"User3 friends: {friend_ids} (should only have User2)"
                )
            else:
                self.log_test("User3 Data Integrity", False, "Failed to get User3 friend list")
                
        else:
            self.log_test(
                "Create User2->User3 Friendship", 
                False,
                f"Failed to create friendship - Status: {response.status_code if response else 'No response'}"
            )
            
    def test_missing_parameters(self):
        """Test 6: Missing Parameters - Test error handling for missing required fields"""
        print("\n🔍 TEST 6: MISSING PARAMETERS")
        
        # Test send-request with missing fromUserId
        request_data = {
            'toUserId': TEST_USERS['user1']['userId'],
            'fromUserName': TEST_USERS['user1']['userName'],
            'toUserName': TEST_USERS['user2']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data)
        
        if response and response.status_code == 400:
            self.log_test(
                "Missing fromUserId Validation", 
                True,
                "Correctly rejected request with missing fromUserId"
            )
        else:
            self.log_test(
                "Missing fromUserId Validation", 
                False,
                f"Should have returned 400 error - Status: {response.status_code if response else 'No response'}"
            )
            
        # Test send-request with missing toUserId
        request_data = {
            'fromUserId': TEST_USERS['user1']['userId'],
            'fromUserName': TEST_USERS['user1']['userName'],
            'toUserName': TEST_USERS['user2']['userName']
        }
        
        response = self.make_request('POST', 'friends/send-request', data=request_data)
        
        if response and response.status_code == 400:
            self.log_test(
                "Missing toUserId Validation", 
                True,
                "Correctly rejected request with missing toUserId"
            )
        else:
            self.log_test(
                "Missing toUserId Validation", 
                False,
                f"Should have returned 400 error - Status: {response.status_code if response else 'No response'}"
            )
            
    def run_all_tests(self):
        """Run all friends system tests"""
        print("🚀 STARTING FRIENDS SYSTEM BACKEND TESTING")
        print(f"📍 Testing against: {API_BASE}")
        print(f"⏰ Started at: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # Run all test suites
        self.test_user_specific_friend_lists()
        self.test_self_addition_prevention()
        self.test_friendship_isolation()
        self.test_duplicate_prevention()
        self.test_data_integrity()
        self.test_missing_parameters()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 FRIENDS SYSTEM TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"✅ Tests Passed: {self.passed_tests}")
        print(f"❌ Tests Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}% ({self.passed_tests}/{self.total_tests})")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: Friends system is working correctly!")
        elif success_rate >= 75:
            print("✅ GOOD: Friends system is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️  MODERATE: Friends system has some significant issues")
        else:
            print("❌ CRITICAL: Friends system has major issues requiring attention")
            
        print(f"⏰ Completed at: {datetime.now().isoformat()}")
        
        return success_rate >= 75  # Return True if tests are mostly passing

if __name__ == "__main__":
    tester = FriendsSystemTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)