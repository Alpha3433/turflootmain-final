#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Friend Request Notifications System
Testing the complete notification workflow from friend request → notification → acceptance/decline → friends list update
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class FriendRequestNotificationTester:
    def __init__(self):
        self.test_results = []
        self.test_users = {}
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s" if response_time > 0 else "N/A",
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_time > 0:
            print(f"    Response Time: {response_time:.3f}s")
        print()

    def create_test_users(self):
        """Create realistic test users for friend request testing"""
        print("🔧 SETTING UP TEST USERS")
        print("=" * 50)
        
        users = [
            {"id": "user_alice_2024", "name": "AliceGamer"},
            {"id": "user_bob_2024", "name": "BobWarrior"},
            {"id": "user_charlie_2024", "name": "CharlieHunter"},
            {"id": "user_diana_2024", "name": "DianaPhoenix"}
        ]
        
        for user in users:
            try:
                # Create user profile via update endpoint
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json={
                        "userId": user["id"],
                        "customName": user["name"],
                        "privyId": user["id"],
                        "email": None
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    self.test_users[user["id"]] = user["name"]
                    self.log_test(
                        f"Create Test User: {user['name']}",
                        True,
                        f"User created with ID: {user['id']}",
                        response_time
                    )
                else:
                    self.log_test(
                        f"Create Test User: {user['name']}",
                        False,
                        f"Failed with status {response.status_code}: {response.text}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Create Test User: {user['name']}",
                    False,
                    f"Exception: {str(e)}"
                )

    def test_friend_request_workflow(self):
        """Test complete friend request notification workflow"""
        print("🎯 TESTING FRIEND REQUEST NOTIFICATION WORKFLOW")
        print("=" * 60)
        
        if len(self.test_users) < 2:
            self.log_test("Friend Request Workflow", False, "Insufficient test users created")
            return
            
        user_ids = list(self.test_users.keys())
        alice_id = user_ids[0]
        bob_id = user_ids[1]
        alice_name = self.test_users[alice_id]
        bob_name = self.test_users[bob_id]
        
        print(f"Testing workflow: {alice_name} → {bob_name}")
        
        # Step 1: Alice sends friend request to Bob
        self.test_send_friend_request(alice_id, bob_id, alice_name, bob_name)
        
        # Step 2: Check Bob's notification count (should be > 0)
        self.test_notification_count(bob_id, expected_min=1)
        
        # Step 3: Bob fetches pending requests
        pending_requests = self.test_fetch_pending_requests(bob_id)
        
        # Step 4: Bob accepts the request
        if pending_requests:
            request_id = pending_requests[0].get('id')
            if request_id:
                self.test_accept_friend_request(request_id, bob_id)
                
                # Step 5: Verify notification count decreases
                self.test_notification_count(bob_id, expected_max=0)
                
                # Step 6: Verify friends lists are updated
                self.test_friends_list_update(alice_id, bob_id, alice_name, bob_name)

    def test_send_friend_request(self, from_user_id, to_user_id, from_name, to_name):
        """Test sending friend request (should create pending status)"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/send-request",
                json={
                    "fromUserId": from_user_id,
                    "toUserId": to_user_id,
                    "fromUserName": from_name,
                    "toUserName": to_name
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'requestId' in data:
                    # Store request ID for later use
                    self.last_request_id = data['requestId']
                    status = data.get('status', 'unknown')
                    self.log_test(
                        "Send Friend Request",
                        True,
                        f"Request sent successfully. Status: {status}, ID: {data['requestId']}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Send Friend Request",
                        False,
                        f"Invalid response structure: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Send Friend Request",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Send Friend Request", False, f"Exception: {str(e)}")

    def test_notification_count(self, user_id, expected_min=None, expected_max=None):
        """Test notification count endpoint"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/notifications/count",
                json={"userId": user_id},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'count' in data:
                    count = data['count']
                    success = True
                    details = f"Notification count: {count}"
                    
                    # Check expectations
                    if expected_min is not None and count < expected_min:
                        success = False
                        details += f" (Expected >= {expected_min})"
                    elif expected_max is not None and count > expected_max:
                        success = False
                        details += f" (Expected <= {expected_max})"
                    
                    self.log_test(
                        "Notification Count Check",
                        success,
                        details,
                        response_time
                    )
                    return count
                else:
                    self.log_test(
                        "Notification Count Check",
                        False,
                        f"Invalid response structure: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Notification Count Check",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Notification Count Check", False, f"Exception: {str(e)}")
        
        return 0

    def test_fetch_pending_requests(self, user_id):
        """Test fetching pending friend requests"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/requests/pending",
                json={"userId": user_id},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'requests' in data:
                    requests_list = data['requests']
                    count = len(requests_list)
                    self.log_test(
                        "Fetch Pending Requests",
                        True,
                        f"Retrieved {count} pending requests",
                        response_time
                    )
                    
                    # Log details of each request
                    for i, req in enumerate(requests_list):
                        print(f"    Request {i+1}: ID={req.get('id', 'N/A')}, From={req.get('fromUserName', 'N/A')}, Status={req.get('status', 'N/A')}")
                    
                    return requests_list
                else:
                    self.log_test(
                        "Fetch Pending Requests",
                        False,
                        f"Invalid response structure: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Fetch Pending Requests",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Fetch Pending Requests", False, f"Exception: {str(e)}")
        
        return []

    def test_accept_friend_request(self, request_id, user_id):
        """Test accepting a friend request"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/accept-request",
                json={
                    "requestId": request_id,
                    "userId": user_id
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Accept Friend Request",
                        True,
                        f"Request {request_id} accepted successfully",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Accept Friend Request",
                        False,
                        f"Request not successful: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Accept Friend Request",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Accept Friend Request", False, f"Exception: {str(e)}")
        
        return False

    def test_decline_friend_request(self, request_id, user_id):
        """Test declining a friend request"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/decline-request",
                json={
                    "requestId": request_id,
                    "userId": user_id
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Decline Friend Request",
                        True,
                        f"Request {request_id} declined successfully",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Decline Friend Request",
                        False,
                        f"Request not successful: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Decline Friend Request",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Decline Friend Request", False, f"Exception: {str(e)}")
        
        return False

    def test_mark_notifications_read(self, user_id):
        """Test marking notifications as read"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/notifications/mark-read",
                json={"userId": user_id},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    marked_count = data.get('markedCount', 0)
                    self.log_test(
                        "Mark Notifications Read",
                        True,
                        f"Marked {marked_count} notifications as read",
                        response_time
                    )
                    return marked_count
                else:
                    self.log_test(
                        "Mark Notifications Read",
                        False,
                        f"Request not successful: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Mark Notifications Read",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Mark Notifications Read", False, f"Exception: {str(e)}")
        
        return 0

    def test_friends_list_update(self, user1_id, user2_id, user1_name, user2_name):
        """Test that friends lists are properly updated after acceptance"""
        # Test User 1's friends list
        self.test_friends_list(user1_id, user1_name, expected_friend=user2_name)
        
        # Test User 2's friends list  
        self.test_friends_list(user2_id, user2_name, expected_friend=user1_name)

    def test_friends_list(self, user_id, user_name, expected_friend=None):
        """Test friends list retrieval"""
        try:
            start_time = time.time()
            response = requests.get(
                f"{API_BASE}/friends/list?userId={user_id}",
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'friends' in data:
                    friends = data['friends']
                    friend_names = [f.get('username', 'Unknown') for f in friends]
                    
                    success = True
                    details = f"{user_name} has {len(friends)} friends: {friend_names}"
                    
                    if expected_friend and expected_friend not in friend_names:
                        success = False
                        details += f" (Expected to find {expected_friend})"
                    
                    self.log_test(
                        f"Friends List Check ({user_name})",
                        success,
                        details,
                        response_time
                    )
                else:
                    self.log_test(
                        f"Friends List Check ({user_name})",
                        False,
                        f"Invalid response structure: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    f"Friends List Check ({user_name})",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(f"Friends List Check ({user_name})", False, f"Exception: {str(e)}")

    def test_decline_workflow(self):
        """Test the decline workflow with different users"""
        print("🚫 TESTING FRIEND REQUEST DECLINE WORKFLOW")
        print("=" * 50)
        
        if len(self.test_users) < 3:
            self.log_test("Decline Workflow", False, "Insufficient test users for decline testing")
            return
            
        user_ids = list(self.test_users.keys())
        charlie_id = user_ids[2]
        diana_id = user_ids[3] if len(user_ids) > 3 else user_ids[1]
        charlie_name = self.test_users[charlie_id]
        diana_name = self.test_users[diana_id]
        
        print(f"Testing decline workflow: {charlie_name} → {diana_name}")
        
        # Charlie sends request to Diana
        self.test_send_friend_request(charlie_id, diana_id, charlie_name, diana_name)
        
        # Diana checks notifications
        self.test_notification_count(diana_id, expected_min=1)
        
        # Diana fetches pending requests
        pending_requests = self.test_fetch_pending_requests(diana_id)
        
        # Diana declines the request
        if pending_requests:
            request_id = pending_requests[0].get('id')
            if request_id:
                self.test_decline_friend_request(request_id, diana_id)
                
                # Verify they are not friends
                self.test_friends_list(charlie_id, charlie_name)
                self.test_friends_list(diana_id, diana_name)

    def test_security_and_validation(self):
        """Test security measures and input validation"""
        print("🔒 TESTING SECURITY AND VALIDATION")
        print("=" * 40)
        
        if not self.test_users:
            self.log_test("Security Testing", False, "No test users available")
            return
            
        user_id = list(self.test_users.keys())[0]
        
        # Test self-addition prevention
        self.test_self_addition_prevention(user_id)
        
        # Test duplicate request prevention
        self.test_duplicate_prevention()
        
        # Test invalid request IDs
        self.test_invalid_request_handling(user_id)
        
        # Test missing parameters
        self.test_missing_parameters()

    def test_self_addition_prevention(self, user_id):
        """Test that users cannot add themselves as friends"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/send-request",
                json={
                    "fromUserId": user_id,
                    "toUserId": user_id,
                    "fromUserName": "TestUser",
                    "toUserName": "TestUser"
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            # Should return 400 error
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'yourself' in data['error'].lower():
                    self.log_test(
                        "Self-Addition Prevention",
                        True,
                        "Correctly prevented self-addition",
                        response_time
                    )
                else:
                    self.log_test(
                        "Self-Addition Prevention",
                        False,
                        f"Wrong error message: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "Self-Addition Prevention",
                    False,
                    f"Expected 400 error, got {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Self-Addition Prevention", False, f"Exception: {str(e)}")

    def test_duplicate_prevention(self):
        """Test duplicate request prevention"""
        if len(self.test_users) < 2:
            self.log_test("Duplicate Prevention", False, "Insufficient users")
            return
            
        user_ids = list(self.test_users.keys())
        user1_id = user_ids[0]
        user2_id = user_ids[1]
        
        # Send the same request twice
        for attempt in [1, 2]:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/friends/send-request",
                    json={
                        "fromUserId": user1_id,
                        "toUserId": user2_id,
                        "fromUserName": "User1",
                        "toUserName": "User2"
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if attempt == 1:
                    # First request should succeed
                    success = response.status_code == 200
                    details = "First request" + (" succeeded" if success else f" failed: {response.text}")
                else:
                    # Second request should fail with 400
                    success = response.status_code == 400
                    details = "Duplicate request" + (" correctly rejected" if success else f" incorrectly allowed: {response.text}")
                
                self.log_test(
                    f"Duplicate Prevention (Attempt {attempt})",
                    success,
                    details,
                    response_time
                )
                
            except Exception as e:
                self.log_test(f"Duplicate Prevention (Attempt {attempt})", False, f"Exception: {str(e)}")

    def test_invalid_request_handling(self, user_id):
        """Test handling of invalid request IDs"""
        fake_request_id = str(uuid.uuid4())
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/friends/accept-request",
                json={
                    "requestId": fake_request_id,
                    "userId": user_id
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            # Should return 404 error
            if response.status_code == 404:
                self.log_test(
                    "Invalid Request ID Handling",
                    True,
                    "Correctly handled invalid request ID",
                    response_time
                )
            else:
                self.log_test(
                    "Invalid Request ID Handling",
                    False,
                    f"Expected 404 error, got {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test("Invalid Request ID Handling", False, f"Exception: {str(e)}")

    def test_missing_parameters(self):
        """Test handling of missing required parameters"""
        endpoints = [
            ("friends/send-request", {}),
            ("friends/accept-request", {}),
            ("friends/decline-request", {}),
            ("friends/requests/pending", {}),
            ("friends/notifications/count", {}),
            ("friends/notifications/mark-read", {})
        ]
        
        for endpoint, payload in endpoints:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/{endpoint}",
                    json=payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                # Should return 400 error for missing parameters
                if response.status_code == 400:
                    self.log_test(
                        f"Missing Parameters ({endpoint})",
                        True,
                        "Correctly validated required parameters",
                        response_time
                    )
                else:
                    self.log_test(
                        f"Missing Parameters ({endpoint})",
                        False,
                        f"Expected 400 error, got {response.status_code}: {response.text}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(f"Missing Parameters ({endpoint})", False, f"Exception: {str(e)}")

    def run_comprehensive_tests(self):
        """Run all friend request notification tests"""
        print("🚀 STARTING COMPREHENSIVE FRIEND REQUEST NOTIFICATIONS TESTING")
        print("=" * 70)
        print(f"Base URL: {BASE_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        print()
        
        # Setup phase
        self.create_test_users()
        
        # Core workflow testing
        self.test_friend_request_workflow()
        
        # Decline workflow testing
        self.test_decline_workflow()
        
        # Security and validation testing
        self.test_security_and_validation()
        
        # Mark notifications as read test
        if self.test_users:
            user_id = list(self.test_users.keys())[0]
            self.test_mark_notifications_read(user_id)
        
        # Generate summary
        self.generate_summary()

    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 70)
        print("📊 FRIEND REQUEST NOTIFICATIONS TESTING SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Group results by category
        categories = {}
        for result in self.test_results:
            test_name = result['test']
            if 'User' in test_name:
                category = "User Setup"
            elif 'Send' in test_name or 'Accept' in test_name or 'Decline' in test_name:
                category = "Request Management"
            elif 'Notification' in test_name or 'Pending' in test_name or 'Mark' in test_name:
                category = "Notification System"
            elif 'Friends List' in test_name:
                category = "Friends List Integration"
            elif 'Security' in test_name or 'Prevention' in test_name or 'Invalid' in test_name or 'Missing' in test_name:
                category = "Security & Validation"
            else:
                category = "Other"
                
            if category not in categories:
                categories[category] = []
            categories[category].append(result)
        
        # Print results by category
        for category, results in categories.items():
            print(f"\n📋 {category.upper()}")
            print("-" * 40)
            category_passed = sum(1 for r in results if r['success'])
            category_total = len(results)
            category_rate = (category_passed / category_total * 100) if category_total > 0 else 0
            print(f"Category Success Rate: {category_rate:.1f}% ({category_passed}/{category_total})")
            
            for result in results:
                print(f"{result['status']} {result['test']}")
                if result['details']:
                    print(f"    {result['details']}")
        
        # Critical findings
        print(f"\n🔍 CRITICAL FINDINGS")
        print("-" * 30)
        
        failed_results = [r for r in self.test_results if not r['success']]
        if failed_results:
            print("❌ FAILED TESTS:")
            for result in failed_results:
                print(f"  • {result['test']}: {result['details']}")
        else:
            print("✅ ALL TESTS PASSED - Friend Request Notifications system is fully operational!")
        
        print(f"\n🕒 Test Completed: {datetime.now().isoformat()}")
        print("=" * 70)

if __name__ == "__main__":
    tester = FriendRequestNotificationTester()
    tester.run_comprehensive_tests()