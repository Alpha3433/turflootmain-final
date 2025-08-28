#!/usr/bin/env python3
"""
TurfLoot Backend API Testing - Final Verification for 100% Success Rate
Testing Friends Authentication Workflow and Friend Request Notifications after API connectivity fix

REVIEW REQUEST VERIFICATION:
- Confirm 100% success rate achieved after API connectivity fix
- Test all authentication scenarios with localhost URLs
- Verify all 6 notification endpoints working properly
- Test enhanced validation with no connectivity errors
- Complete end-to-end testing of friends workflow

API CONNECTIVITY FIX APPLIED:
✅ Updated all FriendsPanel API calls to use localhost URLs instead of relative URLs
✅ Fixed searchUsers, fetchFriends, fetchOnlineFriends, fetchPendingRequests functions
✅ Fixed notification endpoints: count, accept-request, decline-request, mark-read
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Test Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class TurfLootAPITester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_time": f"{response_time:.3f}s",
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} - {test_name} ({response_time:.3f}s)")
        if details:
            print(f"    Details: {details}")
    
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{API_BASE}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            start_time = time.time()
            if method.upper() == 'GET':
                response = requests.get(url, params=params, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            return None, 0
    
    def test_friends_authentication_workflow(self):
        """Test Friends Authentication Workflow - Target: 100% Success Rate"""
        print("\n🔐 TESTING FRIENDS AUTHENTICATION WORKFLOW")
        print("=" * 60)
        
        # Test users for authentication workflow
        test_users = [
            {"id": "auth_user_1", "name": "AuthTestUser1"},
            {"id": "auth_user_2", "name": "AuthTestUser2"},
            {"id": "auth_user_3", "name": "AuthTestUser3"},
            {"id": "auth_user_4", "name": "AuthTestUser4"}
        ]
        
        # 1. Test User Profile Creation/Update (Authentication Foundation)
        for user in test_users:
            response, response_time = self.make_request(
                'POST', 
                'users/profile/update-name',
                {
                    "userId": user["id"],
                    "customName": user["name"],
                    "privyId": user["id"],
                    "email": f"{user['name'].lower()}@test.com"
                }
            )
            
            if response and response.status_code == 200:
                self.log_test(
                    f"User Profile Creation - {user['name']}", 
                    True, 
                    f"User created successfully with custom name", 
                    response_time
                )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    f"User Profile Creation - {user['name']}", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
        
        # 2. Test User Profile Retrieval (Authentication Verification)
        for user in test_users:
            response, response_time = self.make_request(
                'GET', 
                'users/profile',
                params={"userId": user["id"]}
            )
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("username") == user["name"]:
                    self.log_test(
                        f"User Profile Retrieval - {user['name']}", 
                        True, 
                        f"Profile retrieved correctly: {data.get('username')}", 
                        response_time
                    )
                else:
                    self.log_test(
                        f"User Profile Retrieval - {user['name']}", 
                        False, 
                        f"Name mismatch: expected {user['name']}, got {data.get('username')}", 
                        response_time
                    )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    f"User Profile Retrieval - {user['name']}", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
        
        # 3. Test User Search Functionality (Core Authentication Feature)
        response, response_time = self.make_request(
            'GET', 
            'users/search',
            params={"q": "AuthTest", "userId": test_users[0]["id"]}
        )
        
        if response and response.status_code == 200:
            data = response.json()
            users_found = len(data.get("users", []))
            self.log_test(
                "User Search Functionality", 
                True, 
                f"Found {users_found} users matching 'AuthTest'", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "User Search Functionality", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 4. Test Names Search Endpoint (Alternative Authentication Search)
        response, response_time = self.make_request(
            'GET', 
            'names/search',
            params={"q": "AuthTest", "userId": test_users[0]["id"]}
        )
        
        if response and response.status_code == 200:
            data = response.json()
            users_found = len(data.get("users", []))
            self.log_test(
                "Names Search Endpoint", 
                True, 
                f"Found {users_found} users via names search", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Names Search Endpoint", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 5. Test Authentication Edge Cases
        edge_cases = [
            {"case": "Empty User ID", "params": {"q": "test", "userId": ""}},
            {"case": "Invalid User ID", "params": {"q": "test", "userId": "invalid_user_12345"}},
            {"case": "Special Characters", "params": {"q": "test@#$", "userId": test_users[0]["id"]}},
            {"case": "Long User ID", "params": {"q": "test", "userId": "a" * 100}}
        ]
        
        for edge_case in edge_cases:
            response, response_time = self.make_request(
                'GET', 
                'users/search',
                params=edge_case["params"]
            )
            
            # Edge cases should either work or fail gracefully (not crash)
            if response and response.status_code in [200, 400, 404]:
                self.log_test(
                    f"Authentication Edge Case - {edge_case['case']}", 
                    True, 
                    f"Handled gracefully with status {response.status_code}", 
                    response_time
                )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    f"Authentication Edge Case - {edge_case['case']}", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
    
    def test_friend_request_notifications(self):
        """Test Friend Request Notifications - Target: 100% Success Rate"""
        print("\n🔔 TESTING FRIEND REQUEST NOTIFICATIONS")
        print("=" * 60)
        
        # Test users for notification workflow
        notification_users = [
            {"id": "notif_user_1", "name": "NotifUser1"},
            {"id": "notif_user_2", "name": "NotifUser2"},
            {"id": "notif_user_3", "name": "NotifUser3"},
            {"id": "notif_user_4", "name": "NotifUser4"}
        ]
        
        # 1. Setup Users for Notification Testing
        for user in notification_users:
            response, response_time = self.make_request(
                'POST', 
                'users/profile/update-name',
                {
                    "userId": user["id"],
                    "customName": user["name"],
                    "privyId": user["id"],
                    "email": f"{user['name'].lower()}@test.com"
                }
            )
            
            if response and response.status_code == 200:
                self.log_test(
                    f"Notification User Setup - {user['name']}", 
                    True, 
                    f"User ready for notification testing", 
                    response_time
                )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    f"Notification User Setup - {user['name']}", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
        
        # 2. Test Friend Request Sending (Notification Trigger)
        request_id = None
        response, response_time = self.make_request(
            'POST', 
            'friends/send-request',
            {
                "fromUserId": notification_users[0]["id"],
                "toUserId": notification_users[1]["id"],
                "fromUserName": notification_users[0]["name"],
                "toUserName": notification_users[1]["name"]
            }
        )
        
        if response and response.status_code == 200:
            data = response.json()
            request_id = data.get("requestId")
            self.log_test(
                "Friend Request Sending", 
                True, 
                f"Request sent successfully, ID: {request_id}", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Friend Request Sending", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 3. Test Notification Count Endpoint
        response, response_time = self.make_request(
            'POST', 
            'friends/notifications/count',
            {"userId": notification_users[1]["id"]}
        )
        
        if response and response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            self.log_test(
                "Notification Count Endpoint", 
                True, 
                f"Notification count: {count}", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Notification Count Endpoint", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 4. Test Pending Requests Retrieval
        response, response_time = self.make_request(
            'POST', 
            'friends/requests/pending',
            {"userId": notification_users[1]["id"]}
        )
        
        if response and response.status_code == 200:
            data = response.json()
            requests_count = len(data.get("requests", []))
            self.log_test(
                "Pending Requests Retrieval", 
                True, 
                f"Found {requests_count} pending requests", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Pending Requests Retrieval", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 5. Test Friend Request Acceptance
        if request_id:
            response, response_time = self.make_request(
                'POST', 
                'friends/accept-request',
                {
                    "requestId": request_id,
                    "userId": notification_users[1]["id"]
                }
            )
            
            if response and response.status_code == 200:
                self.log_test(
                    "Friend Request Acceptance", 
                    True, 
                    f"Request accepted successfully", 
                    response_time
                )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    "Friend Request Acceptance", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
        
        # 6. Test Friend Request Decline (New Request)
        decline_request_id = None
        response, response_time = self.make_request(
            'POST', 
            'friends/send-request',
            {
                "fromUserId": notification_users[2]["id"],
                "toUserId": notification_users[3]["id"],
                "fromUserName": notification_users[2]["name"],
                "toUserName": notification_users[3]["name"]
            }
        )
        
        if response and response.status_code == 200:
            data = response.json()
            decline_request_id = data.get("requestId")
            
            # Now decline it
            response, response_time = self.make_request(
                'POST', 
                'friends/decline-request',
                {
                    "requestId": decline_request_id,
                    "userId": notification_users[3]["id"]
                }
            )
            
            if response and response.status_code == 200:
                self.log_test(
                    "Friend Request Decline", 
                    True, 
                    f"Request declined successfully", 
                    response_time
                )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    "Friend Request Decline", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
        
        # 7. Test Mark Notifications as Read
        response, response_time = self.make_request(
            'POST', 
            'friends/notifications/mark-read',
            {"userId": notification_users[1]["id"]}
        )
        
        if response and response.status_code == 200:
            self.log_test(
                "Mark Notifications Read", 
                True, 
                f"Notifications marked as read", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Mark Notifications Read", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 8. Test Friends List After Acceptance
        response, response_time = self.make_request(
            'GET', 
            'friends/list',
            params={"userId": notification_users[0]["id"]}
        )
        
        if response and response.status_code == 200:
            data = response.json()
            friends_count = len(data.get("friends", []))
            self.log_test(
                "Friends List After Acceptance", 
                True, 
                f"User has {friends_count} friends", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Friends List After Acceptance", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 9. Test Online Friends Status
        response, response_time = self.make_request(
            'GET', 
            'friends/online-status',
            params={"userId": notification_users[0]["id"]}
        )
        
        if response and response.status_code == 200:
            data = response.json()
            online_count = len(data.get("onlineFriends", []))
            self.log_test(
                "Online Friends Status", 
                True, 
                f"Found {online_count} online friends", 
                response_time
            )
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_test(
                "Online Friends Status", 
                False, 
                f"Failed: {error_msg}", 
                response_time
            )
        
        # 10. Test Enhanced Validation (Security Features)
        validation_tests = [
            {
                "name": "Invalid Data Types - Integer User ID",
                "data": {"fromUserId": 123, "toUserId": "valid_user"},
                "expected_status": 400
            },
            {
                "name": "Invalid Data Types - Array User ID", 
                "data": {"fromUserId": ["user1"], "toUserId": "valid_user"},
                "expected_status": 400
            },
            {
                "name": "Invalid Data Types - Object User ID",
                "data": {"fromUserId": {"id": "user1"}, "toUserId": "valid_user"},
                "expected_status": 400
            },
            {
                "name": "Extra Fields Rejection",
                "data": {"fromUserId": "user1", "toUserId": "user2", "extraField": "should_be_rejected"},
                "expected_status": 400
            },
            {
                "name": "Empty String User IDs",
                "data": {"fromUserId": "", "toUserId": "valid_user"},
                "expected_status": 400
            }
        ]
        
        for validation_test in validation_tests:
            response, response_time = self.make_request(
                'POST', 
                'friends/send-request',
                validation_test["data"]
            )
            
            if response and response.status_code == validation_test["expected_status"]:
                self.log_test(
                    f"Enhanced Validation - {validation_test['name']}", 
                    True, 
                    f"Correctly rejected with status {response.status_code}", 
                    response_time
                )
            else:
                actual_status = response.status_code if response else "No response"
                self.log_test(
                    f"Enhanced Validation - {validation_test['name']}", 
                    False, 
                    f"Expected {validation_test['expected_status']}, got {actual_status}", 
                    response_time
                )
    
    def test_api_connectivity_fix_verification(self):
        """Test API Connectivity Fix - Verify localhost URLs work correctly"""
        print("\n🌐 TESTING API CONNECTIVITY FIX VERIFICATION")
        print("=" * 60)
        
        # Test core API endpoints that were fixed
        core_endpoints = [
            {"endpoint": "ping", "method": "GET", "description": "Ping endpoint"},
            {"endpoint": "", "method": "GET", "description": "Root API endpoint"},
            {"endpoint": "friends/list", "method": "GET", "params": {"userId": "test_user"}, "description": "Friends list endpoint"},
            {"endpoint": "friends/online-status", "method": "GET", "params": {"userId": "test_user"}, "description": "Online status endpoint"},
            {"endpoint": "users/search", "method": "GET", "params": {"q": "test", "userId": "test_user"}, "description": "User search endpoint"},
            {"endpoint": "names/search", "method": "GET", "params": {"q": "test", "userId": "test_user"}, "description": "Names search endpoint"}
        ]
        
        for endpoint_test in core_endpoints:
            if endpoint_test["method"] == "GET":
                response, response_time = self.make_request(
                    'GET', 
                    endpoint_test["endpoint"],
                    params=endpoint_test.get("params")
                )
            else:
                response, response_time = self.make_request(
                    'POST', 
                    endpoint_test["endpoint"],
                    endpoint_test.get("data", {})
                )
            
            if response and response.status_code == 200:
                self.log_test(
                    f"API Connectivity - {endpoint_test['description']}", 
                    True, 
                    f"Localhost URL working correctly", 
                    response_time
                )
            else:
                error_msg = response.text if response else "Connection failed"
                self.log_test(
                    f"API Connectivity - {endpoint_test['description']}", 
                    False, 
                    f"Failed: {error_msg}", 
                    response_time
                )
    
    def run_all_tests(self):
        """Run all tests and generate final report"""
        print("🚀 STARTING TURFLOOT BACKEND API TESTING")
        print("🎯 TARGET: 100% SUCCESS RATE FOR FRIENDS SYSTEM AFTER API CONNECTIVITY FIX")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run test suites
        self.test_api_connectivity_fix_verification()
        self.test_friends_authentication_workflow()
        self.test_friend_request_notifications()
        
        total_time = time.time() - start_time
        
        # Generate final report
        print("\n" + "=" * 80)
        print("📊 FINAL TEST RESULTS SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.passed_tests}")
        print(f"❌ FAILED: {self.failed_tests}")
        print(f"📊 TOTAL: {self.total_tests}")
        print(f"🎯 SUCCESS RATE: {success_rate:.1f}%")
        print(f"⏱️  TOTAL TIME: {total_time:.3f}s")
        
        # Detailed results
        print(f"\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            print(f"{result['status']} {result['test']} ({result['response_time']})")
            if result['details']:
                print(f"    {result['details']}")
        
        # Final assessment
        print(f"\n🎯 FINAL ASSESSMENT:")
        if success_rate >= 100:
            print("✅ TARGET ACHIEVED: 100% SUCCESS RATE CONFIRMED")
            print("✅ API CONNECTIVITY FIX SUCCESSFUL")
            print("✅ FRIENDS AUTHENTICATION WORKFLOW: OPERATIONAL")
            print("✅ FRIEND REQUEST NOTIFICATIONS: OPERATIONAL")
        elif success_rate >= 95:
            print("🟡 NEAR TARGET: 95%+ SUCCESS RATE ACHIEVED")
            print("🟡 MINOR ISSUES DETECTED - REVIEW FAILED TESTS")
        else:
            print("❌ TARGET NOT MET: SIGNIFICANT ISSUES DETECTED")
            print("❌ REQUIRES IMMEDIATE ATTENTION")
        
        return success_rate >= 95

if __name__ == "__main__":
    tester = TurfLootAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)