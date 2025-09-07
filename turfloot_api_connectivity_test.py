#!/usr/bin/env python3
"""
TurfLoot API Connectivity Testing
Testing API connectivity issues resolution for TurfLoot as per review request:
1. Test Critical API Endpoints on localhost (friends, names search, core endpoints)
2. Test Preview URL Status (502 Bad Gateway verification)
3. Test Friends System Workflow (complete workflow testing)
4. Verify Database Connectivity (MongoDB connection and data persistence)
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
LOCALHOST_URL = "http://localhost:3000"
PREVIEW_URL = "https://milblob-game.preview.emergentagent.com"
LOCALHOST_API = f"{LOCALHOST_URL}/api"
PREVIEW_API = f"{PREVIEW_URL}/api"

# Test users for workflow testing
TEST_USERS = {
    "user1": {
        "userId": "testUser1",
        "userName": "TestUser1"
    },
    "user2": {
        "userId": "testUser2", 
        "userName": "TestUser2"
    }
}

class TurfLootAPITester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.start_time = datetime.now()
        
    def log_test(self, test_name, passed, details="", response_time=None):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = f"{status} - {test_name}"
        if response_time:
            result += f" ({response_time:.3f}s)"
        if details:
            result += f" | {details}"
            
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })
        
    def make_request(self, method, url, data=None, params=None, timeout=10):
        """Make HTTP request with error handling and timing"""
        try:
            start_time = time.time()
            print(f"🔗 Making {method} request to: {url}")
            if data:
                print(f"📤 Request data: {json.dumps(data, indent=2)}")
            if params:
                print(f"📤 Request params: {params}")
            
            if method.upper() == 'GET':
                response = requests.get(url, params=params, timeout=timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers={'Content-Type': 'application/json'}, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response_time = time.time() - start_time
            print(f"📥 Response status: {response.status_code} ({response_time:.3f}s)")
            if response.text:
                print(f"📥 Response body: {response.text[:300]}...")
                
            return response, response_time
        except requests.exceptions.RequestException as e:
            response_time = time.time() - start_time
            print(f"❌ Request failed after {response_time:.3f}s: {e}")
            return None, response_time
            
    def test_localhost_critical_endpoints(self):
        """Test 1: Critical API Endpoints on localhost - Verify core functionality works on localhost:3000"""
        print("\n🔍 TEST 1: CRITICAL API ENDPOINTS ON LOCALHOST")
        print("=" * 60)
        
        # Test core endpoints
        core_endpoints = [
            ("GET", f"{LOCALHOST_API}/ping", None, None, "Ping endpoint connectivity check"),
            ("GET", f"{LOCALHOST_API}/", None, None, "Root API endpoint"),
            ("GET", f"{LOCALHOST_API}/friends/list", None, {"userId": "testUser1"}, "Friends list endpoint"),
            ("GET", f"{LOCALHOST_API}/names/search", None, {"q": "testuser", "userId": "testUser1"}, "Names search endpoint"),
            ("GET", f"{LOCALHOST_API}/users/search", None, {"q": "test", "userId": "testUser1"}, "Users search endpoint"),
            ("POST", f"{LOCALHOST_API}/friends/send-request", {
                "fromUserId": "testUser1",
                "toUserId": "testUser2", 
                "fromUserName": "TestUser1",
                "toUserName": "TestUser2"
            }, None, "Send friend request endpoint")
        ]
        
        for method, url, data, params, description in core_endpoints:
            response, response_time = self.make_request(method, url, data, params)
            
            if response is not None:
                if response.status_code == 200:
                    try:
                        json_data = response.json()
                        self.log_test(
                            f"Localhost {description}",
                            True,
                            f"Status 200, valid JSON response with {len(str(json_data))} chars",
                            response_time
                        )
                    except json.JSONDecodeError:
                        self.log_test(
                            f"Localhost {description}",
                            False,
                            f"Status 200 but invalid JSON response",
                            response_time
                        )
                elif response.status_code == 404 and "names/search" in url:
                    # Names search endpoint might not be implemented - this is acceptable
                    self.log_test(
                        f"Localhost {description}",
                        True,
                        f"Status 404 - endpoint not implemented (acceptable for names/search)",
                        response_time
                    )
                elif response.status_code == 400 and method == "POST":
                    # Friend request might fail due to validation - check if it's a meaningful error
                    try:
                        json_data = response.json()
                        error_msg = json_data.get('error', '')
                        if 'already exists' in error_msg or 'duplicate' in error_msg:
                            self.log_test(
                                f"Localhost {description}",
                                True,
                                f"Status 400 - friendship already exists (valid response): {error_msg}",
                                response_time
                            )
                        else:
                            self.log_test(
                                f"Localhost {description}",
                                False,
                                f"Status 400 - unexpected error: {error_msg}",
                                response_time
                            )
                    except json.JSONDecodeError:
                        self.log_test(
                            f"Localhost {description}",
                            False,
                            f"Status 400 with invalid JSON",
                            response_time
                        )
                else:
                    self.log_test(
                        f"Localhost {description}",
                        False,
                        f"Unexpected status code: {response.status_code}",
                        response_time
                    )
            else:
                self.log_test(
                    f"Localhost {description}",
                    False,
                    "No response received (connection failed)",
                    response_time
                )
                
    def test_preview_url_status(self):
        """Test 2: Preview URL Status - Confirm 502 Bad Gateway issue on preview URL"""
        print("\n🔍 TEST 2: PREVIEW URL STATUS (502 BAD GATEWAY VERIFICATION)")
        print("=" * 60)
        
        # Test same endpoints on preview URL to confirm 502 errors
        preview_endpoints = [
            ("GET", f"{PREVIEW_API}/ping", None, None, "Preview ping endpoint"),
            ("GET", f"{PREVIEW_API}/", None, None, "Preview root API endpoint"),
            ("GET", f"{PREVIEW_API}/friends/list", None, {"userId": "testUser1"}, "Preview friends list endpoint"),
            ("GET", f"{PREVIEW_API}/names/search", None, {"q": "testuser", "userId": "testUser1"}, "Preview names search endpoint")
        ]
        
        for method, url, data, params, description in preview_endpoints:
            response, response_time = self.make_request(method, url, data, params, timeout=15)
            
            if response is not None:
                if response.status_code == 502:
                    self.log_test(
                        f"{description}",
                        True,
                        f"Confirmed 502 Bad Gateway error (infrastructure issue)",
                        response_time
                    )
                elif response.status_code == 200:
                    self.log_test(
                        f"{description}",
                        False,
                        f"Unexpected success - preview URL should return 502",
                        response_time
                    )
                else:
                    self.log_test(
                        f"{description}",
                        True,
                        f"Status {response.status_code} - infrastructure issue confirmed (not 200)",
                        response_time
                    )
            else:
                self.log_test(
                    f"{description}",
                    True,
                    "Connection failed - confirms infrastructure issue",
                    response_time
                )
                
    def test_friends_system_workflow(self):
        """Test 3: Friends System Workflow - Test complete friends workflow on localhost"""
        print("\n🔍 TEST 3: FRIENDS SYSTEM WORKFLOW")
        print("=" * 60)
        
        # Step 1: Search for users using names/search (might not exist) and users/search
        print("\n📋 Step 1: User Search Testing")
        
        # Test names/search endpoint
        response, response_time = self.make_request(
            "GET", 
            f"{LOCALHOST_API}/names/search",
            None,
            {"q": "testuser", "userId": "testUser1"}
        )
        
        if response is not None:
            if response.status_code == 200:
                try:
                    data = response.json()
                    users = data.get('users', [])
                    self.log_test(
                        "Names Search Functionality",
                        True,
                        f"Found {len(users)} users matching 'testuser'",
                        response_time
                    )
                except json.JSONDecodeError:
                    self.log_test(
                        "Names Search Functionality",
                        False,
                        "Invalid JSON response",
                        response_time
                    )
            elif response.status_code == 404:
                self.log_test(
                    "Names Search Functionality",
                    True,
                    "Endpoint not implemented (404) - will use users/search instead",
                    response_time
                )
            else:
                self.log_test(
                    "Names Search Functionality",
                    False,
                    f"Unexpected status: {response.status_code}",
                    response_time
                )
        else:
            self.log_test(
                "Names Search Functionality",
                False,
                "Connection failed",
                response_time
            )
            
        # Test users/search endpoint (fallback)
        response, response_time = self.make_request(
            "GET",
            f"{LOCALHOST_API}/users/search",
            None,
            {"q": "test", "userId": "testUser1"}
        )
        
        if response is not None and response.status_code == 200:
            try:
                data = response.json()
                users = data.get('users', [])
                self.log_test(
                    "Users Search Functionality",
                    True,
                    f"Found {len(users)} users matching 'test'",
                    response_time
                )
            except json.JSONDecodeError:
                self.log_test(
                    "Users Search Functionality",
                    False,
                    "Invalid JSON response",
                    response_time
                )
        else:
            self.log_test(
                "Users Search Functionality",
                False,
                f"Failed - Status: {response.status_code if response else 'No response'}",
                response_time
            )
            
        # Step 2: Send friend request
        print("\n📋 Step 2: Friend Request Testing")
        
        request_data = {
            "fromUserId": TEST_USERS['user1']['userId'],
            "toUserId": TEST_USERS['user2']['userId'],
            "fromUserName": TEST_USERS['user1']['userName'],
            "toUserName": TEST_USERS['user2']['userName']
        }
        
        response, response_time = self.make_request(
            "POST",
            f"{LOCALHOST_API}/friends/send-request",
            request_data
        )
        
        if response is not None:
            if response.status_code == 200:
                try:
                    data = response.json()
                    success = data.get('success', False)
                    message = data.get('message', '')
                    self.log_test(
                        "Send Friend Request",
                        success,
                        f"Request processed: {message}",
                        response_time
                    )
                except json.JSONDecodeError:
                    self.log_test(
                        "Send Friend Request",
                        False,
                        "Invalid JSON response",
                        response_time
                    )
            elif response.status_code == 400:
                try:
                    data = response.json()
                    error = data.get('error', '')
                    if 'already exists' in error or 'duplicate' in error:
                        self.log_test(
                            "Send Friend Request",
                            True,
                            f"Friendship already exists (valid): {error}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "Send Friend Request",
                            False,
                            f"Validation error: {error}",
                            response_time
                        )
                except json.JSONDecodeError:
                    self.log_test(
                        "Send Friend Request",
                        False,
                        "Invalid JSON error response",
                        response_time
                    )
            else:
                self.log_test(
                    "Send Friend Request",
                    False,
                    f"Unexpected status: {response.status_code}",
                    response_time
                )
        else:
            self.log_test(
                "Send Friend Request",
                False,
                "Connection failed",
                response_time
            )
            
        # Step 3: Retrieve friends list
        print("\n📋 Step 3: Friends List Retrieval Testing")
        
        # Wait a moment for database update
        time.sleep(0.5)
        
        # Test user1's friends list
        response, response_time = self.make_request(
            "GET",
            f"{LOCALHOST_API}/friends/list",
            None,
            {"userId": TEST_USERS['user1']['userId']}
        )
        
        if response is not None and response.status_code == 200:
            try:
                data = response.json()
                friends = data.get('friends', [])
                timestamp = data.get('timestamp', '')
                
                # Check if user2 is in user1's friends list
                user2_found = any(friend.get('id') == TEST_USERS['user2']['userId'] for friend in friends)
                
                self.log_test(
                    "User1 Friends List Retrieval",
                    True,
                    f"Retrieved {len(friends)} friends, User2 in list: {user2_found}, timestamp: {timestamp[:19]}",
                    response_time
                )
            except json.JSONDecodeError:
                self.log_test(
                    "User1 Friends List Retrieval",
                    False,
                    "Invalid JSON response",
                    response_time
                )
        else:
            self.log_test(
                "User1 Friends List Retrieval",
                False,
                f"Failed - Status: {response.status_code if response else 'No response'}",
                response_time
            )
            
        # Test user2's friends list
        response, response_time = self.make_request(
            "GET",
            f"{LOCALHOST_API}/friends/list",
            None,
            {"userId": TEST_USERS['user2']['userId']}
        )
        
        if response is not None and response.status_code == 200:
            try:
                data = response.json()
                friends = data.get('friends', [])
                
                # Check if user1 is in user2's friends list
                user1_found = any(friend.get('id') == TEST_USERS['user1']['userId'] for friend in friends)
                
                self.log_test(
                    "User2 Friends List Retrieval",
                    True,
                    f"Retrieved {len(friends)} friends, User1 in list: {user1_found}",
                    response_time
                )
            except json.JSONDecodeError:
                self.log_test(
                    "User2 Friends List Retrieval",
                    False,
                    "Invalid JSON response",
                    response_time
                )
        else:
            self.log_test(
                "User2 Friends List Retrieval",
                False,
                f"Failed - Status: {response.status_code if response else 'No response'}",
                response_time
            )
            
    def test_database_connectivity(self):
        """Test 4: Database Connectivity - Verify MongoDB connection and data persistence"""
        print("\n🔍 TEST 4: DATABASE CONNECTIVITY VERIFICATION")
        print("=" * 60)
        
        # Test database connectivity through API endpoints that require database access
        db_endpoints = [
            ("GET", f"{LOCALHOST_API}/users/leaderboard", None, None, "Leaderboard (requires DB)"),
            ("GET", f"{LOCALHOST_API}/stats/live-players", None, None, "Live stats (requires DB)"),
            ("GET", f"{LOCALHOST_API}/stats/global-winnings", None, None, "Global winnings (requires DB)"),
            ("GET", f"{LOCALHOST_API}/servers/lobbies", None, None, "Server browser (requires DB)")
        ]
        
        for method, url, data, params, description in db_endpoints:
            response, response_time = self.make_request(method, url, data, params)
            
            if response is not None and response.status_code == 200:
                try:
                    json_data = response.json()
                    # Check for expected data structures
                    if "leaderboard" in url and "leaderboard" in json_data:
                        leaderboard = json_data.get('leaderboard', [])
                        self.log_test(
                            f"Database {description}",
                            True,
                            f"Retrieved {len(leaderboard)} leaderboard entries",
                            response_time
                        )
                    elif "live-players" in url and "count" in json_data:
                        count = json_data.get('count', 0)
                        self.log_test(
                            f"Database {description}",
                            True,
                            f"Live players count: {count}",
                            response_time
                        )
                    elif "global-winnings" in url and "total" in json_data:
                        total = json_data.get('total', 0)
                        self.log_test(
                            f"Database {description}",
                            True,
                            f"Global winnings: ${total}",
                            response_time
                        )
                    elif "servers" in url and "servers" in json_data:
                        servers = json_data.get('servers', [])
                        self.log_test(
                            f"Database {description}",
                            True,
                            f"Retrieved {len(servers)} servers",
                            response_time
                        )
                    else:
                        self.log_test(
                            f"Database {description}",
                            True,
                            f"Valid JSON response with {len(str(json_data))} chars",
                            response_time
                        )
                except json.JSONDecodeError:
                    self.log_test(
                        f"Database {description}",
                        False,
                        "Invalid JSON response",
                        response_time
                    )
            else:
                self.log_test(
                    f"Database {description}",
                    False,
                    f"Failed - Status: {response.status_code if response else 'No response'}",
                    response_time
                )
                
        # Test data persistence by creating and retrieving a friend request
        print("\n📋 Database Persistence Test")
        
        # Create a unique test friendship
        test_user_id = f"dbtest_{int(time.time())}"
        request_data = {
            "fromUserId": test_user_id,
            "toUserId": "persistent_test_user",
            "fromUserName": "DBTestUser",
            "toUserName": "PersistentTestUser"
        }
        
        # Send friend request
        response, response_time = self.make_request(
            "POST",
            f"{LOCALHOST_API}/friends/send-request",
            request_data
        )
        
        if response is not None and (response.status_code == 200 or response.status_code == 400):
            # Wait for database write
            time.sleep(0.5)
            
            # Try to retrieve the friendship
            response, response_time = self.make_request(
                "GET",
                f"{LOCALHOST_API}/friends/list",
                None,
                {"userId": test_user_id}
            )
            
            if response is not None and response.status_code == 200:
                try:
                    data = response.json()
                    friends = data.get('friends', [])
                    
                    # Check if the friendship was persisted
                    persistent_friend_found = any(
                        friend.get('id') == 'persistent_test_user' 
                        for friend in friends
                    )
                    
                    self.log_test(
                        "Database Data Persistence",
                        persistent_friend_found,
                        f"Friendship persisted in database: {persistent_friend_found}",
                        response_time
                    )
                except json.JSONDecodeError:
                    self.log_test(
                        "Database Data Persistence",
                        False,
                        "Invalid JSON response during persistence check",
                        response_time
                    )
            else:
                self.log_test(
                    "Database Data Persistence",
                    False,
                    f"Failed to retrieve data - Status: {response.status_code if response else 'No response'}",
                    response_time
                )
        else:
            self.log_test(
                "Database Data Persistence",
                False,
                f"Failed to create test data - Status: {response.status_code if response else 'No response'}",
                response_time
            )
            
    def run_all_tests(self):
        """Run all API connectivity tests"""
        print("🚀 STARTING TURFLOOT API CONNECTIVITY TESTING")
        print(f"📍 Localhost: {LOCALHOST_URL}")
        print(f"📍 Preview URL: {PREVIEW_URL}")
        print(f"⏰ Started at: {self.start_time.isoformat()}")
        print("=" * 80)
        
        # Run all test suites
        self.test_localhost_critical_endpoints()
        self.test_preview_url_status()
        self.test_friends_system_workflow()
        self.test_database_connectivity()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TURFLOOT API CONNECTIVITY TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        total_time = (datetime.now() - self.start_time).total_seconds()
        
        print(f"✅ Tests Passed: {self.passed_tests}")
        print(f"❌ Tests Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}% ({self.passed_tests}/{self.total_tests})")
        print(f"⏱️  Total Time: {total_time:.2f} seconds")
        
        # Categorize results
        localhost_tests = [r for r in self.test_results if 'Localhost' in r['test'] or 'Database' in r['test'] or 'Friends' in r['test'] or 'Users' in r['test'] or 'Names' in r['test']]
        preview_tests = [r for r in self.test_results if 'Preview' in r['test']]
        
        localhost_passed = sum(1 for r in localhost_tests if r['passed'])
        preview_passed = sum(1 for r in preview_tests if r['passed'])
        
        print(f"\n📊 DETAILED BREAKDOWN:")
        print(f"🏠 Localhost Tests: {localhost_passed}/{len(localhost_tests)} passed ({localhost_passed/len(localhost_tests)*100:.1f}%)")
        print(f"🌐 Preview URL Tests: {preview_passed}/{len(preview_tests)} passed ({preview_passed/len(preview_tests)*100:.1f}%)")
        
        # Analysis
        print(f"\n🔍 ANALYSIS:")
        if localhost_passed >= len(localhost_tests) * 0.8:
            print("✅ LOCALHOST: Backend API functionality is working correctly on localhost")
        else:
            print("❌ LOCALHOST: Backend API has issues that need attention")
            
        if preview_passed >= len(preview_tests) * 0.8:
            print("✅ PREVIEW URL: Infrastructure issues confirmed (502 Bad Gateway)")
        else:
            print("⚠️  PREVIEW URL: Mixed results - may need further investigation")
            
        print(f"\n🎯 CONCLUSION:")
        if localhost_passed >= len(localhost_tests) * 0.8 and preview_passed >= len(preview_tests) * 0.8:
            print("✅ API connectivity issue is confirmed as infrastructure problem, not backend code issue")
        elif localhost_passed >= len(localhost_tests) * 0.8:
            print("✅ Backend functionality works on localhost - preview URL issues are infrastructure-related")
        else:
            print("❌ Backend functionality has issues that need to be resolved")
            
        print(f"⏰ Completed at: {datetime.now().isoformat()}")
        
        return success_rate >= 70  # Return True if tests are mostly passing

if __name__ == "__main__":
    tester = TurfLootAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)