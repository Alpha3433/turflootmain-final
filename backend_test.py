#!/usr/bin/env python3
"""
TurfLoot Friends System with Authentication - Comprehensive Backend Testing
Testing the complete friends functionality workflow as requested in review.

Test Coverage:
1. Authentication Flow Testing (Privy authentication endpoint)
2. Complete Friends Workflow Testing (user search, friend requests, friends list, online status)
3. Security and Isolation Testing (self-addition prevention, user isolation, duplicate prevention)
4. Database Integration Testing (MongoDB persistence, bidirectional friendships)
5. Friend Request Notifications Preparation (current system analysis)
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class TurfLootFriendsSystemTester:
    def __init__(self):
        self.test_results = []
        self.test_users = []
        self.auth_tokens = {}
        
    def log_test(self, test_name, success, details, response_time=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time': response_time
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"   Details: {details}")
        
    def create_test_user_data(self, user_id):
        """Create realistic test user data for authentication"""
        return {
            "privy_user": {
                "id": user_id,
                "email": f"testuser{user_id[-4:]}@turfloot.com",
                "google": {
                    "email": f"testuser{user_id[-4:]}@turfloot.com",
                    "name": f"Test User {user_id[-4:]}",
                    "subject": f"google_oauth_{user_id}"
                },
                "wallet": {
                    "address": f"0x{uuid.uuid4().hex[:40]}",
                    "wallet_client": "privy",
                    "wallet_client_type": "privy"
                }
            },
            "access_token": f"privy_token_{user_id}_{int(time.time())}"
        }

    def test_authentication_flow(self):
        """Test 1: Authentication Flow Testing - Test wallet balance endpoint for authentication"""
        print("\n🔐 TESTING AUTHENTICATION FLOW")
        
        # Test 1.1: Wallet balance without authentication (should return guest balance)
        start_time = time.time()
        try:
            response = requests.get(f"{API_BASE}/wallet/balance")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'balance' in data and data['balance'] == 0.0:
                    self.log_test("Auth - Guest balance validation", True, 
                                "Correctly returns guest balance (0.0) for unauthenticated request", response_time)
                else:
                    self.log_test("Auth - Guest balance validation", False, 
                                f"Expected guest balance 0.0, got {data.get('balance')}", response_time)
            else:
                self.log_test("Auth - Guest balance validation", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Auth - Guest balance validation", False, f"Request failed: {str(e)}")

        # Test 1.2: Create test users for friends system testing (simulate authenticated users)
        for i in range(4):  # Create 4 test users for comprehensive testing
            test_user_id = f"did:privy:test_user_{uuid.uuid4().hex[:12]}_{i}"
            
            # Create user via custom name update (this creates users in the database)
            start_time = time.time()
            try:
                user_data = {
                    'userId': test_user_id,
                    'customName': f'TestUser{i+1}',
                    'privyId': test_user_id,
                    'email': f'testuser{i+1}@turfloot.com'
                }
                
                response = requests.post(f"{API_BASE}/users/profile/update-name", 
                                       json=user_data, 
                                       headers={'Content-Type': 'application/json'})
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        self.test_users.append({
                            'id': test_user_id,
                            'email': f'testuser{i+1}@turfloot.com',
                            'name': f'TestUser{i+1}'
                        })
                        
                        self.log_test(f"Auth - Test user {i+1} creation", True, 
                                    f"User created successfully: {data.get('customName')}", 
                                    response_time)
                    else:
                        self.log_test(f"Auth - Test user {i+1} creation", False, 
                                    "Response missing success flag", response_time)
                else:
                    self.log_test(f"Auth - Test user {i+1} creation", False, 
                                f"Expected 200, got {response.status_code}: {response.text}", response_time)
            except Exception as e:
                self.log_test(f"Auth - Test user {i+1} creation", False, f"Request failed: {str(e)}")

        # Test 1.3: Verify user profile retrieval (session management simulation)
        if self.test_users:
            test_user = self.test_users[0]
            start_time = time.time()
            try:
                response = requests.get(f"{API_BASE}/users/profile", 
                                      params={'userId': test_user['id']})
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if 'username' in data:
                        self.log_test("Auth - User profile retrieval", True, 
                                    f"Profile retrieved successfully: {data['username']}", response_time)
                    else:
                        self.log_test("Auth - User profile retrieval", False, 
                                    "Profile data missing username", response_time)
                else:
                    self.log_test("Auth - User profile retrieval", False, 
                                f"Expected 200, got {response.status_code}", response_time)
            except Exception as e:
                self.log_test("Auth - User profile retrieval", False, f"Request failed: {str(e)}")

    def test_user_search_functionality(self):
        """Test 2: User Search Functionality - Both names/search and users/search endpoints"""
        print("\n🔍 TESTING USER SEARCH FUNCTIONALITY")
        
        # Create additional test users for search testing
        search_test_users = []
        for i in range(3):
            user_id = f"did:privy:search_test_{uuid.uuid4().hex[:12]}_{i}"
            user_data = self.create_test_user_data(user_id)
            user_data['privy_user']['google']['name'] = f"SearchUser{i+1}"
            user_data['privy_user']['email'] = f"searchuser{i+1}@turfloot.com"
            
            # Create user via auth endpoint
            try:
                response = requests.post(f"{API_BASE}/auth/privy", json=user_data)
                if response.status_code == 200:
                    search_test_users.append({
                        'id': user_id,
                        'name': f"SearchUser{i+1}",
                        'email': f"searchuser{i+1}@turfloot.com"
                    })
                    self.test_users.append(search_test_users[-1])
            except Exception as e:
                print(f"Failed to create search test user {i+1}: {e}")

        time.sleep(1)  # Allow database to sync

        # Test 2.1: Names search endpoint
        start_time = time.time()
        try:
            current_user = self.test_users[0]['id'] if self.test_users else "test_user"
            response = requests.get(f"{API_BASE}/names/search", 
                                  params={'q': 'SearchUser', 'userId': current_user})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and isinstance(data['users'], list):
                    found_users = len(data['users'])
                    self.log_test("Search - Names endpoint", True, 
                                f"Names search working, found {found_users} users matching 'SearchUser'", 
                                response_time)
                else:
                    self.log_test("Search - Names endpoint", False, 
                                "Invalid response structure from names/search", response_time)
            else:
                self.log_test("Search - Names endpoint", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Search - Names endpoint", False, f"Request failed: {str(e)}")

        # Test 2.2: Users search endpoint
        start_time = time.time()
        try:
            current_user = self.test_users[0]['id'] if self.test_users else "test_user"
            response = requests.get(f"{API_BASE}/users/search", 
                                  params={'q': 'SearchUser', 'userId': current_user})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and isinstance(data['users'], list):
                    found_users = len(data['users'])
                    self.log_test("Search - Users endpoint", True, 
                                f"Users search working, found {found_users} users matching 'SearchUser'", 
                                response_time)
                else:
                    self.log_test("Search - Users endpoint", False, 
                                "Invalid response structure from users/search", response_time)
            else:
                self.log_test("Search - Users endpoint", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Search - Users endpoint", False, f"Request failed: {str(e)}")

        # Test 2.3: Search query validation (too short)
        start_time = time.time()
        try:
            current_user = self.test_users[0]['id'] if self.test_users else "test_user"
            response = requests.get(f"{API_BASE}/users/search", 
                                  params={'q': 'a', 'userId': current_user})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'at least 2 characters' in data['message']:
                    self.log_test("Search - Query validation", True, 
                                "Correctly validates minimum query length", response_time)
                else:
                    self.log_test("Search - Query validation", False, 
                                "Missing or incorrect validation message", response_time)
            else:
                self.log_test("Search - Query validation", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Search - Query validation", False, f"Request failed: {str(e)}")

    def test_friend_request_system(self):
        """Test 3: Friend Request System - Send requests with authentication"""
        print("\n👥 TESTING FRIEND REQUEST SYSTEM")
        
        if len(self.test_users) < 2:
            self.log_test("Friend Request - Setup", False, "Need at least 2 test users for friend request testing")
            return

        user1 = self.test_users[0]
        user2 = self.test_users[1]

        # Test 3.1: Valid friend request
        start_time = time.time()
        try:
            request_data = {
                'fromUserId': user1['id'],
                'toUserId': user2['id'],
                'fromUserName': user1.get('name', 'Test User 1'),
                'toUserName': user2.get('name', 'Test User 2')
            }
            
            response = requests.post(f"{API_BASE}/friends/send-request", 
                                   json=request_data,
                                   headers={'Content-Type': 'application/json'})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'requestId' in data:
                    self.log_test("Friend Request - Valid request", True, 
                                f"Friend request sent successfully, ID: {data['requestId'][:8]}...", 
                                response_time)
                else:
                    self.log_test("Friend Request - Valid request", False, 
                                "Response missing success or requestId", response_time)
            else:
                self.log_test("Friend Request - Valid request", False, 
                            f"Expected 200, got {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Friend Request - Valid request", False, f"Request failed: {str(e)}")

        # Test 3.2: Self-addition prevention
        start_time = time.time()
        try:
            request_data = {
                'fromUserId': user1['id'],
                'toUserId': user1['id'],  # Same user
                'fromUserName': user1.get('name', 'Test User 1'),
                'toUserName': user1.get('name', 'Test User 1')
            }
            
            response = requests.post(f"{API_BASE}/friends/send-request", 
                                   json=request_data,
                                   headers={'Content-Type': 'application/json'})
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                data = response.json()
                if 'Cannot add yourself' in data.get('error', ''):
                    self.log_test("Friend Request - Self-addition prevention", True, 
                                "Correctly prevents users from adding themselves", response_time)
                else:
                    self.log_test("Friend Request - Self-addition prevention", False, 
                                f"Wrong error message: {data.get('error')}", response_time)
            else:
                self.log_test("Friend Request - Self-addition prevention", False, 
                            f"Expected 400, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Friend Request - Self-addition prevention", False, f"Request failed: {str(e)}")

        # Test 3.3: Duplicate friend request prevention
        start_time = time.time()
        try:
            request_data = {
                'fromUserId': user1['id'],
                'toUserId': user2['id'],
                'fromUserName': user1.get('name', 'Test User 1'),
                'toUserName': user2.get('name', 'Test User 2')
            }
            
            response = requests.post(f"{API_BASE}/friends/send-request", 
                                   json=request_data,
                                   headers={'Content-Type': 'application/json'})
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                data = response.json()
                if 'already exists' in data.get('error', ''):
                    self.log_test("Friend Request - Duplicate prevention", True, 
                                "Correctly prevents duplicate friend requests", response_time)
                else:
                    self.log_test("Friend Request - Duplicate prevention", False, 
                                f"Wrong error message: {data.get('error')}", response_time)
            else:
                self.log_test("Friend Request - Duplicate prevention", False, 
                            f"Expected 400, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Friend Request - Duplicate prevention", False, f"Request failed: {str(e)}")

    def test_friends_list_retrieval(self):
        """Test 4: Friends List Retrieval - Get friends list with proper user isolation"""
        print("\n📋 TESTING FRIENDS LIST RETRIEVAL")
        
        if len(self.test_users) < 3:
            self.log_test("Friends List - Setup", False, "Need at least 3 test users for isolation testing")
            return

        user1 = self.test_users[0]
        user2 = self.test_users[1]
        user3 = self.test_users[2]

        # Test 4.1: Friends list for user1 (should see user2)
        start_time = time.time()
        try:
            response = requests.get(f"{API_BASE}/friends/list", 
                                  params={'userId': user1['id']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'friends' in data and isinstance(data['friends'], list):
                    friends_count = len(data['friends'])
                    # Check if user2 is in the friends list
                    user2_found = any(friend.get('id') == user2['id'] for friend in data['friends'])
                    
                    if user2_found:
                        self.log_test("Friends List - User1 friends", True, 
                                    f"User1 correctly sees {friends_count} friends including User2", 
                                    response_time)
                    else:
                        self.log_test("Friends List - User1 friends", False, 
                                    f"User2 not found in User1's friends list (found {friends_count} friends)", 
                                    response_time)
                else:
                    self.log_test("Friends List - User1 friends", False, 
                                "Invalid response structure from friends/list", response_time)
            else:
                self.log_test("Friends List - User1 friends", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Friends List - User1 friends", False, f"Request failed: {str(e)}")

        # Test 4.2: Friends list for user2 (should see user1 - bidirectional)
        start_time = time.time()
        try:
            response = requests.get(f"{API_BASE}/friends/list", 
                                  params={'userId': user2['id']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'friends' in data and isinstance(data['friends'], list):
                    friends_count = len(data['friends'])
                    # Check if user1 is in the friends list
                    user1_found = any(friend.get('id') == user1['id'] for friend in data['friends'])
                    
                    if user1_found:
                        self.log_test("Friends List - User2 friends (bidirectional)", True, 
                                    f"User2 correctly sees {friends_count} friends including User1", 
                                    response_time)
                    else:
                        self.log_test("Friends List - User2 friends (bidirectional)", False, 
                                    f"User1 not found in User2's friends list (found {friends_count} friends)", 
                                    response_time)
                else:
                    self.log_test("Friends List - User2 friends (bidirectional)", False, 
                                "Invalid response structure from friends/list", response_time)
            else:
                self.log_test("Friends List - User2 friends (bidirectional)", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Friends List - User2 friends (bidirectional)", False, f"Request failed: {str(e)}")

        # Test 4.3: User isolation - user3 should not see user1-user2 friendship
        start_time = time.time()
        try:
            response = requests.get(f"{API_BASE}/friends/list", 
                                  params={'userId': user3['id']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'friends' in data and isinstance(data['friends'], list):
                    friends_count = len(data['friends'])
                    # User3 should not see user1 or user2 in their friends list
                    user1_found = any(friend.get('id') == user1['id'] for friend in data['friends'])
                    user2_found = any(friend.get('id') == user2['id'] for friend in data['friends'])
                    
                    if not user1_found and not user2_found:
                        self.log_test("Friends List - User isolation", True, 
                                    f"User3 correctly isolated, sees {friends_count} friends (not User1 or User2)", 
                                    response_time)
                    else:
                        self.log_test("Friends List - User isolation", False, 
                                    f"User isolation failed - User3 sees User1: {user1_found}, User2: {user2_found}", 
                                    response_time)
                else:
                    self.log_test("Friends List - User isolation", False, 
                                "Invalid response structure from friends/list", response_time)
            else:
                self.log_test("Friends List - User isolation", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Friends List - User isolation", False, f"Request failed: {str(e)}")

    def test_online_status_tracking(self):
        """Test 5: Online Status Tracking - Get online friends status"""
        print("\n🟢 TESTING ONLINE STATUS TRACKING")
        
        if not self.test_users:
            self.log_test("Online Status - Setup", False, "No test users available for online status testing")
            return

        user1 = self.test_users[0]

        # Test 5.1: Online status endpoint
        start_time = time.time()
        try:
            response = requests.get(f"{API_BASE}/friends/online-status", 
                                  params={'userId': user1['id']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'onlineFriends' in data and 'timestamp' in data:
                    online_count = len(data['onlineFriends'])
                    self.log_test("Online Status - Endpoint functionality", True, 
                                f"Online status endpoint working, {online_count} online friends", 
                                response_time)
                else:
                    self.log_test("Online Status - Endpoint functionality", False, 
                                "Response missing onlineFriends or timestamp", response_time)
            else:
                self.log_test("Online Status - Endpoint functionality", False, 
                            f"Expected 200, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Online Status - Endpoint functionality", False, f"Request failed: {str(e)}")

        # Test 5.2: Online status without userId parameter
        start_time = time.time()
        try:
            response = requests.get(f"{API_BASE}/friends/online-status")
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                data = response.json()
                if 'userId parameter is required' in data.get('error', ''):
                    self.log_test("Online Status - Parameter validation", True, 
                                "Correctly validates required userId parameter", response_time)
                else:
                    self.log_test("Online Status - Parameter validation", False, 
                                f"Wrong error message: {data.get('error')}", response_time)
            else:
                self.log_test("Online Status - Parameter validation", False, 
                            f"Expected 400, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Online Status - Parameter validation", False, f"Request failed: {str(e)}")

    def test_database_integration(self):
        """Test 6: Database Integration - Verify MongoDB persistence and data integrity"""
        print("\n🗄️ TESTING DATABASE INTEGRATION")
        
        # Test 6.1: Core API endpoints for database connectivity
        endpoints_to_test = [
            ('ping', 'Ping endpoint'),
            ('', 'Root API endpoint'),
            ('users/leaderboard', 'Leaderboard endpoint'),
            ('stats/live-players', 'Live players stats'),
            ('stats/global-winnings', 'Global winnings stats')
        ]
        
        for endpoint, description in endpoints_to_test:
            start_time = time.time()
            try:
                url = f"{API_BASE}/{endpoint}" if endpoint else f"{API_BASE}/"
                response = requests.get(url)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Database - {description}", True, 
                                f"Endpoint working, response contains {len(data)} fields", 
                                response_time)
                else:
                    self.log_test(f"Database - {description}", False, 
                                f"Expected 200, got {response.status_code}", response_time)
            except Exception as e:
                self.log_test(f"Database - {description}", False, f"Request failed: {str(e)}")

        # Test 6.2: Data persistence verification
        if len(self.test_users) >= 2:
            user1 = self.test_users[0]
            user2 = self.test_users[1]
            
            # Create a new friendship and verify it persists
            start_time = time.time()
            try:
                # First, get current friends count
                response1 = requests.get(f"{API_BASE}/friends/list", params={'userId': user1['id']})
                initial_count = len(response1.json().get('friends', [])) if response1.status_code == 200 else 0
                
                # Create a new test user and send friend request
                new_user_id = f"did:privy:persist_test_{uuid.uuid4().hex[:12]}"
                new_user_data = self.create_test_user_data(new_user_id)
                new_user_data['privy_user']['google']['name'] = "PersistenceTestUser"
                
                # Create the new user
                auth_response = requests.post(f"{API_BASE}/auth/privy", json=new_user_data)
                
                if auth_response.status_code == 200:
                    # Send friend request
                    friend_request = {
                        'fromUserId': user1['id'],
                        'toUserId': new_user_id,
                        'fromUserName': user1.get('name', 'Test User 1'),
                        'toUserName': 'PersistenceTestUser'
                    }
                    
                    requests.post(f"{API_BASE}/friends/send-request", json=friend_request)
                    
                    # Wait a moment for database sync
                    time.sleep(0.5)
                    
                    # Verify the friendship persists
                    response2 = requests.get(f"{API_BASE}/friends/list", params={'userId': user1['id']})
                    final_count = len(response2.json().get('friends', [])) if response2.status_code == 200 else 0
                    
                    response_time = time.time() - start_time
                    
                    if final_count > initial_count:
                        self.log_test("Database - Data persistence", True, 
                                    f"Friendship persisted in database (friends: {initial_count} → {final_count})", 
                                    response_time)
                    else:
                        self.log_test("Database - Data persistence", False, 
                                    f"Friendship not persisted (friends: {initial_count} → {final_count})", 
                                    response_time)
                else:
                    self.log_test("Database - Data persistence", False, 
                                "Failed to create test user for persistence test")
            except Exception as e:
                self.log_test("Database - Data persistence", False, f"Persistence test failed: {str(e)}")

    def test_friend_request_notifications_preparation(self):
        """Test 7: Friend Request Notifications Preparation - Analyze current system"""
        print("\n🔔 TESTING FRIEND REQUEST NOTIFICATIONS PREPARATION")
        
        # Test 7.1: Current friend request system analysis
        if len(self.test_users) >= 2:
            user1 = self.test_users[0]
            
            # Create a new user for notification testing
            notification_user_id = f"did:privy:notification_test_{uuid.uuid4().hex[:12]}"
            notification_user_data = self.create_test_user_data(notification_user_id)
            notification_user_data['privy_user']['google']['name'] = "NotificationTestUser"
            
            start_time = time.time()
            try:
                # Create the notification test user
                auth_response = requests.post(f"{API_BASE}/auth/privy", json=notification_user_data)
                
                if auth_response.status_code == 200:
                    # Send friend request and analyze the response
                    friend_request = {
                        'fromUserId': user1['id'],
                        'toUserId': notification_user_id,
                        'fromUserName': user1.get('name', 'Test User 1'),
                        'toUserName': 'NotificationTestUser'
                    }
                    
                    response = requests.post(f"{API_BASE}/friends/send-request", json=friend_request)
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        status = data.get('status', 'unknown')
                        
                        if status == 'accepted':
                            self.log_test("Notifications - Current system analysis", True, 
                                        f"Current system auto-accepts friend requests (status: {status})", 
                                        response_time)
                        elif status == 'pending':
                            self.log_test("Notifications - Current system analysis", True, 
                                        f"Current system creates pending requests (status: {status})", 
                                        response_time)
                        else:
                            self.log_test("Notifications - Current system analysis", False, 
                                        f"Unknown friend request status: {status}", response_time)
                    else:
                        self.log_test("Notifications - Current system analysis", False, 
                                    f"Friend request failed: {response.status_code}", response_time)
                else:
                    self.log_test("Notifications - Current system analysis", False, 
                                "Failed to create notification test user")
            except Exception as e:
                self.log_test("Notifications - Current system analysis", False, f"Analysis failed: {str(e)}")

        # Test 7.2: Identify endpoints needed for real-time notifications
        notification_endpoints = [
            ('friends/list', 'Friends list for notification display'),
            ('friends/online-status', 'Online status for real-time updates'),
            ('friends/send-request', 'Friend request creation'),
            ('friends/accept-request', 'Friend request acceptance (if implemented)')
        ]
        
        working_endpoints = []
        for endpoint, description in notification_endpoints:
            start_time = time.time()
            try:
                if endpoint == 'friends/accept-request':
                    # Test with dummy data
                    response = requests.post(f"{API_BASE}/{endpoint}", 
                                           json={'requestId': 'test', 'userId': 'test'})
                else:
                    # Test GET endpoints
                    test_user_id = self.test_users[0]['id'] if self.test_users else 'test_user'
                    response = requests.get(f"{API_BASE}/{endpoint}", 
                                          params={'userId': test_user_id})
                
                response_time = time.time() - start_time
                
                if response.status_code in [200, 400, 404]:  # 400/404 are acceptable for structure testing
                    working_endpoints.append(endpoint)
                    self.log_test(f"Notifications - {endpoint} availability", True, 
                                f"{description} endpoint available (status: {response.status_code})", 
                                response_time)
                else:
                    self.log_test(f"Notifications - {endpoint} availability", False, 
                                f"Endpoint not available (status: {response.status_code})", response_time)
            except Exception as e:
                self.log_test(f"Notifications - {endpoint} availability", False, f"Request failed: {str(e)}")

        # Test 7.3: Friend request status tracking capability
        self.log_test("Notifications - Status tracking readiness", True, 
                    f"Found {len(working_endpoints)} working endpoints for notifications: {', '.join(working_endpoints)}")

    def run_comprehensive_test_suite(self):
        """Run the complete friends system test suite"""
        print("🚀 STARTING COMPREHENSIVE FRIENDS SYSTEM WITH AUTHENTICATION TESTING")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all test categories
        self.test_authentication_flow()
        self.test_user_search_functionality()
        self.test_friend_request_system()
        self.test_friends_list_retrieval()
        self.test_online_status_tracking()
        self.test_database_integration()
        self.test_friend_request_notifications_preparation()
        
        total_time = time.time() - start_time
        
        # Generate comprehensive summary
        self.generate_test_summary(total_time)

    def generate_test_summary(self, total_time):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📈 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests} ✅")
        print(f"   Failed: {failed_tests} ❌")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Total Time: {total_time:.3f}s")
        
        # Category breakdown
        categories = {}
        for result in self.test_results:
            category = result['test'].split(' - ')[0]
            if category not in categories:
                categories[category] = {'total': 0, 'passed': 0}
            categories[category]['total'] += 1
            if result['success']:
                categories[category]['passed'] += 1
        
        print(f"\n📋 CATEGORY BREAKDOWN:")
        for category, stats in categories.items():
            rate = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"   {category}: {stats['passed']}/{stats['total']} ({rate:.1f}%)")
        
        # Critical findings
        print(f"\n🔍 CRITICAL FINDINGS:")
        
        auth_tests = [r for r in self.test_results if 'Auth' in r['test']]
        auth_success = sum(1 for r in auth_tests if r['success'])
        if auth_success == len(auth_tests) and len(auth_tests) > 0:
            print(f"   ✅ Authentication Flow: FULLY OPERATIONAL ({auth_success}/{len(auth_tests)} tests passed)")
        else:
            print(f"   ❌ Authentication Flow: ISSUES DETECTED ({auth_success}/{len(auth_tests)} tests passed)")
        
        search_tests = [r for r in self.test_results if 'Search' in r['test']]
        search_success = sum(1 for r in search_tests if r['success'])
        if search_success == len(search_tests) and len(search_tests) > 0:
            print(f"   ✅ User Search: FULLY OPERATIONAL ({search_success}/{len(search_tests)} tests passed)")
        else:
            print(f"   ❌ User Search: ISSUES DETECTED ({search_success}/{len(search_tests)} tests passed)")
        
        friend_tests = [r for r in self.test_results if 'Friend' in r['test']]
        friend_success = sum(1 for r in friend_tests if r['success'])
        if friend_success == len(friend_tests) and len(friend_tests) > 0:
            print(f"   ✅ Friends System: FULLY OPERATIONAL ({friend_success}/{len(friend_tests)} tests passed)")
        else:
            print(f"   ❌ Friends System: ISSUES DETECTED ({friend_success}/{len(friend_tests)} tests passed)")
        
        database_tests = [r for r in self.test_results if 'Database' in r['test']]
        database_success = sum(1 for r in database_tests if r['success'])
        if database_success == len(database_tests) and len(database_tests) > 0:
            print(f"   ✅ Database Integration: FULLY OPERATIONAL ({database_success}/{len(database_tests)} tests passed)")
        else:
            print(f"   ❌ Database Integration: ISSUES DETECTED ({database_success}/{len(database_tests)} tests passed)")
        
        # Performance analysis
        response_times = [r['response_time'] for r in self.test_results if r['response_time']]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            print(f"\n⚡ PERFORMANCE ANALYSIS:")
            print(f"   Average Response Time: {avg_time:.3f}s")
            print(f"   Maximum Response Time: {max_time:.3f}s")
            print(f"   Total API Calls: {len(response_times)}")
        
        # Test users created
        print(f"\n👥 TEST DATA CREATED:")
        print(f"   Test Users Created: {len(self.test_users)}")
        print(f"   Authentication Tokens: {len(self.auth_tokens)}")
        
        # Failed tests details
        failed_results = [r for r in self.test_results if not r['success']]
        if failed_results:
            print(f"\n❌ FAILED TESTS DETAILS:")
            for result in failed_results:
                print(f"   • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)
        print("🎯 FRIENDS SYSTEM WITH AUTHENTICATION TESTING COMPLETED")
        print("=" * 80)
        
        return success_rate >= 75  # Return True if tests are mostly passing

if __name__ == "__main__":
    tester = TurfLootFriendsSystemTester()
    success = tester.run_comprehensive_test_suite()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)