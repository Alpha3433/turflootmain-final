#!/usr/bin/env python3
"""
DIAGNOSTIC TESTING: Identify and fix failing tests to achieve 100% success rate

This script performs comprehensive diagnostic testing to identify the specific failing tests in:
1. Friends Authentication Workflow (Currently 93.3% - 28/30 tests passed) - need to find 2 failing tests
2. Friend Request Notifications (Currently 96.4% - 27/28 tests passed) - need to find 1 failing test

Focus on edge cases, error conditions, and parameter validation to identify root causes.
"""

import requests
import json
import time
import uuid
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class DiagnosticFriendsTester:
    def __init__(self):
        self.test_results = []
        self.test_users = {}
        self.failed_tests = []
        self.edge_case_failures = []
        
    def log_test(self, test_name, success, details="", response_time=0, category="General"):
        """Log test results with detailed tracking"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'category': category,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s" if response_time > 0 else "N/A",
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        if not success:
            self.failed_tests.append(result)
            
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_time > 0:
            print(f"    Response Time: {response_time:.3f}s")
        print()

    def test_authentication_edge_cases(self):
        """Test authentication workflow edge cases that might be failing"""
        print("🔍 TESTING AUTHENTICATION WORKFLOW EDGE CASES")
        print("=" * 60)
        
        # Test 1: Invalid user ID formats
        self.test_invalid_user_id_formats()
        
        # Test 2: Extremely long user IDs
        self.test_long_user_ids()
        
        # Test 3: Special characters in user IDs
        self.test_special_character_user_ids()
        
        # Test 4: Empty and null authentication parameters
        self.test_empty_auth_parameters()
        
        # Test 5: Malformed JWT tokens
        self.test_malformed_jwt_tokens()
        
        # Test 6: Expired authentication scenarios
        self.test_expired_auth_scenarios()

    def test_invalid_user_id_formats(self):
        """Test various invalid user ID formats"""
        invalid_user_ids = [
            "",  # Empty string
            " ",  # Whitespace only
            "null",  # String null
            "undefined",  # String undefined
            "123",  # Pure numbers
            "user@domain.com",  # Email format
            "user with spaces",  # Spaces
            "user\nwith\nnewlines",  # Newlines
            "user\twith\ttabs",  # Tabs
        ]
        
        for invalid_id in invalid_user_ids:
            try:
                start_time = time.time()
                response = requests.get(
                    f"{API_BASE}/friends/list?userId={invalid_id}",
                    timeout=5
                )
                response_time = time.time() - start_time
                
                # Should handle gracefully, not crash
                if response.status_code in [200, 400, 404]:
                    self.log_test(
                        f"Invalid User ID Format: '{invalid_id}'",
                        True,
                        f"Handled gracefully with status {response.status_code}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Invalid User ID Format: '{invalid_id}'",
                        False,
                        f"Unexpected status {response.status_code}: {response.text}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Invalid User ID Format: '{invalid_id}'",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Authentication Edge Cases"
                )

    def test_long_user_ids(self):
        """Test extremely long user IDs"""
        long_user_ids = [
            "a" * 100,  # 100 characters
            "a" * 500,  # 500 characters
            "a" * 1000,  # 1000 characters
            "did:privy:" + "a" * 200,  # Long Privy ID
        ]
        
        for long_id in long_user_ids:
            try:
                start_time = time.time()
                response = requests.get(
                    f"{API_BASE}/friends/list?userId={long_id}",
                    timeout=10
                )
                response_time = time.time() - start_time
                
                # Should handle without crashing
                if response.status_code in [200, 400, 404, 413]:  # 413 = Payload Too Large
                    self.log_test(
                        f"Long User ID ({len(long_id)} chars)",
                        True,
                        f"Handled gracefully with status {response.status_code}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Long User ID ({len(long_id)} chars)",
                        False,
                        f"Unexpected status {response.status_code}: {response.text[:100]}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Long User ID ({len(long_id)} chars)",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Authentication Edge Cases"
                )

    def test_special_character_user_ids(self):
        """Test user IDs with special characters"""
        special_user_ids = [
            "user<script>alert('xss')</script>",  # XSS attempt
            "user'; DROP TABLE users; --",  # SQL injection attempt
            "user%20with%20encoding",  # URL encoded
            "user+with+plus",  # Plus signs
            "user&with&ampersands",  # Ampersands
            "user=with=equals",  # Equals signs
            "user?with?questions",  # Question marks
            "user#with#hash",  # Hash symbols
        ]
        
        for special_id in special_user_ids:
            try:
                start_time = time.time()
                response = requests.get(
                    f"{API_BASE}/friends/list",
                    params={"userId": special_id},  # Use params to handle encoding
                    timeout=5
                )
                response_time = time.time() - start_time
                
                # Should handle securely without executing malicious code
                if response.status_code in [200, 400, 404]:
                    self.log_test(
                        f"Special Character User ID: '{special_id[:20]}...'",
                        True,
                        f"Handled securely with status {response.status_code}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Special Character User ID: '{special_id[:20]}...'",
                        False,
                        f"Unexpected status {response.status_code}: {response.text[:100]}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Special Character User ID: '{special_id[:20]}...'",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Authentication Edge Cases"
                )

    def test_empty_auth_parameters(self):
        """Test empty and null authentication parameters"""
        test_cases = [
            {"userId": None},
            {"userId": ""},
            {},  # No parameters at all
        ]
        
        for i, params in enumerate(test_cases):
            try:
                start_time = time.time()
                if params:
                    response = requests.get(f"{API_BASE}/friends/list", params=params, timeout=5)
                else:
                    response = requests.get(f"{API_BASE}/friends/list", timeout=5)
                response_time = time.time() - start_time
                
                # Should return proper error for missing required parameters
                if response.status_code == 400 or (response.status_code == 200 and 'friends' in response.json()):
                    self.log_test(
                        f"Empty Auth Parameters (Case {i+1})",
                        True,
                        f"Handled appropriately with status {response.status_code}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Empty Auth Parameters (Case {i+1})",
                        False,
                        f"Unexpected status {response.status_code}: {response.text}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Empty Auth Parameters (Case {i+1})",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Authentication Edge Cases"
                )

    def test_malformed_jwt_tokens(self):
        """Test malformed JWT tokens in Authorization header"""
        malformed_tokens = [
            "Bearer invalid.token.here",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
            "Bearer not-a-jwt-token",
            "Bearer ",  # Empty token
            "InvalidBearer token",  # Wrong format
            "Bearer " + "a" * 1000,  # Extremely long token
        ]
        
        for token in malformed_tokens:
            try:
                start_time = time.time()
                headers = {"Authorization": token}
                response = requests.get(
                    f"{API_BASE}/wallet/balance",
                    headers=headers,
                    timeout=5
                )
                response_time = time.time() - start_time
                
                # Should handle gracefully, not crash
                if response.status_code in [200, 401, 403]:
                    self.log_test(
                        f"Malformed JWT Token: '{token[:30]}...'",
                        True,
                        f"Handled gracefully with status {response.status_code}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Malformed JWT Token: '{token[:30]}...'",
                        False,
                        f"Unexpected status {response.status_code}: {response.text}",
                        response_time,
                        "Authentication Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Malformed JWT Token: '{token[:30]}...'",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Authentication Edge Cases"
                )

    def test_expired_auth_scenarios(self):
        """Test expired authentication scenarios"""
        # Test with old timestamp in testing token
        old_timestamp = int(time.time()) - 86400  # 24 hours ago
        expired_payload = {
            "userId": "expired_user_test",
            "exp": old_timestamp,
            "iat": old_timestamp - 3600
        }
        
        try:
            import base64
            encoded_payload = base64.b64encode(json.dumps(expired_payload).encode()).decode()
            expired_token = f"testing-{encoded_payload}"
            
            start_time = time.time()
            headers = {"Authorization": f"Bearer {expired_token}"}
            response = requests.get(
                f"{API_BASE}/wallet/balance",
                headers=headers,
                timeout=5
            )
            response_time = time.time() - start_time
            
            # Should handle expired tokens appropriately
            if response.status_code in [200, 401, 403]:
                self.log_test(
                    "Expired Authentication Token",
                    True,
                    f"Handled expired token with status {response.status_code}",
                    response_time,
                    "Authentication Edge Cases"
                )
            else:
                self.log_test(
                    "Expired Authentication Token",
                    False,
                    f"Unexpected status {response.status_code}: {response.text}",
                    response_time,
                    "Authentication Edge Cases"
                )
                
        except Exception as e:
            self.log_test(
                "Expired Authentication Token",
                False,
                f"Exception: {str(e)}",
                0,
                "Authentication Edge Cases"
            )

    def test_notification_edge_cases(self):
        """Test friend request notification edge cases that might be failing"""
        print("🔔 TESTING FRIEND REQUEST NOTIFICATION EDGE CASES")
        print("=" * 60)
        
        # Test 1: Concurrent friend requests
        self.test_concurrent_friend_requests()
        
        # Test 2: Request to non-existent users
        self.test_requests_to_nonexistent_users()
        
        # Test 3: Malformed request data
        self.test_malformed_request_data()
        
        # Test 4: Database connection failures simulation
        self.test_database_stress_scenarios()
        
        # Test 5: Race conditions in accept/decline
        self.test_race_conditions()
        
        # Test 6: Notification count edge cases
        self.test_notification_count_edge_cases()

    def test_concurrent_friend_requests(self):
        """Test concurrent friend requests that might cause race conditions"""
        # Create test users first
        test_users = []
        for i in range(3):
            user_id = f"concurrent_user_{i}_{int(time.time())}"
            user_name = f"ConcurrentUser{i}"
            
            try:
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json={
                        "userId": user_id,
                        "customName": user_name,
                        "privyId": user_id,
                        "email": None
                    },
                    timeout=5
                )
                
                if response.status_code == 200:
                    test_users.append({"id": user_id, "name": user_name})
                    
            except Exception as e:
                print(f"Failed to create concurrent test user {i}: {e}")
        
        if len(test_users) < 2:
            self.log_test(
                "Concurrent Friend Requests Setup",
                False,
                "Could not create enough test users",
                0,
                "Notification Edge Cases"
            )
            return
        
        # Test concurrent requests from same user to multiple targets
        user1 = test_users[0]
        user2 = test_users[1]
        
        # Send multiple rapid requests
        import threading
        results = []
        
        def send_request(from_user, to_user, result_list):
            try:
                response = requests.post(
                    f"{API_BASE}/friends/send-request",
                    json={
                        "fromUserId": from_user["id"],
                        "toUserId": to_user["id"],
                        "fromUserName": from_user["name"],
                        "toUserName": to_user["name"]
                    },
                    timeout=5
                )
                result_list.append({
                    "status_code": response.status_code,
                    "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                })
            except Exception as e:
                result_list.append({"error": str(e)})
        
        # Send same request multiple times concurrently
        threads = []
        for i in range(3):
            thread = threading.Thread(target=send_request, args=(user1, user2, results))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Analyze results
        success_count = sum(1 for r in results if r.get("status_code") == 200)
        error_count = sum(1 for r in results if r.get("status_code") == 400)
        
        if success_count == 1 and error_count >= 1:
            self.log_test(
                "Concurrent Friend Requests",
                True,
                f"Handled concurrency correctly: {success_count} success, {error_count} duplicates rejected",
                0,
                "Notification Edge Cases"
            )
        else:
            self.log_test(
                "Concurrent Friend Requests",
                False,
                f"Concurrency issue: {success_count} success, {error_count} errors. Results: {results}",
                0,
                "Notification Edge Cases"
            )

    def test_requests_to_nonexistent_users(self):
        """Test friend requests to non-existent users"""
        nonexistent_user_ids = [
            "user_does_not_exist_12345",
            "did:privy:nonexistent_user",
            str(uuid.uuid4()),  # Random UUID
            "deleted_user_account",
        ]
        
        # Create one real user to send from
        sender_id = f"sender_test_{int(time.time())}"
        try:
            response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json={
                    "userId": sender_id,
                    "customName": "TestSender",
                    "privyId": sender_id,
                    "email": None
                },
                timeout=5
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Nonexistent Users Test Setup",
                    False,
                    "Could not create sender user",
                    0,
                    "Notification Edge Cases"
                )
                return
                
        except Exception as e:
            self.log_test(
                "Nonexistent Users Test Setup",
                False,
                f"Exception creating sender: {e}",
                0,
                "Notification Edge Cases"
            )
            return
        
        # Test requests to each nonexistent user
        for nonexistent_id in nonexistent_user_ids:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/friends/send-request",
                    json={
                        "fromUserId": sender_id,
                        "toUserId": nonexistent_id,
                        "fromUserName": "TestSender",
                        "toUserName": "NonexistentUser"
                    },
                    timeout=5
                )
                response_time = time.time() - start_time
                
                # Should handle gracefully - either succeed (create friendship record) or fail appropriately
                if response.status_code in [200, 400, 404]:
                    self.log_test(
                        f"Request to Nonexistent User: {nonexistent_id[:20]}...",
                        True,
                        f"Handled appropriately with status {response.status_code}",
                        response_time,
                        "Notification Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Request to Nonexistent User: {nonexistent_id[:20]}...",
                        False,
                        f"Unexpected status {response.status_code}: {response.text}",
                        response_time,
                        "Notification Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Request to Nonexistent User: {nonexistent_id[:20]}...",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Notification Edge Cases"
                )

    def test_malformed_request_data(self):
        """Test malformed friend request data"""
        malformed_payloads = [
            {"fromUserId": "user1"},  # Missing toUserId
            {"toUserId": "user2"},  # Missing fromUserId
            {"fromUserId": "user1", "toUserId": "user2", "extraField": "should_be_ignored"},
            {"fromUserId": None, "toUserId": "user2"},  # Null fromUserId
            {"fromUserId": "user1", "toUserId": None},  # Null toUserId
            {"fromUserId": "", "toUserId": "user2"},  # Empty fromUserId
            {"fromUserId": "user1", "toUserId": ""},  # Empty toUserId
            {"fromUserId": 123, "toUserId": "user2"},  # Wrong type
            {"fromUserId": "user1", "toUserId": 456},  # Wrong type
            {"fromUserId": ["user1"], "toUserId": "user2"},  # Array instead of string
            {"fromUserId": {"id": "user1"}, "toUserId": "user2"},  # Object instead of string
        ]
        
        for i, payload in enumerate(malformed_payloads):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/friends/send-request",
                    json=payload,
                    timeout=5
                )
                response_time = time.time() - start_time
                
                # Should return 400 for malformed data
                if response.status_code == 400:
                    self.log_test(
                        f"Malformed Request Data (Case {i+1})",
                        True,
                        f"Correctly rejected malformed data: {str(payload)[:50]}...",
                        response_time,
                        "Notification Edge Cases"
                    )
                else:
                    self.log_test(
                        f"Malformed Request Data (Case {i+1})",
                        False,
                        f"Unexpected status {response.status_code} for payload: {payload}",
                        response_time,
                        "Notification Edge Cases"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Malformed Request Data (Case {i+1})",
                    False,
                    f"Exception: {str(e)}",
                    0,
                    "Notification Edge Cases"
                )

    def test_database_stress_scenarios(self):
        """Test database stress scenarios"""
        # Test rapid sequential requests
        try:
            user_id = f"stress_test_user_{int(time.time())}"
            
            # Create user first
            response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json={
                    "userId": user_id,
                    "customName": "StressTestUser",
                    "privyId": user_id,
                    "email": None
                },
                timeout=5
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Database Stress Test Setup",
                    False,
                    "Could not create stress test user",
                    0,
                    "Notification Edge Cases"
                )
                return
            
            # Rapid sequential requests to friends list
            start_time = time.time()
            success_count = 0
            error_count = 0
            
            for i in range(10):
                try:
                    response = requests.get(
                        f"{API_BASE}/friends/list?userId={user_id}",
                        timeout=2
                    )
                    if response.status_code == 200:
                        success_count += 1
                    else:
                        error_count += 1
                except:
                    error_count += 1
            
            total_time = time.time() - start_time
            
            if success_count >= 8:  # Allow some failures under stress
                self.log_test(
                    "Database Stress Test (Rapid Requests)",
                    True,
                    f"Handled stress well: {success_count}/10 successful in {total_time:.2f}s",
                    total_time,
                    "Notification Edge Cases"
                )
            else:
                self.log_test(
                    "Database Stress Test (Rapid Requests)",
                    False,
                    f"Poor performance under stress: {success_count}/10 successful, {error_count} errors",
                    total_time,
                    "Notification Edge Cases"
                )
                
        except Exception as e:
            self.log_test(
                "Database Stress Test (Rapid Requests)",
                False,
                f"Exception: {str(e)}",
                0,
                "Notification Edge Cases"
            )

    def test_race_conditions(self):
        """Test race conditions in accept/decline operations"""
        # Create test users
        user1_id = f"race_user1_{int(time.time())}"
        user2_id = f"race_user2_{int(time.time())}"
        
        for user_id, user_name in [(user1_id, "RaceUser1"), (user2_id, "RaceUser2")]:
            try:
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json={
                        "userId": user_id,
                        "customName": user_name,
                        "privyId": user_id,
                        "email": None
                    },
                    timeout=5
                )
                
                if response.status_code != 200:
                    self.log_test(
                        "Race Condition Test Setup",
                        False,
                        f"Could not create user {user_name}",
                        0,
                        "Notification Edge Cases"
                    )
                    return
                    
            except Exception as e:
                self.log_test(
                    "Race Condition Test Setup",
                    False,
                    f"Exception creating {user_name}: {e}",
                    0,
                    "Notification Edge Cases"
                )
                return
        
        # Send friend request
        try:
            response = requests.post(
                f"{API_BASE}/friends/send-request",
                json={
                    "fromUserId": user1_id,
                    "toUserId": user2_id,
                    "fromUserName": "RaceUser1",
                    "toUserName": "RaceUser2"
                },
                timeout=5
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Race Condition Test - Send Request",
                    False,
                    f"Could not send friend request: {response.text}",
                    0,
                    "Notification Edge Cases"
                )
                return
            
            request_data = response.json()
            request_id = request_data.get('requestId')
            
            if not request_id:
                self.log_test(
                    "Race Condition Test - Get Request ID",
                    False,
                    "No request ID returned",
                    0,
                    "Notification Edge Cases"
                )
                return
            
            # Try to accept and decline simultaneously
            import threading
            results = []
            
            def accept_request(results_list):
                try:
                    response = requests.post(
                        f"{API_BASE}/friends/accept-request",
                        json={"requestId": request_id, "userId": user2_id},
                        timeout=5
                    )
                    results_list.append(("accept", response.status_code, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text))
                except Exception as e:
                    results_list.append(("accept", "error", str(e)))
            
            def decline_request(results_list):
                try:
                    response = requests.post(
                        f"{API_BASE}/friends/decline-request",
                        json={"requestId": request_id, "userId": user2_id},
                        timeout=5
                    )
                    results_list.append(("decline", response.status_code, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text))
                except Exception as e:
                    results_list.append(("decline", "error", str(e)))
            
            # Start both operations simultaneously
            accept_thread = threading.Thread(target=accept_request, args=(results,))
            decline_thread = threading.Thread(target=decline_request, args=(results,))
            
            accept_thread.start()
            decline_thread.start()
            
            accept_thread.join()
            decline_thread.join()
            
            # Analyze results - one should succeed, one should fail
            success_count = sum(1 for r in results if r[1] == 200)
            error_count = sum(1 for r in results if r[1] == 404 or r[1] == 400)
            
            if success_count == 1 and error_count == 1:
                self.log_test(
                    "Race Condition Test (Accept/Decline)",
                    True,
                    f"Handled race condition correctly: 1 success, 1 appropriate error",
                    0,
                    "Notification Edge Cases"
                )
            else:
                self.log_test(
                    "Race Condition Test (Accept/Decline)",
                    False,
                    f"Race condition issue: {success_count} success, {error_count} errors. Results: {results}",
                    0,
                    "Notification Edge Cases"
                )
                
        except Exception as e:
            self.log_test(
                "Race Condition Test (Accept/Decline)",
                False,
                f"Exception: {str(e)}",
                0,
                "Notification Edge Cases"
            )

    def test_notification_count_edge_cases(self):
        """Test notification count edge cases"""
        # Test with user who has no notifications
        empty_user_id = f"empty_notifications_{int(time.time())}"
        
        try:
            # Create user
            response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json={
                    "userId": empty_user_id,
                    "customName": "EmptyNotifications",
                    "privyId": empty_user_id,
                    "email": None
                },
                timeout=5
            )
            
            if response.status_code == 200:
                # Check notification count for new user
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/friends/notifications/count",
                    json={"userId": empty_user_id},
                    timeout=5
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('count') == 0:
                        self.log_test(
                            "Notification Count - New User",
                            True,
                            "Correctly returned 0 notifications for new user",
                            response_time,
                            "Notification Edge Cases"
                        )
                    else:
                        self.log_test(
                            "Notification Count - New User",
                            False,
                            f"Unexpected response for new user: {data}",
                            response_time,
                            "Notification Edge Cases"
                        )
                else:
                    self.log_test(
                        "Notification Count - New User",
                        False,
                        f"HTTP {response.status_code}: {response.text}",
                        response_time,
                        "Notification Edge Cases"
                    )
            else:
                self.log_test(
                    "Notification Count - New User Setup",
                    False,
                    "Could not create test user",
                    0,
                    "Notification Edge Cases"
                )
                
        except Exception as e:
            self.log_test(
                "Notification Count - New User",
                False,
                f"Exception: {str(e)}",
                0,
                "Notification Edge Cases"
            )

    def test_database_integrity_checks(self):
        """Test database integrity and consistency"""
        print("🗄️ TESTING DATABASE INTEGRITY AND CONSISTENCY")
        print("=" * 60)
        
        # Test 1: Orphaned friend requests
        self.test_orphaned_friend_requests()
        
        # Test 2: Inconsistent friendship states
        self.test_inconsistent_friendship_states()
        
        # Test 3: Duplicate prevention across collections
        self.test_cross_collection_consistency()

    def test_orphaned_friend_requests(self):
        """Test for orphaned friend requests (requests without corresponding users)"""
        # This would require direct database access, so we'll test the API's handling
        # of requests involving users that might have been deleted
        
        # Create a user, send a request, then "simulate" user deletion by using non-existent user
        try:
            temp_user_id = f"temp_user_{int(time.time())}"
            target_user_id = f"target_user_{int(time.time())}"
            
            # Create both users
            for user_id, name in [(temp_user_id, "TempUser"), (target_user_id, "TargetUser")]:
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json={
                        "userId": user_id,
                        "customName": name,
                        "privyId": user_id,
                        "email": None
                    },
                    timeout=5
                )
                
                if response.status_code != 200:
                    self.log_test(
                        "Orphaned Requests Test Setup",
                        False,
                        f"Could not create user {name}",
                        0,
                        "Database Integrity"
                    )
                    return
            
            # Send friend request
            response = requests.post(
                f"{API_BASE}/friends/send-request",
                json={
                    "fromUserId": temp_user_id,
                    "toUserId": target_user_id,
                    "fromUserName": "TempUser",
                    "toUserName": "TargetUser"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                # Now test friends list for both users - should handle gracefully even if user data is missing
                for user_id, name in [(temp_user_id, "TempUser"), (target_user_id, "TargetUser")]:
                    start_time = time.time()
                    response = requests.get(
                        f"{API_BASE}/friends/list?userId={user_id}",
                        timeout=5
                    )
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'friends' in data:
                            self.log_test(
                                f"Orphaned Requests Handling ({name})",
                                True,
                                f"Handled potential orphaned data gracefully, returned {len(data['friends'])} friends",
                                response_time,
                                "Database Integrity"
                            )
                        else:
                            self.log_test(
                                f"Orphaned Requests Handling ({name})",
                                False,
                                f"Invalid response structure: {data}",
                                response_time,
                                "Database Integrity"
                            )
                    else:
                        self.log_test(
                            f"Orphaned Requests Handling ({name})",
                            False,
                            f"HTTP {response.status_code}: {response.text}",
                            response_time,
                            "Database Integrity"
                        )
            else:
                self.log_test(
                    "Orphaned Requests Test - Send Request",
                    False,
                    f"Could not send friend request: {response.text}",
                    0,
                    "Database Integrity"
                )
                
        except Exception as e:
            self.log_test(
                "Orphaned Requests Handling",
                False,
                f"Exception: {str(e)}",
                0,
                "Database Integrity"
            )

    def test_inconsistent_friendship_states(self):
        """Test handling of inconsistent friendship states"""
        # Test scenario where friendship might exist in one direction but not the other
        # This tests the bidirectional consistency of the friends system
        
        try:
            user_a_id = f"consistency_a_{int(time.time())}"
            user_b_id = f"consistency_b_{int(time.time())}"
            
            # Create users
            for user_id, name in [(user_a_id, "ConsistencyA"), (user_b_id, "ConsistencyB")]:
                response = requests.post(
                    f"{API_BASE}/users/profile/update-name",
                    json={
                        "userId": user_id,
                        "customName": name,
                        "privyId": user_id,
                        "email": None
                    },
                    timeout=5
                )
                
                if response.status_code != 200:
                    self.log_test(
                        "Consistency Test Setup",
                        False,
                        f"Could not create user {name}",
                        0,
                        "Database Integrity"
                    )
                    return
            
            # Send and accept friend request
            response = requests.post(
                f"{API_BASE}/friends/send-request",
                json={
                    "fromUserId": user_a_id,
                    "toUserId": user_b_id,
                    "fromUserName": "ConsistencyA",
                    "toUserName": "ConsistencyB"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                request_data = response.json()
                request_id = request_data.get('requestId')
                
                if request_id:
                    # Accept the request
                    response = requests.post(
                        f"{API_BASE}/friends/accept-request",
                        json={"requestId": request_id, "userId": user_b_id},
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        # Now check both users' friends lists for consistency
                        friends_a = None
                        friends_b = None
                        
                        # Get A's friends list
                        response = requests.get(f"{API_BASE}/friends/list?userId={user_a_id}", timeout=5)
                        if response.status_code == 200:
                            friends_a = response.json().get('friends', [])
                        
                        # Get B's friends list
                        response = requests.get(f"{API_BASE}/friends/list?userId={user_b_id}", timeout=5)
                        if response.status_code == 200:
                            friends_b = response.json().get('friends', [])
                        
                        # Check bidirectional consistency
                        a_has_b = any(f.get('username') == 'ConsistencyB' for f in friends_a) if friends_a else False
                        b_has_a = any(f.get('username') == 'ConsistencyA' for f in friends_b) if friends_b else False
                        
                        if a_has_b and b_has_a:
                            self.log_test(
                                "Bidirectional Friendship Consistency",
                                True,
                                "Both users correctly see each other as friends",
                                0,
                                "Database Integrity"
                            )
                        else:
                            self.log_test(
                                "Bidirectional Friendship Consistency",
                                False,
                                f"Inconsistent state: A sees B={a_has_b}, B sees A={b_has_a}",
                                0,
                                "Database Integrity"
                            )
                    else:
                        self.log_test(
                            "Consistency Test - Accept Request",
                            False,
                            f"Could not accept request: {response.text}",
                            0,
                            "Database Integrity"
                        )
                else:
                    self.log_test(
                        "Consistency Test - Get Request ID",
                        False,
                        "No request ID returned",
                        0,
                        "Database Integrity"
                    )
            else:
                self.log_test(
                    "Consistency Test - Send Request",
                    False,
                    f"Could not send request: {response.text}",
                    0,
                    "Database Integrity"
                )
                
        except Exception as e:
            self.log_test(
                "Bidirectional Friendship Consistency",
                False,
                f"Exception: {str(e)}",
                0,
                "Database Integrity"
            )

    def test_cross_collection_consistency(self):
        """Test consistency across different collections (users, friends, etc.)"""
        try:
            # Test user search vs friends list consistency
            search_user_id = f"search_test_{int(time.time())}"
            
            # Create user
            response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json={
                    "userId": search_user_id,
                    "customName": "SearchTestUser",
                    "privyId": search_user_id,
                    "email": None
                },
                timeout=5
            )
            
            if response.status_code == 200:
                # Search for the user we just created
                start_time = time.time()
                response = requests.get(
                    f"{API_BASE}/users/search?q=SearchTest&userId=different_user",
                    timeout=5
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    users = data.get('users', [])
                    found_user = any(u.get('username') == 'SearchTestUser' for u in users)
                    
                    if found_user:
                        self.log_test(
                            "Cross-Collection Consistency (User Search)",
                            True,
                            "User found in search after creation",
                            response_time,
                            "Database Integrity"
                        )
                    else:
                        self.log_test(
                            "Cross-Collection Consistency (User Search)",
                            False,
                            f"User not found in search results: {users}",
                            response_time,
                            "Database Integrity"
                        )
                else:
                    self.log_test(
                        "Cross-Collection Consistency (User Search)",
                        False,
                        f"Search failed: HTTP {response.status_code}: {response.text}",
                        response_time,
                        "Database Integrity"
                    )
            else:
                self.log_test(
                    "Cross-Collection Consistency Setup",
                    False,
                    "Could not create search test user",
                    0,
                    "Database Integrity"
                )
                
        except Exception as e:
            self.log_test(
                "Cross-Collection Consistency (User Search)",
                False,
                f"Exception: {str(e)}",
                0,
                "Database Integrity"
            )

    def run_comprehensive_diagnostic(self):
        """Run all diagnostic tests to identify failing scenarios"""
        print("🔍 STARTING COMPREHENSIVE DIAGNOSTIC TESTING")
        print("=" * 70)
        print(f"Target: Identify failing tests in Friends Authentication (93.3%) and Notifications (96.4%)")
        print(f"Base URL: {BASE_URL}")
        print(f"API Base: {API_BASE}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        print()
        
        # Run all test categories
        self.test_authentication_edge_cases()
        self.test_notification_edge_cases()
        self.test_database_integrity_checks()
        
        # Generate diagnostic summary
        self.generate_diagnostic_summary()

    def generate_diagnostic_summary(self):
        """Generate comprehensive diagnostic summary"""
        print("\n" + "=" * 70)
        print("🔍 DIAGNOSTIC TESTING SUMMARY - FAILURE ANALYSIS")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Diagnostic Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Group results by category
        categories = {}
        for result in self.test_results:
            category = result['category']
            if category not in categories:
                categories[category] = []
            categories[category].append(result)
        
        # Print results by category
        for category, results in categories.items():
            print(f"\n📋 {category.upper()}")
            print("-" * 50)
            category_passed = sum(1 for r in results if r['success'])
            category_total = len(results)
            category_rate = (category_passed / category_total * 100) if category_total > 0 else 0
            print(f"Category Success Rate: {category_rate:.1f}% ({category_passed}/{category_total})")
            
            # Show failed tests in this category
            failed_in_category = [r for r in results if not r['success']]
            if failed_in_category:
                print("❌ FAILED TESTS:")
                for result in failed_in_category:
                    print(f"  • {result['test']}: {result['details']}")
            else:
                print("✅ All tests passed in this category")
        
        # Critical findings - identify the specific failing tests
        print(f"\n🎯 CRITICAL FINDINGS - ROOT CAUSE ANALYSIS")
        print("-" * 50)
        
        if self.failed_tests:
            print(f"❌ IDENTIFIED {len(self.failed_tests)} FAILING TESTS:")
            print()
            
            # Group failures by likely root cause
            auth_failures = [f for f in self.failed_tests if 'Authentication' in f['category']]
            notification_failures = [f for f in self.failed_tests if 'Notification' in f['category']]
            integrity_failures = [f for f in self.failed_tests if 'Integrity' in f['category']]
            
            if auth_failures:
                print("🔐 AUTHENTICATION WORKFLOW FAILURES:")
                for failure in auth_failures:
                    print(f"  • {failure['test']}")
                    print(f"    Root Cause: {failure['details']}")
                    print(f"    Impact: Likely contributing to 93.3% success rate (missing 2 tests)")
                print()
            
            if notification_failures:
                print("🔔 NOTIFICATION SYSTEM FAILURES:")
                for failure in notification_failures:
                    print(f"  • {failure['test']}")
                    print(f"    Root Cause: {failure['details']}")
                    print(f"    Impact: Likely contributing to 96.4% success rate (missing 1 test)")
                print()
            
            if integrity_failures:
                print("🗄️ DATABASE INTEGRITY FAILURES:")
                for failure in integrity_failures:
                    print(f"  • {failure['test']}")
                    print(f"    Root Cause: {failure['details']}")
                    print(f"    Impact: Data consistency issues")
                print()
            
            # Recommendations
            print("💡 RECOMMENDED FIXES:")
            print("-" * 30)
            
            if auth_failures:
                print("1. Authentication Workflow:")
                print("   - Improve input validation for edge cases")
                print("   - Add better error handling for malformed tokens")
                print("   - Implement proper sanitization for special characters")
            
            if notification_failures:
                print("2. Notification System:")
                print("   - Fix race condition handling in concurrent requests")
                print("   - Improve error responses for nonexistent users")
                print("   - Add better validation for malformed request data")
            
            if integrity_failures:
                print("3. Database Integrity:")
                print("   - Ensure bidirectional consistency in friendship records")
                print("   - Add cleanup for orphaned records")
                print("   - Improve cross-collection data synchronization")
            
        else:
            print("✅ NO CRITICAL FAILURES IDENTIFIED IN DIAGNOSTIC TESTS")
            print("The reported failure rates may be due to:")
            print("  • Transient network issues during original testing")
            print("  • Race conditions under high load")
            print("  • Specific test data scenarios not covered in this diagnostic")
            print("  • Infrastructure-related timeouts")
        
        print(f"\n🕒 Diagnostic Completed: {datetime.now().isoformat()}")
        print("=" * 70)

if __name__ == "__main__":
    tester = DiagnosticFriendsTester()
    tester.run_comprehensive_diagnostic()